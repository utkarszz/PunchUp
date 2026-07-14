import { Component, OnInit, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PostService, Post, Comment } from '../../core/services/post.service';
import { FollowService, FollowUser } from '../../core/services/follow.service';
import { AuthService } from '../../core/services/auth.service';
import { UploadService } from '../../core/services/upload.service';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-community',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="community-container animate-fade-in">

      <!-- Left: Feed -->
      <main class="feed-column">
        <div class="page-title animate-slide-up">
          <h1>Community</h1>
          <p class="subtitle">Share your progress. Inspire others.</p>
        </div>

        <!-- Search Bar -->
        <div class="search-bar-wrap animate-slide-up">
          <div class="search-input-row">
            <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              id="community-search"
              type="text"
              class="search-input"
              [(ngModel)]="searchQuery"
              (ngModelChange)="onSearchInput($event)"
              placeholder="Search users, posts, #hashtags…"
              autocomplete="off"
            />
            <button *ngIf="searchQuery" class="search-clear-btn" (click)="clearSearch()" title="Clear search">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
            <div class="search-spinner" *ngIf="isSearching">
              <div class="spinner-small"></div>
            </div>
          </div>

          <!-- Search Results Panel -->
          <div class="search-results-panel" *ngIf="searchQuery.trim() && !isSearching">

            <!-- Tabs -->
            <div class="search-tabs">
              <button class="search-tab" [class.active]="activeSearchTab === 'all'" (click)="setSearchTab('all')">All</button>
              <button class="search-tab" [class.active]="activeSearchTab === 'users'" (click)="setSearchTab('users')">
                Users <span class="tab-badge" *ngIf="searchResults.users.length > 0">{{ searchResults.users.length }}</span>
              </button>
              <button class="search-tab" [class.active]="activeSearchTab === 'posts'" (click)="setSearchTab('posts')">
                Posts <span class="tab-badge" *ngIf="searchResults.posts.length > 0">{{ searchResults.posts.length }}</span>
              </button>
              <button class="search-tab" [class.active]="activeSearchTab === 'hashtags'" (click)="setSearchTab('hashtags')">
                Hashtags <span class="tab-badge" *ngIf="searchResults.hashtags.length > 0">{{ searchResults.hashtags.length }}</span>
              </button>
            </div>

            <!-- Empty State -->
            <div class="search-empty" *ngIf="searchResults.users.length === 0 && searchResults.posts.length === 0 && searchResults.hashtags.length === 0">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <p>No results for "<strong>{{ searchQuery }}</strong>"</p>
            </div>

            <!-- Users Section -->
            <div class="search-section" *ngIf="searchResults.users.length > 0 && (activeSearchTab === 'all' || activeSearchTab === 'users')">
              <span class="search-section-label">Users</span>
              <div class="search-user-item" *ngFor="let user of searchResults.users">
                <a [routerLink]="['/user', user.username]" class="search-user-link">
                  <img
                    [src]="user.profilePicture || 'assets/default-avatar.png'"
                    class="search-avatar"
                    [alt]="user.username"
                    onerror="this.src='https://api.dicebear.com/7.x/bottts/svg?seed=s'"
                  />
                  <div class="search-user-info">
                    <span class="search-user-name">{{ user.displayName || user.username }}</span>
                    <span class="search-user-handle">&#64;{{ user.username }}</span>
                  </div>
                </a>
              </div>
            </div>

            <!-- Posts Section -->
            <div class="search-section" *ngIf="searchResults.posts.length > 0 && (activeSearchTab === 'all' || activeSearchTab === 'posts')">
              <span class="search-section-label">Posts</span>
              <div class="search-post-item" *ngFor="let post of searchResults.posts">
                <a [routerLink]="['/user', post.user?.username]" class="search-post-author-link">
                  <img
                    [src]="post.user?.profilePicture || 'assets/default-avatar.png'"
                    class="search-avatar"
                    [alt]="post.user?.username"
                    onerror="this.src='https://api.dicebear.com/7.x/bottts/svg?seed=p'"
                  />
                  <span class="search-post-author-name">{{ post.user?.displayName || post.user?.username }}</span>
                </a>
                <p class="search-post-excerpt">{{ post.content | slice:0:120 }}{{ post.content?.length > 120 ? '…' : '' }}</p>
              </div>
            </div>

            <!-- Hashtags Section -->
            <div class="search-section" *ngIf="searchResults.hashtags.length > 0 && (activeSearchTab === 'all' || activeSearchTab === 'hashtags')">
              <span class="search-section-label">Hashtags</span>
              <div class="search-hashtag-row">
                <span class="search-hashtag-chip" *ngFor="let tag of searchResults.hashtags">
                  {{ tag.name }} <span class="hashtag-count">{{ tag.count }}</span>
                </span>
              </div>
            </div>

            <!-- Load More -->
            <button
              class="btn btn-secondary btn-sm search-load-more-btn"
              *ngIf="searchResults.users.length > 0 || searchResults.posts.length > 0"
              (click)="loadMoreSearch()"
              [disabled]="isLoadingMoreSearch"
            >
              {{ isLoadingMoreSearch ? 'Loading…' : 'Load More' }}
            </button>
          </div>
        </div>

        <!-- Composer -->
        <div class="card composer-card animate-slide-up" *ngIf="authService.currentUser$ | async as me">
          <div class="composer-top">
            <img
              [src]="me.profilePicture || 'assets/default-avatar.png'"
              class="composer-avatar"
              alt="You"
              onerror="this.src='https://api.dicebear.com/7.x/bottts/svg?seed=me'"
            />
            <textarea
              class="composer-input"
              [(ngModel)]="newPostContent"
              placeholder="What are you working on today?"
              rows="3"
            ></textarea>
          </div>

          <!-- Image Previews -->
          <div class="composer-attachments" *ngIf="uploadedImages.length > 0 || isUploadingImage">
            <div class="attachment-preview" *ngFor="let img of uploadedImages; let idx = index">
              <img [src]="img" alt="Attachment" />
              <button type="button" class="remove-attachment-btn" (click)="removeAttachment(idx)">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div class="attachment-preview loading-attachment" *ngIf="isUploadingImage">
              <div class="spinner-small"></div>
            </div>
          </div>

          <div class="composer-actions">
            <button type="button" class="btn-icon-composer" (click)="imageInput.click()" [disabled]="isUploadingImage || uploadedImages.length >= 4" title="Attach Image">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
              </svg>
            </button>
            <input #imageInput type="file" accept="image/*" style="display:none" (change)="onFileSelected($event)" />

            <span class="char-count" [class.over]="newPostContent.length > 500">
              {{ newPostContent.length }}/500
            </span>
            <button
              class="btn btn-primary btn-sm"
              (click)="submitPost()"
              [disabled]="(!newPostContent.trim() && uploadedImages.length === 0) || newPostContent.length > 500 || isPosting || isUploadingImage"
            >
              {{ isPosting ? 'Posting...' : 'Post' }}
            </button>
          </div>
        </div>

        <!-- Feed Loading -->
        <div class="skeleton-feed" *ngIf="isLoading">
          <div class="skeleton-post card" *ngFor="let i of [1,2,3]"></div>
        </div>

        <!-- Feed Empty -->
        <div class="empty-feed card" *ngIf="!isLoading && posts.length === 0">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
          <p>No posts yet. Be the first to share your progress!</p>
        </div>

        <!-- Posts Feed -->
        <div class="feed-list" *ngIf="!isLoading && posts.length > 0">
          <article class="card post-card animate-slide-up" *ngFor="let post of posts; let i = index">
            <div class="post-header">
              <a [routerLink]="['/user', post.user.username]" class="post-author-link">
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
              </a>
              <span class="post-time">{{ getRelativeTime(post.createdAt) }}</span>
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
                <span>{{ post.saves?.length || 0 }}</span>
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
      </main>

      <!-- Right: Suggested Users -->
      <aside class="suggestions-column">
        <div class="card suggestions-card animate-slide-up">
          <div class="suggestions-header">
            <h3 class="suggestions-title">People to Follow</h3>
            <button class="btn-icon refresh-btn" (click)="loadSuggestions()" title="Refresh Suggestions" [disabled]="loadingSuggestions">
              <svg [class.spinning]="loadingSuggestions" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M23 4v6h-6"></path>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
              </svg>
            </button>
          </div>

          <div class="suggestions-loading" *ngIf="loadingSuggestions && suggestions.length === 0">
            <div class="skeleton-user" *ngFor="let i of [1,2,3]"></div>
          </div>
          
          <div class="suggestions-list" *ngIf="!(loadingSuggestions && suggestions.length === 0)">
            <div class="suggestion-item" *ngFor="let user of suggestions">
              <a [routerLink]="['/user', user.username]" class="suggestion-user-link">
                <img
                  [src]="user.profilePicture || 'assets/default-avatar.png'"
                  class="suggestion-avatar"
                  [alt]="user.username"
                  onerror="this.src='https://api.dicebear.com/7.x/bottts/svg?seed=s'"
                />
                <div class="suggestion-info">
                  <span class="suggestion-name">{{ user.displayName || user.username }}</span>
                  <span class="suggestion-handle">&#64;{{ user.username }}</span>
                </div>
              </a>
              <button
                class="btn btn-sm"
                [class.btn-primary]="!followingSet.has(user.username)"
                [class.btn-secondary]="followingSet.has(user.username)"
                (click)="toggleFollow(user)"
              >
                {{ followingSet.has(user.username) ? 'Following' : 'Follow' }}
              </button>
            </div>
            <p class="no-suggestions" *ngIf="suggestions.length === 0">No suggestions right now.</p>

            <button *ngIf="suggestions.length > 0 && suggestionsLimit < 10" (click)="viewMoreSuggestions()" class="btn btn-secondary btn-sm view-more-suggestions-btn" [disabled]="loadingSuggestions">
              View More People
            </button>
          </div>
        </div>
      </aside>
    </div>
  `,
  styles: [`
    .community-container {
      display: grid;
      grid-template-columns: 1fr 300px;
      gap: 2rem;
      padding: 2.5rem;
      max-width: 1100px;
      margin: 0 auto;
      align-items: start;
    }

    .feed-column {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .page-title h1 { font-size: 1.75rem; font-weight: 700; }
    .subtitle { font-size: 0.875rem; color: var(--text-secondary); margin-top: 0.25rem; }

    /* ── Search Bar ─────────────────────────────────────────────────────────── */
    .search-bar-wrap {
      position: relative;
      z-index: 200;
      isolation: isolate;
    }

    .search-input-row {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 0.625rem 0.875rem;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
    }

    .search-input-row:focus-within {
      border-color: var(--accent);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 15%, transparent);
    }

    .search-icon { color: var(--text-muted); flex-shrink: 0; }

    .search-input {
      flex: 1;
      background: transparent;
      border: none;
      outline: none;
      color: var(--text-primary);
      font-size: 0.9375rem;
      font-family: var(--font-sans);
      min-width: 0;
    }

    .search-input::placeholder { color: var(--text-muted); }

    .search-clear-btn {
      background: transparent;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2px;
      border-radius: 50%;
      transition: color 0.15s ease;
      flex-shrink: 0;
    }

    .search-clear-btn:hover { color: var(--text-primary); }
    .search-spinner { display: flex; align-items: center; }

    .search-results-panel {
      position: absolute;
      top: calc(100% + 6px);
      left: 0;
      right: 0;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-lg);
      z-index: 1000;
      max-height: 480px;
      overflow-y: auto;
    }

    .search-tabs {
      display: flex;
      border-bottom: 1px solid var(--border);
      padding: 0 0.75rem;
      overflow-x: auto;
      scrollbar-width: none;
    }
    .search-tabs::-webkit-scrollbar { display: none; }

    .search-tab {
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      color: var(--text-secondary);
      cursor: pointer;
      font-size: 0.8125rem;
      font-weight: 500;
      padding: 0.625rem 0.75rem;
      white-space: nowrap;
      display: flex;
      align-items: center;
      gap: 0.375rem;
      transition: color 0.15s ease, border-color 0.15s ease;
    }

    .search-tab.active { color: var(--text-primary); border-bottom-color: var(--accent); }

    .tab-badge {
      background: #6366f1;
      color: #fff;
      font-size: 0.65rem;
      font-weight: 700;
      padding: 1px 5px;
      border-radius: 999px;
      line-height: 1.6;
    }

    .search-section {
      padding: 0.75rem 1rem 0.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .search-section-label {
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--text-muted);
    }

    .search-user-item { padding: 0.125rem 0; }

    .search-user-link {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      padding: 0.5rem 0.25rem;
      border-radius: var(--radius);
      text-decoration: none;
      transition: background 0.15s ease;
    }

    .search-user-link:hover { background: var(--surface-hover); }

    .search-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: 1px solid var(--border-hover);
      object-fit: cover;
      flex-shrink: 0;
    }

    .search-user-info { display: flex; flex-direction: column; }
    .search-user-name { font-size: 0.875rem; font-weight: 600; color: var(--text-primary); }
    .search-user-handle { font-size: 0.75rem; color: var(--text-muted); }

    .search-post-item {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
      padding: 0.5rem 0.25rem;
      border-radius: var(--radius);
      transition: background 0.15s ease;
    }

    .search-post-item:hover { background: var(--surface-hover); }

    .search-post-author-link {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      text-decoration: none;
    }

    .search-post-author-name { font-size: 0.8125rem; font-weight: 600; color: var(--text-primary); }

    .search-post-excerpt {
      font-size: 0.8125rem;
      color: var(--text-secondary);
      line-height: 1.4;
      margin: 0;
    }

    .search-hashtag-row {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      padding-bottom: 0.5rem;
    }

    .search-hashtag-chip {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      background: var(--surface-hover);
      border: 1px solid var(--border);
      border-radius: 999px;
      padding: 0.25rem 0.75rem;
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--text-primary);
    }

    .hashtag-count { font-size: 0.7rem; color: var(--text-muted); }

    .search-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.625rem;
      padding: 2rem 1rem;
      color: var(--text-muted);
      text-align: center;
    }

    .search-empty p { font-size: 0.875rem; margin: 0; }
    .search-empty svg { opacity: 0.4; }
    .search-load-more-btn { display: flex; margin: 0.5rem auto 0.75rem; }
    /* ─────────────────────────────────────────────────────────────────────── */

    /* Composer */
    .composer-card { display: flex; flex-direction: column; gap: 1rem; }

    .composer-top {
      display: flex;
      gap: 0.875rem;
      align-items: flex-start;
    }

    .composer-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border: 1px solid var(--border-hover);
      object-fit: cover;
      flex-shrink: 0;
      margin-top: 2px;
    }

    .composer-input {
      flex: 1;
      background: var(--surface-hover);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 0.75rem 1rem;
      color: var(--text-primary);
      font-size: 0.9375rem;
      resize: none;
      transition: border-color 0.2s ease;
      font-family: var(--font-sans);
      line-height: 1.55;
    }

    .composer-input:focus {
      outline: none;
      border-color: var(--border-hover);
    }

    .composer-actions {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 1rem;
    }

    .char-count {
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .char-count.over { color: var(--danger); }

    /* Composer Attachments */
    .composer-attachments {
      display: flex;
      gap: 0.5rem;
      margin-left: calc(36px + 0.875rem);
      flex-wrap: wrap;
      margin-top: -0.5rem;
    }

    .attachment-preview {
      position: relative;
      width: 72px;
      height: 72px;
      border-radius: var(--radius);
      overflow: hidden;
      border: 1px solid var(--border);
    }

    .attachment-preview img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .remove-attachment-btn {
      position: absolute;
      top: 2px;
      right: 2px;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: rgba(0, 0, 0, 0.7);
      border: none;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: background 0.15s ease;
    }

    .remove-attachment-btn:hover {
      background: rgba(0, 0, 0, 0.9);
    }

    .loading-attachment {
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--surface-hover);
    }

    .btn-icon-composer {
      background: transparent;
      border: none;
      color: var(--text-secondary);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0.5rem;
      border-radius: 50%;
      transition: all 0.15s ease;
      margin-right: auto;
    }

    .btn-icon-composer:hover:not(:disabled) {
      color: var(--text-primary);
      background: var(--surface-hover);
    }

    .btn-icon-composer:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .spinner-small {
      width: 16px;
      height: 16px;
      border: 2px solid var(--border);
      border-top-color: var(--text-primary);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Skeleton */
    .skeleton-feed { display: flex; flex-direction: column; gap: 1rem; }
    .skeleton-post { height: 180px; animation: shimmer 1.4s infinite; }

    @keyframes shimmer {
      0%, 100% { opacity: 0.5; }
      50% { opacity: 1; }
    }

    .empty-feed {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      padding: 3rem 2rem;
      text-align: center;
      color: var(--text-muted);
    }

    .empty-feed svg { opacity: 0.4; }

    /* Feed */
    .feed-list { display: flex; flex-direction: column; gap: 1rem; }

    .post-card { display: flex; flex-direction: column; gap: 1rem; }

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

    .post-time {
      font-size: 0.75rem;
      color: var(--text-muted);
      flex-shrink: 0;
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

    .action-btn:hover { color: var(--text-primary); background: var(--surface-hover); }
    .action-btn.active { color: var(--text-primary); }
    .action-btn.active svg { fill: currentColor; }

    /* Comments */
    .comments-section {
      border-top: 1px solid var(--border);
      padding-top: 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .comments-list { display: flex; flex-direction: column; gap: 0.625rem; }

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

    .comment-body { display: flex; flex-direction: column; gap: 0.15rem; }

    .comment-author {
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--text-primary);
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

    .comment-text {
      font-size: 0.875rem;
      color: var(--text-secondary);
    }

    .comment-input-row {
      display: flex;
      gap: 0.5rem;
    }

    .comment-input-row .input {
      flex: 1;
      padding: 0.5rem 0.75rem;
      font-size: 0.875rem;
    }

    /* Suggestions sidebar */
    .suggestions-column { position: sticky; top: 1.5rem; }

    .suggestions-card { display: flex; flex-direction: column; gap: 1.25rem; }

    .suggestions-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .refresh-btn {
      color: var(--text-muted);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: none;
      background: transparent;
      padding: 4px;
      border-radius: 50%;
      transition: all 0.2s ease;
    }

    .refresh-btn:hover:not([disabled]) {
      color: var(--text-primary);
      background: var(--surface-hover);
    }

    .refresh-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .spinning {
      animation: spin 0.8s linear infinite;
    }

    .view-more-suggestions-btn {
      width: 100%;
      margin-top: 0.5rem;
      justify-content: center;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .suggestions-title {
      font-size: 1rem;
      font-weight: 600;
      color: var(--text-primary);
    }

    .skeleton-user {
      height: 52px;
      border-radius: var(--radius);
      background: var(--surface-hover);
      animation: shimmer 1.4s infinite;
    }

    .suggestions-list { display: flex; flex-direction: column; gap: 0.75rem; }

    .suggestion-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
    }

    .suggestion-user-link {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      flex: 1;
      overflow: hidden;
    }

    .suggestion-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border: 1px solid var(--border-hover);
      object-fit: cover;
      flex-shrink: 0;
    }

    .suggestion-info {
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .suggestion-name {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .suggestion-handle {
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .no-suggestions { font-size: 0.875rem; color: var(--text-muted); }

    .btn-sm { padding: 0.35rem 0.75rem; font-size: 0.75rem; }

    /* Responsive */
    @media (max-width: 1024px) {
      .community-container {
        grid-template-columns: 1fr;
        padding: 1.5rem;
      }
      .suggestions-column { position: static; }
    }

    @media (max-width: 768px) {
      .community-container {
        padding: 1.25rem 1rem;
        padding-bottom: calc(var(--mobile-nav-height) + 1.25rem);
        gap: 1.25rem;
      }
    }
  `]
})
export class CommunityComponent implements OnInit, OnDestroy {
  public authService = inject(AuthService);
  private postService = inject(PostService);
  private followService = inject(FollowService);
  private uploadService = inject(UploadService);

  posts: Post[] = [];
  suggestions: FollowUser[] = [];
  commentMap: Record<string, Comment[]> = {};
  commentDraft: Record<string, string> = {};
  followingSet = new Set<string>();

  newPostContent = '';
  openCommentPostId: string | null = null;
  isLoading = true;
  isPosting = false;
  loadingSuggestions = true;
  
  uploadedImages: string[] = [];
  isUploadingImage = false;

  public currentUserId = '';

  suggestionsLimit = 3;

  // Search properties
  searchQuery = '';
  isSearching = false;
  activeSearchTab: 'all' | 'users' | 'posts' | 'hashtags' = 'all';
  searchResults = {
    users: [] as any[],
    posts: [] as any[],
    hashtags: [] as any[]
  };
  searchPage = 1;
  isLoadingMoreSearch = false;
  private searchSubject = new Subject<string>();
  private searchSubscription?: Subscription;

  ngOnInit() {
    this.authService.currentUser$.subscribe(u => {
      if (u) {
        this.currentUserId = u._id;
        this.followService.getFollowing(u.username).subscribe({
          next: (res) => {
            if (res.success && res.following) {
              res.following.forEach(f => {
                const followedUser = f.following || f;
                if (followedUser && followedUser.username) {
                  this.followingSet.add(followedUser.username);
                }
              });
            }
          }
        });
      }
    });

    this.postService.getFeed().subscribe({
      next: (res) => { this.posts = res.posts || []; this.isLoading = false; },
      error: () => { this.isLoading = false; }
    });

    this.loadSuggestions();

    this.searchSubscription = this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(query => {
      this.executeSearch(query);
    });
  }

  ngOnDestroy() {
    this.searchSubscription?.unsubscribe();
  }

  onSearchInput(query: string) {
    this.searchSubject.next(query);
  }

  executeSearch(query: string) {
    const trimmed = query.trim();
    if (!trimmed) {
      this.clearSearch();
      return;
    }
    this.isSearching = true;
    this.searchPage = 1;
    this.postService.searchCommunity(trimmed, 1).subscribe({
      next: (res) => {
        if (res.success) {
          this.searchResults = {
            users: res.users || [],
            posts: res.posts || [],
            hashtags: res.hashtags || []
          };
        }
        this.isSearching = false;
      },
      error: () => {
        this.isSearching = false;
      }
    });
  }

  loadMoreSearch() {
    const trimmed = this.searchQuery.trim();
    if (!trimmed || this.isLoadingMoreSearch) return;

    this.isLoadingMoreSearch = true;
    const nextPage = this.searchPage + 1;
    this.postService.searchCommunity(trimmed, nextPage).subscribe({
      next: (res) => {
        if (res.success) {
          this.searchPage = nextPage;
          this.searchResults.users = [...this.searchResults.users, ...(res.users || [])];
          this.searchResults.posts = [...this.searchResults.posts, ...(res.posts || [])];
          this.searchResults.hashtags = [...this.searchResults.hashtags, ...(res.hashtags || [])];
        }
        this.isLoadingMoreSearch = false;
      },
      error: () => {
        this.isLoadingMoreSearch = false;
      }
    });
  }

  clearSearch() {
    this.searchQuery = '';
    this.searchResults = { users: [], posts: [], hashtags: [] };
    this.searchPage = 1;
    this.isSearching = false;
    this.activeSearchTab = 'all';
  }

  setSearchTab(tab: 'all' | 'users' | 'posts' | 'hashtags') {
    this.activeSearchTab = tab;
  }

  loadSuggestions() {
    this.loadingSuggestions = true;
    this.followService.getSuggestions(this.suggestionsLimit).subscribe({
      next: (res) => {
        this.suggestions = res.users || [];
        this.loadingSuggestions = false;
      },
      error: () => {
        this.loadingSuggestions = false;
      }
    });
  }

  viewMoreSuggestions() {
    this.suggestionsLimit = 10;
    this.loadSuggestions();
  }

  isLiked(post: Post): boolean { return post.likes && post.likes.includes(this.currentUserId); }
  isSaved(post: Post): boolean { return post.saves && post.saves.includes(this.currentUserId); }

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
    if (!post.saves) post.saves = [];
    const currentlySaved = this.isSaved(post);
    this.postService.toggleSavePost(post._id, currentlySaved).subscribe({
      next: () => {
        if (currentlySaved) {
          post.saves = post.saves.filter(id => id !== this.currentUserId);
        } else {
          post.saves.push(this.currentUserId);
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
      const me = this.authService.currentUserValue;
      const enrichedComment = {
        ...res.comment,
        user: {
          _id: me?._id || '',
          username: me?.username || '',
          displayName: me?.displayName || '',
          profilePicture: me?.profilePicture || ''
        }
      };
      this.commentMap[post._id].push(enrichedComment);
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

  onFileSelected(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      const file = target.files[0];
      this.isUploadingImage = true;
      this.uploadService.uploadImage(file).subscribe({
        next: (res) => {
          this.isUploadingImage = false;
          if (res.success && res.imageUrl) {
            this.uploadedImages.push(res.imageUrl);
          }
        },
        error: () => {
          this.isUploadingImage = false;
        }
      });
    }
  }

  removeAttachment(index: number) {
    this.uploadedImages.splice(index, 1);
  }

  submitPost() {
    if ((!this.newPostContent.trim() && this.uploadedImages.length === 0) || this.isPosting) return;
    this.isPosting = true;
    this.postService.createPost(this.newPostContent.trim(), this.uploadedImages).subscribe({
      next: (res) => {
        const me = this.authService.currentUserValue;
        const enrichedPost = {
          ...res.post,
          user: {
            _id: me?._id || '',
            username: me?.username || '',
            displayName: me?.displayName || '',
            profilePicture: me?.profilePicture || ''
          }
        };
        this.posts.unshift(enrichedPost);
        this.newPostContent = '';
        this.uploadedImages = [];
        this.isPosting = false;
      },
      error: () => { this.isPosting = false; }
    });
  }

  toggleFollow(user: FollowUser) {
    if (this.followingSet.has(user.username)) {
      this.followService.unfollow(user.username).subscribe();
      this.followingSet.delete(user.username);
    } else {
      this.followService.follow(user.username).subscribe();
      this.followingSet.add(user.username);
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
