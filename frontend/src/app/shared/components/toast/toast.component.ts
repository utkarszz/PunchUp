import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, ToastMessage } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container">
      <div 
        *ngFor="let toast of toastService.toasts$ | async" 
        class="toast-card card" 
        [ngClass]="toast.type"
      >
        <!-- Icon -->
        <span class="toast-icon">
          <svg *ngIf="toast.type === 'success'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          <svg *ngIf="toast.type === 'error'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line>
          </svg>
          <svg *ngIf="toast.type === 'info'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
        </span>

        <!-- Message -->
        <div class="toast-message">{{ toast.message }}</div>

        <!-- Close button -->
        <button (click)="toastService.remove(toast.id)" class="toast-close-btn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      top: 1.5rem;
      right: 1.5rem;
      z-index: 10000;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      pointer-events: none;
      max-width: 380px;
      width: calc(100% - 3rem);
    }

    .toast-card {
      display: flex;
      align-items: center;
      gap: 0.875rem;
      padding: 1rem 1.25rem;
      border-radius: var(--radius);
      background: rgba(23, 23, 26, 0.95);
      border: 1px solid var(--border-glow);
      box-shadow: var(--shadow-lg), var(--glow-silver-sm);
      backdrop-filter: blur(12px);
      pointer-events: auto;
      animation: toast-slide-in 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      min-width: 280px;
    }

    .toast-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .toast-card.success .toast-icon { color: var(--success); }
    .toast-card.error .toast-icon { color: var(--danger); }
    .toast-card.info .toast-icon { color: var(--accent); }

    .toast-card.success { border-color: rgba(34, 197, 94, 0.25); }
    .toast-card.error { border-color: rgba(239, 68, 68, 0.25); }
    .toast-card.info { border-color: rgba(199, 199, 204, 0.25); }

    .toast-message {
      font-size: 0.875rem;
      color: var(--text-primary);
      line-height: 1.4;
      flex: 1;
      font-weight: 500;
    }

    .toast-close-btn {
      background: none;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0.25rem;
      border-radius: 4px;
      transition: color var(--transition-fast), background-color var(--transition-fast);
    }

    .toast-close-btn:hover {
      color: var(--text-primary);
      background-color: var(--surface-hover);
    }

    @keyframes toast-slide-in {
      from {
        opacity: 0;
        transform: translateY(-1rem) scale(0.96);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    /* Mobile overrides */
    @media (max-width: 768px) {
      .toast-container {
        top: 1rem;
        right: 50%;
        transform: translateX(50%);
        max-width: 480px;
        width: calc(100% - 2rem);
      }

      .toast-card {
        padding: 0.875rem 1rem;
      }
    }
  `]
})
export class ToastComponent {
  public toastService = inject(ToastService);
}
