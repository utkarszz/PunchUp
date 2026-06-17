import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service'; 

@Component({
  selector: 'app-auth-callback',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="callback-container">
      <div class="loader">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2v4"></path>
          <path d="M12 18v4"></path>
          <path d="M4.93 4.93l2.83 2.83"></path>
          <path d="M16.24 16.24l2.83 2.83"></path>
          <path d="M2 12h4"></path>
          <path d="M18 12h4"></path>
          <path d="M4.93 19.07l2.83-2.83"></path>
          <path d="M16.24 7.76l2.83-2.83"></path>
        </svg>
      </div>
      <h2>Authenticating...</h2>
      <p>Please wait while we log you in.</p>
    </div>
  `,
  styles: [`
    .callback-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background-color: var(--background);
      color: var(--text-primary);
      text-align: center;
    }
    
    .loader {
      margin-bottom: 2rem;
      animation: spin 2s linear infinite;
      color: var(--accent);
    }
    
    h2 {
      font-size: 1.5rem;
      margin-bottom: 0.5rem;
    }
    
    p {
      color: var(--text-secondary);
      font-size: 0.875rem;
    }
    
    @keyframes spin {
      100% {
        transform: rotate(360deg);
      }
    }
  `]
})
export class AuthCallbackComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);

  ngOnInit() {
    this.route.queryParams.subscribe((params: any) => {
      const token = params['token'];
      if (token) {
        this.authService.handleOAuthCallback(token).subscribe({
          error: () => {
            console.error('Authentication failed during callback');
            this.router.navigate(['/login']);
          }
        });
      } else {
        console.warn('No token found in callback URL');
        this.router.navigate(['/login']);
      }
    });
  }
}
