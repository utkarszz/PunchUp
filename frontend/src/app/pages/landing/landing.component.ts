import { Component, OnInit, AfterViewInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

interface GridCell {
  lit: boolean;
  pulse: boolean;
  dim: boolean;
}

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.css']
})
export class LandingComponent implements OnInit, AfterViewInit, OnDestroy {
  public authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  // Grid state
  public gridCells: GridCell[] = [];
  public monthHeaders: { name: string; colIndex: number }[] = [];

  // Animation state
  public gridFilling = false;
  public gridFull = false;
  public filledCount = 0;
  public totalCells = 98; // 14 cols × 7 rows
  public get fillPercent(): number {
    return Math.round((this.filledCount / this.totalCells) * 100);
  }

  private fillTimer: any;
  private resetTimer: any;
  private scrollInterval: any;
  private observer: IntersectionObserver | null = null;

  ngOnInit() {
    const isExplicitHome = this.route.snapshot.queryParams['home'] === 'true';
    if (this.authService.currentUserValue && !isExplicitHome) {
      this.router.navigate(['/community']);
      return;
    }
    this.buildEmptyGrid();
    this.buildMonthHeaders();
  }

  ngAfterViewInit() {
    this.initScrollReveal();
    this.initAutoScroll();
    // Small delay then start the animation loop
    setTimeout(() => this.startFillAnimation(), 600);
  }

  ngOnDestroy() {
    clearTimeout(this.fillTimer);
    clearTimeout(this.resetTimer);
    clearInterval(this.scrollInterval);
    this.observer?.disconnect();
  }

  // ── Grid Setup ────────────────────────────────────────────────────────────

  private buildEmptyGrid() {
    this.gridCells = Array.from({ length: this.totalCells }, () => ({
      lit: false,
      pulse: false,
      dim: false
    }));
  }

  private buildMonthHeaders() {
    const today = new Date();
    let lastMonth = '';
    for (let col = 0; col < 14; col++) {
      const date = new Date(today);
      date.setDate(today.getDate() - ((13 - col) * 7));
      const month = date.toLocaleDateString('en-US', { month: 'short' });
      if (month !== lastMonth) {
        this.monthHeaders.push({ name: month, colIndex: col });
        lastMonth = month;
      }
    }
  }

  // ── Fill Animation ────────────────────────────────────────────────────────

  private startFillAnimation() {
    // Reset to completely empty
    this.gridFilling = false;
    this.gridFull = false;
    this.filledCount = 0;
    this.gridCells.forEach(c => { c.lit = false; c.pulse = false; c.dim = false; });

    // Small pause in empty state so user can read the message
    this.fillTimer = setTimeout(() => this.fillNext(0), 900);
  }

  private fillNext(index: number) {
    if (index >= this.totalCells) {
      // Grid is full
      this.gridFilling = false;
      this.gridFull = true;
      // After 2.5 s pause on "full" state, reset and loop
      this.resetTimer = setTimeout(() => this.startFillAnimation(), 2500);
      return;
    }

    this.gridFilling = true;
    const cell = this.gridCells[index];
    cell.lit = true;
    cell.pulse = true;
    this.filledCount = index + 1;

    // Remove pulse after its CSS animation completes
    setTimeout(() => { cell.pulse = false; }, 380);

    // Speed: starts slow (60ms), accelerates as grid fills, settles fast near end
    const progress = index / this.totalCells;
    const delay = progress < 0.15
      ? 55                                     // slow at the start — feels intentional
      : progress < 0.85
        ? Math.max(18, 55 - progress * 50)    // smooth ramp-up
        : 14;                                  // fast sprint to the finish

    this.fillTimer = setTimeout(() => this.fillNext(index + 1), delay);
  }

  // ── Scroll / Reveal ───────────────────────────────────────────────────────

  private initScrollReveal() {
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          this.observer?.unobserve(e.target);
        }
      });
    }, { threshold: 0.12 });

    document.querySelectorAll('.section-reveal').forEach(el => {
      this.observer?.observe(el);
    });
  }

  private initAutoScroll() {
    const showcase = document.querySelector('.showcase-scroll') as HTMLElement;
    if (!showcase) return;
    let paused = false;
    showcase.addEventListener('mouseenter', () => { paused = true; });
    showcase.addEventListener('mouseleave', () => { paused = false; });
    this.scrollInterval = setInterval(() => {
      if (!paused) {
        showcase.scrollLeft += 1;
        if (showcase.scrollLeft >= showcase.scrollWidth - showcase.clientWidth) {
          showcase.scrollLeft = 0;
        }
      }
    }, 20);
  }

  public login() {
    this.authService.loginWithGoogle();
  }
}

