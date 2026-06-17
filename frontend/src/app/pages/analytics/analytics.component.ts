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

      <!-- Stats Grid -->
      <section class="stats-grid" *ngIf="analyticsData">
        <div class="card stat-card">
          <span class="label">Completion Rate</span>
          <h2 class="value">{{ analyticsData.completionRate }}%</h2>
          <span class="comparison">Total Tasks: {{ analyticsData.totalTasks }}</span>
        </div>

        <div class="card stat-card">
          <span class="label">Completed Tasks</span>
          <h2 class="value text-success">{{ analyticsData.completedTasks }}</h2>
          <span class="comparison">All-time record</span>
        </div>

        <div class="card stat-card">
          <span class="label">Pending Tasks</span>
          <h2 class="value text-warning">{{ analyticsData.pendingTasks }}</h2>
          <span class="comparison">Needs attention</span>
        </div>

        <div class="card stat-card">
          <span class="label">Active Streak</span>
          <h2 class="value text-accent">{{ analyticsData.currentStreak }}</h2>
          <span class="comparison">Record: {{ analyticsData.longestStreak }} days</span>
        </div>
      </section>

      <!-- Charts Section -->
      <section class="charts-section">
        <!-- Chart 1: Doughnut Completion Rate -->
        <div class="card chart-card">
          <h3>Completion Rate</h3>
          <p class="chart-subtitle">Completed vs Pending Tasks Ratio</p>
          <div class="chart-wrapper">
            <canvas #completionRateCanvas></canvas>
          </div>
        </div>

        <!-- Chart 2: Category status -->
        <div class="card chart-card">
          <h3>Category Output</h3>
          <p class="chart-subtitle">Completed tasks grouped by workspace tag</p>
          <div class="chart-wrapper">
            <canvas #categoryOutputCanvas></canvas>
          </div>
        </div>

        <!-- Chart 3: Priority breakdown -->
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
    }

    .text-success { color: var(--success) !important; }
    .text-warning { color: var(--warning) !important; }
    .text-accent { color: var(--accent) !important; }

    .stat-card .comparison {
      font-size: 0.75rem;
      color: var(--text-secondary);
    }

    /* Charts Section */
    .charts-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
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

    @media (max-width: 600px) {
      .stats-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class AnalyticsComponent implements OnInit, AfterViewInit, OnDestroy {
  private analyticsService = inject(AnalyticsService);
  private taskService = inject(TaskService);

  public analyticsData: AnalyticsData | null = null;
  public tasksList: Task[] = [];

  // Canvas elements
  @ViewChild('completionRateCanvas') completionRateCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('categoryOutputCanvas') categoryOutputCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('priorityCanvas') priorityCanvas!: ElementRef<HTMLCanvasElement>;

  // Chart instances
  private completionRateChart?: Chart;
  private categoryOutputChart?: Chart;
  private priorityChart?: Chart;

  ngOnInit() {
    this.analyticsService.getAnalytics().subscribe(response => {
      if (response.success && response.analytics) {
        this.analyticsData = response.analytics;
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
              backgroundColor: ['#10b981', '#3f3f46'],
              borderColor: '#18181b',
              borderWidth: 2,
              hoverOffset: 4
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'bottom',
                labels: {
                  color: '#fafafa',
                  font: { family: 'Inter', size: 11 }
                }
              }
            }
          }
        });
      }
    }

    // Build category chart
    if (this.categoryOutputCanvas?.nativeElement) {
      this.categoryOutputChart?.destroy();

      // Aggregate completed tasks by category
      const categories: { [key: string]: number } = {};
      this.tasksList.filter(t => t.completed).forEach(t => {
        const cat = t.category || 'general';
        categories[cat] = (categories[cat] || 0) + 1;
      });

      const labels = Object.keys(categories);
      const data = Object.values(categories);

      const ctx = this.categoryOutputCanvas.nativeElement.getContext('2d');
      if (ctx) {
        this.categoryOutputChart = new Chart(ctx, {
          type: 'polarArea',
          data: {
            labels: labels.length > 0 ? labels : ['general'],
            datasets: [{
              data: data.length > 0 ? data : [0],
              backgroundColor: [
                'rgba(199, 199, 204, 0.4)',
                'rgba(16, 185, 129, 0.4)',
                'rgba(245, 158, 11, 0.4)',
                'rgba(239, 68, 68, 0.4)'
              ],
              borderColor: '#27272a',
              borderWidth: 1
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              r: {
                ticks: { display: false },
                grid: { color: '#27272a' }
              }
            },
            plugins: {
              legend: {
                position: 'bottom',
                labels: {
                  color: '#fafafa',
                  font: { family: 'Inter', size: 11 }
                }
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
              backgroundColor: ['#71717a', '#f59e0b', '#ef4444'],
              borderColor: '#27272a',
              borderWidth: 1,
              borderRadius: 4
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              x: {
                grid: { display: false },
                ticks: { color: '#a1a1aa' }
              },
              y: {
                grid: { color: '#27272a' },
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
