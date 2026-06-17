import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface RoadmapModule {
  title: string;
  description: string;
  badge: 'Planned' | 'In Progress' | 'Q3 Launch';
  badgeClass: string;
  iconSvg: string;
}

@Component({
  selector: 'app-community',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="community-page-container">
      <!-- Header banner -->
      <header class="community-header">
        <div class="badge-pill">Version 2.0 Roadmap</div>
        <h1>PunchUp Circles & Community</h1>
        <p class="subtitle">Connect with developers, share consistency streaks, and build public accountability.</p>
      </header>

      <!-- Main Layout -->
      <div class="community-layout">
        <!-- Left: Waitlist Form & Success -->
        <div class="card waitlist-card">
          <h3>Join the Waitlist</h3>
          <p class="card-desc">Be the first to know when the community module launches. Early backers receive premium badges on their public profile.</p>
          
          <div class="waitlist-form-container" *ngIf="!isRegistered; else registeredState">
            <form (submit)="onJoinWaitlist()" class="waitlist-form">
              <input 
                type="email" 
                [(ngModel)]="emailInput" 
                name="email" 
                required 
                placeholder="Enter your developer email..." 
                class="email-input" />
              <button type="submit" class="btn btn-primary join-btn">Request Early Access</button>
            </form>
          </div>

          <ng-template #registeredState>
            <div class="success-box animate-scale-up">
              <div class="success-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </div>
              <div class="success-meta">
                <h4>You are on the list!</h4>
                <p>We've reserved your spot. You are <strong>#{{ waitlistNumber }}</strong> in line.</p>
              </div>
            </div>
          </ng-template>

          <!-- Micro statistic mock counters -->
          <div class="stats-row-small">
            <div class="sub-stat">
              <span class="val">2.4k+</span>
              <span class="lbl">Developers waiting</span>
            </div>
            <div class="sub-stat">
              <span class="val">Aug '26</span>
              <span class="lbl">Expected release</span>
            </div>
          </div>
        </div>

        <!-- Right: Feature timeline & Roadmap previews -->
        <div class="roadmap-timeline">
          <h3>Upcoming Community Modules</h3>
          
          <div class="modules-grid">
            <div *ngFor="let mod of modules" class="card module-card">
              <div class="module-header-row">
                <span class="module-icon" [innerHTML]="mod.iconSvg"></span>
                <span [class]="'badge ' + mod.badgeClass">{{ mod.badge }}</span>
              </div>
              <h4>{{ mod.title }}</h4>
              <p>{{ mod.description }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .community-page-container {
      padding: 2.5rem;
      display: flex;
      flex-direction: column;
      gap: 2rem;
      max-width: 1200px;
      margin: 0 auto;
      width: 100%;
    }

    .community-header {
      margin-bottom: 0.5rem;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
    }

    .badge-pill {
      background: var(--surface);
      border: 1px solid var(--border);
      color: var(--text-secondary);
      border-radius: 9999px;
      padding: 0.25rem 0.75rem;
      font-size: 0.75rem;
      font-weight: 500;
      margin-bottom: 1rem;
    }

    .subtitle {
      font-size: 0.9rem;
      color: var(--text-secondary);
      margin-top: 0.25rem;
    }

    /* Layout */
    .community-layout {
      display: grid;
      grid-template-columns: 380px 1fr;
      gap: 1.5rem;
      align-items: start;
    }

    /* Waitlist Card */
    .waitlist-card {
      padding: 2rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .card-desc {
      font-size: 0.8125rem;
      color: var(--text-secondary);
      line-height: 1.5;
    }

    .waitlist-form {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .email-input {
      width: 100%;
    }

    .join-btn {
      width: 100%;
    }

    /* Success Box */
    .success-box {
      background: rgba(16, 185, 129, 0.08);
      border: 1px solid rgba(16, 185, 129, 0.2);
      border-radius: var(--radius);
      padding: 1.25rem;
      display: flex;
      gap: 1rem;
      align-items: flex-start;
    }

    .success-icon {
      background: rgba(16, 185, 129, 0.1);
      border-radius: 50%;
      padding: 0.35rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .success-meta h4 {
      font-size: 0.875rem;
      color: var(--text-primary);
      margin-bottom: 0.25rem;
    }

    .success-meta p {
      font-size: 0.8125rem;
      color: var(--text-secondary);
    }

    .stats-row-small {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      border-top: 1px solid var(--border);
      padding-top: 1.25rem;
      margin-top: 0.5rem;
    }

    .sub-stat {
      display: flex;
      flex-direction: column;
    }

    .sub-stat .val {
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--text-primary);
      font-family: var(--font-display);
    }

    .sub-stat .lbl {
      font-size: 0.6875rem;
      color: var(--text-muted);
      text-transform: uppercase;
      font-weight: 600;
      letter-spacing: 0.03em;
    }

    /* Timeline / Modules */
    .roadmap-timeline {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .modules-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .module-card {
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .module-header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .module-icon {
      color: var(--text-secondary);
    }

    .module-card h4 {
      font-size: 1rem;
      color: var(--text-primary);
    }

    .module-card p {
      font-size: 0.8125rem;
      color: var(--text-secondary);
      line-height: 1.5;
    }

    /* Badges colors */
    .badge-planned {
      background: rgba(113, 113, 122, 0.1);
      color: var(--text-muted);
      border: 1px solid rgba(113, 113, 122, 0.2);
    }

    .badge-inprogress {
      background: rgba(245, 158, 11, 0.1);
      color: var(--warning);
      border: 1px solid rgba(245, 158, 11, 0.2);
    }

    .badge-launch {
      background: rgba(16, 185, 129, 0.1);
      color: var(--success);
      border: 1px solid rgba(16, 185, 129, 0.2);
    }

    @media (max-width: 1024px) {
      .community-layout {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class CommunityComponent implements OnInit {
  public emailInput = '';
  public isRegistered = false;
  public waitlistNumber = 0;

  public modules: RoadmapModule[] = [
    {
      title: 'Social Activity Feeds',
      description: 'Follow fellow developers, inspect their grids, and comment on task completion logs. Share daily highlights.',
      badge: 'In Progress',
      badgeClass: 'badge-inprogress',
      iconSvg: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg>`
    },
    {
      title: 'Global Consistency Leaderboard',
      description: 'Compete for consistency ranking based on active streak logs. See top-performing creators globally.',
      badge: 'Q3 Launch',
      badgeClass: 'badge-launch',
      iconSvg: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg>`
    },
    {
      title: 'Achievement Portals',
      description: 'Export custom high-resolution PNG snapshots of consistency achievements to share directly to Twitter or GitHub.',
      badge: 'Planned',
      badgeClass: 'badge-planned',
      iconSvg: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>`
    },
    {
      title: 'Accountability Circles',
      description: 'Form small invite-only groups to track streaks. Receive email reminders or notifications when a member falls behind.',
      badge: 'Planned',
      badgeClass: 'badge-planned',
      iconSvg: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`
    }
  ];

  ngOnInit() {
    const cachedEmail = localStorage.getItem('waitlist_registered_email');
    const cachedNumber = localStorage.getItem('waitlist_registered_number');
    
    if (cachedEmail && cachedNumber) {
      this.isRegistered = true;
      this.waitlistNumber = Number(cachedNumber);
    }
  }

  onJoinWaitlist() {
    if (!this.emailInput) return;

    // Generate random waitlist index for visual fidelity
    const listIndex = 1450 + Math.floor(Math.random() * 320);
    this.waitlistNumber = listIndex;
    
    localStorage.setItem('waitlist_registered_email', this.emailInput);
    localStorage.setItem('waitlist_registered_number', String(listIndex));
    this.isRegistered = true;
  }
}
