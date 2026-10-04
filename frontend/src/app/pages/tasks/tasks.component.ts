import { Component, OnInit, OnDestroy, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { TaskService, Task } from '../../core/services/task.service';
import { FocusService } from '../../core/services/focus.service';
import { ToastService } from '../../core/services/toast.service';
import { ReminderService } from '../../core/services/reminder.service';

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="tasks-container animate-fade-in">
      <!-- 1. Focus Hub Main View -->
      <div class="focus-hub-view" *ngIf="activeFocusView === 'hub'">
        <header class="tasks-header">
          <div>
            <h1>Focus</h1>
            <p class="subtitle">Organize your consistency tasks and track deep focus sessions.</p>
          </div>
        </header>

        <!-- Split Action Area: Top / Primary actions with equal visual importance -->
        <div class="focus-split-grid animate-slide-up">
          <button type="button" class="focus-action-tile create-tile" (click)="setFocusView('create-task')">
            <div class="tile-icon-wrap create-wrap">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </div>
            <div class="tile-info">
              <span class="tile-title">Create Task</span>
              <span class="tile-desc">Add consistency goals with priorities & reminders</span>
            </div>
            <svg class="tile-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>

          <button type="button" class="focus-action-tile timer-tile" (click)="setFocusView('timer')">
            <div class="tile-icon-wrap timer-wrap" [class.pulse-live]="focusService.isRunning$ | async">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
            </div>
            <div class="tile-info">
              <div class="tile-title-row">
                <span class="tile-title">Focus Timer</span>
                <span class="running-pill" *ngIf="focusService.isRunning$ | async">Live</span>
              </div>
              <span class="tile-desc" *ngIf="!(focusService.isRunning$ | async)">
                Today: {{ (focusService.stats$ | async)?.dailyFormatted || '0m' }}
              </span>
              <span class="tile-desc running-desc" *ngIf="focusService.isRunning$ | async">
                Running: {{ focusService.formatSeconds((focusService.elapsedSeconds$ | async) || 0) }}
              </span>
            </div>
            <svg class="tile-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        </div>

      <!-- Filter Bar -->
      <section class="card filter-card">
        <div class="filter-row">
          <!-- Search input -->
          <div class="search-box">
            <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              placeholder="Search tasks..."
              [(ngModel)]="filterSearch"
              (input)="applyFilters()" />
          </div>

          <!-- Status select -->
          <select [(ngModel)]="filterStatus" (change)="applyFilters()">
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
          </select>

          <!-- Priority select -->
          <select [(ngModel)]="filterPriority" (change)="applyFilters()">
            <option value="all">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      </section>

      <!-- Tasks List -->
      <section class="tasks-list-section">

        <!-- 1. Overdue Group (High urgency) -->
        <div class="group-section" *ngIf="overdueTasks.length > 0">
          <div class="group-label group-label-overdue">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            <span>Overdue ({{ overdueTasks.length }})</span>
          </div>
          <div class="tasks-grid">
            <div *ngFor="let task of overdueTasks" class="card task-card" [class.overdue]="isOverdue(task)" [class.completed]="task.completed">
              <div class="task-card-header">
                <div class="task-check-row">
                  <label class="checkbox-container">
                    <input type="checkbox" [checked]="task.completed" [disabled]="task.completed" (change)="onComplete(task)" />
                    <span class="checkmark"></span>
                  </label>
                  <h4 class="task-title" [class.text-overdue]="isOverdue(task)" [title]="task.title">{{ task.title }}</h4>
                </div>
                <div class="task-actions">
                  <button (click)="openEditModal(task)" class="btn-icon" title="Edit">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                  </button>
                  <button (click)="onDelete(task._id)" class="btn-icon delete-icon" title="Delete">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                  </button>
                </div>
              </div>
              <p class="task-desc">{{ task.description || 'No description.' }}</p>
              <div class="task-card-footer">
                <span [class]="'badge badge-' + task.priority">{{ task.priority }}</span>
                <span class="overdue-tag" *ngIf="isOverdue(task)">Overdue</span>
                <span class="due-date-badge" [class.overdue-badge]="isOverdue(task)" *ngIf="task.dueDate">Due {{ formatDueDate(task.dueDate) }}</span>
                <span class="reminder-badge" *ngIf="task.reminderEnabled && task.reminderInterval" [title]="'Reminder: Every ' + task.reminderInterval + 'h'">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                  </svg>
                  <span>Every {{ task.reminderInterval }}h</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- 2. Today Group -->
        <div class="group-section" *ngIf="todayTasks.length > 0">
          <div class="group-label">Today ({{ todayTasks.length }})</div>
          <div class="tasks-grid">
            <div *ngFor="let task of todayTasks" class="card task-card" [class.overdue]="isOverdue(task)" [class.completed]="task.completed">
              <div class="task-card-header">
                <div class="task-check-row">
                  <label class="checkbox-container">
                    <input type="checkbox" [checked]="task.completed" [disabled]="task.completed" (change)="onComplete(task)" />
                    <span class="checkmark"></span>
                  </label>
                  <h4 class="task-title" [class.text-overdue]="isOverdue(task)" [title]="task.title">{{ task.title }}</h4>
                </div>
                <div class="task-actions">
                  <button (click)="openEditModal(task)" class="btn-icon" title="Edit">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                  </button>
                  <button (click)="onDelete(task._id)" class="btn-icon delete-icon" title="Delete">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                  </button>
                </div>
              </div>
              <p class="task-desc">{{ task.description || 'No description.' }}</p>
              <div class="task-card-footer">
                <span [class]="'badge badge-' + task.priority">{{ task.priority }}</span>
                <span class="overdue-tag" *ngIf="isOverdue(task)">Overdue</span>
                <span class="due-date-badge" [class.overdue-badge]="isOverdue(task)" *ngIf="task.dueDate">Due {{ formatDueDate(task.dueDate) }}</span>
                <span class="reminder-badge" *ngIf="task.reminderEnabled && task.reminderInterval" [title]="'Reminder: Every ' + task.reminderInterval + 'h'">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                  </svg>
                  <span>Every {{ task.reminderInterval }}h</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- 3. Upcoming Group -->
        <div class="group-section" *ngIf="upcomingTasks.length > 0">
          <div class="group-label">Upcoming ({{ upcomingTasks.length }})</div>
          <div class="tasks-grid">
            <div *ngFor="let task of upcomingTasks" class="card task-card" [class.overdue]="isOverdue(task)" [class.completed]="task.completed">
              <div class="task-card-header">
                <div class="task-check-row">
                  <label class="checkbox-container">
                    <input type="checkbox" [checked]="task.completed" [disabled]="task.completed" (change)="onComplete(task)" />
                    <span class="checkmark"></span>
                  </label>
                  <h4 class="task-title" [class.text-overdue]="isOverdue(task)" [title]="task.title">{{ task.title }}</h4>
                </div>
                <div class="task-actions">
                  <button (click)="openEditModal(task)" class="btn-icon" title="Edit">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                  </button>
                  <button (click)="onDelete(task._id)" class="btn-icon delete-icon" title="Delete">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                  </button>
                </div>
              </div>
              <p class="task-desc">{{ task.description || 'No description.' }}</p>
              <div class="task-card-footer">
                <span [class]="'badge badge-' + task.priority">{{ task.priority }}</span>
                <span class="overdue-tag" *ngIf="isOverdue(task)">Overdue</span>
                <span class="due-date-badge" [class.overdue-badge]="isOverdue(task)" *ngIf="task.dueDate">Due {{ formatDueDate(task.dueDate) }}</span>
                <span class="reminder-badge" *ngIf="task.reminderEnabled && task.reminderInterval" [title]="'Reminder: Every ' + task.reminderInterval + 'h'">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                  </svg>
                  <span>Every {{ task.reminderInterval }}h</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- 4. Other Tasks (No due date) -->
        <div class="group-section" *ngIf="noDueDateTasks.length > 0">
          <div class="group-label">Other Tasks ({{ noDueDateTasks.length }})</div>
          <div class="tasks-grid">
            <div *ngFor="let task of noDueDateTasks" class="card task-card" [class.overdue]="isOverdue(task)" [class.completed]="task.completed">
              <div class="task-card-header">
                <div class="task-check-row">
                  <label class="checkbox-container">
                    <input type="checkbox" [checked]="task.completed" [disabled]="task.completed" (change)="onComplete(task)" />
                    <span class="checkmark"></span>
                  </label>
                  <h4 class="task-title" [class.text-overdue]="isOverdue(task)" [title]="task.title">{{ task.title }}</h4>
                </div>
                <div class="task-actions">
                  <button (click)="openEditModal(task)" class="btn-icon" title="Edit">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                  </button>
                  <button (click)="onDelete(task._id)" class="btn-icon delete-icon" title="Delete">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                  </button>
                </div>
              </div>
              <p class="task-desc">{{ task.description || 'No description.' }}</p>
              <div class="task-card-footer">
                <span [class]="'badge badge-' + task.priority">{{ task.priority }}</span>
                <span class="overdue-tag" *ngIf="isOverdue(task)">Overdue</span>
                <span class="due-date-badge" [class.overdue-badge]="isOverdue(task)" *ngIf="task.dueDate">Due {{ formatDueDate(task.dueDate) }}</span>
                <span class="reminder-badge" *ngIf="task.reminderEnabled && task.reminderInterval" [title]="'Reminder: Every ' + task.reminderInterval + 'h'">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                  </svg>
                  <span>Every {{ task.reminderInterval }}h</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div class="card empty-tasks-state" *ngIf="filteredTasks.length === 0">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M9 11l3 3L22 4"></path>
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
          </svg>
          <h3>{{ allTasks.length === 0 ? 'No tasks yet' : 'No matching tasks' }}</h3>
          <p>{{ allTasks.length === 0 ? 'Create your first task to start building daily consistency.' : 'Try changing your search or filters.' }}</p>
          <button *ngIf="allTasks.length === 0" (click)="openCreateModal()" class="btn btn-primary">Create Task</button>
        </div>

        <!-- Show More / Show Less Controls -->
        <div class="display-limit-bar" *ngIf="filteredTasks.length > initialLimit">
          <button
            *ngIf="displayLimit < filteredTasks.length"
            (click)="showMore()"
            class="btn btn-secondary display-toggle-btn"
          >
            <span>Show more</span>
            <span class="remaining-count">({{ filteredTasks.length - displayLimit }} remaining)</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>

          <button
            *ngIf="displayLimit >= filteredTasks.length"
            (click)="showLess()"
            class="btn btn-secondary display-toggle-btn"
          >
            <span>Show less</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="18 15 12 9 6 15"></polyline>
            </svg>
          </button>
        </div>

      </section>
      </div> <!-- End of Focus Hub View -->

      <!-- 2. Create Task Dedicated Flow -->
      <div class="create-task-view animate-fade-in" *ngIf="activeFocusView === 'create-task'">
        <div class="section-nav-header animate-slide-up">
          <button type="button" class="btn btn-secondary btn-sm back-nav-btn" (click)="setFocusView('hub')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            <span>Back to Focus</span>
          </button>
          <h2>Create Task</h2>
        </div>

        <div class="card inline-form-card animate-slide-up">
          <form (submit)="saveTask(); $event.preventDefault()" class="modal-form">
            <div class="form-group">
              <label>Task Title *</label>
              <input type="text" [(ngModel)]="modalTask.title" name="inline_title" required placeholder="e.g. Complete Spring Boot LLD" />
            </div>

            <div class="form-group">
              <label>Description</label>
              <textarea [(ngModel)]="modalTask.description" name="inline_description" rows="3" placeholder="Describe the requirements..."></textarea>
            </div>

            <div class="form-row form-row-triple">
              <div class="form-group">
                <label>Priority</label>
                <select [(ngModel)]="modalTask.priority" name="inline_priority">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div class="form-group">
                <label>Reminder</label>
                <select [(ngModel)]="modalTask.reminderInterval" name="inline_reminderInterval" (change)="onReminderIntervalChange()">
                  <option [ngValue]="0">No reminder</option>
                  <option [ngValue]="1">Every 1 hour</option>
                  <option [ngValue]="2">Every 2 hours</option>
                  <option [ngValue]="3">Every 3 hours</option>
                  <option [ngValue]="4">Every 4 hours</option>
                  <option [ngValue]="5">Every 5 hours</option>
                </select>
                <span class="form-hint" *ngIf="modalTask.reminderInterval && modalTask.reminderInterval > 0">
                  Reminder: Every {{ modalTask.reminderInterval }} hour{{ modalTask.reminderInterval > 1 ? 's' : '' }}
                </span>
              </div>
              <div class="form-group form-group-due">
                <label>Due Date & Time (optional)</label>
                <input type="datetime-local" [(ngModel)]="modalTask.dueDate" name="inline_dueDate" />
                <span class="form-hint">Leave blank to automatically set deadline to 24 hours from creation.</span>
              </div>
            </div>

            <div class="due-presets-row">
              <span class="preset-label">Quick Due:</span>
              <button type="button" class="btn-preset" (click)="setDuePreset(1)">+1h</button>
              <button type="button" class="btn-preset" (click)="setDuePreset(3)">+3h</button>
              <button type="button" class="btn-preset" (click)="setDuePreset(24)">Tomorrow</button>
            </div>

            <!-- Permission prompt card -->
            <div class="permission-prompt-card" *ngIf="showPermissionPrompt">
              <div class="prompt-content">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
                <div class="prompt-text">
                  <p>PunchUp needs notification permission to remind you about your tasks.</p>
                </div>
              </div>
              <div class="prompt-actions">
                <button type="button" class="btn btn-sm btn-primary" (click)="confirmPermission()">Enable Notifications</button>
                <button type="button" class="btn btn-sm btn-secondary" (click)="dismissPermissionPrompt()">Cancel</button>
              </div>
            </div>

            <div class="permission-denied-alert" *ngIf="permissionDeniedMessage">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <span>{{ permissionDeniedMessage }}</span>
            </div>

            <div class="modal-buttons">
              <button type="button" (click)="setFocusView('hub')" class="btn btn-secondary">Cancel</button>
              <button type="submit" class="btn btn-primary" [disabled]="!modalTask.title || !modalTask.title.trim()">Create Task</button>
            </div>
          </form>
        </div>
      </div>

      <!-- 3. Focus Timer Dedicated View -->
      <div class="focus-timer-view animate-fade-in" *ngIf="activeFocusView === 'timer'">
        <div class="section-nav-header animate-slide-up">
          <button type="button" class="btn btn-secondary btn-sm back-nav-btn" (click)="setFocusView('hub')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            <span>Back to Focus</span>
          </button>
          <h2>Focus Timer</h2>
        </div>

        <div class="timer-view-wrapper animate-slide-up">
          <div class="card timer-display-card">
            <div
              class="timer-status-badge"
              [class.active-badge]="(focusService.isRunning$ | async) && !(focusService.isPaused$ | async)"
              [class.paused-badge]="focusService.isPaused$ | async"
            >
              <span class="status-pulse-dot" *ngIf="(focusService.isRunning$ | async) && !(focusService.isPaused$ | async)"></span>
              <span *ngIf="!(focusService.isRunning$ | async)">Ready for Deep Focus</span>
              <span *ngIf="(focusService.isRunning$ | async) && !(focusService.isPaused$ | async)">Focus Session in Progress</span>
              <span *ngIf="(focusService.isRunning$ | async) && (focusService.isPaused$ | async)">Focus Session Paused</span>
            </div>

            <div class="digital-timer-clock">
              {{ focusService.formatSeconds((focusService.elapsedSeconds$ | async) || 0) }}
            </div>

            <!-- Ongoing Notification Status Indicator -->
            <div class="timer-notif-pill granted" *ngIf="(focusService.isRunning$ | async) && hasNotificationPermission">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              <span>{{ (focusService.isPaused$ | async) ? 'Paused browser notification active' : 'Live timer notification active in browser' }}</span>
            </div>

            <!-- Permission Denied Warning in Timer -->
            <div class="timer-notif-pill denied" *ngIf="timerPermissionDeniedMessage">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <span>{{ timerPermissionDeniedMessage }}</span>
            </div>

            <p class="timer-subtext" *ngIf="!(focusService.isRunning$ | async)">
              Start an uninterrupted session to build your daily focus time.
            </p>
            <p class="timer-subtext" *ngIf="(focusService.isRunning$ | async) && !(focusService.isPaused$ | async)">
              Stay in the zone. Timer persists across page refreshes and updates your notification bar.
            </p>
            <p class="timer-subtext" *ngIf="(focusService.isRunning$ | async) && (focusService.isPaused$ | async)">
              Timer is currently paused. Click Resume when you are ready to continue your session.
            </p>

            <div class="timer-controls-row">
              <!-- When NOT running -->
              <button
                *ngIf="!(focusService.isRunning$ | async)"
                type="button"
                class="btn btn-primary btn-lg timer-action-btn start-btn"
                (click)="onStartTimerClick()"
                [disabled]="isTimerLoading"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
                <span>Start Focus Timer</span>
              </button>

              <!-- When running AND NOT paused -->
              <ng-container *ngIf="(focusService.isRunning$ | async) && !(focusService.isPaused$ | async)">
                <button
                  type="button"
                  class="btn btn-warning btn-lg timer-action-btn pause-btn"
                  (click)="pauseFocusTimer()"
                  [disabled]="isTimerLoading"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="4" width="4" height="16" rx="1"></rect>
                    <rect x="14" y="4" width="4" height="16" rx="1"></rect>
                  </svg>
                  <span>Pause</span>
                </button>

                <button
                  type="button"
                  class="btn btn-danger btn-lg timer-action-btn stop-btn"
                  (click)="stopFocusTimer()"
                  [disabled]="isTimerLoading"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="6" width="12" height="12" rx="2"></rect>
                  </svg>
                  <span>Stop & Save</span>
                </button>
              </ng-container>

              <!-- When running AND paused -->
              <ng-container *ngIf="(focusService.isRunning$ | async) && (focusService.isPaused$ | async)">
                <button
                  type="button"
                  class="btn btn-success btn-lg timer-action-btn resume-btn"
                  (click)="resumeFocusTimer()"
                  [disabled]="isTimerLoading"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                  </svg>
                  <span>Resume</span>
                </button>

                <button
                  type="button"
                  class="btn btn-danger btn-lg timer-action-btn stop-btn"
                  (click)="stopFocusTimer()"
                  [disabled]="isTimerLoading"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="6" width="12" height="12" rx="2"></rect>
                  </svg>
                  <span>Stop & Save</span>
                </button>
              </ng-container>
            </div>
          </div>

          <!-- Accumulated Focus Time Stats Card -->
          <div class="card timer-stats-card">
            <h3 class="stats-card-title">Accumulated Focus Time</h3>
            <div class="timer-stats-grid">
              <div class="timer-stat-item">
                <span class="stat-label">Today</span>
                <span class="stat-value highlight">{{ (focusService.stats$ | async)?.dailyFormatted || '0m' }}</span>
                <span class="stat-hint">Resets at local midnight</span>
              </div>
              <div class="timer-stat-item">
                <span class="stat-label">This Week</span>
                <span class="stat-value">{{ (focusService.stats$ | async)?.weeklyFormatted || '0m' }}</span>
                <span class="stat-hint">Current week total</span>
              </div>
              <div class="timer-stat-item">
                <span class="stat-label">Overall</span>
                <span class="stat-value">{{ (focusService.stats$ | async)?.overallFormatted || '0m' }}</span>
                <span class="stat-hint">Lifetime accumulated</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Task Modal (Create & Edit) -->
      <div class="modal-backdrop" *ngIf="showModal" (click)="closeModal()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <h3 class="modal-title">{{ isEditMode ? 'Edit Task' : 'Create New Task' }}</h3>

          <form (submit)="saveTask(); $event.preventDefault()" class="modal-form">
            <div class="form-group">
              <label>Task Title *</label>
              <input type="text" [(ngModel)]="modalTask.title" name="title" required placeholder="e.g. Complete Spring Boot LLD" />
            </div>

            <div class="form-group">
              <label>Description</label>
              <textarea [(ngModel)]="modalTask.description" name="description" rows="3" placeholder="Describe the requirements..."></textarea>
            </div>

            <div class="form-row form-row-triple">
              <div class="form-group">
                <label>Priority</label>
                <select [(ngModel)]="modalTask.priority" name="priority">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div class="form-group">
                <label>Reminder</label>
                <select [(ngModel)]="modalTask.reminderInterval" name="reminderInterval" (change)="onReminderIntervalChange()">
                  <option [ngValue]="0">No reminder</option>
                  <option [ngValue]="1">Every 1 hour</option>
                  <option [ngValue]="2">Every 2 hours</option>
                  <option [ngValue]="3">Every 3 hours</option>
                  <option [ngValue]="4">Every 4 hours</option>
                  <option [ngValue]="5">Every 5 hours</option>
                </select>
                <span class="form-hint" *ngIf="modalTask.reminderInterval && modalTask.reminderInterval > 0">
                  Reminder: Every {{ modalTask.reminderInterval }} hour{{ modalTask.reminderInterval > 1 ? 's' : '' }}
                </span>
              </div>
              <div class="form-group form-group-due">
                <label>Due Date & Time (optional)</label>
                <input type="datetime-local" [(ngModel)]="modalTask.dueDate" name="dueDate" />
                <span class="form-hint">Leave blank to automatically set deadline to 24 hours from creation.</span>
              </div>
            </div>

            <!-- Permission prompt card (only appears when user chooses interval > 0 and permission is default) -->
            <div class="permission-prompt-card" *ngIf="showPermissionPrompt">
              <div class="prompt-content">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
                <div class="prompt-text">
                  <p>PunchUp needs notification permission to remind you about your tasks.</p>
                </div>
              </div>
              <div class="prompt-actions">
                <button type="button" class="btn btn-sm btn-primary" (click)="confirmPermission()">Enable Notifications</button>
                <button type="button" class="btn btn-sm btn-secondary" (click)="dismissPermissionPrompt()">Cancel</button>
              </div>
            </div>

            <!-- Permission denied alert (only appears when user chooses interval > 0 and permission is denied) -->
            <div class="permission-denied-alert" *ngIf="permissionDeniedMessage">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <span>{{ permissionDeniedMessage }}</span>
            </div>

            <div class="modal-buttons">
              <button type="button" (click)="closeModal()" class="btn btn-secondary">Cancel</button>
              <button type="submit" class="btn btn-primary">Save Task</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Dedicated Focus Timer Permission Modal -->
      <div class="modal-backdrop" *ngIf="showTimerPermissionModal" (click)="dismissTimerPermissionModal()">
        <div class="modal-content timer-perm-modal animate-scale-up" (click)="$event.stopPropagation()">
          <div class="perm-modal-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
          </div>
          <h3 class="modal-title" style="text-align: center; margin: 0;">Focus Timer Notifications</h3>
          <p class="timer-perm-text">
            Allow PunchUp notifications to keep your active timer visible when you leave or minimize this tab.
          </p>
          <div class="timer-perm-actions">
            <button type="button" class="btn btn-primary btn-full" (click)="confirmTimerPermission()">
              Allow Notifications & Start
            </button>
            <button type="button" class="btn btn-secondary btn-full" (click)="startWithoutTimerNotification()">
              Start Without Notifications
            </button>
            <button type="button" class="btn-ghost" (click)="dismissTimerPermissionModal()">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .tasks-container {
      padding: 2.5rem;
      display: flex;
      flex-direction: column;
      gap: 2rem;
      max-width: 1200px;
      margin: 0 auto;
      width: 100%;
    }

    .tasks-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1.25rem;
    }

    .subtitle {
      font-size: 0.9rem;
      color: var(--text-secondary);
      margin-top: 0.25rem;
    }

    /* Focus Split Grid (Equal visual importance) */
    .focus-split-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    @media (max-width: 580px) {
      .focus-split-grid {
        grid-template-columns: 1fr;
        gap: 0.75rem;
      }
    }

    .focus-action-tile {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1.25rem;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      cursor: pointer;
      text-align: left;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: var(--shadow-sm);
      width: 100%;
    }

    .focus-action-tile:hover {
      border-color: var(--border-glow);
      background: var(--surface-hover);
      transform: translateY(-2px);
      box-shadow: var(--shadow-md);
    }

    .tile-icon-wrap {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .create-wrap {
      background: rgba(59, 130, 246, 0.12);
      color: #3b82f6;
    }

    .timer-wrap {
      background: rgba(139, 92, 246, 0.12);
      color: #8b5cf6;
    }

    .pulse-live {
      animation: livePulse 2s infinite ease-in-out;
    }

    @keyframes livePulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(139, 92, 246, 0.4); }
      50% { box-shadow: 0 0 0 8px rgba(139, 92, 246, 0); }
    }

    .tile-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
      min-width: 0;
    }

    .tile-title-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .tile-title {
      font-size: 1rem;
      font-weight: 700;
      color: var(--text-primary);
    }

    .running-pill {
      font-size: 0.625rem;
      font-weight: 700;
      text-transform: uppercase;
      background: #ef4444;
      color: #fff;
      padding: 0.1rem 0.45rem;
      border-radius: 999px;
      letter-spacing: 0.05em;
    }

    .tile-desc {
      font-size: 0.8125rem;
      color: var(--text-secondary);
      line-height: 1.35;
    }

    .running-desc {
      color: var(--accent);
      font-weight: 600;
    }

    .tile-arrow {
      color: var(--text-muted);
      flex-shrink: 0;
      transition: transform 0.15s ease;
    }

    .focus-action-tile:hover .tile-arrow {
      transform: translateX(3px);
      color: var(--text-primary);
    }

    /* Section Navigation Header */
    .section-nav-header {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1.25rem;
    }

    .section-nav-header h2 {
      font-size: 1.4rem;
      font-weight: 700;
    }

    .back-nav-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
    }

    /* Inline Task Card */
    .inline-form-card {
      padding: 1.75rem;
    }

    .due-presets-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
      margin-top: -0.5rem;
    }

    .preset-label {
      font-size: 0.75rem;
      color: var(--text-muted);
      font-weight: 500;
    }

    .btn-preset {
      padding: 0.2rem 0.55rem;
      font-size: 0.75rem;
      font-weight: 600;
      border-radius: var(--radius);
      border: 1px solid var(--border);
      background: var(--surface-hover);
      color: var(--text-secondary);
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .btn-preset:hover {
      background: var(--surface-elevated);
      color: var(--text-primary);
      border-color: var(--border-hover);
    }

    /* Timer View */
    .timer-view-wrapper {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .timer-display-card {
      padding: 2.5rem 1.5rem;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
    }

    .timer-status-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.35rem 0.85rem;
      border-radius: 999px;
      font-size: 0.8125rem;
      font-weight: 600;
      background: var(--surface-hover);
      color: var(--text-secondary);
      border: 1px solid var(--border);
    }

    .timer-status-badge.active-badge {
      background: rgba(139, 92, 246, 0.12);
      color: #8b5cf6;
      border-color: rgba(139, 92, 246, 0.3);
    }

    .timer-status-badge.paused-badge {
      background: rgba(245, 158, 11, 0.15);
      color: #f59e0b;
      border-color: rgba(245, 158, 11, 0.3);
    }

    .status-pulse-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #8b5cf6;
      animation: pulseDot 1.5s infinite;
    }

    @keyframes pulseDot {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.85); }
    }

    .timer-notif-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.35rem 0.85rem;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 500;
      line-height: 1.4;
    }

    .timer-notif-pill.granted {
      background: rgba(59, 130, 246, 0.12);
      color: #60a5fa;
      border: 1px solid rgba(59, 130, 246, 0.25);
    }

    .timer-notif-pill.denied {
      background: rgba(239, 68, 68, 0.1);
      color: #f87171;
      border: 1px solid rgba(239, 68, 68, 0.25);
      max-width: 440px;
      text-align: left;
    }

    .digital-timer-clock {
      font-family: var(--font-mono, monospace);
      font-size: 4rem;
      font-weight: 800;
      letter-spacing: 0.06em;
      color: var(--text-primary);
      line-height: 1.1;
      padding: 0.5rem 0;
    }

    @media (max-width: 480px) {
      .digital-timer-clock {
        font-size: 2.75rem;
      }

      .timer-controls-row {
        flex-direction: column;
        width: 100%;
      }

      .timer-action-btn {
        width: 100%;
        justify-content: center;
      }
    }

    .timer-subtext {
      font-size: 0.875rem;
      color: var(--text-muted);
      max-width: 420px;
      text-align: center;
    }

    .timer-controls-row {
      margin-top: 1rem;
      display: flex;
      gap: 1rem;
      justify-content: center;
    }

    .timer-action-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.6rem;
      padding: 0.85rem 2rem;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .timer-action-btn.pause-btn {
      background: #f59e0b;
      border-color: #f59e0b;
      color: #1e1b4b;
    }

    .timer-action-btn.pause-btn:hover {
      background: #d97706;
      border-color: #d97706;
    }

    .timer-action-btn.resume-btn {
      background: #10b981;
      border-color: #10b981;
      color: #fff;
    }

    .timer-action-btn.resume-btn:hover {
      background: #059669;
      border-color: #059669;
    }

    .timer-action-btn.stop-btn {
      background: #ef4444;
      border-color: #ef4444;
      color: #fff;
    }

    .timer-action-btn.stop-btn:hover {
      background: #dc2626;
    }

    /* Dedicated Focus Timer Permission Modal Styles */
    .timer-perm-modal {
      max-width: 440px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      padding: 2rem 1.75rem;
    }

    .perm-modal-icon {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: rgba(99, 102, 241, 0.15);
      color: #818cf8;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .timer-perm-text {
      font-size: 0.9rem;
      color: var(--text-secondary);
      line-height: 1.5;
      margin: 0;
    }

    .timer-perm-actions {
      display: flex;
      flex-direction: column;
      gap: 0.625rem;
      width: 100%;
      margin-top: 0.5rem;
    }

    .btn-full {
      width: 100%;
      justify-content: center;
      padding: 0.75rem 1rem;
    }

    .btn-ghost {
      background: transparent;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      padding: 0.4rem;
      font-size: 0.85rem;
      transition: color 0.15s ease;
    }

    .btn-ghost:hover {
      color: var(--text-primary);
      text-decoration: underline;
    }

    .timer-stats-card {
      padding: 1.5rem;
    }

    .stats-card-title {
      font-size: 1.05rem;
      font-weight: 700;
      margin-bottom: 1rem;
    }

    .timer-stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
    }

    @media (max-width: 580px) {
      .timer-stats-grid {
        grid-template-columns: 1fr;
      }
    }

    .timer-stat-item {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      padding: 1rem;
      background: var(--surface-hover);
      border: 1px solid var(--border);
      border-radius: var(--radius);
    }

    .stat-label {
      font-size: 0.75rem;
      color: var(--text-muted);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .stat-value {
      font-size: 1.5rem;
      font-weight: 800;
      color: var(--text-primary);
    }

    .stat-value.highlight {
      color: var(--accent);
    }

    .stat-hint {
      font-size: 0.7rem;
      color: var(--text-muted);
    }

    /* Filter Card */
    .filter-card {
      padding: 1rem 1.25rem;
    }

    .filter-row {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
      align-items: center;
    }

    .search-box {
      flex: 1;
      min-width: 220px;
      position: relative;
      display: flex;
      align-items: center;
    }

    .search-box input {
      width: 100%;
      padding-left: 2.5rem;
    }

    .search-icon {
      position: absolute;
      left: 1rem;
      color: var(--text-muted);
      pointer-events: none;
    }

    select {
      min-width: 140px;
    }

    /* Tasks List */
    .tasks-list-section {
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }

    .group-section {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .group-label {
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--text-muted);
      padding-bottom: 0.5rem;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .group-label-overdue {
      color: var(--danger, #ef4444);
      border-bottom-color: rgba(239, 68, 68, 0.25);
    }

    .tasks-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 1.25rem;
    }

    .task-card {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding: 1.5rem;
      min-height: 170px;
      transition: all 0.2s ease;
    }

    /* Overdue Styling */
    .task-card.overdue {
      border-color: rgba(239, 68, 68, 0.4);
      background: linear-gradient(180deg, rgba(239, 68, 68, 0.04) 0%, var(--surface) 100%);
    }

    .task-card.overdue:hover {
      border-color: rgba(239, 68, 68, 0.6);
      box-shadow: 0 0 16px rgba(239, 68, 68, 0.12);
    }

    .text-overdue {
      color: var(--danger, #ef4444) !important;
    }

    .overdue-tag {
      font-size: 0.6875rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #fff;
      background: var(--danger, #ef4444);
      border-radius: 4px;
      padding: 0.125rem 0.45rem;
      line-height: 1.3;
    }

    .overdue-badge {
      color: var(--danger, #ef4444) !important;
      border-color: rgba(239, 68, 68, 0.3) !important;
      background: rgba(239, 68, 68, 0.08) !important;
    }

    .task-card.completed {
      border-color: var(--border);
      opacity: 0.55;
    }

    .task-card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 0.75rem;
    }

    .task-check-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      overflow: hidden;
      flex: 1;
      min-width: 0;
    }

    .task-title {
      font-size: 1.05rem;
      font-weight: 600;
      color: var(--text-primary);
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;
    }

    .task-card.completed .task-title {
      text-decoration: line-through;
      color: var(--text-muted);
    }

    .task-actions {
      display: flex;
      gap: 0.25rem;
      flex-shrink: 0;
    }

    .delete-icon:hover {
      color: var(--danger, #ef4444);
      background-color: rgba(239, 68, 68, 0.08);
    }

    .task-desc {
      font-size: 0.875rem;
      color: var(--text-secondary);
      flex: 1;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
      line-height: 1.5;
    }

    .task-card.overdue .task-desc {
      color: var(--text-secondary);
    }

    .task-card-footer {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
      font-size: 0.75rem;
      border-top: 1px solid var(--border);
      padding-top: 0.75rem;
      margin-top: auto;
    }

    .due-date-badge {
      font-size: 0.6875rem;
      font-weight: 500;
      color: var(--text-secondary);
      background: var(--surface-hover);
      border: 1px solid var(--border);
      border-radius: 4px;
      padding: 0.125rem 0.5rem;
      margin-left: auto;
      white-space: nowrap;
    }

    /* Checkbox */
    .checkbox-container {
      display: block;
      position: relative;
      width: 18px;
      height: 18px;
      cursor: pointer;
      user-select: none;
      flex-shrink: 0;
    }

    .checkbox-container input {
      position: absolute;
      opacity: 0;
      cursor: pointer;
      height: 0;
      width: 0;
    }

    .checkmark {
      position: absolute;
      top: 0;
      left: 0;
      height: 18px;
      width: 18px;
      background-color: transparent;
      border: 1px solid var(--border-hover);
      border-radius: 4px;
      transition: all var(--transition-fast);
    }

    .checkbox-container:hover input ~ .checkmark {
      border-color: var(--accent);
    }

    .checkbox-container input:checked ~ .checkmark {
      background-color: var(--accent);
      border-color: var(--accent);
    }

    .checkmark:after {
      content: "";
      position: absolute;
      display: none;
    }

    .checkbox-container input:checked ~ .checkmark:after {
      display: block;
      left: 6px;
      top: 3px;
      width: 4px;
      height: 8px;
      border: solid var(--background);
      border-width: 0 2px 2px 0;
      transform: rotate(45deg);
    }

    /* Show more / less container */
    .display-limit-bar {
      display: flex;
      justify-content: center;
      padding: 1rem 0;
    }

    .display-toggle-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.625rem 1.25rem;
      font-size: 0.875rem;
      font-weight: 500;
      border-radius: 999px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .remaining-count {
      color: var(--text-muted);
      font-size: 0.8125rem;
    }

    /* Empty states */
    .empty-tasks-state {
      padding: 4rem 2rem;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      color: var(--text-muted);
    }

    .empty-tasks-state h3 {
      color: var(--text-primary);
      margin-top: 0.5rem;
    }

    .empty-tasks-state p {
      max-width: 400px;
      margin-bottom: 0.5rem;
    }

    /* Modal Form */
    .modal-title {
      margin-bottom: 1.5rem;
      font-size: 1.25rem;
      border-bottom: 1px solid var(--border);
      padding-bottom: 0.75rem;
    }

    .modal-form {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
    }

    .form-hint {
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-top: 0.35rem;
    }

    .reminder-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      font-size: 0.6875rem;
      font-weight: 600;
      color: var(--accent);
      background: rgba(99, 102, 241, 0.08);
      border: 1px solid rgba(99, 102, 241, 0.25);
      border-radius: 4px;
      padding: 0.125rem 0.45rem;
      line-height: 1.3;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .form-row-triple {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .form-group-due {
      grid-column: 1 / -1;
    }

    .permission-prompt-card {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      padding: 0.875rem 1rem;
      background: rgba(99, 102, 241, 0.08);
      border: 1px solid rgba(99, 102, 241, 0.25);
      border-radius: var(--radius);
      animation: fadeIn 0.2s ease;
    }

    .prompt-content {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      color: var(--text-primary);
    }

    .prompt-content svg {
      color: var(--accent);
      flex-shrink: 0;
      margin-top: 0.15rem;
    }

    .prompt-text p {
      font-size: 0.8125rem;
      color: var(--text-secondary);
      line-height: 1.4;
      margin: 0;
    }

    .prompt-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
    }

    .permission-denied-alert {
      display: flex;
      align-items: flex-start;
      gap: 0.65rem;
      padding: 0.75rem 1rem;
      background: rgba(239, 68, 68, 0.08);
      border: 1px solid rgba(239, 68, 68, 0.25);
      border-radius: var(--radius);
      color: var(--danger, #ef4444);
      font-size: 0.8125rem;
      line-height: 1.4;
      animation: fadeIn 0.2s ease;
    }

    .permission-denied-alert svg {
      flex-shrink: 0;
      margin-top: 0.1rem;
    }

    .modal-buttons {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      border-top: 1px solid var(--border);
      padding-top: 1.25rem;
      margin-top: 0.5rem;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .tasks-container {
        padding: 1.25rem 1rem;
        padding-bottom: calc(var(--mobile-nav-height) + 1.25rem);
        gap: 1.25rem;
      }

      .tasks-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.875rem;
        width: 100%;
      }

      .tasks-header h1 {
        font-size: 1.4rem;
      }

      .create-btn {
        width: 100%;
      }

      .filter-card {
        padding: 1rem;
      }

      .filter-row {
        flex-direction: column;
        gap: 0.75rem;
      }

      .search-box, select {
        width: 100%;
        min-width: 100%;
      }

      .tasks-grid {
        grid-template-columns: 1fr;
        gap: 0.875rem;
      }

      .task-card {
        padding: 1.25rem;
        min-height: unset;
      }

      .form-row, .form-row-triple {
        grid-template-columns: 1fr;
      }

      .form-group-due {
        grid-column: auto;
      }

      .modal-buttons {
        flex-direction: column-reverse;
      }

      .modal-buttons .btn {
        width: 100%;
      }
    }

    @media (max-width: 480px) {
      .tasks-container {
        padding: 1rem 0.75rem;
        padding-bottom: calc(var(--mobile-nav-height) + 1rem);
        gap: 1rem;
      }

      .task-card {
        padding: 1rem;
        gap: 0.75rem;
      }

      .task-title {
        font-size: 0.9375rem;
      }

      .task-desc {
        font-size: 0.8125rem;
        -webkit-line-clamp: 2;
      }
    }

    @media (max-width: 320px) {
      .tasks-container {
        padding: 0.75rem 0.5rem;
      }

      .task-card {
        padding: 0.875rem 0.75rem;
      }

      .task-title {
        font-size: 0.875rem;
      }
    }
  `]
})
export class TasksComponent implements OnInit, OnDestroy {
  private taskService = inject(TaskService);
  private toastService = inject(ToastService);
  private route = inject(ActivatedRoute);
  public reminderService = inject(ReminderService);
  public focusService = inject(FocusService);

  public activeFocusView: 'hub' | 'create-task' | 'timer' = 'hub';
  public isTimerLoading = false;

  public allTasks: Task[] = [];
  public filteredTasks: Task[] = [];

  // Grouped active tasks
  public overdueTasks: Task[] = [];
  public todayTasks: Task[] = [];
  public upcomingTasks: Task[] = [];
  public noDueDateTasks: Task[] = [];

  // Filters
  public filterSearch = '';
  public filterStatus = 'all';
  public filterPriority = 'all';

  // Responsive display limit
  public initialLimit = 10;
  public displayLimit = 10;

  // Modal control
  public showModal = false;
  public isEditMode = false;
  public modalTask: Partial<Task> = this.resetModalTask();
  public showPermissionPrompt = false;
  public permissionDeniedMessage = '';
  private activeEditingId: string | null = null;
  private timerSubscription: any = null;

  // Focus Timer notification modal state
  public showTimerPermissionModal = false;
  public timerPermissionDeniedMessage = '';

  public get hasNotificationPermission(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted';
  }

  public setFocusView(view: 'hub' | 'create-task' | 'timer') {
    this.activeFocusView = view;
    if (view === 'create-task') {
      this.isEditMode = false;
      this.activeEditingId = null;
      this.modalTask = this.resetModalTask();
    }
  }

  public setDuePreset(hours: number) {
    const d = new Date(Date.now() + hours * 3600 * 1000);
    const pad = (n: number) => n < 10 ? '0' + n : String(n);
    const localIso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    this.modalTask.dueDate = localIso;
  }

  public startFocusTimer() {
    this.isTimerLoading = true;
    this.focusService.startSession().subscribe({
      next: () => {
        this.isTimerLoading = false;
        this.toastService.showSuccess('Focus session started! Stay in the zone.');
      },
      error: (err) => {
        this.isTimerLoading = false;
        this.toastService.showError(err?.error?.message || 'Could not start focus session');
      }
    });
  }

  public stopFocusTimer() {
    this.isTimerLoading = true;
    this.focusService.stopSession().subscribe({
      next: () => {
        this.isTimerLoading = false;
        this.toastService.showSuccess('Focus session completed and saved!');
        this.focusService.getStats().subscribe();
      },
      error: (err) => {
        this.isTimerLoading = false;
        this.toastService.showError(err?.error?.message || 'Could not stop focus session');
      }
    });
  }

  /** Called when user taps "Start Focus Timer". Checks notification permission before starting. */
  public onStartTimerClick() {
    this.timerPermissionDeniedMessage = '';

    if (typeof window === 'undefined' || !('Notification' in window)) {
      // Notifications not supported — start directly
      this.startFocusTimer();
      return;
    }

    const permission = Notification.permission;

    if (permission === 'granted') {
      // Already have permission — start immediately with notification
      this.startFocusTimer();
    } else if (permission === 'denied') {
      // Permission permanently denied — start without notification, show hint
      this.timerPermissionDeniedMessage = 'Browser notifications are blocked for PunchUp. You can enable them in your browser/site settings.';
      this.startFocusTimer();
    } else {
      // 'default' — ask user explicitly because they triggered the timer
      this.showTimerPermissionModal = true;
    }
  }

  /** User chose "Allow Notifications & Start" in the timer permission modal. */
  public async confirmTimerPermission() {
    this.showTimerPermissionModal = false;
    const granted = await this.reminderService.requestPermission();
    if (granted) {
      this.timerPermissionDeniedMessage = '';
    } else {
      const status = this.reminderService.getPermissionState();
      if (status === 'denied') {
        this.timerPermissionDeniedMessage = 'Browser notifications are blocked for PunchUp. You can enable them in your browser/site settings.';
      }
    }
    // Start the timer regardless of whether permission was granted
    this.startFocusTimer();
  }

  /** User chose "Start Without Notifications" in the timer permission modal. */
  public startWithoutTimerNotification() {
    this.showTimerPermissionModal = false;
    this.startFocusTimer();
  }

  /** User dismissed the timer permission modal (Cancel). Timer does NOT start. */
  public dismissTimerPermissionModal() {
    this.showTimerPermissionModal = false;
  }

  /** Pause the active focus session (local pause, no backend call). */
  public pauseFocusTimer() {
    this.focusService.pauseSession();
  }

  /** Resume the active focus session after a local pause. */
  public resumeFocusTimer() {
    this.focusService.resumeSession();
  }


  ngOnInit() {
    this.updateInitialLimit();
    this.loadTasks();

    this.focusService.syncActiveSession().subscribe();
    this.focusService.getStats().subscribe();

    this.route.queryParams.subscribe((params: any) => {
      if (params['create'] === 'true') {
        this.openCreateModal();
      }
    });

    // Check periodically for tasks that become overdue without manual refresh
    this.timerSubscription = setInterval(() => {
      this.checkOverdueTransitions();
    }, 10000);
  }

  ngOnDestroy() {
    if (this.timerSubscription) {
      clearInterval(this.timerSubscription);
      this.timerSubscription = null;
    }
  }

  @HostListener('window:resize')
  onResize() {
    this.updateInitialLimit();
  }

  @HostListener('window:focus')
  onFocus() {
    this.checkOverdueTransitions();
  }

  public checkOverdueTransitions() {
    this.applyFilters();
  }

  private updateInitialLimit() {
    if (typeof window !== 'undefined') {
      const isMobile = window.innerWidth <= 768;
      const newLimit = isMobile ? 6 : 10;
      if (this.displayLimit === this.initialLimit) {
        this.displayLimit = newLimit;
      }
      this.initialLimit = newLimit;
    }
  }

  public showMore() {
    this.displayLimit = Math.min(this.displayLimit + this.initialLimit, this.filteredTasks.length);
    this.applyGrouping();
  }

  public showLess() {
    this.displayLimit = this.initialLimit;
    this.applyGrouping();
  }

  public isOverdue(task: Task): boolean {
    if (!task || task.completed || !task.dueDate) return false;
    return new Date(task.dueDate).getTime() < Date.now();
  }

  private isToday(task: Task): boolean {
    if (!task.dueDate) return false;
    const due = new Date(task.dueDate);
    const now = new Date();
    return due.toDateString() === now.toDateString();
  }

  private isUpcoming(task: Task): boolean {
    if (!task.dueDate) return false;
    const due = new Date(task.dueDate);
    const now = new Date();
    now.setHours(23, 59, 59, 999);
    return due.getTime() > now.getTime();
  }

  public loadTasks() {
    this.taskService.getTasks().subscribe((response: any) => {
      if (response.success) {
        this.allTasks = response.tasks;
        this.applyFilters();
      }
    });
  }

  public applyFilters() {
    // 1. Filter tasks
    const matched = this.allTasks.filter(task => {
      const matchesSearch = !this.filterSearch ||
        task.title.toLowerCase().includes(this.filterSearch.toLowerCase()) ||
        (task.description || '').toLowerCase().includes(this.filterSearch.toLowerCase());

      let matchesStatus = true;
      if (this.filterStatus === 'pending') matchesStatus = !task.completed;
      if (this.filterStatus === 'completed') matchesStatus = task.completed;

      const matchesPriority = this.filterPriority === 'all' || task.priority === this.filterPriority;

      return matchesSearch && matchesStatus && matchesPriority;
    });

    // 2. Sort order: Overdue first (due asc), then Today, then Upcoming (due asc), then undated
    this.filteredTasks = matched.sort((a, b) => {
      const aOverdue = this.isOverdue(a);
      const bOverdue = this.isOverdue(b);
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;

      // Both overdue: earliest due date first
      if (aOverdue && bOverdue && a.dueDate && b.dueDate) {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }

      // If one has dueDate and other doesn't
      if (a.dueDate && !b.dueDate) return -1;
      if (!a.dueDate && b.dueDate) return 1;

      // If both have due date, order by due date asc
      if (a.dueDate && b.dueDate) {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }

      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    this.applyGrouping();
  }

  private applyGrouping() {
    // Slice tasks according to responsive display limit
    const visible = this.filteredTasks.slice(0, this.displayLimit);

    this.overdueTasks = visible.filter(t => this.isOverdue(t));
    this.todayTasks = visible.filter(t => !this.isOverdue(t) && this.isToday(t));
    this.upcomingTasks = visible.filter(t => !this.isOverdue(t) && this.isUpcoming(t));
    this.noDueDateTasks = visible.filter(t => !this.isOverdue(t) && !this.isToday(t) && !this.isUpcoming(t));
  }

  public formatDueDate(dateStr: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const now = new Date();
    const isThisYear = d.getFullYear() === now.getFullYear();

    const datePart = d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: isThisYear ? undefined : 'numeric',
    });

    const timePart = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    return `${datePart}, ${timePart}`;
  }

  private resetModalTask(): Partial<Task> {
    return {
      title: '',
      description: '',
      priority: 'medium',
      category: 'general',
      dueDate: '',
      reminderInterval: 0,
      reminderEnabled: false,
    };
  }

  public openCreateModal() {
    this.isEditMode = false;
    this.modalTask = this.resetModalTask();
    this.showPermissionPrompt = false;
    this.permissionDeniedMessage = '';
    this.activeEditingId = null;
    this.setFocusView('create-task');
  }

  public openEditModal(task: Task) {
    this.isEditMode = true;
    this.activeEditingId = task._id;
    this.showPermissionPrompt = false;
    this.permissionDeniedMessage = '';

    // Convert date to datetime-local friendly format YYYY-MM-DDTHH:mm
    let localDue = '';
    if (task.dueDate) {
      const d = new Date(task.dueDate);
      const pad = (n: number) => n.toString().padStart(2, '0');
      localDue = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }

    this.modalTask = {
      title: task.title,
      description: task.description,
      priority: task.priority,
      category: task.category || 'general',
      dueDate: localDue,
      reminderInterval: task.reminderInterval || 0,
      reminderEnabled: task.reminderEnabled || false,
    };

    this.showModal = true;
  }

  public closeModal() {
    this.showModal = false;
    this.showPermissionPrompt = false;
    this.permissionDeniedMessage = '';
    this.modalTask = this.resetModalTask();
    this.activeEditingId = null;
  }

  public async onReminderIntervalChange() {
    this.permissionDeniedMessage = '';
    const interval = Number(this.modalTask.reminderInterval) || 0;

    if (interval === 0) {
      this.showPermissionPrompt = false;
      this.modalTask.reminderInterval = 0;
      return;
    }

    // User explicitly enabled reminder > 0: Check browser notification permission specifically for PunchUp
    const status = this.reminderService.getPermissionState();

    if (status === 'granted') {
      this.showPermissionPrompt = false;
      this.reminderService.ensureSubscribed().catch(() => {});
    } else if (status === 'denied') {
      this.modalTask.reminderInterval = 0;
      this.showPermissionPrompt = false;
      this.permissionDeniedMessage = 'Browser notifications are blocked for PunchUp. Enable notifications for PunchUp in your browser settings to use reminders.';
    } else {
      // 'default' - show clear user-initiated permission prompt
      this.showPermissionPrompt = true;
    }
  }

  public async confirmPermission() {
    const granted = await this.reminderService.requestPermission();
    this.showPermissionPrompt = false;
    if (granted) {
      this.permissionDeniedMessage = '';
      this.toastService.showSuccess('PunchUp reminders enabled');
    } else {
      this.modalTask.reminderInterval = 0;
      const status = this.reminderService.getPermissionState();
      if (status === 'denied') {
        this.permissionDeniedMessage = 'Browser notifications are blocked for PunchUp. Enable notifications for PunchUp in your browser settings to use reminders.';
      } else {
        this.toastService.showInfo('Notification permission was not granted.');
      }
    }
  }

  public dismissPermissionPrompt() {
    this.showPermissionPrompt = false;
    this.modalTask.reminderInterval = 0;
  }

  public saveTask() {
    if (!this.modalTask.title || !this.modalTask.title.trim()) return;

    const payload: Partial<Task> = {
      title: this.modalTask.title.trim(),
      description: (this.modalTask.description || '').trim(),
      priority: this.modalTask.priority || 'medium',
      category: this.modalTask.category || 'general',
      reminderInterval: Number(this.modalTask.reminderInterval) || 0,
    };

    if (this.modalTask.dueDate) {
      payload.dueDate = new Date(this.modalTask.dueDate).toISOString();
    } else {
      payload.dueDate = this.isEditMode ? '' : undefined;
    }

    if (this.isEditMode && this.activeEditingId) {
      this.taskService.updateTask(this.activeEditingId, payload).subscribe((response: any) => {
        if (response.success) {
          this.loadTasks();
          this.closeModal();
          this.toastService.showSuccess('Task updated successfully');
        }
      });
    } else {
      this.taskService.createTask(payload).subscribe((response: any) => {
        if (response.success) {
          this.loadTasks();
          this.toastService.showSuccess('Task created successfully!');
          // Return user to hub after creation
          this.setFocusView('hub');
        }
      });
    }
  }

  public onComplete(task: Task) {
    if (task.completed) return;

    this.taskService.completeTask(task._id).subscribe({
      next: (response) => {
        if (response.success) {
          task.completed = true;
          task.completedAt = response.task.completedAt;

          // Immediately remove overdue visual state and re-filter
          this.applyFilters();

          if (response.pointsAwarded && response.pointsAwarded > 0) {
            this.toastService.showSuccess(`+${response.pointsAwarded} points awarded! 🎯 (${response.league} League)`);
          } else {
            this.toastService.showSuccess('Task completed!');
          }

          // Apply completion & disappearance window
          // If task due date has passed, or after brief completion visual feedback, refresh active list
          setTimeout(() => {
            this.loadTasks();
          }, 350);
        }
      },
      error: (err) => {
        console.error('Error completing task:', err);
      }
    });
  }

  public onDelete(id: string) {
    if (confirm('Are you sure you want to delete this task?')) {
      this.taskService.deleteTask(id).subscribe((response: any) => {
        if (response.success) {
          this.loadTasks();
          this.toastService.showInfo('Task deleted');
        }
      });
    }
  }
}
