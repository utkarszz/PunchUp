import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { StreakService, StreakData } from '../../core/services/streak.service';
import { TaskService, Task } from '../../core/services/task.service';
import { GridService, GridCell } from '../../core/services/grid.service';
import { AnalyticsService, AnalyticsData } from '../../core/services/analytics.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="dashboard-container animate-fade-in">
      
      <!-- Top Welcome & Stats Card -->
      <section class="card welcome-card animate-slide-up" *ngIf="authService.currentUser$ | async as user">
        <div class="welcome-header">
          <div class="welcome-text">
            <h1>Welcome back, {{ user.displayName || user.username }}</h1>
            <p class="subtitle">Here is your consistency overview for today. Keep the streak alive!</p>
          </div>
          <div class="welcome-avatar-wrapper">
            <img 
              [src]="user.profilePicture || 'assets/default-avatar.png'" 
              class="welcome-avatar" 
              alt="Avatar"
              onerror="this.src='https://api.dicebear.com/7.x/bottts/svg?seed=user'"
            />
          </div>
        </div>

        <div class="dashboard-stats-grid">
          <div class="dashboard-stat-item">
            <span class="stat-num">{{ streakData?.currentStreak || 0 }}</span>
            <span class="stat-label">Current Streak</span>
            <span class="stat-subtext">days active</span>
          </div>
          <div class="stat-divider"></div>
          <div class="dashboard-stat-item">
            <span class="stat-num">{{ streakData?.longestStreak || 0 }}</span>
            <span class="stat-label">Longest Streak</span>
            <span class="stat-subtext">personal best</span>
          </div>
          <div class="stat-divider"></div>
          <div class="dashboard-stat-item">
            <span class="stat-num">{{ analyticsData?.completedTasks || 0 }}</span>
            <span class="stat-label">Total Tasks Done</span>
            <span class="stat-subtext">completed lifetime</span>
          </div>
        </div>
      </section>

      <!-- Middle Quick Actions Section -->
      <section class="quick-actions-section animate-slide-up animate-stagger-1">
        <h2 class="section-title">Quick Actions</h2>
        <div class="quick-actions-grid">
          
          <a routerLink="/tasks" [queryParams]="{ create: 'true' }" class="card action-card">
            <div class="action-icon-wrapper circle-blue">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </div>
            <div class="action-card-content">
              <h3>Create Task</h3>
              <p>Add a new daily consistency target to your workspace.</p>
            </div>
          </a>

          <a routerLink="/analytics" class="card action-card">
            <div class="action-icon-wrapper circle-purple">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="20" x2="18" y2="10"></line>
                <line x1="12" y1="20" x2="12" y2="4"></line>
                <line x1="6" y1="20" x2="6" y2="14"></line>
              </svg>
            </div>
            <div class="action-card-content">
              <h3>View Analytics</h3>
              <p>Observe habit completion rates and detailed history.</p>
            </div>
          </a>

          <a routerLink="/community" class="card action-card">
            <div class="action-icon-wrapper circle-green">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </div>
            <div class="action-card-content">
              <h3>Community Feed</h3>
              <p>Share achievements, follow users, and grow together.</p>
            </div>
          </a>

        </div>
      </section>

      <!-- Bottom Today's Tasks & Grid Preview -->
      <div class="dashboard-bottom-grid animate-slide-up animate-stagger-2">
        
        <!-- Today's Tasks List -->
        <section class="card tasks-list-card">
          <div class="card-header-row">
            <h3>Today's Tasks</h3>
            <a routerLink="/tasks" class="btn btn-secondary btn-sm">Manage Tasks</a>
          </div>
          
          <div class="tasks-list" *ngIf="todayTasks.length > 0; else noTasks">
            <div *ngFor="let task of todayTasks" class="task-item" [class.completed]="task.completed">
              <label class="checkbox-container">
                <input 
                  type="checkbox" 
                  [checked]="task.completed"
                  [disabled]="task.completed"
                  (change)="onToggleComplete(task)" 
                />
                <span class="checkmark"></span>
              </label>
              <div class="task-details">
                <span class="task-title">{{ task.title }}</span>
                <span class="task-category-badge" *ngIf="task.category">{{ task.category }}</span>
              </div>
              <span [class]="'badge badge-' + task.priority">{{ task.priority }}</span>
            </div>
          </div>
          
          <ng-template #noTasks>
            <div class="empty-state">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 11l3 3L22 4"></path>
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
              </svg>
              <p>No tasks due today. Create one or rest up!</p>
              <a routerLink="/tasks" [queryParams]="{ create: 'true' }" class="btn btn-primary btn-sm">Create Task</a>
            </div>
          </ng-template>
        </section>

        <!-- Mini Grid Preview Card -->
        <section class="card mini-grid-card">
          <div class="card-header-row">
            <h3>Consistency Preview</h3>
            <a routerLink="/grid" class="btn btn-secondary btn-sm">Full Heatmap</a>
          </div>
          <p class="grid-desc">Showing daily completions for the last 12 weeks.</p>
          
          <div class="mini-grid-container">
            <div class="mini-grid-days">
              <span>Mon</span>
              <span>Wed</span>
              <span>Fri</span>
            </div>
            <div class="mini-grid-cells">
              <div 
                *ngFor="let cell of miniGridCells" 
                [class]="'mini-cell intensity-' + cell.intensity"
                [title]="cell.date + ': ' + cell.tasksCompleted + ' tasks completed'">
              </div>
            </div>
          </div>
          
          <div class="legend-row">
            <span>Less</span>
            <div class="mini-cell intensity-0"></div>
            <div class="mini-cell intensity-1"></div>
            <div class="mini-cell intensity-2"></div>
            <div class="mini-cell intensity-3"></div>
            <span>More</span>
          </div>
        </section>

      </div>

    </div>
  `,
  styles: [`
    .dashboard-container {
      padding: 2.5rem;
      display: flex;
      flex-direction: column;
      gap: 2.5rem;
      max-width: 1200px;
      margin: 0 auto;
      width: 100%;
    }

    /* Welcome Card */
    .welcome-card {
      padding: 2.25rem;
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }

    .welcome-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1.5rem;
    }

    .welcome-text h1 {
      font-size: 1.875rem;
      font-weight: 700;
      color: var(--text-primary);
    }

    .subtitle {
      font-size: 0.9375rem;
      color: var(--text-secondary);
      margin-top: 0.35rem;
    }

    .welcome-avatar {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      border: 2px solid var(--border-hover);
      object-fit: cover;
    }

    .dashboard-stats-grid {
      display: flex;
      align-items: center;
      border-top: 1px solid var(--border);
      padding-top: 1.75rem;
    }

    .dashboard-stat-item {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 0.25rem;
    }

    .stat-num {
      font-size: 2.25rem;
      font-weight: 700;
      color: var(--text-primary);
      font-family: var(--font-display);
      line-height: 1;
    }

    .stat-label {
      font-size: 0.6875rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
    }

    .stat-subtext {
      font-size: 0.75rem;
      color: var(--text-secondary);
    }

    .stat-divider {
      width: 1px;
      height: 48px;
      background: var(--border);
      flex-shrink: 0;
    }

    /* Quick Actions */
    .quick-actions-section {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .section-title {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--text-primary);
    }

    .quick-actions-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1.5rem;
    }

    .action-card {
      display: flex;
      gap: 1.25rem;
      align-items: flex-start;
      padding: 1.5rem;
      cursor: pointer;
      text-decoration: none;
      transition: border-color 0.2s ease, background 0.2s ease;
    }

    .action-card:hover {
      border-color: var(--border-glow);
      background: var(--surface-elevated);
    }

    .action-icon-wrapper {
      width: 42px;
      height: 42px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .circle-blue { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
    .circle-purple { background: rgba(139, 92, 246, 0.1); color: #8b5cf6; }
    .circle-green { background: rgba(16, 185, 129, 0.1); color: #10b981; }

    .action-card-content {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      text-align: left;
    }

    .action-card-content h3 {
      font-size: 0.9375rem;
      font-weight: 600;
      color: var(--text-primary);
    }

    .action-card-content p {
      font-size: 0.8125rem;
      color: var(--text-secondary);
      line-height: 1.4;
    }

    /* Bottom Layout */
    .dashboard-bottom-grid {
      display: grid;
      grid-template-columns: 1.2fr 1fr;
      gap: 1.5rem;
    }

    .card-header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.25rem;
    }

    .card-header-row h3 {
      font-size: 1.0625rem;
      font-weight: 600;
      color: var(--text-primary);
    }

    /* Checklist */
    .tasks-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .task-item {
      display: flex;
      align-items: center;
      padding: 0.75rem 1rem;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: rgba(9, 9, 11, 0.2);
      gap: 1rem;
      transition: all var(--transition-fast);
    }

    .task-item:hover {
      border-color: var(--border-hover);
      background: rgba(9, 9, 11, 0.4);
    }

    .task-item.completed {
      opacity: 0.5;
    }

    .checkbox-container {
      display: block;
      position: relative;
      width: 16px;
      height: 16px;
      cursor: pointer;
      user-select: none;
    }

    .checkbox-container input {
      position: absolute;
      opacity: 0;
      cursor: pointer;
      height: 0;
      width: 0;
    }

    .checkmark {
      position: absolute;
      top: 0;
      left: 0;
      height: 16px;
      width: 16px;
      background-color: transparent;
      border: 1px solid var(--border-hover);
      border-radius: 4px;
      transition: all var(--transition-fast);
    }

    .checkbox-container:hover input ~ .checkmark {
      border-color: var(--accent);
    }

    .checkbox-container input:checked ~ .checkmark {
      background-color: var(--accent);
      border-color: var(--accent);
    }

    .checkmark:after {
      content: "";
      position: absolute;
      display: none;
    }

    .checkbox-container input:checked ~ .checkmark:after {
      display: block;
    }

    .checkbox-container .checkmark:after {
      left: 5px;
      top: 2px;
      width: 4px;
      height: 8px;
      border: solid var(--background);
      border-width: 0 2px 2px 0;
      transform: rotate(45deg);
    }

    .task-details {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      overflow: hidden;
    }

    .task-title {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--text-primary);
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;
    }

    .task-category-badge {
      font-size: 0.6875rem;
      color: var(--text-muted);
      border: 1px solid var(--border);
      border-radius: 4px;
      padding: 0.125rem 0.375rem;
      text-transform: capitalize;
    }

    .empty-state {
      padding: 3rem 1.5rem;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      color: var(--text-muted);
      font-size: 0.875rem;
    }

    .empty-state svg { opacity: 0.4; }

    /* Heatmap Mini Grid */
    .grid-desc {
      font-size: 0.8125rem;
      color: var(--text-secondary);
      margin-bottom: 1.5rem;
    }

    .mini-grid-container {
      display: flex;
      gap: 0.5rem;
      align-items: center;
      padding: 1.25rem;
      background: rgba(9, 9, 11, 0.4);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      margin-bottom: 1rem;
      overflow-x: auto;
    }

    .mini-grid-days {
      display: flex;
      flex-direction: column;
      gap: 9px;
      font-size: 0.65rem;
      color: var(--text-muted);
    }

    .mini-grid-cells {
      display: grid;
      grid-template-rows: repeat(7, 10px);
      grid-auto-flow: column;
      gap: 3px;
    }

    .mini-cell {
      width: 10px;
      height: 10px;
      border-radius: 1px;
      background: var(--grid-intensity-0);
      transition: background-color var(--transition-fast);
    }

    .mini-cell.intensity-0 { background-color: var(--grid-intensity-0); }
    .mini-cell.intensity-1 { background-color: var(--grid-intensity-1); }
    .mini-cell.intensity-2 { background-color: var(--grid-intensity-2); }
    .mini-cell.intensity-3 { background-color: var(--grid-intensity-3); }

    .legend-row {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 0.25rem;
      font-size: 0.6875rem;
      color: var(--text-muted);
    }

    /* Responsive */
    @media (max-width: 1024px) {
      .dashboard-bottom-grid {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 768px) {
      .dashboard-container {
        padding: 1.25rem 1rem;
        padding-bottom: calc(var(--mobile-nav-height) + 1.25rem);
        gap: 1.5rem;
      }

      .quick-actions-grid {
        grid-template-columns: 1fr;
        gap: 1rem;
      }

      .dashboard-stats-grid {
        flex-wrap: wrap;
        gap: 1rem;
      }

      .stat-divider { display: none; }
      .dashboard-stat-item { flex: 0 0 45%; }
      
      .welcome-card { padding: 1.5rem; }
    }
  `]
})
export class DashboardComponent implements OnInit {
  public authService = inject(AuthService);
  private streakService = inject(StreakService);
  private taskService = inject(TaskService);
  private gridService = inject(GridService);
  private analyticsService = inject(AnalyticsService);

  streakData: StreakData | null = null;
  analyticsData: AnalyticsData | null = null;
  todayTasks: Task[] = [];
  miniGridCells: GridCell[] = [];

  ngOnInit() {
    this.loadData();
  }

  private loadData() {
    forkJoin({
      streak: this.streakService.getStreak().pipe(catchError(() => of(null))),
      analytics: this.analyticsService.getAnalytics().pipe(catchError(() => of(null))),
      tasks: this.taskService.getTasks().pipe(catchError(() => of(null))),
      grid: this.gridService.getGridData().pipe(catchError(() => of(null)))
    }).subscribe({
      next: (res: any) => {
        if (res.streak && res.streak.success) {
          this.streakData = res.streak.streak;
        }
        if (res.analytics && res.analytics.success) {
          this.analyticsData = res.analytics.analytics;
        }
        if (res.tasks && res.tasks.success) {
          const allTasks: Task[] = res.tasks.tasks || [];
          // Filter tasks due today
          const todayStr = new Date().toDateString();
          this.todayTasks = allTasks.filter(t => {
            if (t.completed) return false; // Only show pending
            if (!t.dueDate) return true; // Show anytime tasks
            return new Date(t.dueDate).toDateString() === todayStr;
          });
        }
        if (res.grid && res.grid.success) {
          // Display last 12 weeks of cells
          const allCells = res.grid.cells || [];
          this.miniGridCells = allCells.slice(-84);
        }
      }
    });
  }

  onToggleComplete(task: Task) {
    if (task.completed) return;
    this.taskService.completeTask(task._id).subscribe({
      next: (res) => {
        if (res.success) {
          task.completed = true;
          // Reload dashboard statistics and grid
          this.loadData();
        }
      }
    });
  }
}
