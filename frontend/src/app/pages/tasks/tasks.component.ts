import { Component, OnInit, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { TaskService, Task } from '../../core/services/task.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="tasks-container animate-fade-in">
      <!-- Title Header -->
      <header class="tasks-header">
        <div>
          <h1>Workspace Tasks</h1>
          <p class="subtitle">Organize and complete your daily consistency objectives.</p>
        </div>
        <button (click)="openCreateModal()" class="btn btn-primary create-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          <span>Create Task</span>
        </button>
      </header>

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
            <div *ngFor="let task of overdueTasks" class="card task-card overdue">
              <div class="task-card-header">
                <div class="task-check-row">
                  <label class="checkbox-container">
                    <input type="checkbox" [checked]="task.completed" [disabled]="task.completed" (change)="onComplete(task)" />
                    <span class="checkmark"></span>
                  </label>
                  <h4 class="task-title text-overdue" [title]="task.title">{{ task.title }}</h4>
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
                <span class="overdue-tag">Overdue</span>
                <span class="due-date-badge overdue-badge" *ngIf="task.dueDate">Due {{ formatDueDate(task.dueDate) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 2. Today Group -->
        <div class="group-section" *ngIf="todayTasks.length > 0">
          <div class="group-label">Today ({{ todayTasks.length }})</div>
          <div class="tasks-grid">
            <div *ngFor="let task of todayTasks" class="card task-card" [class.completed]="task.completed">
              <div class="task-card-header">
                <div class="task-check-row">
                  <label class="checkbox-container">
                    <input type="checkbox" [checked]="task.completed" [disabled]="task.completed" (change)="onComplete(task)" />
                    <span class="checkmark"></span>
                  </label>
                  <h4 class="task-title" [title]="task.title">{{ task.title }}</h4>
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
                <span class="due-date-badge" *ngIf="task.dueDate">Due {{ formatDueDate(task.dueDate) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 3. Upcoming Group -->
        <div class="group-section" *ngIf="upcomingTasks.length > 0">
          <div class="group-label">Upcoming ({{ upcomingTasks.length }})</div>
          <div class="tasks-grid">
            <div *ngFor="let task of upcomingTasks" class="card task-card" [class.completed]="task.completed">
              <div class="task-card-header">
                <div class="task-check-row">
                  <label class="checkbox-container">
                    <input type="checkbox" [checked]="task.completed" [disabled]="task.completed" (change)="onComplete(task)" />
                    <span class="checkmark"></span>
                  </label>
                  <h4 class="task-title" [title]="task.title">{{ task.title }}</h4>
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
                <span class="due-date-badge" *ngIf="task.dueDate">Due {{ formatDueDate(task.dueDate) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 4. Other Tasks (No due date) -->
        <div class="group-section" *ngIf="noDueDateTasks.length > 0">
          <div class="group-label">Other Tasks ({{ noDueDateTasks.length }})</div>
          <div class="tasks-grid">
            <div *ngFor="let task of noDueDateTasks" class="card task-card" [class.completed]="task.completed">
              <div class="task-card-header">
                <div class="task-check-row">
                  <label class="checkbox-container">
                    <input type="checkbox" [checked]="task.completed" [disabled]="task.completed" (change)="onComplete(task)" />
                    <span class="checkmark"></span>
                  </label>
                  <h4 class="task-title" [title]="task.title">{{ task.title }}</h4>
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

            <div class="form-row">
              <div class="form-group">
                <label>Priority</label>
                <select [(ngModel)]="modalTask.priority" name="priority">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div class="form-group">
                <label>Due Date & Time (optional)</label>
                <input type="datetime-local" [(ngModel)]="modalTask.dueDate" name="dueDate" />
              </div>
            </div>

            <div class="modal-buttons">
              <button type="button" (click)="closeModal()" class="btn btn-secondary">Cancel</button>
              <button type="submit" class="btn btn-primary">Save Task</button>
            </div>
          </form>
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
    }

    .subtitle {
      font-size: 0.9rem;
      color: var(--text-secondary);
      margin-top: 0.25rem;
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

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
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

      .form-row {
        grid-template-columns: 1fr;
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
export class TasksComponent implements OnInit {
  private taskService = inject(TaskService);
  private toastService = inject(ToastService);
  private route = inject(ActivatedRoute);

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
  private activeEditingId: string | null = null;

  ngOnInit() {
    this.updateInitialLimit();
    this.loadTasks();

    this.route.queryParams.subscribe((params: any) => {
      if (params['create'] === 'true') {
        this.openCreateModal();
      }
    });
  }

  @HostListener('window:resize')
  onResize() {
    this.updateInitialLimit();
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
    if (task.completed || !task.dueDate) return false;
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
    const now = new Date();
    const isThisYear = d.getFullYear() === now.getFullYear();
    const hasTime = d.getHours() !== 0 || d.getMinutes() !== 0;

    const datePart = d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: isThisYear ? undefined : 'numeric',
    });

    if (hasTime) {
      const timePart = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      return `${datePart}, ${timePart}`;
    }
    return datePart;
  }

  private resetModalTask(): Partial<Task> {
    return {
      title: '',
      description: '',
      priority: 'medium',
      category: 'general',
      dueDate: '',
    };
  }

  public openCreateModal() {
    this.isEditMode = false;
    this.modalTask = this.resetModalTask();
    this.activeEditingId = null;
    this.showModal = true;
  }

  public openEditModal(task: Task) {
    this.isEditMode = true;
    this.activeEditingId = task._id;

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
    };

    this.showModal = true;
  }

  public closeModal() {
    this.showModal = false;
    this.modalTask = this.resetModalTask();
    this.activeEditingId = null;
  }

  public saveTask() {
    if (!this.modalTask.title) return;

    if (this.isEditMode && this.activeEditingId) {
      this.taskService.updateTask(this.activeEditingId, this.modalTask).subscribe((response: any) => {
        if (response.success) {
          this.loadTasks();
          this.closeModal();
          this.toastService.showSuccess('Task updated successfully');
        }
      });
    } else {
      this.taskService.createTask(this.modalTask).subscribe((response: any) => {
        if (response.success) {
          this.loadTasks();
          this.closeModal();
          this.toastService.showSuccess('Task created successfully');
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
