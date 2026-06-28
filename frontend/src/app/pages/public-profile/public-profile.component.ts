import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { UserService, PublicProfile } from '../../core/services/user.service';
import { FollowService } from '../../core/services/follow.service';
import { AuthService } from '../../core/services/auth.service';
import { PostService, Post, Comment } from '../../core/services/post.service';

interface GridDisplayCell {
  date: string;
  tasksCompleted: number;
  intensity: number;
  isEmptyPlaceholder: boolean;
}

@Component({
  selector: 'app-public-profile',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="public-profile-container animate-fade-in">
      <!-- Loading State -->
      <div class="loading-state" *ngIf="isLoading">
        <div class="spinner"></div>
        <p>Loading public profile...</p>
      </div>

      <!-- Error State -->
      <div class="error-state card" *ngIf="errorMsg">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
          <line x1="12" y1="9" x2="12" y2="13"></line>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
        <h3>Profile Not Found</h3>
        <p>{{ errorMsg }}</p>
        <a routerLink="/" class="btn btn-primary">Go to Homepage</a>
      </div>

      <!-- Profile Content -->
      <div class="profile-content" *ngIf="!isLoading && !errorMsg && profile">
        
        <!-- Banner/Card -->
        <div class="card banner-card animate-slide-up">
          <div class="user-main-info">
            <div class="avatar-wrapper">
              <img 
                [src]="profile.user.profilePicture || 'assets/default-avatar.png'" 
                onerror="this.src='https://api.dicebear.com/7.x/bottts/svg?seed=user'"
                [title]="profile.user.username"
                alt="Avatar" 
                class="user-avatar" 
              />
            </div>
            <div class="user-meta">
              <div class="name-row">
                <h2>{{ profile.user.displayName || profile.user.username }}</h2>
                <span class="handle-badge">&#64;{{ profile.user.username }}</span>
              </div>
              <p class="email" *ngIf="isMe && profile.user.email">{{ profile.user.email }}</p>
              <p class="bio" *ngIf="profile.user.bio">{{ profile.user.bio }}</p>
              <p class="bio placeholder-bio" *ngIf="!profile.user.bio">This user hasn't written a biography yet.</p>
            </div>

            <!-- Profile Action Button -->
            <div class="profile-action">
              <button 
                *ngIf="!isMe" 
                class="btn btn-sm"
                [class.btn-primary]="!isFollowing"
                [class.btn-secondary]="isFollowing"
                (click)="toggleFollow()"
              >
                {{ isFollowing ? 'Following' : 'Follow' }}
              </button>
              <a 
                *ngIf="isMe" 
                routerLink="/profile" 
                class="btn btn-secondary btn-sm"
              >
                Edit Profile
              </a>
            </div>
          </div>
        </div>

        <!-- Metrics Row -->
        <div class="metrics-row animate-slide-up animate-stagger-1">
          <div class="card metric-card">
            <span class="metric-label">Current Streak</span>
            <span class="metric-value text-accent">{{ profile.stats.currentStreak || 0 }} days</span>
          </div>

          <div class="card metric-card">
            <span class="metric-label">Longest Streak</span>
            <span class="metric-value text-warning">{{ profile.stats.longestStreak || 0 }} days</span>
          </div>

          <div class="card metric-card">
            <span class="metric-label">Tasks Completed</span>
            <span class="metric-value text-success">{{ profile.stats.totalTasksCompleted || 0 }} done</span>
          </div>
        </div>

        <!-- Network Stats Row -->
        <div class="network-stats-row animate-slide-up animate-stagger-1">
          <a *ngIf="isMe" [routerLink]="['/user', profile.user.username, 'network']" [queryParams]="{ tab: 'followers' }" class="card network-stat-card">
            <span class="network-num">{{ profile.stats.followers || 0 }}</span>
            <span class="network-label">Followers</span>
          </a>
          <div *ngIf="!isMe" class="card network-stat-card static-card">
            <span class="network-num">{{ profile.stats.followers || 0 }}</span>
            <span class="network-label">Followers</span>
          </div>

          <a *ngIf="isMe" [routerLink]="['/user', profile.user.username, 'network']" [queryParams]="{ tab: 'following' }" class="card network-stat-card">
            <span class="network-num">{{ profile.stats.following || 0 }}</span>
            <span class="network-label">Following</span>
          </a>
          <div *ngIf="!isMe" class="card network-stat-card static-card">
            <span class="network-num">{{ profile.stats.following || 0 }}</span>
            <span class="network-label">Following</span>
          </div>
        </div>

        <!-- Contribution Grid -->
        <div class="card grid-card animate-slide-up animate-stagger-2">
          <div class="grid-header">
            <h3>Consistency Heatmap</h3>
            <div class="legend">
              <span>Less</span>
              <div class="legend-cell intensity-0"></div>
              <div class="legend-cell intensity-1"></div>
              <div class="legend-cell intensity-2"></div>
              <div class="legend-cell intensity-3"></div>
              <span>More</span>
            </div>
          </div>
          <p class="grid-desc">Visual history of tasks completed over the last 12 weeks.</p>

          <div class="grid-scroll">
            <div class="grid-container">
              <div class="day-labels">
                <span>Mon</span>
                <span>Wed</span>
                <span>Fri</span>
              </div>
              <div class="cells-matrix">
                <div 
                  *ngFor="let cell of gridCells" 
                  [class]="'grid-cell intensity-' + cell.intensity"
                  [class.placeholder-cell]="cell.isEmptyPlaceholder"
                  [attr.data-tooltip]="cell.isEmptyPlaceholder ? null : (cell.date + ': ' + cell.tasksCompleted + ' completed tasks')">
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Tabs for profile posts vs saved posts (only visible to owner) -->
        <div class="profile-tabs-container animate-slide-up" *ngIf="isMe" style="animation-delay: 240ms;">
          <button class="tab-btn" [class.active]="activeTab === 'posts'" (click)="activeTab = 'posts'">
            Posts ({{ posts.length }})
          </button>
          <button class="tab-btn" [class.active]="activeTab === 'saved'" (click)="activeTab = 'saved'">
            Saved Posts ({{ savedPosts.length }})
          </button>
        </div>

        <!-- Section Title if not Me -->
        <div class="section-title animate-slide-up" *ngIf="!isMe" style="animation-delay: 240ms;">
          <h3>Posts</h3>
        </div>

        <!-- Posts Content Area -->
        <div class="profile-posts-list animate-slide-up" style="animation-delay: 320ms;">
          <!-- Active Tab: Posts -->
          <ng-container *ngIf="activeTab === 'posts'">
            <div class="empty-state card" *ngIf="posts.length === 0">
              <p>No posts shared yet.</p>
            </div>
            
            <div class="posts-feed" *ngIf="posts.length > 0">
              <article class="card post-card" *ngFor="let post of posts">
                <div class="post-header">
                  <div class="post-author-link">
                    <img
                      [src]="post.user.profilePicture || 'assets/default-avatar.png'"
                      class="post-avatar"
                      [alt]="post.user.username"
                      onerror="this.src='https://api.dicebear.com/7.x/bottts/svg?seed=u'"
                    />
                    <div class="post-author-info">
                      <span class="post-display-name">{{ post.user.displayName || post.user.username }}</span>
                      <span class="post-username">&#64;{{ post.user.username }}</span>
                    </div>
                  </div>
                  <div class="post-header-actions">
                    <span class="post-time">{{ getRelativeTime(post.createdAt) }}</span>
                    <button *ngIf="isMe" class="btn-icon delete-post-btn" (click)="deletePost(post._id)" title="Delete Post">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      </svg>
                    </button>
                  </div>
                </div>

                <p class="post-content">{{ post.content }}</p>

                <div class="post-images" *ngIf="post.images && post.images.length > 0">
                  <img *ngFor="let img of post.images" [src]="img" class="post-image" alt="Post image" />
                </div>

                <div class="post-actions">
                  <button class="action-btn" [class.active]="isLiked(post)" (click)="toggleLike(post)">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                    </svg>
                    <span>{{ post.likes.length }}</span>
                  </button>

                  <button class="action-btn" (click)="toggleComments(post._id)">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                    <span>{{ post.commentsCount || 0 }}</span>
                  </button>

                  <button class="action-btn" [class.active]="isSaved(post)" (click)="toggleSave(post)">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                    </svg>
                  </button>
                </div>

                <!-- Comments -->
                <div class="comments-section" *ngIf="openCommentPostId === post._id">
                  <div class="comments-list">
                    <div class="comment-item" *ngFor="let c of (commentMap[post._id] || [])">
                      <img
                        [src]="c.user.profilePicture || 'assets/default-avatar.png'"
                        class="comment-avatar"
                        [alt]="c.user.username"
                        onerror="this.src='https://api.dicebear.com/7.x/bottts/svg?seed=c'"
                      />
                      <div class="comment-body" style="flex: 1;">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; width: 100%;">
                          <span class="comment-author">{{ c.user.displayName || c.user.username }}</span>
                          <button 
                            *ngIf="c.user._id === currentUserId || post.user._id === currentUserId" 
                            class="btn-icon delete-comment-btn" 
                            (click)="deleteComment(post, c._id)"
                            title="Delete Comment"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                          </button>
                        </div>
                        <p class="comment-text">{{ c.content }}</p>
                      </div>
                    </div>
                  </div>
                  <div class="comment-input-row">
                    <input
                      type="text"
                      class="input"
                      [(ngModel)]="commentDraft[post._id]"
                      placeholder="Write a comment..."
                      (keydown.enter)="submitComment(post)"
                    />
                    <button class="btn btn-primary btn-sm" (click)="submitComment(post)">Send</button>
                  </div>
                </div>
              </article>
            </div>
          </ng-container>

          <!-- Active Tab: Saved Posts (only visible if isMe) -->
          <ng-container *ngIf="activeTab === 'saved' && isMe">
            <div class="empty-state card" *ngIf="savedPosts.length === 0">
              <p>No saved posts.</p>
            </div>
            
            <div class="posts-feed" *ngIf="savedPosts.length > 0">
              <article class="card post-card" *ngFor="let post of savedPosts">
                <div class="post-header">
                  <div class="post-author-link">
                    <img
                      [src]="post.user.profilePicture || 'assets/default-avatar.png'"
                      class="post-avatar"
                      [alt]="post.user.username"
                      onerror="this.src='https://api.dicebear.com/7.x/bottts/svg?seed=u'"
                    />
                    <div class="post-author-info">
                      <span class="post-display-name">{{ post.user.displayName || post.user.username }}</span>
                      <span class="post-username">&#64;{{ post.user.username }}</span>
                    </div>
                  </div>
                  <div class="post-header-actions">
                    <span class="post-time">{{ getRelativeTime(post.createdAt) }}</span>
                    <!-- Remove from Saved button (unsaves) -->
                    <button class="btn-icon remove-saved-btn" (click)="toggleSave(post)" title="Remove from Saved">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </button>
                  </div>
                </div>

                <p class="post-content">{{ post.content }}</p>

                <div class="post-images" *ngIf="post.images && post.images.length > 0">
                  <img *ngFor="let img of post.images" [src]="img" class="post-image" alt="Post image" />
                </div>

                <div class="post-actions">
                  <button class="action-btn" [class.active]="isLiked(post)" (click)="toggleLike(post)">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                    </svg>
                    <span>{{ post.likes.length }}</span>
                  </button>

                  <button class="action-btn" (click)="toggleComments(post._id)">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                    <span>{{ post.commentsCount || 0 }}</span>
                  </button>

                  <button class="action-btn" [class.active]="isSaved(post)" (click)="toggleSave(post)">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                    </svg>
                  </button>
                </div>

                <!-- Comments -->
                <div class="comments-section" *ngIf="openCommentPostId === post._id">
                  <div class="comments-list">
                    <div class="comment-item" *ngFor="let c of (commentMap[post._id] || [])">
                      <img
                        [src]="c.user.profilePicture || 'assets/default-avatar.png'"
                        class="comment-avatar"
                        [alt]="c.user.username"
                        onerror="this.src='https://api.dicebear.com/7.x/bottts/svg?seed=c'"
                      />
                      <div class="comment-body" style="flex: 1;">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; width: 100%;">
                          <span class="comment-author">{{ c.user.displayName || c.user.username }}</span>
                          <button 
                            *ngIf="c.user._id === currentUserId || post.user._id === currentUserId" 
                            class="btn-icon delete-comment-btn" 
                            (click)="deleteComment(post, c._id)"
                            title="Delete Comment"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                          </button>
                        </div>
                        <p class="comment-text">{{ c.content }}</p>
                      </div>
                    </div>
                  </div>
                  <div class="comment-input-row">
                    <input
                      type="text"
                      class="input"
                      [(ngModel)]="commentDraft[post._id]"
                      placeholder="Write a comment..."
                      (keydown.enter)="submitComment(post)"
                    />
                    <button class="btn btn-primary btn-sm" (click)="submitComment(post)">Send</button>
                  </div>
                </div>
              </article>
            </div>
          </ng-container>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .public-profile-container {
      padding: 2.5rem;
      max-width: 900px;
      margin: 0 auto;
      width: 100%;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .loading-state, .error-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      gap: 1.5rem;
      padding: 5rem 2rem;
      margin-top: 10vh;
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid var(--border);
      border-top-color: var(--text-primary);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .error-state svg {
      color: var(--danger);
    }

    .error-state p {
      max-width: 350px;
      margin-bottom: 0.5rem;
    }

    /* Profile Layout */
    .profile-content {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .banner-card {
      padding: 2.5rem;
    }

    .user-main-info {
      display: flex;
      gap: 2rem;
      align-items: center;
    }

    .avatar-wrapper {
      flex-shrink: 0;
    }

    .user-avatar {
      width: 96px;
      height: 96px;
      border-radius: 50%;
      border: 2px solid var(--border-hover);
      object-fit: cover;
    }

    .user-meta {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      flex: 1;
      text-align: left;
    }

    .name-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .user-meta h2 {
      font-size: 1.75rem;
      color: var(--text-primary);
      font-weight: 700;
      line-height: 1.2;
    }

    .handle-badge {
      font-size: 0.8125rem;
      color: var(--text-muted);
      background: var(--surface-hover);
      padding: 0.15rem 0.5rem;
      border-radius: 99px;
      border: 1px solid var(--border);
    }

    .user-meta .email {
      font-size: 0.875rem;
      color: var(--text-muted);
    }

    .user-meta .bio {
      font-size: 0.9rem;
      color: var(--text-secondary);
      margin-top: 0.75rem;
      line-height: 1.5;
    }

    .placeholder-bio {
      font-style: italic;
      color: var(--text-muted) !important;
    }

    .profile-action {
      flex-shrink: 0;
    }

    /* Metrics */
    .metrics-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1.5rem;
    }

    .metric-card {
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      text-align: center;
    }

    .metric-label {
      font-size: 0.75rem;
      color: var(--text-muted);
      text-transform: uppercase;
      font-weight: 600;
      letter-spacing: 0.05em;
    }

    .metric-value {
      font-size: 1.5rem;
      font-weight: 700;
      font-family: var(--font-display);
    }

    /* Network stats row */
    .network-stats-row {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1.5rem;
    }

    .network-stat-card {
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.15rem;
      cursor: pointer;
      text-decoration: none;
      transition: border-color var(--transition-fast), background var(--transition-fast);
    }

    .network-stat-card:hover {
      border-color: var(--border-glow);
      background: var(--surface-elevated);
    }

    .network-stat-card.static-card {
      cursor: default;
    }

    .network-stat-card.static-card:hover {
      border-color: var(--border);
      background: var(--surface);
    }

    .network-num {
      font-size: 1.625rem;
      font-weight: 700;
      color: var(--text-primary);
      font-family: var(--font-display);
    }

    .network-label {
      font-size: 0.75rem;
      color: var(--text-muted);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .text-success { color: var(--success); }
    .text-warning { color: var(--warning); }
    .text-accent { color: var(--accent); }

    /* Grid styling */
    .grid-card {
      padding: 1.75rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .grid-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .grid-desc {
      font-size: 0.8125rem;
      color: var(--text-secondary);
      margin-top: -0.5rem;
      text-align: left;
    }

    .legend {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .legend-cell {
      width: 12px;
      height: 12px;
      border-radius: 2px;
    }

    .legend-cell.intensity-0 { background: var(--grid-intensity-0); }
    .legend-cell.intensity-1 { background: var(--grid-intensity-1); }
    .legend-cell.intensity-2 { background: var(--grid-intensity-2); }
    .legend-cell.intensity-3 { background: var(--grid-intensity-3); }

    .grid-scroll {
      width: 100%;
      overflow-x: auto;
      padding-bottom: 0.5rem;
    }

    .grid-container {
      display: flex;
      gap: 0.5rem;
      width: max-content;
      align-items: center;
      padding: 1rem;
      background: rgba(9, 9, 11, 0.4);
      border: 1px solid var(--border);
      border-radius: var(--radius);
    }

    .day-labels {
      display: flex;
      flex-direction: column;
      gap: 10px;
      font-size: 0.65rem;
      color: var(--text-muted);
    }

    .cells-matrix {
      display: grid;
      grid-template-rows: repeat(7, 12px);
      grid-auto-flow: column;
      gap: 3px;
    }

    .grid-cell {
      width: 12px;
      height: 12px;
      border-radius: 2px;
      background: var(--grid-intensity-0);
      position: relative;
    }

    .grid-cell.intensity-0 { background: var(--grid-intensity-0); }
    .grid-cell.intensity-1 { background: var(--grid-intensity-1); }
    .grid-cell.intensity-2 { background: var(--grid-intensity-2); }
    .grid-cell.intensity-3 { background: var(--grid-intensity-3); }

    .grid-cell[data-tooltip]:hover::after {
      content: attr(data-tooltip);
      position: absolute;
      bottom: 18px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--surface-hover);
      border: 1px solid var(--border-hover);
      color: var(--text-primary);
      padding: 0.35rem 0.6rem;
      border-radius: var(--radius);
      font-size: 0.6875rem;
      white-space: nowrap;
      z-index: 100;
      box-shadow: var(--shadow-md);
      pointer-events: none;
    }

    @media (max-width: 768px) {
      .public-profile-container {
        padding: 1.25rem 1rem;
        padding-bottom: calc(var(--mobile-nav-height) + 1.25rem);
      }
      .user-main-info {
        flex-direction: column;
        text-align: center;
        gap: 1.25rem;
      }
      .user-meta {
        text-align: center;
      }
      .name-row {
        justify-content: center;
      }
      .metrics-row {
        grid-template-columns: 1fr;
        gap: 1rem;
      }
      .network-stats-row {
        grid-template-columns: 1fr;
        gap: 1rem;
      }
    }

    /* Tabs styling */
    .profile-tabs-container {
      display: flex;
      gap: 1rem;
      border-bottom: 1px solid var(--border);
      padding-bottom: 0.75rem;
      margin-top: 1rem;
    }

    .tab-btn {
      background: transparent;
      border: none;
      color: var(--text-muted);
      font-size: 0.9375rem;
      font-weight: 600;
      padding: 0.5rem 0.25rem;
      cursor: pointer;
      position: relative;
      transition: color var(--transition-fast);
    }

    .tab-btn:hover {
      color: var(--text-primary);
    }

    .tab-btn.active {
      color: var(--text-primary);
    }

    .tab-btn.active::after {
      content: '';
      position: absolute;
      bottom: -0.8rem;
      left: 0;
      right: 0;
      height: 2px;
      background: var(--text-primary);
    }

    .section-title {
      margin-top: 1rem;
      border-bottom: 1px solid var(--border);
      padding-bottom: 0.75rem;
    }

    .section-title h3 {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--text-primary);
    }

    /* Posts layout */
    .profile-posts-list {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      margin-top: 1rem;
    }

    .empty-state {
      padding: 3rem 1.5rem;
      text-align: center;
      color: var(--text-muted);
      font-size: 0.9rem;
    }

    .posts-feed {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .post-card {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      text-align: left;
    }

    .post-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .post-author-link {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .post-avatar {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      border: 1px solid var(--border-hover);
      object-fit: cover;
    }

    .post-author-info {
      display: flex;
      flex-direction: column;
    }

    .post-display-name {
      font-size: 0.9375rem;
      font-weight: 600;
      color: var(--text-primary);
    }

    .post-username {
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .post-header-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .post-time {
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .delete-post-btn {
      color: var(--text-muted);
      cursor: pointer;
      transition: color var(--transition-fast);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 4px;
      border-radius: 4px;
      background: transparent;
      border: none;
    }

    .delete-post-btn:hover {
      color: var(--danger);
      background: var(--surface-hover);
    }

    .post-content {
      font-size: 0.9375rem;
      color: var(--text-primary);
      line-height: 1.6;
      white-space: pre-wrap;
    }

    .post-images {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .post-image {
      width: 100%;
      max-height: 340px;
      object-fit: cover;
      border-radius: var(--radius);
      border: 1px solid var(--border);
    }

    .post-actions {
      display: flex;
      gap: 1.25rem;
      padding-top: 0.5rem;
      border-top: 1px solid var(--border);
    }

    .action-btn {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.8125rem;
      color: var(--text-muted);
      background: transparent;
      border: none;
      cursor: pointer;
      padding: 0.35rem 0.5rem;
      border-radius: var(--radius);
      transition: all 0.15s ease;
      font-family: var(--font-sans);
    }

    .action-btn:hover {
      color: var(--text-primary);
      background: var(--surface-hover);
    }

    .action-btn.active {
      color: var(--text-primary);
    }

    .action-btn.active svg {
      fill: currentColor;
    }

    /* Comments Section */
    .comments-section {
      border-top: 1px solid var(--border);
      padding-top: 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .comments-list {
      display: flex;
      flex-direction: column;
      gap: 0.625rem;
    }

    .comment-item {
      display: flex;
      gap: 0.625rem;
      align-items: flex-start;
    }

    .comment-avatar {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      object-fit: cover;
      flex-shrink: 0;
    }

    .comment-body {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }

    .comment-author {
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--text-primary);
    }

    .comment-text {
      font-size: 0.875rem;
      color: var(--text-secondary);
    }

    .delete-comment-btn {
      padding: 0;
      min-width: 20px;
      min-height: 20px;
      width: 20px;
      height: 20px;
      color: var(--text-muted);
      background: transparent;
      border: none;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: color 0.15s ease;
    }

    .delete-comment-btn:hover {
      color: var(--danger) !important;
    }

    .comment-input-row {
      display: flex;
      gap: 0.5rem;
    }

    .comment-input-row .input {
      flex: 1;
      padding: 0.5rem 0.75rem;
      font-size: 0.875rem;
      background: var(--surface-hover);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      color: var(--text-primary);
    }

    .comment-input-row .input:focus {
      outline: none;
      border-color: var(--border-hover);
    }

    /* Trash icon — red, permanent delete */
    .delete-post-btn:hover,
    .delete-comment-btn:hover {
      color: var(--danger);
      background: rgba(239, 68, 68, 0.08);
    }

    /* X icon — amber, just removes from saved list */
    .remove-saved-btn:hover {
      color: #f59e0b;
      background: rgba(245, 158, 11, 0.08);
    }
  `]
})
export class PublicProfileComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private userService = inject(UserService);
  private followService = inject(FollowService);
  private authService = inject(AuthService);
  private postService = inject(PostService);

  public profile: PublicProfile | null = null;
  public isLoading = true;
  public errorMsg: string | null = null;
  public gridCells: GridDisplayCell[] = [];

  public isMe = false;
  public isFollowing = false;
  private myUsername = '';

  public posts: Post[] = [];
  public savedPosts: Post[] = [];
  public activeTab: 'posts' | 'saved' = 'posts';
  public commentMap: Record<string, Comment[]> = {};
  public commentDraft: Record<string, string> = {};
  public savedPostIds = new Set<string>();
  public openCommentPostId: string | null = null;
  public currentUserId = '';

  ngOnInit() {
    this.authService.currentUser$.subscribe(u => {
      if (u) {
        this.myUsername = u.username;
        this.currentUserId = u._id;
        this.checkOwnershipAndFollowStatus();
        this.loadSavedPostIds();
      }
    });

    this.route.params.subscribe(params => {
      const id = params['id'];
      if (id) {
        this.loadProfile(id);
      } else {
        this.isLoading = false;
        this.errorMsg = 'Invalid user link.';
      }
    });
  }

  private loadProfile(id: string) {
    this.isLoading = true;
    this.errorMsg = null;

    this.userService.getUserProfile(id).subscribe({
      next: response => {
        this.isLoading = false;
        if (response.success && response.profile) {
          this.profile = response.profile;
          this.checkOwnershipAndFollowStatus();
          this.generateSimulatedGrid(response.profile.stats);
          this.loadUserPosts();
        } else {
          this.errorMsg = 'Could not find the requested user profile.';
        }
      },
      error: err => {
        this.isLoading = false;
        this.errorMsg = 'Error communicating with backend server.';
        console.error('Error loading public profile:', err);
      }
    });
  }

  private loadUserPosts() {
    if (!this.profile) return;
    this.postService.getUserPosts(this.profile.user.username).subscribe({
      next: (res) => {
        this.posts = res.posts || [];
      },
      error: (err) => console.error('Failed to load user posts:', err)
    });
  }

  private loadSavedPostIds() {
    this.postService.getSavedPosts().subscribe({
      next: (res) => {
        const list = res.savedPosts || [];
        this.savedPostIds = new Set(list.map(sp => sp.post?._id).filter((id): id is string => !!id));
        if (this.isMe) {
          this.savedPosts = list.map(sp => sp.post).filter((p): p is Post => !!p);
        }
      },
      error: (err) => console.error('Failed to load saved posts:', err)
    });
  }

  private checkOwnershipAndFollowStatus() {
    if (!this.profile || !this.myUsername) return;

    this.isMe = this.profile.user.username.toLowerCase() === this.myUsername.toLowerCase();

    if (!this.isMe) {
      this.followService.getFollowing(this.myUsername).subscribe({
        next: (res) => {
          const followingList = res.following || [];
          this.isFollowing = followingList.some(
            u => u.following?.username?.toLowerCase() === this.profile!.user.username.toLowerCase()
          );
        }
      });
    }
  }

  public toggleFollow() {
    if (!this.profile) return;
    
    if (this.isFollowing) {
      this.followService.unfollow(this.profile.user.username).subscribe({
        next: () => {
          this.isFollowing = false;
          if (this.profile) {
            this.profile.stats.followers = Math.max(0, (this.profile.stats.followers || 0) - 1);
          }
        }
      });
    } else {
      this.followService.follow(this.profile.user.username).subscribe({
        next: () => {
          this.isFollowing = true;
          if (this.profile) {
            this.profile.stats.followers = (this.profile.stats.followers || 0) + 1;
          }
        }
      });
    }
  }

  isLiked(post: Post): boolean { return post.likes && post.likes.includes(this.currentUserId); }
  isSaved(post: Post): boolean { return this.savedPostIds.has(post._id); }

  toggleLike(post: Post) {
    if (!post.likes) post.likes = [];
    this.postService.likePost(post._id).subscribe(res => {
      if (res.liked) {
        post.likes.push(this.currentUserId);
      } else {
        post.likes = post.likes.filter(id => id !== this.currentUserId);
      }
    });
  }

  toggleSave(post: Post) {
    const currentlySaved = this.isSaved(post);
    this.postService.toggleSavePost(post._id, currentlySaved).subscribe({
      next: () => {
        if (currentlySaved) {
          this.savedPostIds.delete(post._id);
          if (this.isMe) {
            this.savedPosts = this.savedPosts.filter(p => p._id !== post._id);
          }
        } else {
          this.savedPostIds.add(post._id);
          if (this.isMe) {
            if (!this.savedPosts.some(p => p._id === post._id)) {
              this.savedPosts.unshift(post);
            }
          }
        }
      },
      error: (err) => console.error('Save toggle failed:', err)
    });
  }

  toggleComments(postId: string) {
    if (this.openCommentPostId === postId) {
      this.openCommentPostId = null;
      return;
    }
    this.openCommentPostId = postId;
    if (!this.commentMap[postId]) {
      this.postService.getComments(postId).subscribe(res => {
        this.commentMap[postId] = res.comments || [];
      });
    }
  }

  submitComment(post: Post) {
    const content = this.commentDraft[post._id]?.trim();
    if (!content) return;
    this.postService.addComment(post._id, content).subscribe(res => {
      if (!this.commentMap[post._id]) this.commentMap[post._id] = [];
      this.commentMap[post._id].push(res.comment);
      post.commentsCount = (post.commentsCount || 0) + 1;
      this.commentDraft[post._id] = '';
    });
  }

  deleteComment(post: Post, commentId: string) {
    if (confirm('Are you sure you want to delete this comment?')) {
      this.postService.deleteComment(commentId).subscribe({
        next: () => {
          if (this.commentMap[post._id]) {
            this.commentMap[post._id] = this.commentMap[post._id].filter(c => c._id !== commentId);
          }
          post.commentsCount = Math.max(0, (post.commentsCount || 0) - 1);
        },
        error: (err) => console.error('Failed to delete comment:', err)
      });
    }
  }

  deletePost(postId: string) {
    if (confirm('Are you sure you want to delete this post?')) {
      this.postService.deletePost(postId).subscribe({
        next: () => {
          this.posts = this.posts.filter(p => p._id !== postId);
          this.savedPosts = this.savedPosts.filter(p => p._id !== postId);
          this.savedPostIds.delete(postId);
          if (this.profile && this.isMe) {
            this.profile.stats.totalTasksCompleted = Math.max(0, (this.profile.stats.totalTasksCompleted || 0) - 1);
          }
        },
        error: (err) => console.error('Failed to delete post:', err)
      });
    }
  }

  getRelativeTime(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return days < 7 ? `${days}d ago` : new Date(dateStr).toLocaleDateString();
  }

  private generateSimulatedGrid(stats: any) {
    const cells: GridDisplayCell[] = [];
    const today = new Date();
    const currentStreak = stats.currentStreak || 0;
    let remainingCompletions = Math.max(0, (stats.totalTasksCompleted || 0) - currentStreak);

    for (let i = 83; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];

      let tasksCompleted = 0;
      let intensity = 0;

      if (i < currentStreak) {
        tasksCompleted = 1 + Math.floor(Math.random() * 2);
        intensity = tasksCompleted === 1 ? 1 : 2;
      } else if (remainingCompletions > 0 && Math.random() < 0.25) {
        const bundle = Math.min(remainingCompletions, 1 + Math.floor(Math.random() * 3));
        tasksCompleted = bundle;
        intensity = bundle === 1 ? 1 : bundle === 2 ? 2 : 3;
        remainingCompletions -= bundle;
      }

      cells.push({
        date: dateStr,
        tasksCompleted,
        intensity,
        isEmptyPlaceholder: false
      });
    }

    this.gridCells = cells;
  }
}
