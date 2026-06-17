import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { GridService, GridCell } from '../../core/services/grid.service';
import { StreakService, StreakData } from '../../core/services/streak.service';

interface GridDisplayCell {
  date: string;
  tasksCompleted: number;
  intensity: number;
  isEmptyPlaceholder: boolean;
  dayName: string;
}

@Component({
  selector: 'app-grid',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="grid-page-container">
      <!-- Title Header -->
      <header class="grid-page-header">
        <div>
          <h1>Consistency Grid</h1>
          <p class="subtitle">Track your daily task completion history and visualize long-term habits.</p>
        </div>
        <div class="year-filter">
          <label class="year-label">Select Year</label>
          <select [(ngModel)]="selectedYear" (change)="onYearChange()" class="year-select">
            <option *ngFor="let yr of availableYears" [value]="yr">{{ yr }}</option>
          </select>
        </div>
      </header>

      <!-- Stats Panel Row -->
      <section class="stats-panel card">
        <div class="stats-metric">
          <span class="metric-label">Total Completions</span>
          <span class="metric-value">{{ totalCompletions }}</span>
          <span class="metric-sub">in {{ selectedYear }}</span>
        </div>
        <div class="stats-metric">
          <span class="metric-label">Active Days</span>
          <span class="metric-value">{{ activeDaysCount }}</span>
          <span class="metric-sub">{{ ((activeDaysCount / 365) * 100) | number:'1.1-1' }}% of year</span>
        </div>
        <div class="stats-metric">
          <span class="metric-label">Longest Streak</span>
          <span class="metric-value">{{ streakData?.longestStreak || 0 }}</span>
          <span class="metric-sub">days record</span>
        </div>
        <div class="stats-metric">
          <span class="metric-label">Current Streak</span>
          <span class="metric-value">{{ streakData?.currentStreak || 0 }}</span>
          <span class="metric-sub">days active</span>
        </div>
      </section>

      <!-- The Contribution Grid -->
      <section class="grid-wrapper card">
        <div class="grid-card-header">
          <h3>{{ totalCompletions }} completed tasks in {{ selectedYear }}</h3>
          <div class="legend">
            <span>Less</span>
            <div class="legend-cell intensity-0"></div>
            <div class="legend-cell intensity-1"></div>
            <div class="legend-cell intensity-2"></div>
            <div class="legend-cell intensity-3"></div>
            <span>More</span>
          </div>
        </div>

        <div class="contribution-scroll">
          <div class="contribution-grid-container">
            <!-- Day labels column -->
            <div class="day-labels">
              <span>Sun</span>
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
            </div>

            <!-- Month labels wrapper -->
            <div class="grid-content-area">
              <div class="month-labels">
                <span *ngFor="let month of monthHeaders" [style.grid-column-start]="month.colIndex">
                  {{ month.name }}
                </span>
              </div>

              <!-- Cells matrix -->
              <div class="cells-matrix">
                <div 
                  *ngFor="let cell of displayCells" 
                  [class]="'grid-cell intensity-' + cell.intensity"
                  [class.placeholder-cell]="cell.isEmptyPlaceholder"
                  [attr.data-tooltip]="cell.isEmptyPlaceholder ? null : (cell.date + ': ' + cell.tasksCompleted + ' completed task' + (cell.tasksCompleted === 1 ? '' : 's'))">
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Detailed Grid Analysis -->
      <section class="grid-analysis-row">
        <!-- Frequency Breakdown -->
        <div class="card analysis-card">
          <h3>Consistency Habits</h3>
          <p class="subtitle">Distribution of task completing intensities throughout the year.</p>
          
          <div class="intensity-bar-chart">
            <div class="bar-row">
              <div class="bar-label">No completions</div>
              <div class="bar-fill-track">
                <div class="bar-fill" [style.width.%]="getIntensityPercentage(0)"></div>
              </div>
              <div class="bar-value">{{ getIntensityCount(0) }} days</div>
            </div>
            
            <div class="bar-row">
              <div class="bar-label">1-2 tasks (Low)</div>
              <div class="bar-fill-track">
                <div class="bar-fill intensity-1" [style.width.%]="getIntensityPercentage(1)"></div>
              </div>
              <div class="bar-value">{{ getIntensityCount(1) }} days</div>
            </div>

            <div class="bar-row">
              <div class="bar-label">3-5 tasks (Medium)</div>
              <div class="bar-fill-track">
                <div class="bar-fill intensity-2" [style.width.%]="getIntensityPercentage(2)"></div>
              </div>
              <div class="bar-value">{{ getIntensityCount(2) }} days</div>
            </div>

            <div class="bar-row">
              <div class="bar-label">6+ tasks (High)</div>
              <div class="bar-fill-track">
                <div class="bar-fill intensity-3" [style.width.%]="getIntensityPercentage(3)"></div>
              </div>
              <div class="bar-value">{{ getIntensityCount(3) }} days</div>
            </div>
          </div>
        </div>

        <!-- Productivity Summary -->
        <div class="card analysis-card">
          <h3>Workspace Highlights</h3>
          <ul class="highlights-list">
            <li>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              <div>
                <strong>Average Completions</strong>
                <span>{{ (totalCompletions / 365) | number:'1.2-2' }} tasks per day</span>
              </div>
            </li>
            <li>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
              <div>
                <strong>Active Days Ratio</strong>
                <span>Completed at least 1 task on {{ activeDaysCount }} out of 365 days</span>
              </div>
            </li>
            <li>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5"></path><path d="M2 12l10 5 10-5"></path></svg>
              <div>
                <strong>Habit Formation Index</strong>
                <span>{{ (streakData?.currentStreak || 0) > 10 ? 'High Consistency' : 'Building Habits' }}</span>
              </div>
            </li>
          </ul>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .grid-page-container {
      padding: 2.5rem;
      display: flex;
      flex-direction: column;
      gap: 2rem;
      max-width: 1200px;
      margin: 0 auto;
      width: 100%;
    }

    .grid-page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .subtitle {
      font-size: 0.9rem;
      color: var(--text-secondary);
      margin-top: 0.25rem;
    }

    .year-filter {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .year-label {
      margin: 0;
    }

    .year-select {
      min-width: 120px;
      padding: 0.5rem 0.75rem;
    }

    /* Stats Panel */
    .stats-panel {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      padding: 1.5rem 2rem;
      gap: 1.5rem;
    }

    .stats-metric {
      display: flex;
      flex-direction: column;
      text-align: center;
    }

    .stats-metric:not(:last-child) {
      border-right: 1px solid var(--border);
    }

    .metric-label {
      font-size: 0.75rem;
      color: var(--text-muted);
      text-transform: uppercase;
      font-weight: 600;
      letter-spacing: 0.05em;
    }

    .metric-value {
      font-size: 2rem;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0.25rem 0;
      font-family: var(--font-display);
    }

    .metric-sub {
      font-size: 0.75rem;
      color: var(--text-secondary);
    }

    /* Grid Layout Card */
    .grid-wrapper {
      padding: 1.75rem;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .grid-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
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

    .contribution-scroll {
      width: 100%;
      overflow-x: auto;
      padding-bottom: 0.5rem;
    }

    .contribution-grid-container {
      display: flex;
      gap: 0.5rem;
      width: max-content;
    }

    .day-labels {
      display: grid;
      grid-template-rows: repeat(7, 12px);
      gap: 3px;
      font-size: 0.65rem;
      color: var(--text-muted);
      align-items: center;
      padding-top: 15px; /* offset month row */
    }

    .day-labels span {
      height: 12px;
      line-height: 12px;
    }

    .grid-content-area {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .month-labels {
      display: grid;
      grid-template-columns: repeat(53, 12px);
      gap: 3px;
      font-size: 0.65rem;
      color: var(--text-muted);
      margin-bottom: 3px;
    }

    .cells-matrix {
      display: grid;
      grid-template-rows: repeat(7, 12px);
      grid-auto-flow: column;
      gap: 3px;
      position: relative;
    }

    .grid-cell {
      width: 12px;
      height: 12px;
      border-radius: 2px;
      background: var(--grid-intensity-0);
      position: relative;
      cursor: pointer;
    }

    .grid-cell.intensity-0 { background: var(--grid-intensity-0); }
    .grid-cell.intensity-1 { background: var(--grid-intensity-1); }
    .grid-cell.intensity-2 { background: var(--grid-intensity-2); }
    .grid-cell.intensity-3 { background: var(--grid-intensity-3); }
    
    .placeholder-cell {
      opacity: 0;
      cursor: default;
      pointer-events: none;
    }

    /* Tooltip styling */
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

    /* Analysis Panel */
    .grid-analysis-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
    }

    .analysis-card {
      padding: 1.75rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .intensity-bar-chart {
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
      margin-top: 0.5rem;
    }

    .bar-row {
      display: flex;
      align-items: center;
      gap: 1rem;
      font-size: 0.8125rem;
    }

    .bar-label {
      width: 120px;
      color: var(--text-secondary);
    }

    .bar-fill-track {
      flex: 1;
      height: 6px;
      background: var(--surface-hover);
      border-radius: 3px;
      overflow: hidden;
    }

    .bar-fill {
      height: 100%;
      background: var(--border-hover);
      border-radius: 3px;
    }

    .bar-fill.intensity-1 { background: var(--grid-intensity-1); }
    .bar-fill.intensity-2 { background: var(--grid-intensity-2); }
    .bar-fill.intensity-3 { background: var(--grid-intensity-3); }

    .bar-value {
      width: 60px;
      text-align: right;
      color: var(--text-primary);
      font-weight: 500;
    }

    /* Highlights list */
    .highlights-list {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      margin-top: 0.5rem;
    }

    .highlights-list li {
      display: flex;
      gap: 1rem;
      align-items: flex-start;
    }

    .highlights-list li svg {
      color: var(--text-secondary);
      flex-shrink: 0;
      margin-top: 0.125rem;
    }

    .highlights-list li div {
      display: flex;
      flex-direction: column;
    }

    .highlights-list li strong {
      font-size: 0.875rem;
      color: var(--text-primary);
      font-weight: 600;
    }

    .highlights-list li span {
      font-size: 0.8125rem;
      color: var(--text-secondary);
    }

    @media (max-width: 1024px) {
      .grid-analysis-row {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 768px) {
      .stats-panel {
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
      }
      .stats-metric:nth-child(even) {
        border-right: none;
      }
      .grid-page-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 1rem;
      }
    }
  `]
})
export class GridComponent implements OnInit {
  private gridService = inject(GridService);
  private streakService = inject(StreakService);

  public selectedYear = new Date().getFullYear();
  public availableYears: number[] = [2026, 2025];
  public streakData: StreakData | null = null;

  // Grid Data
  public apiGridData: GridCell[] = [];
  public displayCells: GridDisplayCell[] = [];
  public monthHeaders: { name: string; colIndex: number }[] = [];

  // Summary Metrics
  public totalCompletions = 0;
  public activeDaysCount = 0;

  ngOnInit() {
    this.loadGridAndStreakData();
  }

  private loadGridAndStreakData() {
    forkJoin({
      grid: this.gridService.getGridData().pipe(catchError(() => of({ success: true, totalContributionDays: 0, gridData: [] }))),
      streak: this.streakService.getStreak().pipe(catchError(() => of({ success: true, streak: null })))
    }).subscribe(({ grid, streak }) => {
      if (grid.success && grid.gridData) {
        this.apiGridData = grid.gridData;
      }
      if (streak.success && streak.streak) {
        this.streakData = streak.streak;
      }
      this.generateFullYearGrid();
    });
  }

  public onYearChange() {
    this.generateFullYearGrid();
  }

  private generateFullYearGrid() {
    const year = Number(this.selectedYear);
    const cells: GridDisplayCell[] = [];
    
    // Create Date maps of API responses
    const dataMap = new Map<string, GridCell>();
    this.apiGridData.forEach(c => dataMap.set(c.date, c));

    // Jan 1st of Selected Year
    const startDate = new Date(year, 0, 1);
    // Dec 31st of Selected Year
    const endDate = new Date(year, 11, 31);
    
    // Day of the week for Jan 1st (0 = Sun, 1 = Mon ... 6 = Sat)
    const startDayOfWeek = startDate.getDay();

    // 1. Add placeholders for days of week prior to Jan 1st
    for (let i = 0; i < startDayOfWeek; i++) {
      cells.push({
        date: '',
        tasksCompleted: 0,
        intensity: 0,
        isEmptyPlaceholder: true,
        dayName: ''
      });
    }

    const monthStarts: { [key: number]: number } = {}; // maps month index to column index

    // 2. Loop through all 365 (or 366) days
    const current = new Date(startDate);
    let cellCounter = startDayOfWeek;
    
    this.totalCompletions = 0;
    this.activeDaysCount = 0;

    const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    while (current <= endDate) {
      const dateStr = current.toISOString().split('T')[0];
      const monthIdx = current.getMonth();
      const colIdx = Math.floor(cellCounter / 7) + 1; // 1-indexed column

      // Store column index when month starts
      if (monthStarts[monthIdx] === undefined) {
        monthStarts[monthIdx] = colIdx;
      }

      let intensity = 0;
      let tasksCompleted = 0;

      if (dataMap.has(dateStr)) {
        const item = dataMap.get(dateStr)!;
        intensity = item.intensity;
        tasksCompleted = item.tasksCompleted;
        this.totalCompletions += tasksCompleted;
        if (tasksCompleted > 0) {
          this.activeDaysCount++;
        }
      }

      cells.push({
        date: dateStr,
        tasksCompleted,
        intensity,
        isEmptyPlaceholder: false,
        dayName: weekdayNames[current.getDay()]
      });

      cellCounter++;
      current.setDate(current.getDate() + 1);
    }

    this.displayCells = cells;

    // 3. Generate Month headers
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    this.monthHeaders = Object.entries(monthStarts).map(([mIdx, colIndex]) => ({
      name: monthNames[Number(mIdx)],
      colIndex
    }));
  }

  // Habits Breakdown Helpers
  public getIntensityCount(level: number): number {
    return this.displayCells.filter(c => !c.isEmptyPlaceholder && c.intensity === level).length;
  }

  public getIntensityPercentage(level: number): number {
    const totalDays = this.displayCells.filter(c => !c.isEmptyPlaceholder).length;
    if (totalDays === 0) return 0;
    return (this.getIntensityCount(level) / totalDays) * 100;
  }
}
