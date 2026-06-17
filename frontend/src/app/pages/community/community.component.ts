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
    <div class="community-page-container animate-fade-in">
      <!-- Header banner -->
      <header class="community-header animate-slide-up">
        <div class="badge-pill">Community Coming In Version 2</div>
        <h1>Social Accountability & Community-Driven Consistency</h1>
        <p class="subtitle">Version 2 will introduce social features to help you build streaks together.</p>
      </header>

      <!-- Main Layout -->
      <div class="community-layout animate-slide-up animate-stagger-2">
        <div class="roadmap-timeline">
          <h3>Version 2 Roadmap Preview</h3>
          
          <div class="modules-grid">
            <div *ngFor="let mod of modules; let i = index" class="card module-card animate-slide-up" [style.animationDelay.ms]="i * 100 + 100">
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
      width: 100%;
      margin-top: 1rem;
    }

    .modules-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1.5rem;
    }

    .module-card {
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      transition: all var(--transition-normal);
    }
    
    .module-card:hover {
      border-color: var(--border-hover);
      box-shadow: var(--shadow-sm);
      transform: translateY(-2px);
    }

    .module-header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .module-icon {
      color: var(--text-primary);
    }

    .module-card h4 {
      font-size: 1.15rem;
      color: var(--text-primary);
    }

    .module-card p {
      font-size: 0.9rem;
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

    @media (max-width: 900px) {
      .modules-grid {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 768px) {
      .community-page-container {
        padding: 1.5rem 1rem;
        gap: 1.5rem;
      }

      .community-header h1 {
        font-size: 1.4rem;
        line-height: 1.3;
      }

      .community-header .subtitle {
        font-size: 0.875rem;
        margin-top: 0.5rem;
      }

      .community-layout {
        margin-top: 0.5rem;
      }

      .modules-grid {
        grid-template-columns: 1fr;
        gap: 0.875rem;
      }

      .module-card {
        padding: 1.25rem;
      }

      .module-card h4 {
        font-size: 1rem;
      }

      .module-card p {
        font-size: 0.875rem;
      }

      .roadmap-timeline h3 {
        font-size: 1rem;
        margin-bottom: 1rem;
      }
    }
  `]
})
export class CommunityComponent implements OnInit {
  public modules: RoadmapModule[] = [
    {
      title: 'Social Activity Feeds',
      description: 'Follow fellow developers, inspect their grids, and comment on task completion logs. Share daily highlights.',
      badge: 'In Progress',
      badgeClass: 'badge-inprogress',
      iconSvg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg>`
    },
    {
      title: 'Global Consistency Leaderboard',
      description: 'Compete for consistency ranking based on active streak logs. See top-performing creators globally.',
      badge: 'Q3 Launch',
      badgeClass: 'badge-launch',
      iconSvg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg>`
    },
    {
      title: 'Accountability Circles',
      description: 'Form small invite-only groups to track streaks. Receive email reminders or notifications when a member falls behind.',
      badge: 'Planned',
      badgeClass: 'badge-planned',
      iconSvg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`
    },
    {
      title: 'Public Profiles & Following',
      description: 'Build your credibility by maintaining a public profile and letting others follow your progress over time.',
      badge: 'Planned',
      badgeClass: 'badge-planned',
      iconSvg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`
    },
    {
      title: 'Achievement Sharing',
      description: 'Export custom high-resolution PNG snapshots of consistency achievements to share directly to Twitter or GitHub.',
      badge: 'Planned',
      badgeClass: 'badge-planned',
      iconSvg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>`
    },
    {
      title: 'Community Challenges',
      description: 'Join themed challenges like #100DaysOfCode and work together to complete community goals.',
      badge: 'Planned',
      badgeClass: 'badge-planned',
      iconSvg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`
    }
  ];

  ngOnInit() {
    // Component initialization
  }
}
