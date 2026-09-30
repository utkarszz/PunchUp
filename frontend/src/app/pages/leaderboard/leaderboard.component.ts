import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LeaderboardService, LeaderboardEntry } from '../../core/services/leaderboard.service';
import { AuthService } from '../../core/services/auth.service';
import { LeagueBadgeComponent, LEAGUES } from '../../shared/components/league-badge/league-badge.component';

@Component({
  selector: 'app-leaderboard',
  standalone: true,
  imports: [CommonModule, RouterLink, LeagueBadgeComponent],
  template: `
    <div class="leaderboard-container animate-fade-in">
      <!-- Header -->
      <header class="leaderboard-header">
        <div>
          <h1>Leaderboard</h1>
          <p class="subtitle">Rankings based on consistency, productivity, and league status.</p>
        </div>
      </header>

      <!-- Main Navigation Tabs -->
      <div class="leaderboard-tabs" role="tablist">
        <button
          class="tab-btn"
          [class.active]="activeTab === 'weekly'"
          (click)="switchTab('weekly')"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          <span>This Week</span>
        </button>

        <button
          class="tab-btn"
          [class.active]="activeTab === 'overall'"
          (click)="switchTab('overall')"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="8" r="7"></circle>
            <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline>
          </svg>
          <span>Overall</span>
        </button>

        <button
          class="tab-btn"
          [class.active]="activeTab === 'league'"
          (click)="switchTab('league')"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
          </svg>
          <span>By League</span>
        </button>
      </div>

      <!-- League Sub-Selector (when on 'league' tab) -->
      <div class="league-selector-wrap" *ngIf="activeTab === 'league'">
        <div class="league-pills">
          <button
            *ngFor="let l of allLeagues"
            class="league-pill-btn"
            [class.active]="selectedLeague === l.name"
            (click)="selectLeague(l.name)"
          >
            <app-league-badge [league]="l.name"></app-league-badge>
          </button>
        </div>
      </div>

      <!-- Description Banner -->
      <div class="info-banner" *ngIf="activeTab === 'weekly'">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="16" x2="12" y2="12"></line>
          <line x1="12" y1="8" x2="12.01" y2="8"></line>
        </svg>
        <span>Points earned since Monday 00:00 UTC. Weekly leaderboard resets every week while preserving lifetime points.</span>
      </div>

      <!-- Loading State -->
      <div class="card loading-card" *ngIf="isLoading">
        <div class="spinner"></div>
        <p>Loading rankings...</p>
      </div>

      <!-- Empty State -->
      <div class="card empty-card" *ngIf="!isLoading && entries.length === 0">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="8" r="7"></circle>
          <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline>
        </svg>
        <h3>No rankings yet</h3>
        <p>Complete workspace tasks to earn points and climb the ranks!</p>
      </div>

      <!-- Leaderboard List -->
      <div class="leaderboard-list" *ngIf="!isLoading && entries.length > 0">
        <div
          *ngFor="let item of entries"
          class="card rank-card animate-slide-up"
          [class.current-user-card]="item.username === currentUsername"
          [class.top-one]="item.rank === 1"
          [class.top-two]="item.rank === 2"
          [class.top-three]="item.rank === 3"
        >
          <!-- Rank Number or Trophy -->
          <div class="rank-badge-col">
            <span class="rank-num" *ngIf="item.rank > 3">#{{ item.rank }}</span>
            <div class="trophy-badge" *ngIf="item.rank <= 3" [class]="'trophy-' + item.rank">
              <span class="trophy-icon" *ngIf="item.rank === 1">🥇</span>
              <span class="trophy-icon" *ngIf="item.rank === 2">🥈</span>
              <span class="trophy-icon" *ngIf="item.rank === 3">🥉</span>
              <span class="trophy-rank">#{{ item.rank }}</span>
            </div>
          </div>

          <!-- User Info -->
          <a [routerLink]="['/user', item.username]" class="user-info-col">
            <img
              [src]="item.profilePicture || 'assets/default-avatar.png'"
              [alt]="item.username"
              class="user-avatar"
              onerror="this.src='https://api.dicebear.com/7.x/bottts/svg?seed=user'"
            />
            <div class="user-names">
              <div class="name-badge-row">
                <span class="display-name">{{ item.displayName || item.username }}</span>
                <app-league-badge [league]="item.league"></app-league-badge>
              </div>
              <span class="username-handle">&#64;{{ item.username }}</span>
            </div>
          </a>

          <!-- Points Display -->
          <div class="points-col">
            <span class="points-value">
              {{ activeTab === 'weekly' ? (item.weeklyPoints || 0) : item.totalPoints }}
            </span>
            <span class="points-label">
              {{ activeTab === 'weekly' ? 'pts this week' : 'pts lifetime' }}
            </span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .leaderboard-container {
      padding: 2.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.75rem;
      max-width: 1000px;
      margin: 0 auto;
      width: 100%;
    }

    .leaderboard-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .subtitle {
      font-size: 0.9rem;
      color: var(--text-secondary);
      margin-top: 0.25rem;
    }

    /* Tabs */
    .leaderboard-tabs {
      display: flex;
      gap: 0.5rem;
      border-bottom: 1px solid var(--border);
      padding-bottom: 0.75rem;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }

    .tab-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: transparent;
      border: 1px solid transparent;
      color: var(--text-secondary);
      cursor: pointer;
      font-size: 0.875rem;
      font-weight: 500;
      padding: 0.6rem 1rem;
      border-radius: var(--radius);
      transition: all 0.15s ease;
      white-space: nowrap;
    }

    .tab-btn:hover {
      color: var(--text-primary);
      background: var(--surface-hover);
    }

    .tab-btn.active {
      color: var(--text-primary);
      background: var(--surface-elevated);
      border-color: var(--border);
      font-weight: 600;
    }

    /* League Sub-Selector */
    .league-selector-wrap {
      overflow-x: auto;
      padding-bottom: 0.25rem;
    }

    .league-pills {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .league-pill-btn {
      background: transparent;
      border: 1px solid var(--border);
      border-radius: 999px;
      padding: 0.35rem 0.65rem;
      cursor: pointer;
      transition: all 0.15s ease;
      display: inline-flex;
      align-items: center;
    }

    .league-pill-btn:hover {
      background: var(--surface-hover);
      border-color: var(--border-hover);
    }

    .league-pill-btn.active {
      background: var(--surface-elevated);
      border-color: var(--accent);
      box-shadow: 0 0 10px rgba(199, 199, 204, 0.15);
    }

    /* Info Banner */
    .info-banner {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      padding: 0.75rem 1rem;
      background: rgba(199, 199, 204, 0.05);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      font-size: 0.8125rem;
      color: var(--text-secondary);
    }

    .info-banner svg {
      flex-shrink: 0;
      color: var(--text-muted);
    }

    /* Leaderboard List */
    .leaderboard-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .rank-card {
      display: flex;
      align-items: center;
      padding: 1rem 1.5rem;
      gap: 1.25rem;
      transition: all 0.2s ease;
    }

    .rank-card:hover {
      transform: translateY(-1px);
    }

    .rank-card.current-user-card {
      border-color: rgba(199, 199, 204, 0.35);
      background: rgba(199, 199, 204, 0.04);
    }

    /* Top 3 Glow */
    .rank-card.top-one {
      border-color: rgba(234, 179, 8, 0.35);
      background: linear-gradient(90deg, rgba(234, 179, 8, 0.05) 0%, var(--surface) 100%);
    }

    .rank-card.top-two {
      border-color: rgba(203, 213, 225, 0.3);
      background: linear-gradient(90deg, rgba(203, 213, 225, 0.04) 0%, var(--surface) 100%);
    }

    .rank-card.top-three {
      border-color: rgba(217, 119, 6, 0.3);
      background: linear-gradient(90deg, rgba(217, 119, 6, 0.04) 0%, var(--surface) 100%);
    }

    /* Rank Badge Col */
    .rank-badge-col {
      width: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .rank-num {
      font-family: var(--font-display);
      font-size: 1rem;
      font-weight: 700;
      color: var(--text-muted);
    }

    .trophy-badge {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      line-height: 1;
      gap: 2px;
    }

    .trophy-icon {
      font-size: 1.25rem;
    }

    .trophy-rank {
      font-size: 0.65rem;
      font-weight: 700;
      color: var(--text-secondary);
    }

    /* User Info Col */
    .user-info-col {
      display: flex;
      align-items: center;
      gap: 0.875rem;
      flex: 1;
      min-width: 0;
      text-decoration: none;
    }

    .user-avatar {
      width: 42px;
      height: 42px;
      border-radius: 50%;
      border: 1px solid var(--border-hover);
      object-fit: cover;
      flex-shrink: 0;
    }

    .user-names {
      display: flex;
      flex-direction: column;
      min-width: 0;
      gap: 0.15rem;
    }

    .name-badge-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .display-name {
      font-size: 0.95rem;
      font-weight: 600;
      color: var(--text-primary);
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;
    }

    .username-handle {
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    /* Points Col */
    .points-col {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      flex-shrink: 0;
      text-align: right;
    }

    .points-value {
      font-family: var(--font-display);
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--text-primary);
      line-height: 1.2;
    }

    .points-label {
      font-size: 0.6875rem;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    /* Loading and Empty */
    .loading-card, .empty-card {
      padding: 4rem 2rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      text-align: center;
      color: var(--text-muted);
    }

    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid var(--border);
      border-top-color: var(--accent);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Responsive */
    @media (max-width: 768px) {
      .leaderboard-container {
        padding: 1.25rem 1rem;
        padding-bottom: calc(var(--mobile-nav-height) + 1.25rem);
        gap: 1.25rem;
      }

      .rank-card {
        padding: 0.875rem 1rem;
        gap: 0.875rem;
      }

      .rank-badge-col {
        width: 36px;
      }

      .user-avatar {
        width: 36px;
        height: 36px;
      }

      .points-value {
        font-size: 1.1rem;
      }
    }

    @media (max-width: 480px) {
      .leaderboard-container {
        padding: 1rem 0.75rem;
        padding-bottom: calc(var(--mobile-nav-height) + 1rem);
        gap: 1rem;
      }

      .rank-card {
        padding: 0.75rem 0.75rem;
        gap: 0.65rem;
      }

      .display-name {
        font-size: 0.875rem;
      }

      .points-value {
        font-size: 1rem;
      }

      .points-label {
        font-size: 0.625rem;
      }
    }

    @media (max-width: 320px) {
      .rank-badge-col {
        width: 28px;
      }

      .user-avatar {
        width: 30px;
        height: 30px;
      }

      .rank-card {
        padding: 0.625rem 0.5rem;
      }
    }
  `]
})
export class LeaderboardComponent implements OnInit {
  private leaderboardService = inject(LeaderboardService);
  private authService = inject(AuthService);

