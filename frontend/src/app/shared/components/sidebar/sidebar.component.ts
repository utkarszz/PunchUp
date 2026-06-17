import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

interface NavItem {
  label: string;
  route: string;
  iconSvg: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <aside [ngClass]="{ 'collapsed': isCollapsed }" class="sidebar">
      <div class="sidebar-header">
        <div class="logo-container">
          <img src="assets/logo.png" alt="PunchUp" class="logo-img" />
          <span class="logo-text" *ngIf="!isCollapsed">PunchUp <span class="logo-v1">V1</span></span>
        </div>
        <button (click)="toggleSidebar()" class="btn-icon toggle-btn" aria-label="Toggle Sidebar">
          <svg *ngIf="!isCollapsed" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="11 17 6 12 11 7"></polyline><polyline points="18 17 13 12 18 7"></polyline></svg>
          <svg *ngIf="isCollapsed" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="13 17 18 12 13 7"></polyline><polyline points="6 17 11 12 6 7"></polyline></svg>
        </button>
      </div>

      <nav class="sidebar-nav">
        <a *ngFor="let item of navItems"
           [routerLink]="item.route"
           routerLinkActive="active"
           [routerLinkActiveOptions]="{ exact: item.route === '/dashboard' }"
           class="nav-item"
           [title]="isCollapsed ? item.label : ''">
          <span class="nav-icon" [innerHTML]="item.iconSvg"></span>
          <span class="nav-label" *ngIf="!isCollapsed">{{ item.label }}</span>
        </a>
      </nav>

      <div class="sidebar-footer" *ngIf="authService.currentUser$ | async as user">
        <div class="user-badge" [routerLink]="['/profile']">
          <img [src]="user.profilePicture || 'assets/default-avatar.png'"
               onerror="this.src='https://api.dicebear.com/7.x/bottts/svg?seed=' + encodeURIComponent(this.title)"
               [title]="user.username"
               alt="Avatar"
               class="user-avatar" />
          <div class="user-info" *ngIf="!isCollapsed">
            <span class="username">{{ user.username }}</span>
            <span class="user-email">{{ user.email }}</span>
          </div>
        </div>

        <button (click)="onLogout()" class="nav-item logout-btn" [title]="isCollapsed ? 'Log Out' : ''">
          <span class="nav-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
          </span>
          <span class="nav-label" *ngIf="!isCollapsed">Log Out</span>
        </button>
      </div>
    </aside>
  `,
  styles: [`
    .sidebar {
      width: var(--sidebar-width-expanded);
      background-color: var(--surface);
      border-right: 1px solid var(--border);
      height: 100vh;
      position: sticky;
      top: 0;
      display: flex;
      flex-direction: column;
      transition: width 260ms cubic-bezier(0.4, 0, 0.2, 1);
      z-index: 100;
      overflow: hidden;
    }

    .sidebar.collapsed {
      width: var(--sidebar-width-collapsed);
    }

    .sidebar-header {
      padding: 1.25rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--border);
      min-height: 65px;
    }

    .logo-container {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      font-family: var(--font-display);
      font-weight: 700;
      font-size: 1.05rem;
      letter-spacing: -0.02em;
      color: var(--text-primary);
      overflow: hidden;
      min-width: 0;
    }

    .logo-img {
      width: 26px;
      height: 26px;
      object-fit: contain;
      flex-shrink: 0;
      border-radius: 6px;
    }

    .logo-text {
      white-space: nowrap;
      animation: fadeInText 200ms ease forwards;
      overflow: hidden;
    }

    .logo-v1 {
      color: var(--text-muted);
      font-size: 0.8em;
      font-weight: 500;
      margin-left: 0.1em;
    }

    @keyframes fadeInText {
      from { opacity: 0; transform: translateX(-4px); }
      to { opacity: 1; transform: translateX(0); }
    }

    .toggle-btn {
      color: var(--text-muted);
      border-radius: var(--radius);
      padding: 0.3rem;
      flex-shrink: 0;
      transition: all 0.15s ease;
    }

    .toggle-btn:hover {
      color: var(--text-primary);
      background: var(--surface-hover);
    }

    .sidebar-nav {
      flex: 1;
      padding: 0.875rem 0.625rem;
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
      overflow-y: auto;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.6rem 0.75rem;
      color: var(--text-muted);
      border-radius: var(--radius);
      transition: all 160ms ease;
      cursor: pointer;
      font-size: 0.875rem;
      font-weight: 500;
      border: 1px solid transparent;
      white-space: nowrap;
    }

    .nav-item:hover {
      color: var(--text-primary);
      background-color: var(--surface-hover);
      border-color: var(--border);
    }

    .nav-item.active {
      color: var(--text-primary);
      background-color: rgba(199, 199, 204, 0.05);
      border-color: var(--border);
      box-shadow: inset 0 0 0 1px rgba(199,199,204,0.04);
    }

    .nav-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      color: inherit;
      flex-shrink: 0;
    }

    .nav-label {
      white-space: nowrap;
      overflow: hidden;
    }

    .sidebar-footer {
      padding: 0.875rem 0.625rem;
      border-top: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .user-badge {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.5rem 0.75rem;
      border-radius: var(--radius);
      cursor: pointer;
      transition: all 160ms ease;
      border: 1px solid transparent;
    }

    .user-badge:hover {
      background-color: var(--surface-hover);
      border-color: var(--border);
    }

    .user-avatar {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      border: 1px solid var(--border-hover);
      object-fit: cover;
      flex-shrink: 0;
    }

    .user-info {
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: fadeInText 200ms ease forwards;
    }

    .username {
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--text-primary);
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;
    }

    .user-email {
      font-size: 0.6875rem;
      color: var(--text-muted);
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;
    }

    .logout-btn {
      color: var(--text-muted);
    }

    .logout-btn:hover {
      color: var(--danger);
      background-color: rgba(239, 68, 68, 0.06);
      border-color: rgba(239, 68, 68, 0.15);
    }

    /* Hide sidebar on mobile */
    @media (max-width: 768px) {
      .sidebar {
        display: none;
      }
    }
  `]
})
export class SidebarComponent implements OnInit {
  public authService = inject(AuthService);
  private router = inject(Router);

  public isCollapsed = false;

  public navItems: NavItem[] = [
    {
      label: 'Dashboard',
      route: '/dashboard',
      iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9"></rect><rect x="14" y="3" width="7" height="5"></rect><rect x="14" y="12" width="7" height="9"></rect><rect x="3" y="16" width="7" height="5"></rect></svg>`
    },
    {
      label: 'Tasks',
      route: '/tasks',
      iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"></path><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>`
    },
    {
      label: 'Analytics',
      route: '/analytics',
      iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>`
    },
    {
      label: 'Consistency Grid',
      route: '/grid',
      iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line><line x1="15" y1="3" x2="15" y2="21"></line><line x1="3" y1="9" x2="21" y2="9"></line><line x1="3" y1="15" x2="21" y2="15"></line></svg>`
    },
    {
      label: 'Profile',
      route: '/profile',
      iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`
    },
    {
      label: 'Community',
      route: '/community',
      iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`
    }
  ];

  ngOnInit() {
    const collapsedPreference = localStorage.getItem('sidebar_collapsed');
    this.isCollapsed = collapsedPreference === 'true';
  }

  toggleSidebar() {
    this.isCollapsed = !this.isCollapsed;
    localStorage.setItem('sidebar_collapsed', String(this.isCollapsed));
  }

  onLogout() {
    this.authService.logout();
  }

  encodeURIComponent(val: string): string {
    return encodeURIComponent(val || 'avatar');
  }
}
