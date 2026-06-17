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
    <div class="grid-page-container animate-fade-in">
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

      <!-- Stats Panel Row (animated counters) -->
      <section class="stats-panel card" [class.loading]="loading">
        <ng-container *ngIf="!loading; else skeletonStats">
          <div class="stats-metric">
            <span class="metric-label">Total Completions</span>
            <span class="metric-value">{{ animatedTotalCompletions }}</span>
            <span class="metric-sub">in {{ selectedYear }}</span>
          </div>
          <div class="stats-metric">
            <span class="metric-label">Active Days</span>
            <span class="metric-value">{{ animatedActiveDays }}</span>
            <span class="metric-sub">{{ ((animatedActiveDays / 365) * 100) | number:'1.1-1' }}% of year</span>
          </div>
          <div class="stats-metric">
            <span class="metric-label">Longest Streak</span>
            <span class="metric-value">{{ animatedLongestStreak }}</span>
            <span class="metric-sub">days record</span>
          </div>
          <div class="stats-metric">
            <span class="metric-label">Current Streak</span>
            <span class="metric-value text-accent">{{ animatedCurrentStreak }}</span>
            <span class="metric-sub">days active</span>
          </div>
        </ng-container>
      </section>

      <!-- Skeleton Stats Template -->
      <ng-template #skeletonStats>
        <div class="stats-metric" *ngFor="let i of [1,2,3,4]">
          <div class="skeleton skeleton-label"></div>
          <div class="skeleton skeleton-val"></div>
          <div class="skeleton skeleton-sub"></div>
        </div>
      </ng-template>

      <!-- The Contribution Grid -->
      <section class="grid-wrapper card" [class.loading]="loading">
        <ng-container *ngIf="!loading; else skeletonGrid">
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
        </ng-container>
      </section>

      <!-- Skeleton Grid Template -->
      <ng-template #skeletonGrid>
        <div class="skeleton skeleton-grid-header"></div>
        <div class="skeleton skeleton-grid-body"></div>
      </ng-template>

      <!-- Detailed Grid Analysis -->
      <section class="grid-analysis-row" *ngIf="!loading">
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
      width: 13px;
      height: 13px;
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
      gap: 0.625rem;
      width: max-content;
    }

    .day-labels {
      display: grid;
      grid-template-rows: repeat(7, 13px);
      gap: 3px;
      font-size: 0.65rem;
      color: var(--text-muted);
      align-items: center;
      padding-top: 17px; /* offset month row */
    }

    .day-labels span {
      height: 13px;
      line-height: 13px;
    }

    .grid-content-area {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .month-labels {
      display: grid;
      grid-template-columns: repeat(53, 13px);
      gap: 3px;
      font-size: 0.65rem;
      color: var(--text-muted);
      margin-bottom: 4px;
    }

    .cells-matrix {
      display: grid;
      grid-template-rows: repeat(7, 13px);
      grid-auto-flow: column;
      gap: 3px;
      position: relative;
    }

    .grid-cell {
      width: 13px;
      height: 13px;
      border-radius: 2px;
      background: var(--grid-intensity-0);
      position: relative;
      cursor: pointer;
      transition: all 0.22s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .grid-cell.intensity-0 { background: var(--grid-intensity-0); }
    
    .grid-cell.intensity-1 { 
      background: var(--grid-intensity-1); 
    }
    
    .grid-cell.intensity-2 { 
      background: var(--grid-intensity-2); 
      box-shadow: 0 0 3px rgba(120, 120, 128, 0.2);
    }
    
    .grid-cell.intensity-3 { 
      background: var(--grid-intensity-3); 
      box-shadow: 0 0 6px rgba(199, 199, 204, 0.5);
    }

    .grid-cell:hover {
      transform: scale(1.3);
      box-shadow: 0 0 10px rgba(199, 199, 204, 0.8) !important;
      z-index: 10;
    }
    
    .placeholder-cell {
      opacity: 0;
      cursor: default;
      pointer-events: none;
    }

    /* Enhanced premium glass tooltip */
    .grid-cell[data-tooltip]:hover::after {
      content: attr(data-tooltip);
      position: absolute;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(28, 28, 31, 0.9);
      border: 1px solid var(--border-glow);
      color: var(--text-primary);
      padding: 0.45rem 0.75rem;
      border-radius: var(--radius);
      font-size: 0.7rem;
      font-weight: 500;
      white-space: nowrap;
      z-index: 100;
      box-shadow: var(--glow-silver-sm);
      pointer-events: none;
      backdrop-filter: blur(4px);
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

    /* Skeletons */
    .skeleton-label {
      height: 0.85rem;
      width: 50%;
      margin: 0 auto;
    }
    .skeleton-val {
      height: 2rem;
      width: 70%;
      margin: 0.4rem auto;
    }
    .skeleton-sub {
      height: 0.75rem;
      width: 40%;
      margin: 0 auto;
    }
    .skeleton-grid-header {
      height: 1.5rem;
      width: 40%;
    }
    .skeleton-grid-body {
      height: 120px;
      width: 100%;
    }

    @media (max-width: 1024px) {
      .grid-analysis-row {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 768px) {
      .grid-page-container {
        padding: 1.25rem 1rem;
        padding-bottom: calc(var(--mobile-nav-height) + 1.25rem);
        gap: 1.25rem;
      }

      .grid-page-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.875rem;
      }

      .grid-page-header h1 {
        font-size: 1.4rem;
      }

      .year-filter {
        width: 100%;
      }

      .year-select {
        min-width: 100%;
        padding: 0.45rem 0.65rem;
        font-size: 0.8125rem;
      }

      .stats-panel {
        grid-template-columns: 1fr 1fr;
        gap: 0.75rem;
        padding: 1.25rem;
      }

      .stats-metric:nth-child(even) {
        border-right: none;
      }

      .stats-metric:nth-child(n+3) {
        border-top: 1px solid var(--border);
        padding-top: 0.75rem;
      }

      .metric-value {
        font-size: 1.65rem;
      }

      .grid-wrapper {
        padding: 1.25rem 1rem;
        gap: 1rem;
      }

      .grid-card-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.75rem;
      }

      .grid-card-header h3 {
        font-size: 0.875rem;
      }

      .analysis-card {
        padding: 1.25rem;
      }

      .bar-label {
        width: 90px;
        font-size: 0.75rem;
      }

      .bar-value {
        width: 50px;
        font-size: 0.75rem;
      }
    }

    @media (max-width: 480px) {
      .grid-page-container {
        padding: 1rem 0.875rem;
        padding-bottom: calc(var(--mobile-nav-height) + 1rem);
        gap: 1rem;
      }

      .grid-page-header h1 {
        font-size: 1.25rem;
      }

      .subtitle {
        font-size: 0.8125rem;
      }

      .stats-panel {
        grid-template-columns: 1fr 1fr;
        padding: 1rem;
        gap: 0.625rem;
      }

      .metric-value {
        font-size: 1.375rem;
      }

      .metric-label {
        font-size: 0.6875rem;
      }

      .grid-wrapper {
        padding: 1rem 0.75rem;
      }

      /* Make grid cells smaller for tight screens */
      .grid-cell {
        width: 11px;
        height: 11px;
      }

      .cells-matrix {
        grid-template-rows: repeat(7, 11px);
      }

      .day-labels {
        grid-template-rows: repeat(7, 11px);
      }

      .month-labels {
        grid-template-columns: repeat(53, 11px);
      }

      .bar-label {
        width: 80px;
        font-size: 0.6875rem;
      }

      .highlights-list li strong {
        font-size: 0.8125rem;
      }

      .highlights-list li span {
        font-size: 0.75rem;
      }
    }

    @media (max-width: 360px) {
      .grid-page-container {
        padding: 0.875rem 0.75rem;
        padding-bottom: calc(var(--mobile-nav-height) + 0.875rem);
      }

      .grid-page-header h1 {
        font-size: 1.125rem;
      }

      .stats-panel {
        grid-template-columns: 1fr 1fr;
        padding: 0.875rem;
        gap: 0.5rem;
      }

      .metric-value {
        font-size: 1.25rem;
      }

      .grid-cell {
        width: 10px;
        height: 10px;
      }

      .cells-matrix {
        grid-template-rows: repeat(7, 10px);
      }

      .day-labels {
        grid-template-rows: repeat(7, 10px);
        padding-top: 16px;
      }

      .month-labels {
        grid-template-columns: repeat(53, 10px);
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
  public loading = true;

  // Animated counters
  public animatedTotalCompletions = 0;
  public animatedActiveDays = 0;
  public animatedLongestStreak = 0;
  public animatedCurrentStreak = 0;

  // Grid Data
  public apiGridData: GridCell[] = [];
  public displayCells: GridDisplayCell[] = [];
  public monthHeaders: { name: string; colIndex: number }[] = [];

  // Summary Metrics
  public totalCompletions = 0;
  public activeDaysCount = 0;

  private counterIntervals: any[] = [];

  ngOnInit() {
    this.loadGridAndStreakData();
  }

  private loadGridAndStreakData() {
    this.loading = true;
    forkJoin({
      grid: this.gridService.getGridData().pipe(catchError(() => of({ success: true, totalContributionDays: 0, gridData: [] }))),
      streak: this.streakService.getStreak().pipe(catchError(() => of({ success: true, streak: null })))
    }).subscribe(({ grid, streak }) => {
      this.loading = false;
      if (grid.success && grid.gridData) {
        this.apiGridData = grid.gridData;
      }
      if (streak.success && streak.streak) {
        this.streakData = streak.streak;
      }
      this.generateFullYearGrid();
      this.startAnimatedCounters();
    });
  }

  public onYearChange() {
    this.generateFullYearGrid();
    this.startAnimatedCounters();
  }

  private startAnimatedCounters() {
    this.counterIntervals.forEach(i => clearInterval(i));
    this.counterIntervals = [];

    const targetTotal = this.totalCompletions;
    const targetActive = this.activeDaysCount;
    const targetLongest = this.streakData?.longestStreak || 0;
    const targetCurrent = this.streakData?.currentStreak || 0;

    this.animatedTotalCompletions = 0;
    this.animatedActiveDays = 0;
    this.animatedLongestStreak = 0;
    this.animatedCurrentStreak = 0;

    const totalStep = Math.max(1, Math.floor(targetTotal / 30));
    const activeStep = Math.max(1, Math.floor(targetActive / 30));
    const longestStep = Math.max(1, Math.floor(targetLongest / 30));
    const currentStep = Math.max(1, Math.floor(targetCurrent / 30));

    const iTotal = setInterval(() => {
      if (this.animatedTotalCompletions < targetTotal) {
        this.animatedTotalCompletions = Math.min(targetTotal, this.animatedTotalCompletions + totalStep);
      } else {
        clearInterval(iTotal);
      }
    }, 20);
    this.counterIntervals.push(iTotal);

    const iActive = setInterval(() => {
      if (this.animatedActiveDays < targetActive) {
        this.animatedActiveDays = Math.min(targetActive, this.animatedActiveDays + activeStep);
      } else {
        clearInterval(iActive);
      }
    }, 20);
    this.counterIntervals.push(iActive);

    const iLongest = setInterval(() => {
      if (this.animatedLongestStreak < targetLongest) {
        this.animatedLongestStreak = Math.min(targetLongest, this.animatedLongestStreak + longestStep);
      } else {
        clearInterval(iLongest);
      }
    }, 20);
    this.counterIntervals.push(iLongest);

    const iCurrent = setInterval(() => {
      if (this.animatedCurrentStreak < targetCurrent) {
        this.animatedCurrentStreak = Math.min(targetCurrent, this.animatedCurrentStreak + currentStep);
      } else {
        clearInterval(iCurrent);
      }
    }, 20);
    this.counterIntervals.push(iCurrent);
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
