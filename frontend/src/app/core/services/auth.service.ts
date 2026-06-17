import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, map, of, tap } from 'rxjs';
import { Router, ActivatedRoute } from '@angular/router';
import { environment } from '../../../environments/environment';

export interface UserProfile {
  _id: string;
  username: string;
  email: string;
  profilePicture?: string;
  bio?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  private currentUserSubject = new BehaviorSubject<UserProfile | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  
  private isLoadedSubject = new BehaviorSubject<boolean>(false);
  public isLoaded$ = this.isLoadedSubject.asObservable();

  constructor() {
    this.checkSession();
  }

  private checkSession() {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      this.loadCurrentUser().subscribe();
    } else {
      this.isLoadedSubject.next(true);
    }
  }

  public handleOAuthCallback(token: string): Observable<UserProfile | null> {
    if (!token) {
      this.isLoadedSubject.next(true);
      return of(null);
    }
    
    localStorage.setItem('token', token);
    return this.loadCurrentUser().pipe(
      tap(() => {
        this.router.navigate(['/']); // Redirect to landing page instead of dashboard
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

    // The interceptor will add the authorization header, but we also specify it here in case the interceptor isn't fully active
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    return this.http.get<{ success: boolean; user: UserProfile }>(`${environment.apiUrl}/api/users/me`, { headers }).pipe(
      map(response => {
        if (response?.success && response?.user) {
          this.currentUserSubject.next(response.user);
          return response.user;
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

  public logout(): void {
    localStorage.removeItem('token');
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  public updateProfileLocally(updatedUser: UserProfile): void {
    this.currentUserSubject.next(updatedUser);
  }
}
