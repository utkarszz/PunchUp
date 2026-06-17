import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="landing-container">
      <!-- Nav Header -->
      <header class="landing-header animate-fade-in animate-stagger-1">
        <div class="logo">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" stroke="var(--text-primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
          </svg>
          <span class="logo-text">PunchUp</span>
        </div>
        <div class="header-actions">
          <ng-container *ngIf="!authService.isAuthenticated()">
            <button (click)="login()" class="btn btn-secondary btn-sm">Sign In</button>
            <button (click)="login()" class="btn btn-primary btn-sm">Get Started</button>
          </ng-container>
          <ng-container *ngIf="authService.isAuthenticated()">
            <a routerLink="/dashboard" class="btn btn-primary btn-sm">Dashboard</a>
          </ng-container>
        </div>
      </header>

      <!-- Hero Section -->
      <section class="hero-section">
        <div class="badge-pill animate-slide-up animate-stagger-2">PunchUp Public Beta</div>
        <h1 class="hero-title animate-slide-up animate-stagger-3">Consistency <span class="highlight">compounds</span>.</h1>
        <p class="hero-subtitle animate-slide-up animate-stagger-4">
          Build streaks.<br>
          Track meaningful work.<br>
          Create momentum every day.
        </p>
        <div class="cta-group animate-slide-up animate-stagger-4">
          <ng-container *ngIf="!authService.isAuthenticated()">
            <button (click)="login()" class="btn btn-primary btn-lg">Continue With Google</button>
          </ng-container>
          <ng-container *ngIf="authService.isAuthenticated()">
            <a routerLink="/dashboard" class="btn btn-primary btn-lg">Start Building Momentum</a>
          </ng-container>
          <a href="#features" class="btn btn-secondary btn-lg">Explore Features</a>
        </div>
      </section>

      <!-- Consistency Grid Showcase -->
      <section id="features" class="showcase-section">
        <div class="showcase-grid-card card">
          <div class="card-header">
            <h3>Consistency Grid</h3>
            <p>Every single day of work matters. Color intensity shifts dynamically based on completed items.</p>
          </div>
          <div class="grid-preview">
            <div class="grid-days">
              <span class="day-label">Mon</span>
              <span class="day-label">Wed</span>
              <span class="day-label">Fri</span>
            </div>
            <div class="grid-cells-row">
              <div *ngFor="let cell of mockGrid" 
                   [class]="'grid-cell intensity-' + cell.intensity"
                   [title]="cell.date + ': ' + cell.tasks + ' tasks completed'"></div>
            </div>
          </div>
          <div class="grid-legend">
            <span>Less</span>
            <div class="grid-cell intensity-0"></div>
            <div class="grid-cell intensity-1"></div>
            <div class="grid-cell intensity-2"></div>
            <div class="grid-cell intensity-3"></div>
            <span>More</span>
          </div>
        </div>
      </section>

      <!-- Twin Feature Grid -->
      <section class="features-grid-section">
        <div class="features-grid">
          <!-- Feature 1: Analytics -->
          <div class="card feature-card">
            <div class="feature-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
            </div>
            <h4>Detailed Analytics</h4>
            <p>Gain actionable insights on task completion rates, categories distribution, and streak lengths. Monitor your output weekly and monthly.</p>
          </div>

          <!-- Feature 2: Public Showcases -->
          <div class="card feature-card">
            <div class="feature-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
            </div>
            <h4>Public Profiles</h4>
            <p>Share your achievements, current streak records, and consistency grids via shareable public paths. Build credibility and accountability.</p>
          </div>
        </div>
      </section>

      <!-- Target Audience -->
      <section class="target-audience-section animate-slide-up">
        <h2>Who is PunchUp for?</h2>
        <div class="audience-grid">
          <div class="audience-item">Developers</div>
          <div class="audience-item">Students</div>
          <div class="audience-item">Creators</div>
          <div class="audience-item">Founders</div>
          <div class="audience-item">Anyone building habits</div>
        </div>
      </section>

      <!-- CTA Banner -->
      <section class="cta-banner animate-slide-up">
        <div class="cta-card card">
          <h2>Ready to hold yourself accountable?</h2>
          <p>Join developers and creators worldwide building consistency, one day at a time.</p>
          <ng-container *ngIf="!authService.isAuthenticated()">
            <button (click)="login()" class="btn btn-primary">Show Up Today</button>
          </ng-container>
          <ng-container *ngIf="authService.isAuthenticated()">
            <a routerLink="/dashboard" class="btn btn-primary">Show Up Today</a>
          </ng-container>
        </div>
      </section>

      <!-- Feedback & Contact Sections -->
      <section class="bottom-sections animate-slide-up">
        
        <!-- Built By Card -->
        <div class="contact-card card">
          <h3>Built By Utkarsh Singh</h3>
          <p class="contact-desc">Creator and Lead Developer of PunchUp.</p>
          <div class="contact-links">
            <a href="https://github.com/utkarszz" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm">GitHub</a>
            <a href="https://www.linkedin.com/in/utkarsh-singh-6a560037a/" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm">LinkedIn</a>
            <a href="mailto:utkarzz1705@gmail.com" class="btn btn-secondary btn-sm">Email</a>
          </div>
        </div>

        <!-- Feedback Card -->
        <div class="feedback-card card">
          <h3>Help Improve PunchUp</h3>
          <p class="feedback-desc">Found a bug? Have a feature idea? Want to suggest improvements?</p>
          <a href="mailto:utkarzz1705@gmail.com?subject=PunchUp Feedback" class="btn btn-primary btn-sm">Send Feedback</a>
        </div>

      </section>

      <!-- Footer -->
      <footer class="landing-footer">
        <span>&copy; 2026 PunchUp. Ready for production.</span>
      </footer>
    </div>
  `,
  styles: [`
    .landing-container {
      background-color: var(--background);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 0 1.5rem;
    }

    .landing-header {
      width: 100%;
      max-width: 1200px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.5rem 0;
      border-bottom: 1px solid var(--border);
    }

    .logo {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-family: var(--font-display);
      font-weight: 700;
      font-size: 1.25rem;
    }

    .logo-text {
      color: var(--text-primary);
    }

    .header-actions {
      display: flex;
      gap: 0.75rem;
    }

    .btn-sm {
      padding: 0.4rem 0.8rem;
      font-size: 0.8125rem;
    }

    .hero-section {
      width: 100%;
      max-width: 800px;
      text-align: center;
      padding: 6rem 0 4rem 0;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .badge-pill {
      background: var(--surface);
      border: 1px solid var(--border);
      color: var(--text-secondary);
      border-radius: 9999px;
      padding: 0.35rem 0.85rem;
      font-size: 0.75rem;
      font-weight: 500;
      margin-bottom: 1.5rem;
    }

    .hero-title {
      font-size: 3.5rem;
      font-weight: 700;
      line-height: 1.1;
      margin-bottom: 1.25rem;
      letter-spacing: -0.04em;
    }

    .hero-title .highlight {
      color: var(--accent);
    }

    .hero-subtitle {
      font-size: 1.125rem;
      max-width: 600px;
      margin-bottom: 2rem;
      line-height: 1.6;
    }

    .cta-group {
      display: flex;
      gap: 1rem;
    }

    .btn-lg {
      padding: 0.85rem 1.75rem;
      font-size: 0.95rem;
    }

    .showcase-section {
      width: 100%;
      max-width: 1000px;
      margin-bottom: 4rem;
    }

    .showcase-grid-card {
      padding: 2.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      align-items: center;
      text-align: center;
    }

    .showcase-grid-card h3 {
      font-size: 1.5rem;
      margin-bottom: 0.5rem;
    }

    .showcase-grid-card p {
      font-size: 0.9rem;
      max-width: 500px;
    }

    .grid-preview {
      display: flex;
      gap: 0.5rem;
      align-items: center;
      padding: 1.5rem;
      background: rgba(9, 9, 11, 0.5);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      width: 100%;
      overflow-x: auto;
    }

    .grid-days {
      display: flex;
      flex-direction: column;
      gap: 10px;
      justify-content: space-between;
      font-size: 0.65rem;
      color: var(--text-muted);
    }

    .day-label {
      height: 12px;
      line-height: 12px;
    }

    .grid-cells-row {
      display: grid;
      grid-template-flow: column;
      grid-template-rows: repeat(7, 12px);
      grid-auto-flow: column;
      gap: 3px;
    }

    .grid-cell {
      width: 12px;
      height: 12px;
      border-radius: 2px;
      background-color: var(--grid-intensity-0);
      transition: background-color 0.25s ease;
    }

    .grid-cell.intensity-0 { background-color: var(--grid-intensity-0); }
    .grid-cell.intensity-1 { background-color: var(--grid-intensity-1); }
    .grid-cell.intensity-2 { background-color: var(--grid-intensity-2); }
    .grid-cell.intensity-3 { background-color: var(--grid-intensity-3); }

    .grid-legend {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .grid-legend .grid-cell {
      cursor: default;
    }

    .features-grid-section {
      width: 100%;
      max-width: 1000px;
      margin-bottom: 4rem;
    }

    .features-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
    }

    .feature-card {
      padding: 2rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .feature-icon {
      color: var(--text-primary);
      margin-bottom: 0.5rem;
    }

    .feature-card h4 {
      font-size: 1.15rem;
    }

    .feature-card p {
      font-size: 0.875rem;
      line-height: 1.5;
    }

    .cta-banner {
      width: 100%;
      max-width: 1000px;
      margin-bottom: 6rem;
    }

    .cta-card {
      text-align: center;
      padding: 3rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      background: radial-gradient(circle at top, rgba(199, 199, 204, 0.04), transparent);
    }

    .cta-card h2 {
      font-size: 1.85rem;
    }

    .cta-card p {
      font-size: 0.95rem;
      max-width: 500px;
      margin-bottom: 0.5rem;
    }

    .landing-footer {
      width: 100%;
      max-width: 1200px;
      padding: 2rem 0;
      border-top: 1px solid var(--border);
      text-align: center;
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-top: auto;
    }

    .target-audience-section {
      width: 100%;
      max-width: 1000px;
      margin-bottom: 6rem;
      text-align: center;
    }

    .target-audience-section h2 {
      font-size: 1.5rem;
      margin-bottom: 2rem;
      color: var(--text-primary);
    }

    .audience-grid {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 1rem;
    }

    .audience-item {
      padding: 0.75rem 1.5rem;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      font-size: 0.9rem;
      color: var(--text-secondary);
      transition: all var(--transition-normal);
    }

    .audience-item:hover {
      border-color: var(--border-hover);
      color: var(--text-primary);
      box-shadow: var(--shadow-sm);
      transform: translateY(-2px);
    }

    .bottom-sections {
      width: 100%;
      max-width: 1000px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
      margin-bottom: 4rem;
    }

    .contact-card, .feedback-card {
      padding: 2.5rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 1rem;
      transition: all var(--transition-normal);
    }

    .contact-card:hover, .feedback-card:hover {
      border-color: var(--border-hover);
      box-shadow: var(--shadow-sm);
      transform: translateY(-2px);
    }

    .contact-card h3, .feedback-card h3 {
      font-size: 1.25rem;
      color: var(--text-primary);
    }

    .contact-desc, .feedback-desc {
      font-size: 0.875rem;
      color: var(--text-secondary);
      line-height: 1.5;
    }

    .contact-links {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 0.75rem;
      margin-top: 0.5rem;
    }

    /* Responsiveness */
    @media (max-width: 768px) {
      .hero-title {
        font-size: 2.5rem;
      }
      .features-grid {
        grid-template-columns: 1fr;
      }
      .bottom-sections {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class LandingComponent {
  public authService = inject(AuthService);
  public mockGrid: { date: string; tasks: number; intensity: number }[] = [];

  constructor() {
    this.generateMockGrid();
  }

  private generateMockGrid() {
    // Generate 7 rows * 20 columns = 140 cells
    const intensities = [0, 0, 1, 0, 2, 0, 1, 3, 0, 2, 1, 0, 0, 2, 3, 1, 0, 0, 1];
    for (let i = 0; i < 140; i++) {
      const intensity = intensities[i % intensities.length];
      this.mockGrid.push({
        date: `2026-06-${(i % 30) + 1}`,
        tasks: intensity === 0 ? 0 : intensity === 1 ? 1 : intensity === 2 ? 4 : 8,
        intensity
      });
    }
  }

  public login(): void {
    this.authService.loginWithGoogle();
  }
}

