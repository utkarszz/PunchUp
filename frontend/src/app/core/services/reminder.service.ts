import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export type NotificationPermissionState = 'granted' | 'denied' | 'default' | 'unsupported';

@Injectable({
  providedIn: 'root',
})
export class ReminderService {
  private http = inject(HttpClient);
  private apiBase = `${environment.apiUrl}/api/notifications`;

  /**
   * Check the browser's current notification permission specifically for PunchUp's origin.
   * Does NOT request permission.
   */
  public getPermissionState(): NotificationPermissionState {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported';
    }
    return Notification.permission as NotificationPermissionState;
  }

  /**
   * Request browser notification permission for PunchUp.
   * MUST be invoked solely as a consequence of an explicit user interaction (e.g. enabling a task reminder).
   */
  public async requestPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        // Automatically ensure service worker and push subscription are active for PunchUp
        await this.ensureSubscribed().catch((err) => {
          console.warn('[ReminderService] Push subscription failed after granting permission:', err);
        });
        return true;
      }
      return false;
    } catch (err) {
      console.error('[ReminderService] Error requesting notification permission:', err);
      return false;
    }
  }

  /**
   * Ensures the service worker is registered and the browser has a push subscription stored on the backend.
   */
  public async ensureSubscribed(): Promise<void> {
    if (
      typeof window === 'undefined' ||
      !('serviceWorker' in navigator) ||
      !('PushManager' in window) ||
      this.getPermissionState() !== 'granted'
    ) {
      return;
    }

    try {
      // Register Service Worker with scope restricted to PunchUp
      const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      await navigator.serviceWorker.ready;

      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        // Fetch VAPID public key from backend
        const keyRes = await firstValueFrom(
          this.http.get<{ success: boolean; publicKey: string }>(`${this.apiBase}/vapid-public-key`)
        );

        if (!keyRes || !keyRes.publicKey) {
          throw new Error('VAPID public key not available from server');
        }

        const applicationServerKey = this.urlBase64ToUint8Array(keyRes.publicKey);
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey as any,
        });
      }

      // Sync subscription with backend
      const subscriptionJSON = subscription.toJSON();
      if (subscriptionJSON.endpoint && subscriptionJSON.keys) {
        await firstValueFrom(
          this.http.post(`${this.apiBase}/push-subscription`, {
            endpoint: subscriptionJSON.endpoint,
            keys: {
              p256dh: subscriptionJSON.keys['p256dh'],
              auth: subscriptionJSON.keys['auth'],
            },
          })
        );
      }
    } catch (error) {
      console.warn('[ReminderService] Failed to establish push subscription:', error);
      throw error;
    }
  }

  /**
   * Helper to convert base64 VAPID public key to Uint8Array for PushManager
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
}
