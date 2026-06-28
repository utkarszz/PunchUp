import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NotificationService, Notification } from '../../core/services/notification.service';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="page-container animate-fade-in">
      <header class="page-header animate-slide-up">
        <div>
          <h1>Notifications</h1>
          <p class="subtitle">Stay updated on your activity.</p>
        </div>
        <button class="btn btn-secondary btn-sm" (click)="markAllRead()" *ngIf="hasUnread">
          Mark all as read
        </button>
      </header>

      <!-- Loading State -->
      <div class="loading-state" *ngIf="isLoading">
        <div class="skeleton-item" *ngFor="let i of [1,2,3,4,5]"></div>
      </div>

      <!-- Notifications List -->
      <div class="notifications-list animate-slide-up" *ngIf="!isLoading">
        <div *ngIf="notifications.length === 0" class="empty-state card">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
          <p>No notifications yet. Follow users and interact with posts to get started.</p>
        </div>

        <div
          *ngFor="let notif of notifications"
          class="notif-item card"
          [class.unread]="!notif.read"
          (click)="markRead(notif)"
        >
          <div class="notif-avatar-wrapper">
            <img
              [src]="notif.from?.profilePicture || 'assets/default-avatar.png'"
              [alt]="notif.from?.username"
              class="notif-avatar"
              onerror="this.src='https://api.dicebear.com/7.x/bottts/svg?seed=user'"
            />
            <span class="notif-type-icon" [ngClass]="'type-' + notif.type">
              <svg *ngIf="notif.type === 'follow'" width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
              <svg *ngIf="notif.type === 'like'" width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
              <svg *ngIf="notif.type === 'comment'" width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
            </span>
          </div>

          <div class="notif-body">
            <p class="notif-text">
              <a [routerLink]="['/user', notif.from?.username]" class="notif-username" (click)="$event.stopPropagation()">
                {{ notif.from?.displayName || notif.from?.username }}
              </a>
              <span *ngIf="notif.type === 'follow'"> started following you.</span>
              <span *ngIf="notif.type === 'like'"> liked your post.</span>
              <span *ngIf="notif.type === 'comment'"> commented on your post.</span>
            </p>
            <span *ngIf="notif.post?.content" class="notif-post-preview">"{{ notif.post!.content | slice:0:60 }}..."</span>
            <span class="notif-time">{{ getRelativeTime(notif.createdAt) }}</span>
          </div>

          <span class="unread-dot" *ngIf="!notif.read"></span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-container {
      padding: 2.5rem;
      max-width: 720px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .page-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
    }

    h1 { font-size: 1.75rem; font-weight: 700; }

    .subtitle {
      font-size: 0.875rem;
      color: var(--text-secondary);
      margin-top: 0.25rem;
    }

    .loading-state {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .skeleton-item {
      height: 72px;
      border-radius: var(--radius-lg);
      background: var(--surface-hover);
      animation: shimmer 1.4s infinite;
    }

    @keyframes shimmer {
      0%, 100% { opacity: 0.6; }
      50% { opacity: 1; }
    }

    .notifications-list {
      display: flex;
      flex-direction: column;
      gap: 0.625rem;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      padding: 3.5rem 2rem;
      text-align: center;
      color: var(--text-muted);
    }

    .empty-state svg { opacity: 0.4; }

    .notif-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem 1.25rem;
      cursor: pointer;
      transition: border-color 0.2s ease, background 0.2s ease;
    }

    .notif-item.unread {
      border-color: var(--border-hover);
      background: var(--surface-elevated);
    }

    .notif-item:hover {
      border-color: var(--border-glow);
    }

    .notif-avatar-wrapper {
      position: relative;
      flex-shrink: 0;
    }

    .notif-avatar {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      border: 1px solid var(--border-hover);
      object-fit: cover;
    }

    .notif-type-icon {
      position: absolute;
      bottom: -2px;
      right: -2px;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1.5px solid var(--surface);
    }

    .notif-type-icon.type-follow { background: #3b82f6; color: #fff; }
    .notif-type-icon.type-like   { background: #ef4444; color: #fff; }
    .notif-type-icon.type-comment { background: #8b5cf6; color: #fff; }

    .notif-body {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
      overflow: hidden;
    }

    .notif-text {
      font-size: 0.875rem;
      color: var(--text-primary);
      line-height: 1.4;
    }

    .notif-username {
      font-weight: 600;
      color: var(--text-primary);
    }

    .notif-username:hover { text-decoration: underline; }

    .notif-post-preview {
      font-size: 0.8125rem;
      color: var(--text-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .notif-time {
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .unread-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #3b82f6;
      flex-shrink: 0;
    }

    @media (max-width: 768px) {
      .page-container {
        padding: 1.25rem 1rem;
        padding-bottom: calc(var(--mobile-nav-height) + 1.25rem);
      }
    }
  `]
})
export class NotificationsComponent implements OnInit {
  private notifService = inject(NotificationService);

  notifications: Notification[] = [];
  isLoading = true;

  get hasUnread() { return this.notifications.some(n => !n.read); }

  ngOnInit() {
    this.notifService.getAll().subscribe({
      next: (res) => {
        this.notifications = res.notifications || [];
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; }
    });
  }

  markRead(notif: Notification) {
    if (notif.read) return;
    this.notifService.markRead(notif._id).subscribe();
    notif.read = true;
  }

  markAllRead() {
    this.notifService.markAllRead().subscribe();
    this.notifications.forEach(n => n.read = true);
  }

  getRelativeTime(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString();
  }
}
