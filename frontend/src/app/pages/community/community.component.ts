import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface FeaturePreview {
  title: string;
  description: string;
  icon: string;
  tag: string;
}

@Component({
  selector: 'app-community',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="community-page-container animate-fade-in">
      <!-- Premium coming soon banner -->
      <header class="community-header animate-slide-up">
        <div class="coming-soon-pill">COMING SOON</div>
        <h1 class="coming-soon-title">Community launches in <span class="highlight">Version 2</span></h1>
        <p class="subtitle">Social accountability meets daily consistency. We are building features to help you commit, grow, and protect streaks together.</p>
      </header>

      <!-- Preview Cards Grid -->
      <div class="previews-grid animate-slide-up animate-stagger-2">
        <div *ngFor="let feat of previewFeatures" class="card preview-card">
          <div class="preview-header-row">
            <span class="preview-icon">
              <ng-container [ngSwitch]="feat.icon">
                <svg *ngSwitchCase="'Team'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                <svg *ngSwitchCase="'Activity'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
                <svg *ngSwitchCase="'Chat'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                <svg *ngSwitchCase="'Achievements'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 .55-.45 1-1 1H4v2h16v-2h-5c-.55 0-1-.45-1-1v-2.34"></path><path d="M12 2a6 6 0 0 1 6 6v4H6V8a6 6 0 0 1 6-6z"></path></svg>
              </ng-container>
            </span>
            <span class="v2-tag">{{ feat.tag }}</span>
          </div>
          <h3>{{ feat.title }}</h3>
          <p>{{ feat.description }}</p>
        </div>
      </div>

      <!-- Interest Section -->
      <section class="interest-section card animate-slide-up animate-stagger-3">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" style="color: var(--text-primary);">
          <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
        </svg>
        <h3>Follow Utkarsh on LinkedIn</h3>
        <p>Follow my LinkedIn to get updates about Version 2.</p>
        <a href="https://www.linkedin.com/in/utkarsh-singh-6a560037a/" target="_blank" class="btn btn-primary" style="margin-top: 0.5rem; gap: 0.75rem;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
          <span>Follow on LinkedIn</span>
        </a>
      </section>
    </div>
  `,
  styles: [`
    .community-page-container {
      padding: 2.5rem;
      display: flex;
      flex-direction: column;
      gap: 2.5rem;
      max-width: 1000px;
      margin: 0 auto;
      width: 100%;
    }

    .community-header {
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .coming-soon-pill {
      background: rgba(199, 199, 204, 0.04);
      border: 1px solid var(--border);
      color: var(--text-secondary);
      border-radius: 9999px;
      padding: 0.25rem 0.85rem;
      font-size: 0.7rem;
      font-weight: 600;
      letter-spacing: 0.08em;
      margin-bottom: 1.25rem;
      box-shadow: var(--glow-silver-sm);
    }

    .coming-soon-title {
      font-size: 2.5rem;
      font-weight: 700;
      margin-bottom: 0.75rem;
      letter-spacing: -0.03em;
    }

    .coming-soon-title .highlight {
      color: var(--text-primary);
      text-shadow: 0 0 24px rgba(199, 199, 204, 0.2);
    }

    .subtitle {
      font-size: 1rem;
      color: var(--text-secondary);
      max-width: 600px;
      line-height: 1.6;
    }

    /* Grid layout */
    .previews-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1.5rem;
    }

    .preview-card {
      padding: 1.75rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      text-align: left;
    }

    .preview-header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .preview-icon {
      color: var(--text-primary);
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .v2-tag {
      font-size: 0.65rem;
      font-weight: 600;
      color: var(--text-secondary);
      border: 1px solid var(--border);
      padding: 0.15rem 0.5rem;
      border-radius: 4px;
      background: rgba(255,255,255,0.02);
    }

    .preview-card h3 {
      font-size: 1.25rem;
      color: var(--text-primary);
    }

    .preview-card p {
      font-size: 0.9rem;
      color: var(--text-secondary);
      line-height: 1.6;
    }

    /* Interest/Subscribe card */
    .interest-section {
      text-align: center;
      padding: 3rem 2rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      background: radial-gradient(circle at top, rgba(199, 199, 204, 0.04), transparent 80%);
    }

    .interest-section h3 {
      font-size: 1.5rem;
    }

    .interest-section p {
      font-size: 0.95rem;
      color: var(--text-secondary);
      max-width: 500px;
    }

    .subscribe-form {
      display: flex;
      gap: 0.75rem;
      width: 100%;
      max-width: 460px;
      margin-top: 0.5rem;
    }

    .subscribe-form input {
      flex: 1;
    }

    .subscribe-form button {
      flex-shrink: 0;
    }

    .success-msg {
      font-size: 0.8125rem;
      color: var(--success) !important;
      margin-top: 0.25rem;
    }

    @media (max-width: 768px) {
      .community-page-container {
        padding: 1.25rem 1rem;
        padding-bottom: calc(var(--mobile-nav-height) + 1.25rem);
        gap: 1.5rem;
      }

      .coming-soon-title {
        font-size: 1.85rem;
      }

      .subtitle {
        font-size: 0.9rem;
      }

      .previews-grid {
        grid-template-columns: 1fr;
        gap: 1rem;
      }

      .interest-section {
        padding: 2rem 1.25rem;
      }

      .interest-section h3 {
        font-size: 1.25rem;
      }
    }

    @media (max-width: 480px) {
      .community-page-container {
        padding: 1rem 0.875rem;
        padding-bottom: calc(var(--mobile-nav-height) + 1rem);
        gap: 1.25rem;
      }

      .coming-soon-title {
        font-size: 1.5rem;
      }

      .coming-soon-pill {
        font-size: 0.65rem;
      }

      .subtitle {
        font-size: 0.875rem;
      }

      .preview-card {
        padding: 1.25rem;
        gap: 0.75rem;
      }

      .preview-card h3 {
        font-size: 1.1rem;
      }

      .preview-card p {
        font-size: 0.8125rem;
      }

      .interest-section {
        padding: 1.75rem 1rem;
        gap: 0.875rem;
      }

      .interest-section h3 {
        font-size: 1.125rem;
      }

      .interest-section p {
        font-size: 0.875rem;
      }
    }

    @media (max-width: 360px) {
      .community-page-container {
        padding: 0.875rem 0.75rem;
        padding-bottom: calc(var(--mobile-nav-height) + 0.875rem);
      }

      .coming-soon-title {
        font-size: 1.375rem;
      }

      .preview-card {
        padding: 1rem;
      }

      .interest-section {
        padding: 1.5rem 0.875rem;
      }
    }
  `]

})
export class CommunityComponent implements OnInit {
  public subscriberEmail = '';
  public subscribed = false;

  public previewFeatures: FeaturePreview[] = [
    {
      title: 'Public Progress Sharing',
      description: 'Host your commitment online. Share a personalized profile listing your recent activity grids, active streaks, and all-time records.',
      icon: 'Team',
      tag: 'V2 Preview'
    },
    {
      title: 'Activity Feed',
      description: 'Interact with peers and check up on mutual streaks. Receive clean updates when someone finishes milestones or commits code.',
      icon: 'Activity',
      tag: 'V2 Preview'
    },
    {
      title: 'User Interactions',
      description: 'Engage, support, and discuss tasks together. Write short encouraging comments or reactions directly on verified daily completed logs.',
      icon: 'Chat',
      tag: 'V2 Preview'
    },
    {
      title: 'Achievement Sharing',
      description: 'Generate beautiful high-resolution image snapshots of your consistency grid to export directly to Twitter/X, GitHub, or LinkedIn.',
      icon: 'Achievements',
      tag: 'V2 Preview'
    }
  ];

  ngOnInit() {
    // Component initialized
  }

  public onSubscribe() {
    if (!this.subscriberEmail || !this.subscriberEmail.includes('@')) return;
    this.subscribed = true;
    this.subscriberEmail = '';
    setTimeout(() => {
      this.subscribed = false;
    }, 4000);
  }
}
