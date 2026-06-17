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
    <div class="dashboard-container">
      <!-- Welcome Header -->
      <header class="dashboard-header" *ngIf="authService.currentUser$ | async as user">
        <div>
          <h1>Welcome back, {{ user.username }}</h1>
          <p class="subtitle">Here is your consistency overview for today.</p>
        </div>
        <div class="header-badge btn btn-secondary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          <span>Streak: {{ streakData?.currentStreak || 0 }} days</span>
        </div>
      </header>

      <!-- Stats Grid -->
      <section class="stats-row">
        <!-- Card 1: Streak -->
        <div class="card stat-card">
          <span class="stat-label">Current Streak</span>
          <div class="stat-value-container">
            <span class="stat-value">{{ streakData?.currentStreak || 0 }}</span>
            <span class="stat-unit">days</span>
          </div>
          <p class="stat-comparison">Longest: {{ streakData?.longestStreak || 0 }} days</p>
        </div>

        <!-- Card 2: Completion Rate -->
        <div class="card stat-card">
          <span class="stat-label">Completion Rate</span>
          <div class="stat-value-container">
            <span class="stat-value">{{ analyticsData?.completionRate || 0 }}</span>
            <span class="stat-unit">%</span>
          </div>
          <div class="progress-bar-container">
            <div class="progress-bar-fill" [style.width.%]="analyticsData?.completionRate || 0"></div>
          </div>
        </div>

        <!-- Card 3: Tasks Completed -->
        <div class="card stat-card">
          <span class="stat-label">Tasks Completed</span>
          <div class="stat-value-container">
            <span class="stat-value">{{ analyticsData?.completedTasks || 0 }}</span>
            <span class="stat-unit">/ {{ analyticsData?.totalTasks || 0 }}</span>
          </div>
          <p class="stat-comparison">{{ analyticsData?.pendingTasks || 0 }} pending tasks</p>
        </div>
      </section>

      <!-- Main Layout Grid -->
      <div class="dashboard-grid-layout">
        <!-- Recent Tasks Checklist -->
        <div class="card checklist-card">
          <div class="card-title-row">
            <h3>Recent Tasks</h3>
            <a routerLink="/tasks" class="btn btn-secondary btn-sm">Manage Tasks</a>
          </div>
          
          <div class="tasks-list" *ngIf="recentTasks.length > 0; else noTasks">
            <div *ngFor="let task of recentTasks" class="task-item" [class.completed]="task.completed">
              <label class="checkbox-container">
                <input 
                  type="checkbox" 
                  [checked]="task.completed"
                  [disabled]="task.completed"
                  (change)="onToggleComplete(task)" />
                <span class="checkmark"></span>
              </label>
              <div class="task-details">
                <span class="task-title">{{ task.title }}</span>
                <span class="task-category-badge">{{ task.category }}</span>
              </div>
              <span [class]="'badge badge-' + task.priority">{{ task.priority }}</span>
            </div>
          </div>
          
          <ng-template #noTasks>
            <div class="empty-state">
              <p>No pending tasks found. Create one to get started!</p>
              <a routerLink="/tasks" class="btn btn-primary btn-sm">Create Task</a>
            </div>
          </ng-template>
        </div>

        <!-- Consistency Grid Preview (12 Weeks) -->
        <div class="card grid-preview-card">
          <div class="card-title-row">
            <h3>Consistency Preview</h3>
            <a routerLink="/grid" class="btn btn-secondary btn-sm">Full Grid</a>
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
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-container {
      padding: 2.5rem;
      display: flex;
      flex-direction: column;
      gap: 2rem;
      max-width: 1200px;
      margin: 0 auto;
      width: 100%;
    }

    .dashboard-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .subtitle {
      font-size: 0.9rem;
      color: var(--text-secondary);
      margin-top: 0.25rem;
    }

    .header-badge {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.8125rem;
      font-weight: 600;
      border-color: var(--border-hover);
    }

    /* Stats Cards Row */
    .stats-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1.5rem;
    }

    .stat-card {
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .stat-label {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .stat-value-container {
      display: flex;
      align-items: baseline;
      gap: 0.35rem;
    }

    .stat-value {
      font-size: 2rem;
      font-weight: 700;
      font-family: var(--font-display);
      color: var(--text-primary);
    }

    .stat-unit {
      font-size: 0.875rem;
      color: var(--text-secondary);
      font-weight: 500;
    }

    .stat-comparison {
      font-size: 0.75rem;
      color: var(--text-secondary);
    }

    .progress-bar-container {
      width: 100%;
      height: 4px;
      background: var(--surface-hover);
      border-radius: 2px;
      margin-top: auto;
      overflow: hidden;
    }

    .progress-bar-fill {
      height: 100%;
      background: var(--accent);
      border-radius: 2px;
      transition: width 0.5s ease;
    }

    /* Layout Grid */
    .dashboard-grid-layout {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
    }

    .card-title-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .btn-sm {
      padding: 0.35rem 0.7rem;
      font-size: 0.75rem;
    }

    /* Checklist Card */
    .checklist-card {
      display: flex;
      flex-direction: column;
    }

    .tasks-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      margin-top: 0.5rem;
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

    /* Grid Preview Card */
    .grid-preview-card {
      display: flex;
      flex-direction: column;
    }

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

    /* Responsiveness */
    @media (max-width: 1024px) {
      .dashboard-grid-layout {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 768px) {
      .stats-row {
        grid-template-columns: 1fr;
        gap: 1rem;
      }
      .dashboard-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 1rem;
      }
    }
  `]
})
export class DashboardComponent implements OnInit {
  public authService = inject(AuthService);
  private streakService = inject(StreakService);
  private taskService = inject(TaskService);
  private gridService = inject(GridService);
  private analyticsService = inject(AnalyticsService);

  public streakData: StreakData | null = null;
  public analyticsData: AnalyticsData | null = null;
  public recentTasks: Task[] = [];
  public miniGridCells: GridCell[] = [];

  ngOnInit() {
    this.loadDashboardData();
  }

  private loadDashboardData() {
    forkJoin({
      streak: this.streakService.getStreak().pipe(catchError(() => of({ success: true, streak: null }))),
      tasks: this.taskService.getTasks().pipe(catchError(() => of({ success: true, count: 0, tasks: [] }))),
      grid: this.gridService.getGridData().pipe(catchError(() => of({ success: true, totalContributionDays: 0, gridData: [] }))),
      analytics: this.analyticsService.getAnalytics().pipe(catchError(() => of({ success: true, analytics: null })))
    }).subscribe(({ streak, tasks, grid, analytics }) => {
      if (streak.success && streak.streak) {
        this.streakData = streak.streak;
      }
      
      if (analytics.success && analytics.analytics) {
        this.analyticsData = analytics.analytics;
      }

      if (tasks.success && tasks.tasks) {
        // Filter out completed tasks and take top 4 pending tasks, sort by priority
        const pending = tasks.tasks.filter(t => !t.completed);
        const completed = tasks.tasks.filter(t => t.completed);
        
        // Show up to 4 items: priority to pending tasks
        this.recentTasks = [...pending, ...completed].slice(0, 4);
      }

      if (grid.success && grid.gridData) {
        this.generateMiniGrid(grid.gridData);
      } else {
        this.generateMiniGrid([]);
      }
    });
  }

  private generateMiniGrid(actualData: GridCell[]) {
    // We want 12 weeks = 84 cells.
    // Let's create an array representing the last 84 days.
    const cells: GridCell[] = [];
    const today = new Date();
    const dataMap = new Map<string, GridCell>();
    
    actualData.forEach(c => dataMap.set(c.date, c));

    for (let i = 83; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      
      if (dataMap.has(dateStr)) {
        cells.push(dataMap.get(dateStr)!);
      } else {
        cells.push({
          date: dateStr,
          tasksCompleted: 0,
          intensity: 0
        });
      }
    }

    this.miniGridCells = cells;
  }

  onToggleComplete(task: Task) {
    if (task.completed) return;
    
    this.taskService.completeTask(task._id).subscribe(response => {
      if (response.success) {
        task.completed = true;
        task.completedAt = response.task.completedAt;
        
        // Reload dashboard stats
        this.loadDashboardData();
      }
    });
  }

  encodeURIComponent(val: string): string {
    return encodeURIComponent(val || 'user');
  }
}
