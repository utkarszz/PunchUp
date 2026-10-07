import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { PostService, Post, Comment } from '../../../core/services/post.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { UserService } from '../../../core/services/user.service';
import { LeagueBadgeComponent } from '../../../shared/components/league-badge/league-badge.component';
import { MentionDropdownComponent, MentionUser } from '../../../shared/components/mention-dropdown/mention-dropdown.component';
import {
  buildCommentTree,
  formatContentWithMentions,
  getMentionTrigger,
  applyMentionSelection,
  ThreadComment,
  MentionRef
} from '../../../core/services/mention-utils';

@Component({
  selector: 'app-post-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LeagueBadgeComponent, MentionDropdownComponent],
  template: `
    <div class="post-detail-container animate-fade-in">
      <header class="detail-header">
        <button class="btn btn-secondary btn-sm back-btn" (click)="goBack()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          <span>Back to Feed</span>
        </button>
      </header>

      <!-- Loading State -->
      <div class="card loading-card" *ngIf="isLoading">
        <div class="spinner"></div>
        <p>Loading post...</p>
      </div>

      <!-- Error / Not Found State -->
      <div class="card empty-card" *ngIf="!isLoading && (!post || errorMsg)">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <h3>Post not found</h3>
        <p>{{ errorMsg || 'This post may have been removed or the link is invalid.' }}</p>
        <button class="btn btn-primary btn-sm" (click)="goToCommunity()">Explore Community</button>
      </div>

      <!-- Post Content -->
      <div class="post-detail-content" *ngIf="!isLoading && post">
        <article class="card post-card animate-slide-up">
          <div class="post-header">
            <div class="post-author-wrapper">
              <a [routerLink]="['/user', post.user.username]" class="post-avatar-link">
                <img
                  [src]="post.user.profilePicture || 'assets/default-avatar.png'"
                  class="post-avatar"
                  [alt]="post.user.username"
                  onerror="this.src='https://api.dicebear.com/7.x/bottts/svg?seed=u'"
                />
              </a>
              <div class="post-author-info">
                <div class="post-author-main">
                  <a [routerLink]="['/user', post.user.username]" class="post-display-name-link">
                    <span class="post-display-name">{{ post.user.displayName || post.user.username }}</span>
                  </a>
                  <app-league-badge [points]="post.user.totalPoints || 0"></app-league-badge>
                </div>
                <a [routerLink]="['/user', post.user.username]" class="post-handle-link">
                  <span class="post-username">&#64;{{ post.user.username }}</span>
                </a>
              </div>
            </div>
            <span class="post-time">{{ getRelativeTime(post.createdAt) }}</span>
          </div>

          <p class="post-content" [innerHTML]="formatCommentText(post.content)"></p>

          <div class="post-images" *ngIf="post.images && post.images.length > 0">
            <img *ngFor="let img of post.images" [src]="img" class="post-image" alt="Post attachment" />
          </div>

          <!-- Post Actions Bar -->
          <div class="post-actions">
            <button class="action-btn" [class.active]="isLiked(post)" (click)="toggleLike()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
              </svg>
              <span>{{ post.likes.length }}</span>
            </button>

            <button class="action-btn active" title="Comments">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              <span>{{ post.commentsCount || 0 }}</span>
            </button>

            <button class="action-btn" [class.active]="isSaved(post)" (click)="toggleSave()" *ngIf="isAuthenticated">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
              </svg>
              <span>{{ post.saves.length }}</span>
            </button>

            <button class="action-btn share-btn" (click)="sharePost()" title="Share Post">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="18" cy="5" r="3"></circle>
                <circle cx="6" cy="12" r="3"></circle>
                <circle cx="18" cy="19" r="3"></circle>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
              </svg>
              <span>Share</span>
            </button>
          </div>
        </article>

        <!-- Unauthenticated Call To Action (Case 1) -->
        <div class="card auth-cta-card animate-slide-up" *ngIf="!isAuthenticated">
          <div class="auth-cta-content">
            <div class="cta-text">
              <h3>Join the conversation on PunchUp</h3>
              <p>Log in with Google to like posts, reply to comments, and track your focus sessions.</p>
            </div>
            <button class="btn btn-primary auth-cta-btn" (click)="loginToPunchUp()">
              <svg class="google-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/>
              </svg>
              <span>Login to PunchUp</span>
            </button>
          </div>
        </div>

        <!-- Comments Section -->
        <section class="card comments-card animate-slide-up">
          <h3 class="comments-title">
            Comments
            <span class="count-badge" *ngIf="comments.length > 0">{{ comments.length }}</span>
          </h3>

          <!-- Authenticated Main Comment Composer -->
          <div class="comment-input-row" *ngIf="isAuthenticated" style="position: relative;">
            <input
              type="text"
              class="input"
              [(ngModel)]="mainCommentDraft"
              (input)="onMainCommentInput($event)"
              (keydown)="onMainCommentKeyDown($event)"
              placeholder="Write a comment... Type @ to mention"
              #mainCommentInput
            />
            <button class="btn btn-primary btn-sm" (click)="submitComment()" [disabled]="!mainCommentDraft.trim()">
              Send
            </button>
            <app-mention-dropdown
              [users]="mentionUsers"
              [isOpen]="activeMentionContext === 'main' && isMentionOpen"
              [selectedIndex]="mentionSelectedIndex"
              [isLoading]="isMentionLoading"
              position="top"
              (userSelected)="onSelectMentionUser($event, 'main')"
              (close)="closeMentionDropdown()"
            ></app-mention-dropdown>
          </div>

          <!-- Empty Comments State -->
          <div class="empty-comments" *ngIf="comments.length === 0">
            <p>No comments yet. {{ isAuthenticated ? 'Be the first to share your thoughts!' : 'Log in to join the conversation.' }}</p>
          </div>

          <!-- Comments List with Replies -->
          <div class="comments-list" *ngIf="comments.length > 0">
            <div class="comment-thread" *ngFor="let comment of getCommentTree()">
              <ng-container *ngTemplateOutlet="commentThreadNode; context: { c: comment, depth: 0 }"></ng-container>
            </div>
          </div>

          <!-- Recursive Thread Node Template -->
          <ng-template #commentThreadNode let-c="c" let-depth="depth">
            <div
              class="comment-item-wrapper"
              [class.is-nested]="depth > 0"
              [class.capped-nest]="depth >= 2"
            >
              <div class="comment-item" [id]="'comment-' + c._id">
                <img
                  [src]="c.user?.profilePicture || 'assets/default-avatar.png'"
                  class="comment-avatar"
                  [class.reply-avatar]="depth > 0"
                  [alt]="c.user?.username"
                  onerror="this.src='https://api.dicebear.com/7.x/bottts/svg?seed=c'"
                />
                <div class="comment-body">
                  <div class="comment-header-row">
                    <div class="comment-author-badge">
                      <a [routerLink]="['/user', c.user?.username]" class="comment-author">
                        {{ c.user?.displayName || c.user?.username }}
                      </a>
                      <app-league-badge [points]="c.user?.totalPoints || 0"></app-league-badge>
                    </div>
                    <span class="comment-time">{{ getRelativeTime(c.createdAt) }}</span>
                  </div>

                  <p class="comment-text" [innerHTML]="formatCommentText(c.content)"></p>

                  <!-- Comment Interactive Actions: Like & Reply -->
                  <div class="comment-actions-bar">
                    <button
                      class="comment-action-btn"
                      [class.liked]="isCommentLiked(c)"
                      (click)="toggleCommentLike(c)"
                      title="Like comment"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                      </svg>
                      <span>{{ c.likes?.length || 0 }}</span>
                    </button>

                    <button
                      class="comment-action-btn reply-btn"
                      (click)="openReplyBox(c)"
                      title="Reply to comment"
                      *ngIf="isAuthenticated"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 10h10a5 5 0 0 1 5 5v2"></path>
                        <polyline points="7 6 3 10 7 14"></polyline>
                      </svg>
                      <span>Reply</span>
                    </button>

                    <button
                      *ngIf="canDeleteComment(c)"
                      class="comment-action-btn delete-btn"
                      (click)="deleteComment(c._id)"
                      title="Delete Comment"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      </svg>
                    </button>
                  </div>

                  <!-- Inline Reply Composer -->
                  <div class="reply-composer animate-fade-in" *ngIf="activeReplyCommentId === c._id" style="position: relative;">
                    <div class="replying-to-bar">
                      <span>Replying to <strong>&#64;{{ c.user?.username }}</strong></span>
                      <button class="btn-icon close-reply-btn" (click)="cancelReply()" title="Cancel">×</button>
                    </div>
                    <div class="reply-input-row" style="position: relative;">
                      <input
                        type="text"
                        class="input input-sm"
                        [(ngModel)]="replyDraft"
                        (input)="onReplyInput($event, c)"
                        (keydown)="onReplyKeyDown($event, c)"
                        [placeholder]="'Reply to @' + c.user?.username + '...'"
                        #replyInput
                      />
                      <button class="btn btn-primary btn-sm" (click)="submitReply(c)" [disabled]="!replyDraft?.trim()">
                        Reply
                      </button>
                    </div>
                    <app-mention-dropdown
                      [users]="mentionUsers"
                      [isOpen]="activeMentionContext === 'reply_' + c._id && isMentionOpen"
                      [selectedIndex]="mentionSelectedIndex"
                      [isLoading]="isMentionLoading"
                      position="top"
                      (userSelected)="onSelectMentionUser($event, 'reply_' + c._id)"
                      (close)="closeMentionDropdown()"
                    ></app-mention-dropdown>
                  </div>
                </div>
              </div>

              <!-- Nested Child Replies Thread -->
              <div class="replies-container" *ngIf="c.replies && c.replies.length > 0">
                <div class="reply-thread-item" *ngFor="let child of c.replies">
                  <ng-container *ngTemplateOutlet="commentThreadNode; context: { c: child, depth: depth + 1 }"></ng-container>
                </div>
              </div>
            </div>
          </ng-template>
        </section>
      </div>
    </div>
  `,
  styles: [`
    .post-detail-container {
      max-width: 680px;
      margin: 0 auto;
      padding: 1.5rem 1rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      min-width: 0;
    }

    .detail-header {
      display: flex;
      align-items: center;
    }

    .back-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      font-weight: 500;
    }

    .loading-card, .empty-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 3rem 1.5rem;
      text-align: center;
      gap: 1rem;
      color: var(--text-muted);
    }

    .post-detail-content {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .post-card {
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .post-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 0.75rem;
    }

    .post-author-wrapper {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      min-width: 0;
    }

    .post-avatar {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      object-fit: cover;
      border: 1.5px solid var(--border);
      flex-shrink: 0;
    }

    .post-author-info {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .post-author-main {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      flex-wrap: wrap;
    }

    .post-display-name {
      font-weight: 600;
      color: var(--text-primary);
      font-size: 0.95rem;
    }

    .post-username {
      font-size: 0.8125rem;
      color: var(--text-muted);
    }

    .post-time {
      font-size: 0.75rem;
      color: var(--text-muted);
      white-space: nowrap;
      flex-shrink: 0;
    }

    .post-content {
      font-size: 1rem;
      line-height: 1.55;
      color: var(--text-primary);
      word-break: break-word;
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
      max-height: 380px;
      object-fit: cover;
      border-radius: var(--radius);
    }

    .post-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding-top: 0.75rem;
      border-top: 1px solid var(--border);
    }

    .action-btn {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.4rem 0.75rem;
      border-radius: var(--radius);
      color: var(--text-muted);
      background: transparent;
      border: 1px solid transparent;
      font-size: 0.8125rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .action-btn:hover {
      background: var(--surface-hover);
      color: var(--text-primary);
      border-color: var(--border);
    }

    .action-btn.active {
      color: #ef4444;
      background: rgba(239, 68, 68, 0.08);
      border-color: rgba(239, 68, 68, 0.2);
    }

    .action-btn.share-btn:hover {
      color: var(--accent);
      background: rgba(59, 130, 246, 0.08);
      border-color: rgba(59, 130, 246, 0.2);
    }

    /* Auth Callout Card (Case 1) */
    .auth-cta-card {
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(139, 92, 246, 0.08) 100%);
      border: 1px solid rgba(59, 130, 246, 0.25);
      padding: 1.5rem;
    }

    .auth-cta-content {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1.25rem;
      flex-wrap: wrap;
    }

    .cta-text h3 {
      font-size: 1.05rem;
      font-weight: 700;
      color: var(--text-primary);
      margin-bottom: 0.25rem;
    }

    .cta-text p {
      font-size: 0.85rem;
      color: var(--text-secondary);
      line-height: 1.4;
    }

    .auth-cta-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      white-space: nowrap;
      padding: 0.65rem 1.25rem;
    }

    /* Comments Section */
    .comments-card {
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .comments-title {
      font-size: 1.1rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .count-badge {
      font-size: 0.75rem;
      background: var(--surface-hover);
      color: var(--text-secondary);
      padding: 0.15rem 0.5rem;
      border-radius: 999px;
      font-weight: 600;
    }

    .comment-input-row {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }

    .empty-comments {
      padding: 1.5rem;
      text-align: center;
      color: var(--text-muted);
      font-size: 0.875rem;
    }

    .comments-list {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .comment-thread {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .comment-item {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
    }

    .comment-avatar {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      object-fit: cover;
      flex-shrink: 0;
      border: 1px solid var(--border);
    }

    .reply-avatar {
      width: 28px;
      height: 28px;
    }

    .comment-body {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      min-width: 0;
    }

    .comment-header-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
    }

    .comment-author-badge {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      flex-wrap: wrap;
    }

    .comment-author {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-primary);
    }

    .comment-author:hover {
      text-decoration: underline;
    }

    .comment-time {
      font-size: 0.7rem;
      color: var(--text-muted);
      white-space: nowrap;
    }

    .comment-text {
      font-size: 0.875rem;
      line-height: 1.45;
      color: var(--text-primary);
      word-break: break-word;
    }

    .reply-mention {
      color: var(--accent);
      font-weight: 600;
      margin-right: 0.25rem;
    }

    .comment-actions-bar {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-top: 0.15rem;
    }

    .comment-action-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.2rem 0.45rem;
      border-radius: var(--radius);
      background: transparent;
      border: none;
      color: var(--text-muted);
      font-size: 0.75rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.12s ease;
    }

    .comment-action-btn:hover {
      color: var(--text-primary);
      background: var(--surface-hover);
    }

    .comment-action-btn.liked {
      color: #ef4444;
      background: rgba(239, 68, 68, 0.08);
    }

    .delete-btn {
      color: var(--text-muted);
    }

    .delete-btn:hover {
      color: var(--danger);
    }

    /* Reply Composer */
    .reply-composer {
      background: var(--surface-elevated);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 0.6rem 0.75rem;
      margin-top: 0.4rem;
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }

    .replying-to-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .close-reply-btn {
      border: none;
      background: transparent;
      font-size: 1.1rem;
      color: var(--text-muted);
      cursor: pointer;
      line-height: 1;
      padding: 0 0.25rem;
    }

    .reply-input-row {
      display: flex;
      gap: 0.4rem;
      align-items: center;
    }

    .input-sm {
      padding: 0.35rem 0.6rem;
      font-size: 0.8125rem;
    }

    /* Replies container */
    .replies-container {
      margin-left: 2rem;
      padding-left: 0.75rem;
      border-left: 2px solid var(--border);
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
      margin-top: 0.4rem;
    }

    .comment-item-wrapper.is-nested {
      margin-top: 0.5rem;
    }

    .comment-item-wrapper.capped-nest > .replies-container {
      margin-left: 0.5rem;
      padding-left: 0.5rem;
    }

    .reply-thread-item {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .reply-item {
      display: flex;
      align-items: flex-start;
      gap: 0.6rem;
    }

    @media (max-width: 480px) {
      .post-detail-container {
        padding: 1rem 0.75rem;
        padding-bottom: calc(var(--mobile-nav-height) + 1.25rem);
      }
      .post-card, .comments-card, .auth-cta-card {
        padding: 1rem;
      }
      .replies-container {
        margin-left: 1rem;
        padding-left: 0.5rem;
      }
      .auth-cta-content {
        flex-direction: column;
        align-items: stretch;
      }
      .auth-cta-btn {
        justify-content: center;
      }
    }
  `]
})
export class PostDetailComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  public postService = inject(PostService);
  public authService = inject(AuthService);
  private userService = inject(UserService);
  private toastService = inject(ToastService);

  public post: Post | null = null;
  public comments: Comment[] = [];
  public isLoading = true;
  public errorMsg = '';
  public postIdentifier = '';

  public mainCommentDraft = '';
  public activeReplyCommentId: string | null = null;
  public replyDraft = '';

  // Mention autocomplete state
  mentionUsers: MentionUser[] = [];
  isMentionOpen = false;
  mentionSelectedIndex = 0;
  isMentionLoading = false;
  activeMentionContext: string | null = null;
  activeMentionTarget: HTMLInputElement | HTMLTextAreaElement | null = null;
  activeMentionTrigger: { query: string; startIndex: number } | null = null;

  mainCommentMentions: MentionRef[] = [];
  replyMentions: MentionRef[] = [];

  private mentionSearchSubject = new Subject<{ query: string; context: string }>();
  private mentionSearchSub?: Subscription;

  public get isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }

  public get currentUserId(): string {
    return this.authService.currentUserValue?._id || '';
  }

  getCommentTree(): ThreadComment[] {
    return buildCommentTree(this.comments);
  }

  formatCommentText(content: string): string {
    return formatContentWithMentions(content);
  }

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.postIdentifier = id;
        this.loadPost(id);
      } else {
        this.isLoading = false;
        this.errorMsg = 'No post specified.';
      }
    });

    this.mentionSearchSub = this.mentionSearchSubject.pipe(
      debounceTime(150),
      distinctUntilChanged((p, c) => p.query === c.query && p.context === c.context)
    ).subscribe(({ query }) => {
      this.isMentionLoading = true;
      this.userService.searchUsers(query, 8).subscribe({
        next: (res) => {
          this.mentionUsers = res.users || [];
          this.mentionSelectedIndex = 0;
          this.isMentionLoading = false;
          this.isMentionOpen = this.mentionUsers.length > 0;
        },
        error: () => {
          this.isMentionLoading = false;
          this.mentionUsers = [];
          this.isMentionOpen = false;
        }
      });
    });
  }

  ngOnDestroy() {
    this.mentionSearchSub?.unsubscribe();
  }

  loadPost(id: string) {
    this.isLoading = true;
    this.errorMsg = '';
    this.postService.getPostById(id).subscribe({
      next: (res) => {
        if (res.success && res.post) {
          this.post = res.post;
          this.loadComments(res.post._id);
        } else {
          this.errorMsg = 'Post not found.';
          this.isLoading = false;
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMsg = err?.error?.message || 'Failed to load post.';
      }
    });
  }

  loadComments(postId: string) {
    this.postService.getComments(postId).subscribe({
      next: (res) => {
        this.comments = res.comments || [];
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  // Mention interaction handlers
  onMainCommentInput(event: Event) {
    const target = event.target as HTMLInputElement;
    this.handleMentionInput(this.mainCommentDraft, target, 'main');
  }

  onMainCommentKeyDown(event: KeyboardEvent) {
    if (this.handleMentionKeyDown(event, 'main')) {
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      this.submitComment();
    }
  }

  onReplyInput(event: Event, comment: Comment) {
    const target = event.target as HTMLInputElement;
    this.handleMentionInput(this.replyDraft, target, 'reply_' + comment._id);
  }

  onReplyKeyDown(event: KeyboardEvent, comment: Comment) {
    if (this.handleMentionKeyDown(event, 'reply_' + comment._id)) {
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      this.submitReply(comment);
    }
  }

  private handleMentionInput(text: string, target: HTMLInputElement | HTMLTextAreaElement, context: string) {
    const cursorPos = target.selectionStart ?? text.length;
    const trigger = getMentionTrigger(text, cursorPos);

    if (trigger) {
      this.activeMentionContext = context;
      this.activeMentionTarget = target;
      this.activeMentionTrigger = trigger;
      this.mentionSearchSubject.next({ query: trigger.query, context });
    } else {
      if (this.activeMentionContext === context) {
        this.closeMentionDropdown();
      }
    }
  }

  private handleMentionKeyDown(event: KeyboardEvent, context: string): boolean {
    if (!this.isMentionOpen || this.activeMentionContext !== context) {
      return false;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (this.mentionUsers.length > 0) {
        this.mentionSelectedIndex = (this.mentionSelectedIndex + 1) % this.mentionUsers.length;
      }
      return true;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (this.mentionUsers.length > 0) {
        this.mentionSelectedIndex = (this.mentionSelectedIndex - 1 + this.mentionUsers.length) % this.mentionUsers.length;
      }
      return true;
    }

    if (event.key === 'Enter' || event.key === 'Tab') {
      if (this.mentionUsers.length > 0 && this.mentionUsers[this.mentionSelectedIndex]) {
        event.preventDefault();
        this.selectMentionUser(this.mentionUsers[this.mentionSelectedIndex], context);
        return true;
      }
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeMentionDropdown();
      return true;
    }

    return false;
  }

  onSelectMentionUser(user: MentionUser, context: string) {
    this.selectMentionUser(user, context);
  }

  selectMentionUser(user: MentionUser, context: string) {
    if (!this.activeMentionTarget || !this.activeMentionTrigger) {
      this.closeMentionDropdown();
      return;
    }

    const target = this.activeMentionTarget;
    const cursorPos = target.selectionStart ?? target.value.length;
    const startIndex = this.activeMentionTrigger.startIndex;

    if (context === 'main') {
      const { newText, newCursorPos } = applyMentionSelection(this.mainCommentDraft, startIndex, cursorPos, user.username);
      this.mainCommentDraft = newText;
      this.mainCommentMentions.push({ userId: user._id, username: user.username });
      this.restoreCursor(target, newCursorPos);
    } else if (context.startsWith('reply_')) {
      const { newText, newCursorPos } = applyMentionSelection(this.replyDraft, startIndex, cursorPos, user.username);
      this.replyDraft = newText;
      this.replyMentions.push({ userId: user._id, username: user.username });
      this.restoreCursor(target, newCursorPos);
    }

    this.closeMentionDropdown();
  }

  private restoreCursor(target: HTMLInputElement | HTMLTextAreaElement, pos: number) {
    setTimeout(() => {
      target.focus();
      target.setSelectionRange(pos, pos);
    }, 0);
  }

  closeMentionDropdown() {
    this.isMentionOpen = false;
    this.mentionUsers = [];
    this.activeMentionContext = null;
    this.activeMentionTarget = null;
    this.activeMentionTrigger = null;
  }

  loginToPunchUp() {
    const returnUrl = `/community/post/${this.postIdentifier}`;
    this.authService.setReturnUrl(returnUrl);
    this.router.navigate(['/login'], { queryParams: { returnUrl } });
  }

  sharePost() {
    const shareRef = this.post?.shareId || this.post?._id || this.postIdentifier;
    const url = `${window.location.origin}/community/post/${shareRef}`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        this.toastService.showSuccess('Post link copied to clipboard!');
      }).catch(() => {
        this.promptFallbackShare(url);
      });
    } else {
      this.promptFallbackShare(url);
    }
  }

  private promptFallbackShare(url: string) {
    if (navigator.share) {
      navigator.share({ title: 'PunchUp Post', url }).catch(() => {});
    } else {
      prompt('Copy post URL:', url);
    }
  }

  isLiked(post: Post): boolean {
    return !!post.likes && post.likes.includes(this.currentUserId);
  }

  isSaved(post: Post): boolean {
    return !!post.saves && post.saves.includes(this.currentUserId);
  }

  toggleLike() {
    if (!this.isAuthenticated) {
      this.loginToPunchUp();
      return;
    }
    if (!this.post) return;
    if (!this.post.likes) this.post.likes = [];

    const wasLiked = this.isLiked(this.post);
    if (wasLiked) {
      this.post.likes = this.post.likes.filter(id => id !== this.currentUserId);
    } else {
      this.post.likes.push(this.currentUserId);
    }

    this.postService.likePost(this.post._id).subscribe({
      error: () => {
        // Rollback
        if (wasLiked) {
          this.post?.likes.push(this.currentUserId);
        } else {
          this.post!.likes = this.post!.likes.filter(id => id !== this.currentUserId);
        }
      }
    });
  }

  toggleSave() {
    if (!this.isAuthenticated || !this.post) return;
    if (!this.post.saves) this.post.saves = [];

    const currentlySaved = this.isSaved(this.post);
    this.postService.toggleSavePost(this.post._id, currentlySaved).subscribe({
      next: () => {
        if (currentlySaved) {
          this.post!.saves = this.post!.saves.filter(id => id !== this.currentUserId);
        } else {
          this.post!.saves.push(this.currentUserId);
        }
      }
    });
  }

  submitComment() {
    if (!this.isAuthenticated) {
      this.loginToPunchUp();
      return;
    }
    const content = this.mainCommentDraft.trim();
    if (!content || !this.post) return;
    const mentions = [...this.mainCommentMentions];

    this.postService.addComment(this.post._id, content, undefined, mentions).subscribe({
      next: (res) => {
        const me = this.authService.currentUserValue;
        const enriched: Comment = {
          ...res.comment,
          user: {
            _id: me?._id || '',
            username: me?.username || '',
            displayName: me?.displayName || '',
            profilePicture: me?.profilePicture || '',
            totalPoints: me?.totalPoints || 0
          },
          likes: []
        };
        this.comments.push(enriched);
        this.post!.commentsCount = (this.post!.commentsCount || 0) + 1;
        this.mainCommentDraft = '';
        this.mainCommentMentions = [];
        this.closeMentionDropdown();
        this.toastService.showSuccess('Comment added!');
      },
      error: (err) => {
        this.toastService.showError(err?.error?.message || 'Failed to add comment');
      }
    });
  }

  openReplyBox(comment: Comment) {
    if (!this.isAuthenticated) {
      this.loginToPunchUp();
      return;
    }
    this.activeReplyCommentId = comment._id;
    this.replyDraft = `@${comment.user.username} `;
    this.replyMentions = [{ userId: comment.user._id, username: comment.user.username }];
  }

  cancelReply() {
    this.activeReplyCommentId = null;
    this.replyDraft = '';
    this.replyMentions = [];
    this.closeMentionDropdown();
  }

  submitReply(parentComment: Comment) {
    if (!this.isAuthenticated) {
      this.loginToPunchUp();
      return;
    }
    const content = this.replyDraft.trim();
    if (!content || !this.post) return;
    const mentions = [...this.replyMentions];

    this.postService.addComment(this.post._id, content, parentComment._id, mentions).subscribe({
      next: (res) => {
        const me = this.authService.currentUserValue;
        const enriched: Comment = {
          ...res.comment,
          parentComment: parentComment._id,
          user: {
            _id: me?._id || '',
            username: me?.username || '',
            displayName: me?.displayName || '',
            profilePicture: me?.profilePicture || '',
            totalPoints: me?.totalPoints || 0
          },
          likes: []
        };
        this.comments.push(enriched);
        this.post!.commentsCount = (this.post!.commentsCount || 0) + 1;
        this.activeReplyCommentId = null;
        this.replyDraft = '';
        this.replyMentions = [];
        this.closeMentionDropdown();
        this.toastService.showSuccess('Reply sent!');
      },
      error: (err) => {
        this.toastService.showError(err?.error?.message || 'Failed to post reply');
      }
    });
  }

  isCommentLiked(comment: Comment): boolean {
    return !!comment.likes && comment.likes.includes(this.currentUserId);
  }

  toggleCommentLike(comment: Comment) {
    if (!this.isAuthenticated) {
      this.loginToPunchUp();
      return;
    }
    if (!comment.likes) comment.likes = [];

    const wasLiked = this.isCommentLiked(comment);
    if (wasLiked) {
      comment.likes = comment.likes.filter(id => id !== this.currentUserId);
    } else {
      comment.likes.push(this.currentUserId);
    }

    this.postService.likeComment(comment._id).subscribe({
      error: () => {
        // Rollback
        if (wasLiked) {
          comment.likes!.push(this.currentUserId);
        } else {
          comment.likes = comment.likes!.filter(id => id !== this.currentUserId);
        }
      }
    });
  }

  canDeleteComment(comment: Comment): boolean {
    if (!this.isAuthenticated) return false;
    const isCommentAuthor = comment.user._id === this.currentUserId;
    const isPostAuthor = this.post?.user._id === this.currentUserId;
    return isCommentAuthor || isPostAuthor;
  }

  deleteComment(commentId: string) {
    if (!confirm('Are you sure you want to delete this comment?')) return;
    this.postService.deleteComment(commentId).subscribe({
      next: () => {
        // Cascade removal: find comment and all its descendants
        const toRemove = new Set<string>([commentId]);
        let changed = true;
        while (changed) {
          changed = false;
          for (const item of this.comments) {
            const pid = typeof item.parentComment === 'object' ? item.parentComment?._id : item.parentComment;
            if (pid && toRemove.has(pid) && !toRemove.has(item._id)) {
              toRemove.add(item._id);
              changed = true;
            }
          }
        }
        this.comments = this.comments.filter(c => !toRemove.has(c._id));
        if (this.post) {
          this.post.commentsCount = Math.max(0, (this.post.commentsCount || 0) - toRemove.size);
        }
        this.toastService.showSuccess('Comment deleted');
      },
      error: (err) => {
        this.toastService.showError(err?.error?.message || 'Failed to delete comment');
      }
    });
  }

  goBack() {
    this.router.navigate(['/community']);
  }

  goToCommunity() {
    this.router.navigate(['/community']);
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
