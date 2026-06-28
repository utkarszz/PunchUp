import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { FollowService, FollowUser } from '../../core/services/follow.service';
import { UserService } from '../../core/services/user.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-network',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="network-container animate-fade-in">
      
      <!-- Header with Back Button -->
      <header class="network-header animate-slide-up">
        <a [routerLink]="['/user', username]" class="back-link">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          <span>Back to profile</span>
        </a>
        <h1 class="page-title">&#64;{{ username }}'s Network</h1>
      </header>

      <!-- Access Denied State -->
      <div class="error-state card animate-slide-up" *ngIf="accessDenied">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
        <h3>Access Restricted</h3>
        <p>You cannot view other users' network lists.</p>
        <a [routerLink]="['/user', username]" class="btn btn-primary">Back to Profile</a>
      </div>

      <ng-container *ngIf="!accessDenied">
        <!-- Tabs -->
        <div class="network-tabs card animate-slide-up">
          <button 
            class="tab-btn" 
            [class.active]="activeTab === 'followers'"
            (click)="switchTab('followers')"
          >
            Followers <span class="tab-count">{{ followers.length }}</span>
          </button>
          <button 
            class="tab-btn" 
            [class.active]="activeTab === 'following'"
            (click)="switchTab('following')"
          >
            Following <span class="tab-count">{{ following.length }}</span>
          </button>
        </div>

        <!-- Loading State -->
        <div class="loading-state" *ngIf="isLoading">
          <div class="skeleton-card" *ngFor="let i of [1,2,3,4]"></div>
        </div>

        <!-- Empty State -->
        <div class="empty-state card animate-slide-up" *ngIf="!isLoading && getActiveList().length === 0">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
          </svg>
          <p *ngIf="activeTab === 'followers'">No followers yet.</p>
          <p *ngIf="activeTab === 'following'">Not following anyone yet.</p>
        </div>

        <!-- Network List -->
        <div class="network-list animate-slide-up" *ngIf="!isLoading && getActiveList().length > 0">
          <div class="card profile-card" *ngFor="let user of getActiveList()">
            <a [routerLink]="['/user', user.username]" class="profile-card-link">
              <img 
                [src]="user.profilePicture || 'assets/default-avatar.png'" 
                class="profile-card-avatar"
                [alt]="user.username"
                onerror="this.src='https://api.dicebear.com/7.x/bottts/svg?seed=user'"
              />
              <div class="profile-card-info">
                <h3>{{ user.displayName || user.username }}</h3>
                <span class="profile-card-username">&#64;{{ user.username }}</span>
                <p class="profile-card-bio" *ngIf="user.bio">{{ user.bio }}</p>
              </div>
            </a>
            
            <!-- Follow Action Button -->
            <div class="profile-card-action" *ngIf="!isMe(user)">
              <button 
                class="btn btn-sm"
                [class.btn-primary]="!isFollowing(user)"
                [class.btn-secondary]="isFollowing(user)"
                (click)="toggleFollow(user)"
              >
                {{ isFollowing(user) ? 'Following' : 'Follow' }}
              </button>
            </div>
          </div>
        </div>
      </ng-container>

    </div>
  `,
  styles: [`
    .network-container {
      padding: 2.5rem;
      max-width: 680px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .network-header {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .back-link {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      color: var(--text-muted);
      text-decoration: none;
      transition: color 0.2s ease;
    }

    .back-link:hover {
      color: var(--text-primary);
    }

    .page-title {
      font-size: 1.625rem;
      font-weight: 700;
      color: var(--text-primary);
    }

    /* Tabs */
    .network-tabs {
      display: flex;
      padding: 0.25rem;
      gap: 0.25rem;
    }

    .tab-btn {
      flex: 1;
      background: transparent;
      border: none;
      padding: 0.75rem;
      font-size: 0.9375rem;
      font-weight: 500;
      color: var(--text-secondary);
      border-radius: var(--radius);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      transition: all 0.15s ease;
      font-family: var(--font-sans);
    }

    .tab-btn:hover {
      background: var(--surface-hover);
      color: var(--text-primary);
    }

    .tab-btn.active {
      background: var(--surface-elevated);
      color: var(--text-primary);
      box-shadow: var(--shadow-sm);
    }

    .tab-count {
      font-size: 0.75rem;
      font-weight: 600;
      background: var(--surface-hover);
      padding: 0.125rem 0.5rem;
      border-radius: 99px;
      color: var(--text-secondary);
    }

    .tab-btn.active .tab-count {
      background: var(--surface-hover);
      color: var(--text-primary);
    }

    /* Loading / Skeleton */
    .loading-state {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .skeleton-card {
      height: 76px;
      border-radius: var(--radius-lg);
      background: var(--surface-hover);
      animation: shimmer 1.4s infinite;
    }

    @keyframes shimmer {
      0%, 100% { opacity: 0.6; }
      50% { opacity: 1; }
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      padding: 4rem 2rem;
      color: var(--text-muted);
      text-align: center;
    }

    .empty-state svg { opacity: 0.4; }

    /* Network List */
    .network-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .profile-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 1.25rem;
      gap: 1.5rem;
      transition: border-color 0.2s ease;
    }

    .profile-card:hover {
      border-color: var(--border-hover);
    }

    .profile-card-link {
      display: flex;
      align-items: center;
      gap: 1rem;
      flex: 1;
      text-decoration: none;
      overflow: hidden;
    }

    .profile-card-avatar {
      width: 46px;
      height: 46px;
      border-radius: 50%;
      border: 1px solid var(--border-hover);
      object-fit: cover;
      flex-shrink: 0;
    }

    .profile-card-info {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
      overflow: hidden;
      text-align: left;
    }

    .profile-card-info h3 {
      font-size: 0.9375rem;
      font-weight: 600;
      color: var(--text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .profile-card-username {
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .profile-card-bio {
      font-size: 0.8125rem;
      color: var(--text-secondary);
      line-height: 1.35;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-top: 0.15rem;
    }

    .profile-card-action {
      flex-shrink: 0;
    }

    .btn-sm {
      padding: 0.35rem 0.85rem;
      font-size: 0.75rem;
    }

    .error-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      gap: 1.5rem;
      padding: 5rem 2rem;
      margin-top: 1vh;
    }

    .error-state svg {
      color: var(--danger);
    }

    .error-state p {
      max-width: 350px;
      margin-bottom: 0.5rem;
      color: var(--text-secondary);
    }

    @media (max-width: 640px) {
      .network-container {
        padding: 1.25rem 1rem;
        padding-bottom: calc(var(--mobile-nav-height) + 1.25rem);
      }
    }
  `]
})
export class NetworkComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private followService = inject(FollowService);
  private authService = inject(AuthService);

  username = '';
  activeTab: 'followers' | 'following' = 'followers';
  isLoading = true;
  accessDenied = false;

  followers: FollowUser[] = [];
  following: FollowUser[] = [];
  myFollowingSet = new Set<string>();
  myUsername = '';

  ngOnInit() {
    this.authService.currentUser$.subscribe(u => {
      if (u) {
        this.myUsername = u.username;
        this.checkAccess();
      }
    });

    this.route.params.subscribe(params => {
      this.username = params['id'];
      this.checkAccess();
      this.route.queryParams.subscribe(qParams => {
        if (qParams['tab'] === 'following') {
          this.activeTab = 'following';
        } else {
          this.activeTab = 'followers';
        }
        if (!this.accessDenied) {
          this.loadNetwork();
        }
      });
    });
  }

  checkAccess() {
    if (this.username && this.myUsername) {
      if (this.username.toLowerCase() !== this.myUsername.toLowerCase()) {
        this.accessDenied = true;
        this.isLoading = false;
      } else {
        this.accessDenied = false;
      }
    }
  }

  private loadNetwork() {
    this.isLoading = true;
    
    // Fetch followers and following list
    this.followService.getFollowers(this.username).subscribe({
      next: (res) => {
        this.followers = (res.followers || []).map((f: any) => f.follower).filter(Boolean);
        this.checkLoadingState();
      },
      error: () => this.checkLoadingState()
    });

    this.followService.getFollowing(this.username).subscribe({
      next: (res) => {
        this.following = (res.following || []).map((f: any) => f.following).filter(Boolean);
        this.checkLoadingState();
      },
      error: () => this.checkLoadingState()
    });

    // Also load my own following list to know follow states
    if (this.myUsername) {
      this.followService.getFollowing(this.myUsername).subscribe({
        next: (res) => {
          const list = res.following || [];
          this.myFollowingSet = new Set(list.map(u => u.following?.username).filter((u): u is string => !!u));
        }
      });
    }
  }

  private checkLoadingState() {
    // Stop loading when data loaded (or simple timeout check)
    this.isLoading = false;
  }

  switchTab(tab: 'followers' | 'following') {
    this.activeTab = tab;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge'
    });
  }

  getActiveList(): FollowUser[] {
    return this.activeTab === 'followers' ? this.followers : this.following;
  }

  isMe(user: FollowUser): boolean {
    return user.username === this.myUsername;
  }

  isFollowing(user: FollowUser): boolean {
    return this.myFollowingSet.has(user.username);
  }

  toggleFollow(user: FollowUser) {
    if (this.isFollowing(user)) {
      this.followService.unfollow(user.username).subscribe({
        next: () => this.myFollowingSet.delete(user.username)
      });
    } else {
      this.followService.follow(user.username).subscribe({
        next: () => this.myFollowingSet.add(user.username)
      });
    }
  }
}
