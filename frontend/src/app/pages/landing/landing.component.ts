import { Component, OnInit, AfterViewInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.css']
})
export class LandingComponent implements OnInit, AfterViewInit, OnDestroy {
  public authService = inject(AuthService);
  public mockGrid: { intensity: number; date: string; tasks: number }[] = [];
  public heroGrid: { intensity: number; active: boolean }[] = [];
  public streakCount = 0;
  private streakTarget = 100;
  private streakInterval: any;
  private scrollInterval: any;
  private observer: IntersectionObserver | null = null;

  ngOnInit() {
    this.generateMockGrid();
    this.generateHeroGrid();
    this.animateStreak();
  }

  ngAfterViewInit() {
    this.initScrollReveal();
    this.initAutoScroll();
    this.animateHeroGrid();
  }

  ngOnDestroy() {
    clearInterval(this.streakInterval);
    clearInterval(this.scrollInterval);
    this.observer?.disconnect();
  }

  private generateMockGrid() {
    const pattern = [0, 0, 1, 0, 2, 1, 0, 3, 0, 2, 1, 0, 0, 2, 3, 1, 0, 1, 2, 0];
    for (let i = 0; i < 140; i++) {
      const intensity = pattern[i % pattern.length];
      this.mockGrid.push({
        intensity,
        date: '2026-06-' + ((i % 30) + 1),
        tasks: [0, 1, 4, 8][intensity]
      });
    }
  }

  private generateHeroGrid() {
    for (let i = 0; i < 84; i++) {
      this.heroGrid.push({ intensity: 0, active: false });
    }
  }

  private animateHeroGrid() {
    const pattern = [0, 0, 1, 2, 1, 0, 3, 2, 1, 0, 0, 1, 2, 3, 1, 0, 1, 0, 2, 1, 3, 0, 1, 2, 0, 1, 0, 2, 1, 3, 1, 0, 2, 1, 0, 3, 2, 1, 0, 1, 2, 0, 1, 2, 3, 1, 0, 1, 0, 2, 1, 0, 3, 1, 2, 0, 1, 2, 3, 1, 0, 1, 2, 0, 1, 3, 0, 2, 1, 0, 1, 2, 3, 1, 0, 2, 1, 3, 0, 1, 2, 0, 3, 1];
    let idx = 0;
    const reveal = () => {
      if (idx < this.heroGrid.length) {
        this.heroGrid[idx].intensity = pattern[idx] ?? 0;
        this.heroGrid[idx].active = true;
        idx++;
        setTimeout(reveal, 18);
      }
    };
    setTimeout(reveal, 400);
  }

  private animateStreak() {
    let current = 1;
    this.streakCount = current;
    this.streakInterval = setInterval(() => {
      current += 1;
      this.streakCount = current;
      if (current >= this.streakTarget) clearInterval(this.streakInterval);
    }, 28);
  }

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
