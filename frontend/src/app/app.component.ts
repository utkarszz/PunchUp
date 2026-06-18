import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from './shared/components/sidebar/sidebar.component';
import { CommandPaletteComponent } from './shared/components/command-palette/command-palette.component';
import { AuthService } from './core/services/auth.service';
import { BackendWakeupService } from './core/services/backend-wakeup.service';
import { ToastComponent } from './shared/components/toast/toast.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, RouterLink, RouterLinkActive, SidebarComponent, CommandPaletteComponent, ToastComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  private authService = inject(AuthService);
  public wakeupService = inject(BackendWakeupService);
  public isAuthenticated = false;

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.isAuthenticated = !!user;
    });

    if (typeof window === 'undefined') return;

    // ── Type guard: is element an interactive form control? ─────────────────
    const isFormControl = (el: EventTarget | null): el is HTMLElement =>
      !!el && ['INPUT', 'TEXTAREA', 'SELECT'].includes((el as HTMLElement).tagName);

    // ── Scroll element into the center of the visible viewport ──────────────
    // scrollIntoView correctly handles BOTH window scroll (page forms)
    // AND inner container scroll (fixed modals, drawers) automatically.
    const centerElement = (el: HTMLElement) => {
      el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    };

    // ── 1. Visual Viewport tracking — keeps --visual-vh in sync with keyboard ─
    const updateVh = () => {
      const h = window.visualViewport?.height ?? window.innerHeight;
      document.documentElement.style.setProperty('--visual-vh', `${h}px`);
      document.body.classList.toggle('keyboard-open', window.innerHeight - h > 120);
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', () => {
        updateVh();
        // Re-center the focused input after the keyboard finishes animating
        const active = document.activeElement;
        if (isFormControl(active)) {
          requestAnimationFrame(() => centerElement(active));
        }
      });
      window.visualViewport.addEventListener('scroll', updateVh);
      updateVh();
    }

    // ── 2. Auto-scroll any focused input / textarea / select into view ───────
    document.addEventListener('focusin', (e: Event) => {
      if (!isFormControl(e.target)) return;
      const el = e.target;
      requestAnimationFrame(() => centerElement(el));
    }, true);

    // ── 3. Keyboard-close reset — prevents stuck blank gap on Android ────────
    document.addEventListener('focusout', (e: Event) => {
      if (!isFormControl(e.target)) return;
      setTimeout(() => {
        if (!isFormControl(document.activeElement)) {
          window.scrollTo({ top: window.scrollY, behavior: 'instant' });
        }
      }, 150);
    }, true);

    // ── 4. Form submit — scroll to first invalid field automatically ─────────
    document.addEventListener('submit', (e: Event) => {
      const form = e.target as HTMLFormElement | null;
      if (!form) return;
      const first = form.querySelector(
        'input:invalid, textarea:invalid, select:invalid'
      ) as HTMLElement | null;
      if (first) {
        first.focus();
        requestAnimationFrame(() => centerElement(first));
      }
    }, true);
  }
}