  public activeTab: 'weekly' | 'overall' | 'league' = 'weekly';
  public selectedLeague = 'Gold';
  public allLeagues = LEAGUES;
  public entries: LeaderboardEntry[] = [];
  public isLoading = false;
  public currentUsername = '';

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.currentUsername = user.username;
        // Default league tab to user's current league if available
        if (user.totalPoints !== undefined) {
          const userLeague = this.getLeagueForPoints(user.totalPoints);
          this.selectedLeague = userLeague;
        }
      }
    });

    this.loadLeaderboard();
  }

  public switchTab(tab: 'weekly' | 'overall' | 'league') {
    this.activeTab = tab;
    this.loadLeaderboard();
  }

  public selectLeague(league: string) {
    this.selectedLeague = league;
    this.loadLeaderboard();
  }

  private loadLeaderboard() {
    this.isLoading = true;

    if (this.activeTab === 'weekly') {
      this.leaderboardService.getWeeklyLeaderboard().subscribe({
        next: (res) => {
          this.entries = res.leaderboard || [];
          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
        }
      });
    } else if (this.activeTab === 'overall') {
      this.leaderboardService.getOverallLeaderboard().subscribe({
        next: (res) => {
          this.entries = res.leaderboard || [];
          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
        }
      });
    } else if (this.activeTab === 'league') {
      this.leaderboardService.getLeagueLeaderboard(this.selectedLeague).subscribe({
        next: (res) => {
          this.entries = res.leaderboard || [];
          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
        }
      });
    }
  }

  private getLeagueForPoints(points: number): string {
    for (let i = LEAGUES.length - 1; i >= 0; i--) {
      if (points >= LEAGUES[i].min) return LEAGUES[i].name;
    }
    return 'Rookie';
  }
}
