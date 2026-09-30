import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

export const LEAGUES = [
  { name: 'Rookie',   min: 0,    color: '#71717a', bg: 'rgba(113, 113, 122, 0.12)', border: 'rgba(113, 113, 122, 0.25)' },
  { name: 'Bronze',   min: 100,  color: '#cd7f32', bg: 'rgba(205, 127, 50, 0.14)',  border: 'rgba(205, 127, 50, 0.3)' },
  { name: 'Silver',   min: 300,  color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.14)', border: 'rgba(148, 163, 184, 0.3)' },
  { name: 'Gold',     min: 700,  color: '#eab308', bg: 'rgba(234, 179, 8, 0.14)',   border: 'rgba(234, 179, 8, 0.35)' },
  { name: 'Platinum', min: 1500, color: '#22d3ee', bg: 'rgba(34, 211, 238, 0.14)',  border: 'rgba(34, 211, 238, 0.35)' },
  { name: 'Diamond',  min: 3000, color: '#818cf8', bg: 'rgba(129, 140, 248, 0.15)', border: 'rgba(129, 140, 248, 0.35)' },
  { name: 'Master',   min: 6000, color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.16)',  border: 'rgba(244, 63, 94, 0.4)' },
];

export function calculateLeague(points: number = 0): string {
  for (let i = LEAGUES.length - 1; i >= 0; i--) {
    if (points >= LEAGUES[i].min) {
      return LEAGUES[i].name;
    }
  }
  return 'Rookie';
}

@Component({
  selector: 'app-league-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span
      class="league-badge"
      [class]="'league-' + currentLeague.toLowerCase()"
      [title]="currentLeague + ' League' + (points !== undefined ? ' (' + points + ' pts)' : '')"
    >
      <span class="league-icon" [ngSwitch]="currentLeague.toLowerCase()">
        <svg *ngSwitchCase="'master'" width="9" height="9" viewBox="0 0 24 24" fill="currentColor">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
        </svg>
        <svg *ngSwitchCase="'diamond'" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polygon points="6 3 18 3 22 9 12 22 2 9"></polygon>
        </svg>
        <svg *ngSwitchCase="'platinum'" width="9" height="9" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="6"></circle>
        </svg>
        <svg *ngSwitchCase="'gold'" width="9" height="9" viewBox="0 0 24 24" fill="currentColor">
          <polygon points="12 2 15 8 21 9 17 14 18 20 12 17 6 20 7 14 3 9 9 8"></polygon>
        </svg>
        <svg *ngSwitchDefault width="8" height="8" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="5"></circle>
        </svg>
      </span>
      <span class="league-text">{{ currentLeague }}</span>
    </span>
  `,
  styles: [`
    .league-badge {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      padding: 1px 6px;
      border-radius: 999px;
      font-size: 0.65rem;
      font-weight: 600;
      letter-spacing: 0.03em;
      text-transform: uppercase;
      line-height: 1.35;
      vertical-align: middle;
      user-select: none;
      white-space: nowrap;
      flex-shrink: 0;
      border: 1px solid transparent;
      box-sizing: border-box;
      max-height: 18px;
    }

    .league-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
    }

    .league-text {
      font-family: var(--font-sans);
    }

    /* League-specific themes */
    .league-rookie {
      color: #94a3b8;
      background: rgba(148, 163, 184, 0.1);
      border-color: rgba(148, 163, 184, 0.22);
    }

    .league-bronze {
      color: #d97706;
      background: rgba(217, 119, 6, 0.12);
      border-color: rgba(217, 119, 6, 0.28);
    }

    .league-silver {
      color: #cbd5e1;
      background: rgba(203, 213, 225, 0.12);
      border-color: rgba(203, 213, 225, 0.26);
    }

    .league-gold {
      color: #eab308;
      background: rgba(234, 179, 8, 0.14);
      border-color: rgba(234, 179, 8, 0.35);
      box-shadow: 0 0 6px rgba(234, 179, 8, 0.15);
    }

    .league-platinum {
      color: #22d3ee;
      background: rgba(34, 211, 238, 0.12);
      border-color: rgba(34, 211, 238, 0.32);
      box-shadow: 0 0 6px rgba(34, 211, 238, 0.15);
    }

    .league-diamond {
      color: #818cf8;
      background: rgba(129, 140, 248, 0.14);
      border-color: rgba(129, 140, 248, 0.35);
      box-shadow: 0 0 8px rgba(129, 140, 248, 0.2);
    }

    .league-master {
      color: #f43f5e;
      background: rgba(244, 63, 94, 0.14);
      border-color: rgba(244, 63, 94, 0.38);
      box-shadow: 0 0 8px rgba(244, 63, 94, 0.22);
    }
  `]
})
export class LeagueBadgeComponent implements OnChanges {
  @Input() league?: string;
  @Input() points?: number;

  public currentLeague = 'Rookie';

  ngOnChanges(): void {
    if (this.league) {
      this.currentLeague = this.league;
    } else if (this.points !== undefined && this.points !== null) {
      this.currentLeague = calculateLeague(this.points);
    } else {
      this.currentLeague = 'Rookie';
    }
  }
}
