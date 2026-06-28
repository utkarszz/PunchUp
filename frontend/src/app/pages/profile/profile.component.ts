import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService, UserProfile } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';
import { UploadService } from '../../core/services/upload.service';
import { StreakService, StreakData } from '../../core/services/streak.service';
import { AnalyticsService, AnalyticsData } from '../../core/services/analytics.service';
import { PostService, Post, Comment } from '../../core/services/post.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="profile-page animate-fade-in">

      <!-- Profile Hero Card -->
      <div class="card profile-hero animate-slide-up" *ngIf="user">
        <div class="hero-top">
          <div class="avatar-wrapper">
            <img
              [src]="user.profilePicture || 'assets/default-avatar.png'"
              [alt]="user.username"
              class="profile-avatar"
              onerror="this.src='https://api.dicebear.com/7.x/bottts/svg?seed=user'"
            />
            <button class="avatar-upload-btn" (click)="fileInput.click()" [disabled]="isUploading" title="Change photo">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
            </button>
            <input #fileInput type="file" accept="image/*" style="display:none" (change)="onFileSelected($event)" />
            
            <button *ngIf="user.profilePicture && isEditing"
                    class="avatar-remove-btn"
                    (click)="removeProfilePicture()"
                    [disabled]="isSaving"
                    title="Remove profile photo">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <div class="hero-identity">
            <h1 class="display-name">{{ user.displayName || user.username }}</h1>
            <span class="username-handle">&#64;{{ user.username }}</span>
            <p class="bio-text" *ngIf="user.bio && !isEditing">{{ user.bio }}</p>
            <p class="bio-text muted" *ngIf="!user.bio && !isEditing">No bio yet. Add one to let others know what you are working on.</p>
          </div>

          <div class="hero-actions">
            <button class="btn btn-secondary btn-sm" (click)="toggleEdit()">
              {{ isEditing ? 'Cancel' : 'Edit Profile' }}
            </button>
            <button class="btn btn-secondary btn-sm" (click)="copyPublicUrl()">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
              {{ copyText }}
            </button>
          </div>
        </div>

        <!-- Stats Row -->
        <div class="stats-row">
          <div class="stat-item">
            <span class="stat-num">{{ streakData?.currentStreak || 0 }}</span>
            <span class="stat-label">Current Streak</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <span class="stat-num">{{ streakData?.longestStreak || 0 }}</span>
            <span class="stat-label">Longest Streak</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <span class="stat-num">{{ analyticsData?.completedTasks || 0 }}</span>
            <span class="stat-label">Tasks Done</span>
          </div>
          <div class="stat-divider"></div>
          <a [routerLink]="['/user', user?.username, 'network']" [queryParams]="{tab:'followers'}" class="stat-item stat-item-link">
            <span class="stat-num">{{ profileStats?.followers || 0 }}</span>
            <span class="stat-label">Followers</span>
          </a>
          <div class="stat-divider"></div>
          <a [routerLink]="['/user', user?.username, 'network']" [queryParams]="{tab:'following'}" class="stat-item stat-item-link">
            <span class="stat-num">{{ profileStats?.following || 0 }}</span>
            <span class="stat-label">Following</span>
          </a>
        </div>
      </div>

      <!-- Edit Form (inline, no modal) -->
      <div class="card edit-form-card animate-slide-up" *ngIf="isEditing">
        <h3>Edit Details</h3>
        <form (submit)="onSaveProfile()" class="edit-form">
          <div class="form-group">
            <label>Display Name</label>
            <input type="text" [(ngModel)]="displayName" name="displayName" placeholder="e.g. Utkarsh Singh" />
          </div>
          <div class="form-group">
            <label>Username</label>
            <input type="text" [(ngModel)]="username" name="username" required placeholder="e.g. utkarzz" />
          </div>
          <div class="form-group">
            <label>Email Address</label>
            <input type="email" [value]="user?.email" disabled class="disabled-input" />
          </div>
          <div class="form-group">
            <label>Biography</label>
            <textarea [(ngModel)]="bio" name="bio" rows="3" placeholder="Tell the community what you are working on..."></textarea>
          </div>
          <div class="form-actions">
            <div class="save-status" *ngIf="saveStatus" [class.success]="saveStatus === 'success'">
              {{ saveStatus === 'success' ? 'Profile saved!' : (serverErrorMessage || 'Failed to save profile.') }}
            </div>
            <div class="action-btns">
              <button type="button" (click)="toggleEdit()" class="btn btn-secondary">Cancel</button>
              <button type="submit" [disabled]="isSaving" class="btn btn-primary">
                {{ isSaving ? 'Saving...' : 'Save Changes' }}
              </button>
            </div>
          </div>
        </form>

        <!-- Danger Zone -->
        <div class="danger-zone">
          <h4 class="danger-title">Danger Zone</h4>
          <p class="danger-desc">Once you delete your account, there is no going back. All your streaks, tasks, comments, saved posts, and followers will be permanently deleted.</p>
          
          <button *ngIf="!showDeleteConfirm" type="button" class="btn btn-danger btn-sm" (click)="confirmDeleteAccount()">
            Delete Account Permanently
          </button>

          <!-- Confirmation block -->
          <div class="confirm-delete-block" *ngIf="showDeleteConfirm">
            <p class="confirm-msg">Are you absolutely sure? Type your username <strong>{{ user?.username }}</strong> to confirm.</p>
            <input type="text" [(ngModel)]="deleteConfirmUsername" name="deleteConfirmUsername" class="confirm-input" placeholder="Type username here..." />
            <div class="confirm-actions">
              <button type="button" class="btn btn-secondary btn-sm" (click)="cancelDelete()">Cancel</button>
              <button type="button" class="btn btn-danger btn-sm" [disabled]="deleteConfirmUsername !== user?.username || isDeletingAccount" (click)="executeDeleteAccount()">
                {{ isDeletingAccount ? 'Deleting...' : 'Permanently Delete My Account' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Tabs for profile posts vs saved posts -->
      <div class="profile-tabs-container animate-slide-up" style="animation-delay: 240ms;">
        <button class="tab-btn" [class.active]="activeTab === 'posts'" (click)="activeTab = 'posts'">
          My Posts ({{ posts.length }})
        </button>
        <button class="tab-btn" [class.active]="activeTab === 'saved'" (click)="activeTab = 'saved'">
          Saved Posts ({{ savedPosts.length }})
        </button>
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
                  <button class="btn-icon delete-post-btn" (click)="deletePost(post._id)" title="Delete Post">
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

        <!-- Active Tab: Saved Posts -->
        <ng-container *ngIf="activeTab === 'saved'">
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
                          *ngIf="c.user._id === user?._id || post.user._id === user?._id" 
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

      <!-- Upload status -->
      <div class="upload-toast" *ngIf="isUploading">Uploading photo...</div>

    </div>
  `,
  styles: [`
    .profile-page {
      padding: 2.5rem;
      max-width: 800px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    /* Hero Card */
    .profile-hero {
      display: flex;
      flex-direction: column;
      gap: 1.75rem;
    }

    .hero-top {
      display: flex;
      align-items: flex-start;
      gap: 1.5rem;
    }

    /* Avatar */
    .avatar-wrapper {
      position: relative;
      flex-shrink: 0;
    }

    .profile-avatar {
      width: 88px;
      height: 88px;
      border-radius: 50%;
      border: 2px solid var(--border-hover);
      object-fit: cover;
    }

    .avatar-upload-btn {
      position: absolute;
      bottom: 0;
      right: 0;
      width: 26px;
      height: 26px;
      border-radius: 50%;
      background: var(--surface-elevated);
      border: 1.5px solid var(--border-hover);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: var(--text-secondary);
      transition: all 0.15s ease;
    }

    .avatar-upload-btn:hover {
      background: var(--surface-hover);
      color: var(--text-primary);
      border-color: var(--border-glow);
    }

    .avatar-remove-btn {
      position: absolute;
      bottom: 0;
      left: 0;
      width: 26px;
      height: 26px;
      border-radius: 50%;
      background: var(--surface-elevated);
      border: 1.5px solid rgba(239, 68, 68, 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: var(--danger);
      transition: all 0.15s ease;
    }

    .avatar-remove-btn:hover {
      background: rgba(239, 68, 68, 0.08);
      border-color: var(--danger);
    }

    /* Identity */
    .hero-identity {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .display-name {
      font-size: 1.625rem;
      font-weight: 700;
      line-height: 1.2;
    }

    .username-handle {
      font-size: 0.9rem;
      color: var(--text-muted);
      font-weight: 400;
    }

    .bio-text {
      font-size: 0.9rem;
      color: var(--text-secondary);
      margin-top: 0.35rem;
      line-height: 1.5;
    }

    .bio-text.muted { color: var(--text-muted); font-style: italic; }

    .hero-actions {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      align-items: flex-end;
    }

    /* Stats Row */
    .stats-row {
      display: flex;
      align-items: center;
      gap: 0;
      border-top: 1px solid var(--border);
      padding-top: 1.5rem;
    }

    .stat-item {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.25rem;
      text-align: center;
    }

    .stat-num {
      font-size: 1.875rem;
      font-weight: 700;
      font-family: var(--font-display);
      color: var(--text-primary);
      line-height: 1;
    }

    .stat-label {
      font-size: 0.6875rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
    }

    .stat-divider {
      width: 1px;
      height: 40px;
      background: var(--border);
      flex-shrink: 0;
    }

    .stat-item-link {
      text-decoration: none;
      cursor: pointer;
      transition: opacity 0.15s ease;
      border-radius: var(--radius);
    }

    .stat-item-link:hover {
      opacity: 0.75;
    }

    .stat-item-link .stat-label {
      color: var(--accent);
    }

    /* Edit Form */
    .edit-form-card h3 {
      font-size: 1.125rem;
      font-weight: 600;
      margin-bottom: 1.25rem;
    }

    .edit-form {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .form-actions {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding-top: 0.5rem;
    }

    .action-btns {
      display: flex;
      gap: 0.75rem;
      margin-left: auto;
    }

    .save-status {
      font-size: 0.875rem;
      color: var(--danger);
      padding: 0.5rem 0.75rem;
      border-radius: var(--radius);
      background: rgba(239,68,68,0.05);
      border: 1px solid rgba(239,68,68,0.15);
    }

    .save-status.success {
      color: var(--success);
      background: rgba(16,185,129,0.05);
      border-color: rgba(16,185,129,0.2);
    }

    .upload-toast {
      position: fixed;
      bottom: calc(var(--mobile-nav-height) + 1rem);
      left: 50%;
      transform: translateX(-50%);
      background: var(--surface-elevated);
      border: 1px solid var(--border-hover);
      border-radius: var(--radius-lg);
      padding: 0.75rem 1.25rem;
      font-size: 0.875rem;
      color: var(--text-primary);
      box-shadow: var(--shadow-lg);
      z-index: 1000;
    }

    /* Danger Zone */
    .danger-zone {
      margin-top: 2rem;
      padding: 1.5rem;
      border: 1px solid rgba(239, 68, 68, 0.2);
      background: rgba(239, 68, 68, 0.02);
      border-radius: var(--radius-lg);
      text-align: left;
    }

    .danger-title {
      color: var(--danger);
      font-size: 1rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
    }

    .danger-desc {
      font-size: 0.8125rem;
      color: var(--text-secondary);
      margin-bottom: 1.25rem;
      line-height: 1.5;
    }

    .confirm-delete-block {
      margin-top: 1rem;
      padding: 1.25rem;
      border: 1px solid var(--border-hover);
      background: var(--surface-hover);
      border-radius: var(--radius);
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .confirm-msg {
      font-size: 0.875rem;
      color: var(--text-primary);
      margin: 0;
    }

    .confirm-input {
      background: var(--surface);
      border: 1px solid var(--border);
    }

    .confirm-actions {
      display: flex;
      gap: 0.75rem;
      justify-content: flex-end;
    }

    @media (max-width: 640px) {
      .profile-page {
        padding: 1.25rem 1rem;
        padding-bottom: calc(var(--mobile-nav-height) + 1.25rem);
      }

      .hero-top {
        flex-direction: column;
        align-items: flex-start;
        gap: 1rem;
      }

      .hero-actions {
        flex-direction: row;
        align-items: center;
      }

      .stats-row {
        flex-wrap: wrap;
        gap: 1rem;
      }

      .stat-divider { display: none; }
      .stat-item { flex: 0 0 45%; }

      .stat-num { font-size: 1.5rem; }
    }

    /* Profile Tabs */
    .profile-tabs-container {
      display: flex;
      gap: 0.5rem;
      border-bottom: 1px solid var(--border);
      padding-bottom: 0.75rem;
      margin-top: 1rem;
    }

    .profile-tabs-container .tab-btn {
      background: transparent;
      border: none;
      padding: 0.5rem 1rem;
      font-size: 0.9rem;
      font-weight: 500;
      color: var(--text-secondary);
      cursor: pointer;
      border-radius: var(--radius);
      transition: all var(--transition-fast);
    }

    .profile-tabs-container .tab-btn:hover {
      background: var(--surface-hover);
      color: var(--text-primary);
    }

    .profile-tabs-container .tab-btn.active {
      background: var(--surface-elevated);
      color: var(--text-primary);
      border: 1px solid var(--border-glow);
    }

    /* Posts Feed */
    .profile-posts-list {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .posts-feed {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .post-card {
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      text-align: left;
    }

    .post-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .post-author-link {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      text-decoration: none;
    }

    .post-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      object-fit: cover;
      border: 1px solid var(--border);
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

    .post-content {
      font-size: 0.9375rem;
      line-height: 1.5;
      color: var(--text-primary);
      white-space: pre-wrap;
    }

    .post-images {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 0.5rem;
      border-radius: var(--radius);
      overflow: hidden;
    }

    .post-image {
      width: 100%;
      height: auto;
      max-height: 360px;
      object-fit: cover;
      border-radius: var(--radius);
    }

    .post-actions {
      display: flex;
      gap: 1.5rem;
      border-top: 1px solid var(--border);
      padding-top: 0.75rem;
    }

    .action-btn {
      background: transparent;
      border: none;
      display: flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.8125rem;
      color: var(--text-secondary);
      cursor: pointer;
      padding: 0.25rem 0.5rem;
      border-radius: var(--radius);
      transition: all var(--transition-fast);
    }

    .action-btn:hover {
      background: var(--surface-hover);
      color: var(--text-primary);
    }

    .action-btn.active {
      color: var(--accent);
    }

    /* Comments Section */
    .comments-section {
      border-top: 1px solid var(--border);
      padding-top: 1rem;
      margin-top: 0.5rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .comments-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .comment-item {
      display: flex;
      gap: 0.75rem;
      align-items: flex-start;
    }

    .comment-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      object-fit: cover;
    }

    .comment-body {
      background: var(--surface-hover);
      padding: 0.75rem 1rem;
      border-radius: var(--radius-lg);
      font-size: 0.875rem;
      line-height: 1.4;
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }

    .comment-author {
      font-weight: 600;
      color: var(--text-primary);
    }

    .comment-text {
      color: var(--text-secondary);
    }

    .comment-input-row {
      display: flex;
      gap: 0.75rem;
    }

    .comment-input-row .input {
      flex: 1;
      font-size: 0.875rem;
      padding: 0.5rem 0.875rem;
    }

    .btn-icon {
      background: transparent;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      padding: 0.25rem;
      border-radius: var(--radius);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all var(--transition-fast);
    }

    .btn-icon:hover {
      color: var(--text-secondary);
      background: var(--surface-hover);
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
export class ProfileComponent implements OnInit {
  private authService = inject(AuthService);
  private userService = inject(UserService);
  private uploadService = inject(UploadService);
  private streakService = inject(StreakService);
  private analyticsService = inject(AnalyticsService);
  private postService = inject(PostService);

  public user: UserProfile | null = null;
  public streakData: StreakData | null = null;
  public analyticsData: AnalyticsData | null = null;
  public profileStats: { followers: number; following: number } | null = null;

  public displayName = '';
  public username = '';
  public bio = '';
  public isEditing = false;
  public isSaving = false;
  public isUploading = false;
  public showDeleteConfirm = false;
  public deleteConfirmUsername = '';
  public isDeletingAccount = false;
  public saveStatus: 'success' | 'error' | null = null;
  public serverErrorMessage = '';
  public copyText = 'Share';

  // Social/Posts states
  public posts: Post[] = [];
  public savedPosts: Post[] = [];
  public activeTab: 'posts' | 'saved' = 'posts';
  public commentMap: { [key: string]: Comment[] } = {};
  public commentDraft: { [key: string]: string } = {};
  public savedPostIds = new Set<string>();
  public openCommentPostId: string | null = null;

  ngOnInit() {
    this.authService.currentUser$.subscribe(u => {
      if (u) {
        this.user = u;
        this.displayName = u.displayName || '';
        this.username = u.username || '';
        this.bio = u.bio || '';
        // Load followers/following counts
        this.userService.getUserProfile(u.username).subscribe({
          next: res => {
            if (res.success && res.profile) {
              this.profileStats = {
                followers: res.profile.stats.followers || 0,
                following: res.profile.stats.following || 0
              };
            }
          },
          error: () => {}
        });

        // Load post feeds
        this.loadUserPosts();
        this.loadSavedPostIds();
      }
    });

    this.streakService.getStreak().subscribe({
      next: res => this.streakData = res.streak,
      error: () => {}
    });

    this.analyticsService.getAnalytics().subscribe({
      next: res => this.analyticsData = res.analytics,
      error: () => {}
    });
  }

  public toggleEdit() {
    this.isEditing = !this.isEditing;
    if (!this.isEditing) {
      // Reset form values
      this.displayName = this.user?.displayName || '';
      this.username = this.user?.username || '';
      this.bio = this.user?.bio || '';
    }
  }

  public copyPublicUrl() {
    if (!this.user) return;
    const url = `${window.location.origin}/user/${this.user.username}`;
    navigator.clipboard.writeText(url).then(() => {
      this.copyText = 'Copied!';
      setTimeout(() => this.copyText = 'Share', 2500);
    });
  }

  public onFileSelected(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      const file = target.files[0];
      this.isUploading = true;
      this.uploadService.uploadProfilePicture(file).subscribe({
        next: response => {
          this.isUploading = false;
          if (response.success && response.imageUrl) {
            const updatedUser = { ...this.user!, profilePicture: response.imageUrl };
            this.authService.updateProfileLocally(updatedUser);
          }
        },
        error: () => { this.isUploading = false; }
      });
    }
  }

  public onSaveProfile() {
    if (!this.username) return;
    this.isSaving = true;
    this.saveStatus = null;
    this.serverErrorMessage = '';
    this.userService.updateProfile(this.username, this.bio, this.displayName, this.user?.profilePicture).subscribe({
      next: response => {
        this.isSaving = false;
        if (response.success && response.user) {
          const updatedUser = { 
            ...this.user!, 
            displayName: response.user.displayName,
            username: response.user.username, 
            bio: response.user.bio 
          };
          this.authService.updateProfileLocally(updatedUser);
          this.saveStatus = 'success';
          setTimeout(() => { this.saveStatus = null; this.isEditing = false; }, 2000);
        }
      },
      error: (err) => {
        this.isSaving = false;
        this.saveStatus = 'error';
        this.serverErrorMessage = err.error?.message || 'Failed to save profile.';
        setTimeout(() => this.saveStatus = null, 3000);
      }
    });
  }

  public removeProfilePicture() {
    if (!this.user) return;
    this.isSaving = true;
    this.saveStatus = null;
    this.userService.updateProfile(this.username, this.bio, this.displayName, null).subscribe({
      next: response => {
        this.isSaving = false;
        if (response.success && response.user) {
          const updatedUser = { 
            ...this.user!, 
            profilePicture: ''
          };
          this.authService.updateProfileLocally(updatedUser);
          this.saveStatus = 'success';
          setTimeout(() => { this.saveStatus = null; }, 2000);
        }
      },
      error: (err) => {
        this.isSaving = false;
        this.saveStatus = 'error';
        this.serverErrorMessage = err.error?.message || 'Failed to remove photo.';
        setTimeout(() => this.saveStatus = null, 3000);
      }
    });
  }

  public confirmDeleteAccount() {
    this.showDeleteConfirm = true;
    this.deleteConfirmUsername = '';
  }

  public cancelDelete() {
    this.showDeleteConfirm = false;
    this.deleteConfirmUsername = '';
  }

  public executeDeleteAccount() {
    if (this.deleteConfirmUsername !== this.user?.username) return;
    this.isDeletingAccount = true;
    this.userService.deleteAccount().subscribe({
      next: () => {
        this.isDeletingAccount = false;
        this.authService.logout();
      },
      error: (err) => {
        this.isDeletingAccount = false;
        alert(err.error?.message || 'Failed to delete account. Please try again.');
      }
    });
  }

  // Social/Posts interaction helper methods
  private loadUserPosts() {
    if (!this.user) return;
    this.postService.getUserPosts(this.user.username).subscribe({
      next: (res) => this.posts = res.posts || [],
      error: (err) => console.error('Failed to load user posts:', err)
    });
  }

  private loadSavedPostIds() {
    this.postService.getSavedPosts().subscribe({
      next: (res) => {
        const list = res.savedPosts || [];
        this.savedPostIds = new Set(list.map(sp => sp.post?._id).filter((id): id is string => !!id));
        this.savedPosts = list.map(sp => sp.post).filter((p): p is Post => !!p);
      },
      error: (err) => console.error('Failed to load saved posts:', err)
    });
  }

  isLiked(post: Post): boolean {
    return post.likes && post.likes.includes(this.user?._id || '');
  }

  isSaved(post: Post): boolean {
    return this.savedPostIds.has(post._id);
  }

  toggleLike(post: Post) {
    this.postService.likePost(post._id).subscribe({
      next: (res) => {
        if (res.liked) {
          post.likes.push(this.user?._id || '');
        } else {
          post.likes = post.likes.filter(id => id !== (this.user?._id || ''));
        }
      }
    });
  }

  toggleSave(post: Post) {
    const currentlySaved = this.isSaved(post);
    this.postService.toggleSavePost(post._id, currentlySaved).subscribe({
      next: () => {
        if (currentlySaved) {
          this.savedPostIds.delete(post._id);
          this.savedPosts = this.savedPosts.filter(p => p._id !== post._id);
        } else {
          this.savedPostIds.add(post._id);
          this.loadSavedPostIds();
        }
      }
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
}
