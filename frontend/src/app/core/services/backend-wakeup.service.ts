import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, of, timer } from 'rxjs';
import { catchError, map, retry, timeout } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class BackendWakeupService {
  private http = inject(HttpClient);
  
  private isReadySubject = new BehaviorSubject<boolean>(false);
  public isReady$ = this.isReadySubject.asObservable();
  
  private statusMessageSubject = new BehaviorSubject<string>('Connecting to PunchUp...');
  public statusMessage$ = this.statusMessageSubject.asObservable();

  private hasFailedSubject = new BehaviorSubject<boolean>(false);
  public hasFailed$ = this.hasFailedSubject.asObservable();

  constructor() {
    this.pingBackend();
  }

  public retryPing() {
    this.hasFailedSubject.next(false);
    this.statusMessageSubject.next('Connecting to PunchUp...');
    this.pingBackend();
  }

  private pingBackend() {
    const maxRetries = 25; // 25 attempts * ~2.5s = ~60+ seconds
    const pingUrl = `${environment.apiUrl}/`;

    this.http.get<{ success: boolean }>(pingUrl).pipe(
      timeout(6000), // Timeout each individual request after 6 seconds
      map(res => {
        if (res && res.success) return true;
        throw new Error('Invalid response');
      }),
      retry({
        count: maxRetries,
        delay: (error, retryCount) => {
          this.statusMessageSubject.next(
            `Connecting to PunchUp... (Waking up servers, attempt ${retryCount}/${maxRetries})`
          );
          return timer(2500);
        }
      }),
      catchError(err => {
        console.error('Failed to reach backend after max retries:', err);
        this.statusMessageSubject.next(
          'Could not establish connection to the backend. Please check your internet connection or click below to retry.'
        );
        this.hasFailedSubject.next(true);
        return of(false);
      })
    ).subscribe(success => {
      if (success) {
        this.isReadySubject.next(true);
      }
    });
  }
}
