import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, filter, map, of, take, tap } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { BackendWakeupService } from './backend-wakeup.service';

export interface UserProfile {
  _id: string;
  username: string;
  email: string;
  displayName?: string;
  profilePicture?: string;
  bio?: string;
  isOnboarded?: boolean;
  totalPoints?: number;
  role?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private wakeupService = inject(BackendWakeupService);

  private currentUserSubject = new BehaviorSubject<UserProfile | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  
  private isLoadedSubject = new BehaviorSubject<boolean>(false);
  public isLoaded$ = this.isLoadedSubject.asObservable();

  public get currentUserValue(): UserProfile | null {
    return this.currentUserSubject.value;
  }

  constructor() {
    this.wakeupService.isReady$.pipe(
      filter(ready => ready),
      take(1)
    ).subscribe(() => {
      this.checkSession();
    });
  }

  private checkSession() {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      this.loadCurrentUser().subscribe();
    } else {
      this.isLoadedSubject.next(true);
    }
  }

  /**
   * Sanitizes a redirect URL to prevent open redirect vulnerabilities.
   * Only allows valid relative application paths starting with '/' and not '//'.
   */
  public sanitizeReturnUrl(url: string | null | undefined): string {
    if (!url || typeof url !== 'string') return '/community';
    const trimmed = url.trim();
    // Must start with '/' and must not start with '//' (protocol-relative) or contain '://'
    if (trimmed.startsWith('/') && !trimmed.startsWith('//') && !trimmed.includes('://')) {
      return trimmed;
    }
    return '/community';
  }

  public setReturnUrl(url: string): void {
    const safe = this.sanitizeReturnUrl(url);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('punchup_return_url', safe);
    }
  }

  public getAndClearReturnUrl(): string {
    if (typeof window === 'undefined') return '/community';
    const saved = sessionStorage.getItem('punchup_return_url');
    sessionStorage.removeItem('punchup_return_url');
    return this.sanitizeReturnUrl(saved);
  }

  public handleOAuthCallback(token: string): Observable<UserProfile | null> {
    if (!token) {
      this.isLoadedSubject.next(true);
      return of(null);
    }
    
    localStorage.setItem('token', token);
    return this.loadCurrentUser().pipe(
      tap((user) => {
        if (user && user.isOnboarded === false) {
          this.router.navigate(['/onboarding'], { replaceUrl: true });
        } else {
          const returnUrl = this.getAndClearReturnUrl();
          this.router.navigateByUrl(returnUrl, { replaceUrl: true });
        }
      })
    );
  }

  public getToken(): string | null {
    return localStorage.getItem('token');
  }

  public isAuthenticated(): boolean {
    return !!this.getToken();
  }

  public loadCurrentUser(): Observable<UserProfile | null> {
    const token = this.getToken();
    if (!token) {
      this.currentUserSubject.next(null);
      this.isLoadedSubject.next(true);
      return of(null);
    }

    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    return this.http.get<any>(`${environment.apiUrl}/api/users/me`, { headers }).pipe(
      map(response => {
        const user = response?.user || response?.profile?.user;
        if (response?.success && user) {
          this.currentUserSubject.next(user);
          return user;
        }
        throw new Error('Profile request unsuccessful');
      }),
      catchError(error => {
        console.error('Failed to load user profile, clearing session:', error);
        this.logout();
        return of(null);
      }),
      tap(() => this.isLoadedSubject.next(true))
    );
  }

  public loginWithGoogle(): void {
    window.location.href = environment.googleAuthUrl;
  }

  public logout(redirectUrl?: string): void {
    localStorage.removeItem('token');
    this.currentUserSubject.next(null);
    if (redirectUrl) {
      this.setReturnUrl(redirectUrl);
      this.router.navigate(['/login'], { queryParams: { returnUrl: this.sanitizeReturnUrl(redirectUrl) } });
    } else {
      this.router.navigate(['/login']);
    }
  }

  public handleSessionExpired(currentUrl?: string): void {
    const targetUrl = currentUrl || (typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/community');
    this.logout(targetUrl);
  }

  public updateProfileLocally(updatedUser: UserProfile): void {
    this.currentUserSubject.next(updatedUser);
  }
}
