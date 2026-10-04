import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface FocusSession {
  _id: string;
  user: string;
  startTime: string;
  endTime?: string;
  duration: number;
  status: 'active' | 'completed' | 'cancelled';
  timeZone?: string;
  createdAt: string;
}

export interface FocusStats {
  dailySeconds: number;
  weeklySeconds: number;
  overallSeconds: number;
  dailyFormatted: string;
  weeklyFormatted: string;
  overallFormatted: string;
}

@Injectable({
  providedIn: 'root',
})
export class FocusService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api/focus`;

  private activeSessionSubject = new BehaviorSubject<FocusSession | null>(null);
  public activeSession$ = this.activeSessionSubject.asObservable();

  private statsSubject = new BehaviorSubject<FocusStats | null>(null);
  public stats$ = this.statsSubject.asObservable();

  private isRunningSubject = new BehaviorSubject<boolean>(false);
  public isRunning$ = this.isRunningSubject.asObservable();

  private isPausedSubject = new BehaviorSubject<boolean>(false);
  public isPaused$ = this.isPausedSubject.asObservable();

  public get isPaused(): boolean {
    return this.isPausedSubject.value;
  }

  private elapsedSecondsSubject = new BehaviorSubject<number>(0);
  public elapsedSeconds$ = this.elapsedSecondsSubject.asObservable();

  private timerInterval: any = null;
  private notificationInterval: any = null;
  private accumulatedPausedMs = 0;
  private pausedAt: number | null = null;
  private visibilityListenerAttached = false;

  constructor() {
    this.restoreFromStorage();
    this.initVisibilityListener();
  }

  public getUserTimeZone(): string {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch {
      return 'UTC';
    }
  }

  private initVisibilityListener() {
    if (typeof document === 'undefined' || this.visibilityListenerAttached) return;
    this.visibilityListenerAttached = true;
    document.addEventListener('visibilitychange', () => {
      // When user leaves the tab (minimized / switched app), immediately update notification with accurate elapsed
      if (this.isRunningSubject.value) {
        this.showTimerNotification(this.isPaused ? 'paused' : 'running');
      }
    });
  }

  private persistState(session: FocusSession) {
    if (typeof window === 'undefined') return;
    try {
      const stateObj = {
        session,
        isPaused: this.isPausedSubject.value,
        accumulatedPausedMs: this.accumulatedPausedMs,
        pausedAt: this.pausedAt,
        pausedElapsed: this.elapsedSecondsSubject.value,
      };
      localStorage.setItem('punchup_active_focus_session', JSON.stringify(stateObj));
    } catch {
      // Ignore storage errors
    }
  }

  private restoreFromStorage() {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem('punchup_active_focus_session');
      if (saved) {
        const parsed = JSON.parse(saved);
        const session: FocusSession = parsed.session || parsed;
        if (session && session.status === 'active') {
          this.activeSessionSubject.next(session);
          this.accumulatedPausedMs = parsed.accumulatedPausedMs || 0;
          this.pausedAt = parsed.pausedAt || null;

          if (parsed.isPaused) {
            this.isPausedSubject.next(true);
            this.isRunningSubject.next(true);
            this.elapsedSecondsSubject.next(parsed.pausedElapsed || 0);
            this.showTimerNotification('paused');
          } else {
            this.isPausedSubject.next(false);
            this.startLocalTicker(session.startTime, this.accumulatedPausedMs);
            this.startNotificationTicker();
            this.showTimerNotification('running');
          }
        }
      }
    } catch {
      localStorage.removeItem('punchup_active_focus_session');
    }
  }

  private startLocalTicker(startTimeStr: string, accumulatedPausedMs = 0) {
    this.stopLocalTicker(false);
    const startMs = new Date(startTimeStr).getTime();

    const update = () => {
      const nowMs = Date.now();
      const elapsed = Math.max(0, Math.floor((nowMs - startMs - this.accumulatedPausedMs) / 1000));
      this.elapsedSecondsSubject.next(elapsed);
    };

    update();
    this.isRunningSubject.next(true);
    this.timerInterval = setInterval(update, 1000);
  }

  private stopLocalTicker(keepRunningState = false) {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    if (!keepRunningState) {
      this.isRunningSubject.next(false);
    }
  }

  public pauseSession() {
    if (!this.isRunningSubject.value || this.isPausedSubject.value) return;
    const session = this.activeSessionSubject.value;
    if (!session) return;

    this.pausedAt = Date.now();
    this.stopLocalTicker(true);
    this.stopNotificationTicker();
    this.isPausedSubject.next(true);
    this.persistState(session);
    this.showTimerNotification('paused');
  }

  public resumeSession() {
    if (!this.isRunningSubject.value || !this.isPausedSubject.value) return;
    const session = this.activeSessionSubject.value;
    if (!session) return;

    if (this.pausedAt) {
      this.accumulatedPausedMs += Date.now() - this.pausedAt;
      this.pausedAt = null;
    }

    this.isPausedSubject.next(false);
    this.startLocalTicker(session.startTime, this.accumulatedPausedMs);
    this.startNotificationTicker();
    this.persistState(session);
    this.showTimerNotification('running');
  }

  public async showTimerNotification(state: 'running' | 'paused' = 'running'): Promise<void> {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    const session = this.activeSessionSubject.value;
    if (!session) return;

    const elapsed = this.elapsedSecondsSubject.value;
    const formatted = this.formatSeconds(elapsed);
    const title = 'PunchUp';
    const statusLine = state === 'paused' ? 'Focus Timer Paused' : 'Focus Timer';
    const body = `${statusLine}\n${formatted} elapsed`;

    const options: any = {
      body,
      icon: '/assets/logo.png',
      badge: '/assets/logo.png',
      tag: 'punchup-focus-timer',
      renotify: false,
      silent: true,
      requireInteraction: state === 'running',
      data: {
        url: '/tasks',
        type: 'focus-timer',
      },
      actions: [
        { action: 'open', title: 'Open PunchUp' },
      ],
    };

    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready;
        if (reg && 'showNotification' in reg) {
          await reg.showNotification(title, options);
          return;
        }
      }
      new Notification(title, options);
    } catch {
      // Fallback without actions for browsers where action buttons throw
      try {
        delete options.actions;
        if ('serviceWorker' in navigator) {
          const reg = await navigator.serviceWorker.ready;
          if (reg && 'showNotification' in reg) {
            await reg.showNotification(title, options);
            return;
          }
        }
        new Notification(title, options);
      } catch (e) {
        console.warn('[FocusService] Could not display timer notification:', e);
      }
    }
  }

  public async closeTimerNotification(): Promise<void> {
    this.stopNotificationTicker();
    if (typeof window === 'undefined') return;

    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
          const notifs = await reg.getNotifications({ tag: 'punchup-focus-timer' });
          notifs.forEach((n) => n.close());
        }
      }
    } catch (err) {
      console.warn('[FocusService] Error closing timer notification:', err);
    }
  }

  private startNotificationTicker() {
    this.stopNotificationTicker();
    // Update every 30 seconds silently to keep elapsed time fresh without notification spam
    this.notificationInterval = setInterval(() => {
      if (this.isRunningSubject.value && !this.isPausedSubject.value) {
        this.showTimerNotification('running');
      }
    }, 30000);
  }

  private stopNotificationTicker() {
    if (this.notificationInterval) {
      clearInterval(this.notificationInterval);
      this.notificationInterval = null;
    }
  }

  public syncActiveSession(): Observable<{ success: boolean; activeSession: FocusSession | null; serverTime?: string }> {
    return this.http.get<{ success: boolean; activeSession: FocusSession | null; serverTime?: string }>(`${this.base}/active`).pipe(
      tap((res) => {
        if (res.success && res.activeSession) {
          const existing = this.activeSessionSubject.value;
          this.activeSessionSubject.next(res.activeSession);

          // If session is already being tracked locally (e.g. paused or with accumulated pause), keep local pause state
          if (existing && existing._id === res.activeSession._id) {
            if (this.isPausedSubject.value) {
              this.showTimerNotification('paused');
            } else {
              this.showTimerNotification('running');
            }
          } else {
            this.accumulatedPausedMs = 0;
            this.pausedAt = null;
            this.isPausedSubject.next(false);
            this.persistState(res.activeSession);
            this.startLocalTicker(res.activeSession.startTime, 0);
            this.startNotificationTicker();
            this.showTimerNotification('running');
          }
        } else {
          this.activeSessionSubject.next(null);
          this.stopLocalTicker();
          this.stopNotificationTicker();
          this.isPausedSubject.next(false);
          this.accumulatedPausedMs = 0;
          this.pausedAt = null;
          this.elapsedSecondsSubject.next(0);
          this.closeTimerNotification();
          if (typeof window !== 'undefined') {
            localStorage.removeItem('punchup_active_focus_session');
          }
        }
      })
    );
  }

  public startSession(): Observable<{ success: boolean; session: FocusSession }> {
    const timeZone = this.getUserTimeZone();
    return this.http.post<{ success: boolean; session: FocusSession }>(`${this.base}/start`, { timeZone }).pipe(
      tap((res) => {
        if (res.success && res.session) {
          this.accumulatedPausedMs = 0;
          this.pausedAt = null;
          this.isPausedSubject.next(false);
          this.activeSessionSubject.next(res.session);
          this.persistState(res.session);
          this.startLocalTicker(res.session.startTime, 0);
          this.startNotificationTicker();
          this.showTimerNotification('running');
        }
      })
    );
  }

  public stopSession(duration?: number): Observable<{ success: boolean; session: FocusSession; stats?: FocusStats }> {
    const timeZone = this.getUserTimeZone();
    const payload: { duration?: number; timeZone: string } = {
      duration: duration ?? this.elapsedSecondsSubject.value,
      timeZone,
    };

    return this.http.post<{ success: boolean; session: FocusSession; stats?: FocusStats }>(`${this.base}/stop`, payload).pipe(
      tap((res) => {
        this.stopLocalTicker();
        this.stopNotificationTicker();
        this.closeTimerNotification();
        this.isPausedSubject.next(false);
        this.accumulatedPausedMs = 0;
        this.pausedAt = null;
        this.activeSessionSubject.next(null);
        this.elapsedSecondsSubject.next(0);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('punchup_active_focus_session');
        }
        if (res.stats) {
          this.statsSubject.next(res.stats);
        }
      })
    );
  }

  public getStats(): Observable<{ success: boolean; stats: FocusStats }> {
    const timeZone = this.getUserTimeZone();
    return this.http.get<{ success: boolean; stats: FocusStats }>(`${this.base}/stats?timeZone=${encodeURIComponent(timeZone)}`).pipe(
      tap((res) => {
        if (res.success && res.stats) {
          this.statsSubject.next(res.stats);
        }
      })
    );
  }

  public formatSeconds(totalSeconds: number): string {
    const sec = Math.max(0, Math.floor(totalSeconds));
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = sec % 60;

    const pad = (n: number) => (n < 10 ? '0' + n : String(n));

    if (hrs > 0) {
      return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
    }
    return `${pad(mins)}:${pad(secs)}`;
  }
}
