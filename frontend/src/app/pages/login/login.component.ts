import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="login-container">
      <div class="login-card card animate-slide-up">
        <!-- Logo -->
        <div class="logo">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" stroke="var(--text-primary)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
          </svg>
          <span class="logo-text">PunchUp</span>
        </div>

        <div class="header-text">
          <h2>Welcome to PunchUp</h2>
          <p>Sign in with your Google account to track tasks, build streaks, and visualize your progress.</p>
        </div>

        <!-- Google OAuth Button -->
        <button (click)="onGoogleLogin()" [disabled]="isLoading" class="btn btn-primary login-btn">
          <svg class="google-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
          </svg>
          {{ isLoading ? 'Connecting to Google...' : 'Continue with Google' }}
        </button>

        <div class="info-footer">
          <p>By continuing, you agree to PunchUp's Terms of Service and Privacy Policy.</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-container {
      background-color: var(--background);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
    }

    .login-card {
      width: 100%;
      max-width: 420px;
      padding: 3rem 2.5rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 2rem;
      background-color: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-lg);
    }

    .logo {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-family: var(--font-display);
      font-weight: 700;
      font-size: 1.5rem;
    }

    .logo-text {
      color: var(--text-primary);
    }

    .header-text h2 {
      font-size: 1.5rem;
      margin-bottom: 0.5rem;
      color: var(--text-primary);
    }

    .header-text p {
      font-size: 0.875rem;
      color: var(--text-secondary);
      line-height: 1.5;
    }

    .login-btn {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      padding: 0.85rem;
      font-weight: 600;
      border: 1px solid var(--border);
      background-color: var(--text-primary);
      color: var(--background);
    }

    .login-btn:hover {
      background-color: var(--primary-hover);
      transform: translateY(-1px);
    }

    .login-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .google-icon {
      flex-shrink: 0;
    }

    .info-footer p {
      font-size: 0.75rem;
      color: var(--text-muted);
      line-height: 1.4;
    }
  `]
})
export class LoginComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);

  public isLoading = false;

  ngOnInit() {
    // If user is already authenticated, send them to dashboard immediately
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
    }

    // Check if redirect has query params
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('token')) {
      this.isLoading = true;
    }
  }

  onGoogleLogin() {
    this.isLoading = true;
    this.authService.loginWithGoogle();
  }
}
