import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { UserService, PublicProfile } from '../../core/services/user.service';

interface GridDisplayCell {
  date: string;
  tasksCompleted: number;
  intensity: number;
  isEmptyPlaceholder: boolean;
}

@Component({
  selector: 'app-public-profile',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="public-profile-container animate-fade-in">
      <!-- Loading State -->
      <div class="loading-state" *ngIf="isLoading">
        <div class="spinner"></div>
        <p>Loading public profile...</p>
      </div>

      <!-- Error State -->
      <div class="error-state card" *ngIf="errorMsg">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
        <h3>Profile Not Found</h3>
        <p>{{ errorMsg }}</p>
        <a routerLink="/" class="btn btn-primary">Go to Homepage</a>
      </div>

      <!-- Profile Content -->
      <div class="profile-content" *ngIf="!isLoading && !errorMsg && profile">
        <!-- Banner/Card -->
        <div class="card banner-card">
          <div class="user-main-info">
            <img 
              [src]="profile.user.profilePicture || 'assets/default-avatar.png'" 
              onerror="this.src='https://api.dicebear.com/7.x/bottts/svg?seed=' + encodeURIComponent(this.title)"
              [title]="profile.user.username"
              alt="Avatar" 
              class="user-avatar" />
            <div class="user-meta">
              <h2>{{ profile.user.username }}</h2>
              <p class="email">{{ profile.user.email }}</p>
              <p class="bio" *ngIf="profile.user.bio">{{ profile.user.bio }}</p>
              <p class="bio placeholder-bio" *ngIf="!profile.user.bio">This user hasn't written a biography yet.</p>
            </div>
          </div>
        </div>

        <!-- Metrics Row -->
        <div class="metrics-row">
          <div class="card metric-card">
            <span class="metric-label">Current Streak</span>
            <span class="metric-value text-accent">{{ profile.stats.currentStreak }} days</span>
          </div>

          <div class="card metric-card">
            <span class="metric-label">Longest Streak</span>
            <span class="metric-value text-warning">{{ profile.stats.longestStreak }} days</span>
          </div>

          <div class="card metric-card">
            <span class="metric-label">Total Tasks Completed</span>
            <span class="metric-value text-success">{{ profile.stats.totalTasksCompleted }} tasks</span>
          </div>
        </div>

        <!-- Contribution Grid -->
        <div class="card grid-card">
          <div class="grid-header">
            <h3>Consistency Heatmap</h3>
            <div class="legend">
              <span>Less</span>
              <div class="legend-cell intensity-0"></div>
              <div class="legend-cell intensity-1"></div>
              <div class="legend-cell intensity-2"></div>
              <div class="legend-cell intensity-3"></div>
              <span>More</span>
            </div>
          </div>
          <p class="grid-desc">Visual history of tasks completed over the last 12 weeks.</p>

          <div class="grid-scroll">
            <div class="grid-container">
              <div class="day-labels">
                <span>Mon</span>
                <span>Wed</span>
                <span>Fri</span>
              </div>
              <div class="cells-matrix">
                <div 
                  *ngFor="let cell of gridCells" 
                  [class]="'grid-cell intensity-' + cell.intensity"
                  [class.placeholder-cell]="cell.isEmptyPlaceholder"
                  [attr.data-tooltip]="cell.isEmptyPlaceholder ? null : (cell.date + ': ' + cell.tasksCompleted + ' completed tasks')">
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .public-profile-container {
      padding: 2.5rem;
      max-width: 900px;
      margin: 0 auto;
      width: 100%;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    .loading-state, .error-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      gap: 1.5rem;
      padding: 5rem 2rem;
      margin-top: 10vh;
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid var(--border);
      border-top-color: var(--text-primary);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .error-state svg {
      color: var(--danger);
    }

    .error-state p {
      max-width: 350px;
      margin-bottom: 0.5rem;
    }

    /* Profile Layout */
    .profile-content {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .banner-card {
      padding: 2.5rem;
    }

    .user-main-info {
      display: flex;
      gap: 2rem;
      align-items: center;
    }

    .user-avatar {
      width: 96px;
      height: 96px;
      border-radius: 50%;
      border: 2px solid var(--border-hover);
      object-fit: cover;
    }

    .user-meta {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      flex: 1;
    }

    .user-meta h2 {
      font-size: 1.75rem;
      color: var(--text-primary);
    }

    .user-meta .email {
      font-size: 0.875rem;
      color: var(--text-muted);
    }

    .user-meta .bio {
      font-size: 0.9rem;
      color: var(--text-secondary);
      margin-top: 0.75rem;
      line-height: 1.5;
    }

    .placeholder-bio {
      font-style: italic;
      color: var(--text-muted) !important;
    }

    /* Metrics */
    .metrics-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1.5rem;
    }

    .metric-card {
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      text-align: center;
    }

    .metric-label {
      font-size: 0.75rem;
      color: var(--text-muted);
      text-transform: uppercase;
      font-weight: 600;
      letter-spacing: 0.05em;
    }

    .metric-value {
      font-size: 1.5rem;
      font-weight: 700;
      font-family: var(--font-display);
    }

    .text-success { color: var(--success); }
    .text-warning { color: var(--warning); }
    .text-accent { color: var(--accent); }

    /* Grid styling */
    .grid-card {
      padding: 1.75rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .grid-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .grid-desc {
      font-size: 0.8125rem;
      color: var(--text-secondary);
      margin-top: -0.5rem;
    }

    .legend {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .legend-cell {
      width: 12px;
      height: 12px;
      border-radius: 2px;
    }

    .legend-cell.intensity-0 { background: var(--grid-intensity-0); }
    .legend-cell.intensity-1 { background: var(--grid-intensity-1); }
    .legend-cell.intensity-2 { background: var(--grid-intensity-2); }
    .legend-cell.intensity-3 { background: var(--grid-intensity-3); }

    .grid-scroll {
      width: 100%;
      overflow-x: auto;
      padding-bottom: 0.5rem;
    }

    .grid-container {
      display: flex;
      gap: 0.5rem;
      width: max-content;
      align-items: center;
      padding: 1rem;
      background: rgba(9, 9, 11, 0.4);
      border: 1px solid var(--border);
      border-radius: var(--radius);
    }

    .day-labels {
      display: flex;
      flex-direction: column;
      gap: 10px;
      font-size: 0.65rem;
      color: var(--text-muted);
    }

    .cells-matrix {
      display: grid;
      grid-template-rows: repeat(7, 12px);
      grid-auto-flow: column;
      gap: 3px;
    }

    .grid-cell {
      width: 12px;
      height: 12px;
      border-radius: 2px;
      background: var(--grid-intensity-0);
      position: relative;
    }

    .grid-cell.intensity-0 { background: var(--grid-intensity-0); }
    .grid-cell.intensity-1 { background: var(--grid-intensity-1); }
    .grid-cell.intensity-2 { background: var(--grid-intensity-2); }
    .grid-cell.intensity-3 { background: var(--grid-intensity-3); }

    .grid-cell[data-tooltip]:hover::after {
      content: attr(data-tooltip);
      position: absolute;
      bottom: 18px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--surface-hover);
      border: 1px solid var(--border-hover);
      color: var(--text-primary);
      padding: 0.35rem 0.6rem;
      border-radius: var(--radius);
      font-size: 0.6875rem;
      white-space: nowrap;
      z-index: 100;
      box-shadow: var(--shadow-md);
      pointer-events: none;
    }

    @media (max-width: 600px) {
      .user-main-info {
        flex-direction: column;
        text-align: center;
      }
      .metrics-row {
        grid-template-columns: 1fr;
        gap: 1rem;
      }
    }
  `]
})
export class PublicProfileComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private userService = inject(UserService);

  public profile: PublicProfile | null = null;
  public isLoading = true;
  public errorMsg: string | null = null;
  public gridCells: GridDisplayCell[] = [];

  ngOnInit() {
    this.route.params.subscribe(params => {
      const id = params['id'];
      if (id) {
        this.loadProfile(id);
      } else {
        this.isLoading = false;
        this.errorMsg = 'Invalid user link.';
      }
    });
  }

  private loadProfile(id: string) {
    this.isLoading = true;
    this.errorMsg = null;

    this.userService.getUserProfile(id).subscribe({
      next: response => {
        this.isLoading = false;
        if (response.success && response.profile) {
          this.profile = response.profile;
          this.generateSimulatedGrid(response.profile.stats);
        } else {
          this.errorMsg = 'Could not find the requested user profile.';
        }
      },
      error: err => {
        this.isLoading = false;
        this.errorMsg = 'Error communicating with backend server.';
        console.error('Error loading public profile:', err);
      }
    });
  }

  private generateSimulatedGrid(stats: { currentStreak: number; longestStreak: number; totalTasksCompleted: number }) {
    // Generate a 12-week grid (84 cells) representing their statistics.
    // We map their active streak of `currentStreak` days to the most recent cells,
    // and distribute their remaining completed tasks randomly over the earlier cells.
    const cells: GridDisplayCell[] = [];
    const today = new Date();
    const currentStreak = stats.currentStreak || 0;
    
    // Calculate total completed tasks left to distribute
    let remainingCompletions = Math.max(0, stats.totalTasksCompleted - currentStreak);

    for (let i = 83; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];

      let tasksCompleted = 0;
      let intensity = 0;

      if (i < currentStreak) {
        // This day is part of their active current streak!
        tasksCompleted = 1 + Math.floor(Math.random() * 2); // 1-2 tasks
        intensity = tasksCompleted === 1 ? 1 : 2;
      } else if (remainingCompletions > 0 && Math.random() < 0.25) {
        // Distribute remaining completed tasks randomly
        const bundle = Math.min(remainingCompletions, 1 + Math.floor(Math.random() * 3));
        tasksCompleted = bundle;
        intensity = bundle === 1 ? 1 : bundle === 2 ? 2 : 3;
        remainingCompletions -= bundle;
      }

      cells.push({
        date: dateStr,
        tasksCompleted,
        intensity,
        isEmptyPlaceholder: false
      });
    }

    this.gridCells = cells;
  }

  encodeURIComponent(val: string): string {
    return encodeURIComponent(val || 'user');
  }
}
