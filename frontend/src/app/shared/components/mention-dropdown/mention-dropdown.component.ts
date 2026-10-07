import { Component, Input, Output, EventEmitter, ElementRef, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LeagueBadgeComponent } from '../league-badge/league-badge.component';

export interface MentionUser {
  _id: string;
  username: string;
  displayName?: string;
  profilePicture?: string;
  totalPoints?: number;
}

@Component({
  selector: 'app-mention-dropdown',
  standalone: true,
  imports: [CommonModule, LeagueBadgeComponent],
  template: `
    <div
      class="mention-dropdown-panel animate-scale-up"
      *ngIf="isOpen && (users.length > 0 || isLoading)"
      [ngClass]="'pos-' + position"
      (click)="$event.stopPropagation()"
    >
      <div class="mention-header" *ngIf="isLoading">
        <span class="mention-spinner"></span>
        <span class="header-text">Searching users...</span>
      </div>

      <div class="mention-header" *ngIf="!isLoading && users.length > 0">
        <span class="header-text">People</span>
        <span class="header-hint">↑↓ navigate · ↵ select · esc dismiss</span>
      </div>

      <div class="mention-list" *ngIf="!isLoading">
        <div
          *ngFor="let user of users; let i = index"
          class="mention-item"
          [class.selected]="i === selectedIndex"
          (mouseenter)="onItemHover(i)"
          (mousedown)="onSelectUser(user, $event)"
        >
          <img
            [src]="user.profilePicture || 'assets/default-avatar.png'"
            class="mention-avatar"
            [alt]="user.username"
            onerror="this.src='https://api.dicebear.com/7.x/bottts/svg?seed=u'"
          />
          <div class="mention-user-info">
            <div class="mention-name-row">
              <span class="mention-display-name">{{ user.displayName || user.username }}</span>
              <app-league-badge *ngIf="user.totalPoints !== undefined" [points]="user.totalPoints"></app-league-badge>
            </div>
            <span class="mention-username">&#64;{{ user.username }}</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      position: relative;
      width: 100%;
    }

    .mention-dropdown-panel {
      position: absolute;
      left: 0;
      right: 0;
      width: 100%;
      max-width: 100%;
      background: var(--surface-elevated, #18181b);
      border: 1px solid var(--border-hover, #3a3a40);
      border-radius: var(--radius-lg, 12px);
      box-shadow: var(--shadow-lg, 0 10px 30px rgba(0, 0, 0, 0.5));
      z-index: 1200;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      animation: mentionAppear 0.15s ease-out forwards;
    }

    .mention-dropdown-panel.pos-bottom {
      top: calc(100% + 6px);
    }

    .mention-dropdown-panel.pos-top {
      bottom: calc(100% + 6px);
    }

    @keyframes mentionAppear {
      from {
        opacity: 0;
        transform: translateY(-4px) scale(0.98);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    .mention-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.5rem 0.85rem;
      border-bottom: 1px solid var(--border, #222226);
      background: rgba(255, 255, 255, 0.02);
      font-size: 0.75rem;
      color: var(--text-muted, #71717a);
    }

    .header-text {
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .header-hint {
      font-size: 0.6875rem;
      opacity: 0.8;
    }

    .mention-spinner {
      width: 14px;
      height: 14px;
      border: 2px solid var(--border-hover, #3a3a40);
      border-top-color: var(--primary, #c7c7cc);
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
      margin-right: 0.5rem;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .mention-list {
      max-height: 220px;
      overflow-y: auto;
      overflow-x: hidden;
      padding: 0.25rem 0;
      overscroll-behavior: contain;
    }

    /* Custom scrollbar */
    .mention-list::-webkit-scrollbar {
      width: 5px;
    }
    .mention-list::-webkit-scrollbar-thumb {
      background: var(--border-hover, #3a3a40);
      border-radius: 4px;
    }

    .mention-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.5rem 0.85rem;
      cursor: pointer;
      transition: background 0.12s ease;
      min-width: 0;
    }

    .mention-item:hover,
    .mention-item.selected {
      background: var(--surface-hover, #27272a);
    }

    .mention-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      object-fit: cover;
      flex-shrink: 0;
      border: 1px solid var(--border, #222226);
    }

    .mention-user-info {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 0.1rem;
    }

    .mention-name-row {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      min-width: 0;
    }

    .mention-display-name {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text-primary, #f4f4f5);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .mention-username {
      font-size: 0.75rem;
      color: var(--text-secondary, #a1a1aa);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    @media (max-width: 480px) {
      .header-hint {
        display: none;
      }
      .mention-item {
        padding: 0.5rem 0.65rem;
      }
      .mention-avatar {
        width: 28px;
        height: 28px;
      }
    }
  `]
})
export class MentionDropdownComponent {
  private elementRef = inject(ElementRef);

  @Input() users: MentionUser[] = [];
  @Input() isOpen = false;
  @Input() selectedIndex = 0;
  @Input() isLoading = false;
  @Input() position: 'top' | 'bottom' = 'bottom';

  @Output() userSelected = new EventEmitter<MentionUser>();
  @Output() close = new EventEmitter<void>();

  onItemHover(index: number) {
    this.selectedIndex = index;
  }

  onSelectUser(user: MentionUser, event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.userSelected.emit(user);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (this.isOpen && !this.elementRef.nativeElement.contains(event.target)) {
      this.close.emit();
    }
  }
}
