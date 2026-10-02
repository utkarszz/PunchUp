import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface Notification {
  _id: string;
  type: 'follow' | 'like' | 'comment' | 'task_reminder';
  from?: {
    _id: string;
    username: string;
    displayName?: string;
    profilePicture?: string;
  };
  post?: { _id: string; content: string };
  task?: { _id: string; title: string; dueDate?: string; completed?: boolean };
  message?: string;
  read: boolean;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api/notifications`;

  /** Reactive unread count — persisted via backend, updated locally on actions */
  private unreadCountSubject = new BehaviorSubject<number>(0);
  public unreadCount$ = this.unreadCountSubject.asObservable();

  get unreadCount(): number {
    return this.unreadCountSubject.value;
  }

  private pollInterval?: any;

  private onWindowFocus = () => {
    this.fetchUnreadCount();
  };

  getAll(): Observable<{ success: boolean; notifications: Notification[] }> {
    return this.http.get<{ success: boolean; notifications: any[] }>(this.base).pipe(
      map(res => ({
        ...res,
        notifications: (res.notifications || []).map((n: any) => ({
          _id: n._id,
          type: n.type,
          // Backend uses 'sender', frontend template expects 'from'
          from: n.sender || n.from || null,
          post: n.post || null,
          task: n.task || null,
          message: n.message || '',
          // Backend uses 'isRead', frontend template expects 'read'
          read: n.isRead ?? n.read ?? false,
          createdAt: n.createdAt,
        }))
      })),
      tap(() => {
        this.fetchUnreadCount();
      })
    );
  }

  getUnreadCount(): Observable<{ success: boolean; count: number; unreadCount: number }> {
    return this.http.get<{ success: boolean; count: number; unreadCount: number }>(`${this.base}/unread-count`).pipe(
      tap(res => {
        if (res && res.success && typeof res.unreadCount === 'number') {
          this.unreadCountSubject.next(res.unreadCount);
        }
      })
    );
  }

  markRead(id: string): Observable<any> {
    return this.http.patch(`${this.base}/${id}/read`, {}).pipe(
      tap(() => {
        const current = this.unreadCountSubject.value;
        if (current > 0) {
          this.unreadCountSubject.next(current - 1);
        }
      })
    );
  }

  markAllRead(): Observable<any> {
    return this.http.patch(`${this.base}/read-all`, {}).pipe(
      tap(() => {
        this.unreadCountSubject.next(0);
      })
    );
  }

  /** Fetch unread count from backend and update the local subject */
  fetchUnreadCount(): void {
    this.getUnreadCount().subscribe({
      error: () => {}
    });
  }

  /** Start gentle background polling for notifications */
  startPolling(intervalMs = 45000): void {
    if (this.pollInterval) return;
    if (typeof window !== 'undefined') {
      this.pollInterval = setInterval(() => {
        this.fetchUnreadCount();
      }, intervalMs);
      window.addEventListener('focus', this.onWindowFocus);
    }
  }

  /** Stop background polling */
  stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = undefined;
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('focus', this.onWindowFocus);
    }
  }

  /** Increment unread count locally (e.g. when a new notification arrives via polling) */
  incrementUnreadCount(): void {
    this.unreadCountSubject.next(this.unreadCountSubject.value + 1);
  }

  /** Set unread count to a specific value */
  setUnreadCount(count: number): void {
    this.unreadCountSubject.next(Math.max(0, count));
  }
}
