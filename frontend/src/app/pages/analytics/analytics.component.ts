import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, registerables } from 'chart.js';
import { AnalyticsService, AnalyticsData } from '../../core/services/analytics.service';
import { TaskService, Task } from '../../core/services/task.service';

Chart.register(...registerables);

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="analytics-container animate-fade-in">
      <!-- Title Header -->
      <header class="analytics-header">
        <h1>Visual Analytics</h1>
        <p class="subtitle">Detailed breakdown of your productivity output and consistency trends.</p>
      </header>

      <!-- Stats Grid (with animated numbers & skeletons) -->
      <section class="stats-grid">
        <!-- Metric 1: Completion Rate -->
        <div class="card stat-card" [class.loading]="!analyticsData">
          <span class="label">Completion Rate</span>
          <ng-container *ngIf="analyticsData; else skeletonValue">
            <h2 class="value">{{ animatedCompletionRate }}%</h2>
            <div class="progress-bar-container">
              <div class="progress-bar-fill" [style.width.%]="animatedCompletionRate"></div>
            </div>
            <span class="comparison">Total Tasks: {{ analyticsData.totalTasks }}</span>
          </ng-container>
        </div>

        <!-- Metric 2: Completed Tasks -->
        <div class="card stat-card" [class.loading]="!analyticsData">
          <span class="label">Completed Tasks</span>
          <ng-container *ngIf="analyticsData; else skeletonValue">
            <h2 class="value text-success">{{ animatedCompletedTasks }}</h2>
            <span class="comparison">All-time record</span>
          </ng-container>
        </div>

        <!-- Metric 3: Pending Tasks -->
        <div class="card stat-card" [class.loading]="!analyticsData">
          <span class="label">Pending Tasks</span>
          <ng-container *ngIf="analyticsData; else skeletonValue">
            <h2 class="value text-warning">{{ animatedPendingTasks }}</h2>
            <span class="comparison">Needs attention</span>
          </ng-container>
        </div>

        <!-- Metric 4: Active Streak -->
        <div class="card stat-card" [class.loading]="!analyticsData">
          <span class="label">Active Streak</span>
          <ng-container *ngIf="analyticsData; else skeletonValue">
            <h2 class="value text-accent">{{ animatedCurrentStreak }}</h2>
            <span class="comparison">Record: {{ analyticsData.longestStreak }} days</span>
          </ng-container>
        </div>
      </section>

      <!-- Skeleton Templates -->
      <ng-template #skeletonValue>
        <div class="skeleton skeleton-title"></div>
        <div class="skeleton skeleton-sub"></div>
      </ng-template>

      <!-- Charts Section -->
      <section class="charts-section" [class.hidden]="!analyticsData">
        <!-- Chart 1: Doughnut Completion Rate -->
        <div class="card chart-card">
          <h3>Completion Rate</h3>
          <p class="chart-subtitle">Completed vs Pending Tasks Ratio</p>
          <div class="chart-wrapper">
            <canvas #completionRateCanvas></canvas>
          </div>
        </div>

        <!-- Chart 2: Weekly Pattern -->
        <div class="card chart-card">
          <h3>Weekly Pattern</h3>
          <p class="chart-subtitle">Completed tasks by day of the week</p>
          <div class="chart-wrapper">
            <canvas #categoryOutputCanvas></canvas>
          </div>
        </div>

        <!-- Chart 3: Priority Breakdown -->
        <div class="card chart-card full-width">
          <h3>Priority Distribution</h3>
          <p class="chart-subtitle">Count of tasks by priority level</p>
          <div class="chart-wrapper-wide">
            <canvas #priorityCanvas></canvas>
          </div>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .analytics-container {
      padding: 2.5rem;
      display: flex;
      flex-direction: column;
      gap: 2rem;
      max-width: 1200px;
      margin: 0 auto;
      width: 100%;
    }

    .analytics-header {
      margin-bottom: 0.5rem;
    }

    .subtitle {
      font-size: 0.9rem;
      color: var(--text-secondary);
      margin-top: 0.25rem;
    }

    /* Stats Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1.5rem;
    }

    .stat-card {
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      min-height: 120px;
      justify-content: space-between;
    }

    .stat-card .label {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .stat-card .value {
      font-size: 2.25rem;
      font-weight: 700;
      font-family: var(--font-display);
      color: var(--text-primary);
      line-height: 1;
      letter-spacing: -0.02em;
    }

    .text-success { color: var(--success) !important; }
    .text-warning { color: var(--warning) !important; }
    .text-accent { color: var(--accent) !important; }

    .stat-card .comparison {
      font-size: 0.75rem;
      color: var(--text-secondary);
    }

    .progress-bar-container {
      width: 100%;
      height: 4px;
      background: var(--border);
      border-radius: 999px;
      overflow: hidden;
      margin: 0.25rem 0;
    }

    .progress-bar-fill {
      height: 100%;
      background: var(--accent);
      box-shadow: 0 0 8px rgba(199, 199, 204, 0.4);
      transition: width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    /* Charts Section */
    .charts-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
      transition: opacity var(--transition-normal);
    }

    .charts-section.hidden {
      opacity: 0;
      pointer-events: none;
    }

    .chart-card {
      padding: 1.75rem;
      display: flex;
      flex-direction: column;
      min-height: 350px;
    }

    .chart-card.full-width {
      grid-column: span 2;
    }

    .chart-card h3 {
      font-size: 1.1rem;
      font-weight: 600;
      color: var(--text-primary);
    }

    .chart-subtitle {
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-bottom: 1.5rem;
    }

    .chart-wrapper {
      flex: 1;
      position: relative;
      width: 100%;
      height: 220px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .chart-wrapper-wide {
      flex: 1;
      position: relative;
      width: 100%;
      height: 280px;
    }

    canvas {
      width: 100% !important;
      height: 100% !important;
    }

    /* Skeletons */
    .skeleton-title {
      height: 2.25rem;
      width: 60%;
      margin: 0.25rem 0;
    }

    .skeleton-sub {
      height: 0.85rem;
      width: 40%;
    }

    @media (max-width: 1024px) {
      .stats-grid {
        grid-template-columns: 1fr 1fr;
      }
      .charts-section {
        grid-template-columns: 1fr;
      }
      .chart-card.full-width {
        grid-column: span 1;
      }
    }

    @media (max-width: 768px) {
      .analytics-container {
        padding: 1.25rem 1rem;
        padding-bottom: calc(var(--mobile-nav-height) + 1.25rem);
        gap: 1.25rem;
      }

      .analytics-header h1 {
        font-size: 1.4rem;
      }

      .subtitle {
        font-size: 0.8125rem;
      }

      .stats-grid {
        grid-template-columns: 1fr 1fr;
        gap: 0.75rem;
      }

      .stat-card {
        padding: 1.25rem;
        min-height: 100px;
      }

      .stat-card .value {
        font-size: 1.75rem;
      }

      .charts-section {
        gap: 0.875rem;
      }

      .chart-card {
        padding: 1.25rem;
        min-height: 260px;
      }

      .chart-wrapper {
        height: 180px;
      }

      .chart-wrapper-wide {
        height: 200px;
      }
    }

    @media (max-width: 480px) {
      .analytics-container {
        padding: 1rem 0.875rem;
        padding-bottom: calc(var(--mobile-nav-height) + 1rem);
        gap: 1rem;
      }

      .analytics-header h1 {
        font-size: 1.25rem;
      }

      .stats-grid {
        grid-template-columns: 1fr 1fr;
        gap: 0.625rem;
      }

      .stat-card {
        padding: 1rem;
        min-height: 90px;
      }

      .stat-card .value {
        font-size: 1.5rem;
      }

      .chart-card {
        padding: 1rem;
        min-height: 240px;
      }

      .chart-wrapper {
        height: 160px;
      }

      .chart-wrapper-wide {
        height: 180px;
      }
    }

    @media (max-width: 360px) {
      .analytics-container {
        padding: 0.875rem 0.75rem;
        padding-bottom: calc(var(--mobile-nav-height) + 0.875rem);
      }

      .stats-grid {
        grid-template-columns: 1fr 1fr;
        gap: 0.5rem;
      }

      .stat-card .value {
        font-size: 1.25rem;
      }

      .stat-card .label {
        font-size: 0.6875rem;
      }
    }
  `]

})
export class AnalyticsComponent implements OnInit, AfterViewInit, OnDestroy {
  private analyticsService = inject(AnalyticsService);
  private taskService = inject(TaskService);

  public analyticsData: AnalyticsData | null = null;
  public tasksList: Task[] = [];

  // Animated counters value holders
  public animatedCompletionRate = 0;
  public animatedCompletedTasks = 0;
  public animatedPendingTasks = 0;
  public animatedCurrentStreak = 0;

  // Canvas elements
  @ViewChild('completionRateCanvas') completionRateCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('categoryOutputCanvas') categoryOutputCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('priorityCanvas') priorityCanvas!: ElementRef<HTMLCanvasElement>;

  // Chart instances
  private completionRateChart?: Chart;
  private categoryOutputChart?: Chart;
  private priorityChart?: Chart;

  private counterIntervals: any[] = [];

  ngOnInit() {
    this.analyticsService.getAnalytics().subscribe(response => {
      if (response.success && response.analytics) {
        this.analyticsData = response.analytics;
        this.startAnimatedCounters();
        this.buildCharts();
      }
    });

    this.taskService.getTasks().subscribe(response => {
      if (response.success && response.tasks) {
        this.tasksList = response.tasks;
        this.buildCharts();
      }
    });
  }

  ngAfterViewInit() {
    this.buildCharts();
  }

  ngOnDestroy() {
    // Clean up chart references to prevent memory leaks
    this.completionRateChart?.destroy();
    this.categoryOutputChart?.destroy();
    this.priorityChart?.destroy();
    this.counterIntervals.forEach(interval => clearInterval(interval));
  }

  private startAnimatedCounters() {
    if (!this.analyticsData) return;

    this.counterIntervals.forEach(interval => clearInterval(interval));
    this.counterIntervals = [];

    // Target values
    const targetRate = this.analyticsData.completionRate;
    const targetCompleted = this.analyticsData.completedTasks;
    const targetPending = this.analyticsData.pendingTasks;
    const targetStreak = this.analyticsData.currentStreak;

    // Set animated counters with simple linear increments
    this.animatedCompletionRate = 0;
    this.animatedCompletedTasks = 0;
    this.animatedPendingTasks = 0;
    this.animatedCurrentStreak = 0;

    const rateStep = Math.max(1, Math.floor(targetRate / 30));
    const completedStep = Math.max(1, Math.floor(targetCompleted / 30));
    const pendingStep = Math.max(1, Math.floor(targetPending / 30));
    const streakStep = Math.max(1, Math.floor(targetStreak / 30));

    const intervalRate = setInterval(() => {
      if (this.animatedCompletionRate < targetRate) {
        this.animatedCompletionRate = Math.min(targetRate, this.animatedCompletionRate + rateStep);
      } else {
        clearInterval(intervalRate);
      }
    }, 20);
    this.counterIntervals.push(intervalRate);

    const intervalCompleted = setInterval(() => {
      if (this.animatedCompletedTasks < targetCompleted) {
        this.animatedCompletedTasks = Math.min(targetCompleted, this.animatedCompletedTasks + completedStep);
      } else {
        clearInterval(intervalCompleted);
      }
    }, 20);
    this.counterIntervals.push(intervalCompleted);

    const intervalPending = setInterval(() => {
      if (this.animatedPendingTasks < targetPending) {
        this.animatedPendingTasks = Math.min(targetPending, this.animatedPendingTasks + pendingStep);
      } else {
        clearInterval(intervalPending);
      }
    }, 20);
    this.counterIntervals.push(intervalPending);

    const intervalStreak = setInterval(() => {
      if (this.animatedCurrentStreak < targetStreak) {
        this.animatedCurrentStreak = Math.min(targetStreak, this.animatedCurrentStreak + streakStep);
      } else {
        clearInterval(intervalStreak);
      }
    }, 20);
    this.counterIntervals.push(intervalStreak);
  }

  private buildCharts() {
    if (!this.analyticsData || this.tasksList.length === 0) return;

    // Build completion rate doughnut chart
    if (this.completionRateCanvas?.nativeElement) {
      this.completionRateChart?.destroy();

      const ctx = this.completionRateCanvas.nativeElement.getContext('2d');
      if (ctx) {
        this.completionRateChart = new Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: ['Completed', 'Pending'],
            datasets: [{
              data: [this.analyticsData.completedTasks, this.analyticsData.pendingTasks],
              backgroundColor: ['#c7c7cc', '#222226'],
              borderColor: '#111113',
              borderWidth: 2,
              hoverOffset: 4
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
              duration: 800,
              easing: 'easeOutQuart'
            },
            plugins: {
              legend: {
                position: 'bottom',
                labels: {
                  color: '#a1a1aa',
                  font: { family: 'Inter', size: 11 }
                }
              }
            }
          }
        });
      }
    }

    // Build weekly pattern chart (completions by day of the week)
    if (this.categoryOutputCanvas?.nativeElement) {
      this.categoryOutputChart?.destroy();

      const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const completionsByDay = [0, 0, 0, 0, 0, 0, 0];

      this.tasksList.filter(t => t.completed && t.completedAt).forEach(t => {
        const date = new Date(t.completedAt!);
        const dayIndex = date.getDay();
        if (dayIndex >= 0 && dayIndex < 7) {
          completionsByDay[dayIndex]++;
        }
      });

      const ctx = this.categoryOutputCanvas.nativeElement.getContext('2d');
      if (ctx) {
        this.categoryOutputChart = new Chart(ctx, {
          type: 'radar',
          data: {
            labels: daysOfWeek,
            datasets: [{
              label: 'Completions',
              data: completionsByDay,
              backgroundColor: 'rgba(199, 199, 204, 0.15)',
              borderColor: '#c7c7cc',
              pointBackgroundColor: '#f4f4f5',
              pointBorderColor: '#111113',
              pointHoverBackgroundColor: '#111113',
              pointHoverBorderColor: '#f4f4f5',
              borderWidth: 2
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
              duration: 800,
              easing: 'easeOutQuart'
            },
            scales: {
              r: {
                angleLines: { color: 'rgba(255, 255, 255, 0.08)' },
                grid: { color: 'rgba(255, 255, 255, 0.08)' },
                pointLabels: { color: '#a1a1aa', font: { family: 'Inter', size: 10 } },
                ticks: { display: false }
              }
            },
            plugins: {
              legend: {
                display: false
              }
            }
          }
        });
      }
    }

    // Build priority chart (Bar Chart)
    if (this.priorityCanvas?.nativeElement) {
      this.priorityChart?.destroy();

      // Aggregate tasks by priority
      const priorities = { low: 0, medium: 0, high: 0 };
      this.tasksList.forEach(t => {
        if (t.priority === 'low') priorities.low++;
        else if (t.priority === 'medium') priorities.medium++;
        else if (t.priority === 'high') priorities.high++;
      });

      const ctx = this.priorityCanvas.nativeElement.getContext('2d');
      if (ctx) {
        this.priorityChart = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: ['Low Priority', 'Medium Priority', 'High Priority'],
            datasets: [{
              label: 'Task Count',
              data: [priorities.low, priorities.medium, priorities.high],
              backgroundColor: ['#52525b', '#f59e0b', '#ef4444'],
              borderColor: '#222226',
              borderWidth: 1,
              borderRadius: 4
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
              duration: 800,
              easing: 'easeOutQuart'
            },
            scales: {
              x: {
                grid: { display: false },
                ticks: { color: '#a1a1aa' }
              },
              y: {
                grid: { color: '#222226' },
                ticks: { color: '#a1a1aa', stepSize: 1 }
              }
            },
            plugins: {
              legend: {
                display: false
              }
            }
          }
        });
      }
    }
  }
}
