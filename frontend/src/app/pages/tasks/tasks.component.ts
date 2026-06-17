import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { TaskService, Task } from '../../core/services/task.service';

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="tasks-container">
      <!-- Title Header -->
      <header class="tasks-header">
        <div>
          <h1>Workspace Tasks</h1>
          <p class="subtitle">Organize and complete your daily consistency objectives.</p>
        </div>
        <button (click)="openCreateModal()" class="btn btn-primary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          <span>Create Task</span>
        </button>
      </header>

      <!-- Filter Bar -->
      <section class="card filter-card">
        <div class="filter-row">
          <!-- Search input -->
          <div class="search-box">
            <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input 
              type="text" 
              placeholder="Search tasks..." 
              [(ngModel)]="filterSearch"
              (input)="applyFilters()" />
          </div>

          <!-- Status select -->
          <select [(ngModel)]="filterStatus" (change)="applyFilters()">
            <option value="all">All Statuses</option>
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

          <!-- Category select -->
          <select [(ngModel)]="filterCategory" (change)="applyFilters()">
            <option value="all">All Categories</option>
            <option *ngFor="let cat of uniqueCategories" [value]="cat">{{ cat }}</option>
          </select>
        </div>
      </section>

      <!-- Tasks List -->
      <section class="tasks-list-section">
        <div class="tasks-grid" *ngIf="filteredTasks.length > 0; else emptyState">
          <div *ngFor="let task of filteredTasks" class="card task-card" [class.completed]="task.completed">
            <div class="task-card-header">
              <div class="task-check-row">
                <label class="checkbox-container">
                  <input 
                    type="checkbox" 
                    [checked]="task.completed"
                    [disabled]="task.completed"
                    (change)="onComplete(task)" />
                  <span class="checkmark"></span>
                </label>
                <h4 class="task-title" [title]="task.title">{{ task.title }}</h4>
              </div>
              <div class="task-actions">
                <button (click)="openEditModal(task)" class="btn-icon" title="Edit Task">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                </button>
                <button (click)="onDelete(task._id)" class="btn-icon delete-icon" title="Delete Task">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
              </div>
            </div>

            <p class="task-desc">{{ task.description || 'No description provided.' }}</p>

            <div class="task-card-footer">
              <span [class]="'badge badge-' + task.priority">{{ task.priority }}</span>
              <span class="category-pill">{{ task.category }}</span>
              <span class="due-date" *ngIf="task.dueDate">
                Due: {{ task.dueDate | date:'mediumDate' }}
              </span>
            </div>
          </div>
        </div>

        <ng-template #emptyState>
          <div class="card empty-tasks-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 11l3 3L22 4"></path><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>
            <h3>No tasks match your criteria</h3>
            <p>Try clearing your filters or create a new task to continue building consistency.</p>
            <button (click)="openCreateModal()" class="btn btn-primary">Create Task</button>
          </div>
        </ng-template>
      </section>

      <!-- Task Modal (Create & Edit) -->
      <div class="modal-backdrop" *ngIf="showModal" (click)="closeModal()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <h3 class="modal-title">{{ isEditMode ? 'Edit Task' : 'Create New Task' }}</h3>
          
          <form (submit)="saveTask()" class="modal-form">
            <div class="form-group">
              <label>Task Title *</label>
              <input type="text" [(ngModel)]="modalTask.title" name="title" required placeholder="e.g. Code 1 hour of Angular" />
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
                <label>Category</label>
                <input type="text" [(ngModel)]="modalTask.category" name="category" placeholder="e.g. coding, personal, fitness" />
              </div>
            </div>

            <div class="form-group">
              <label>Due Date</label>
              <input type="date" [(ngModel)]="modalTask.dueDate" name="dueDate" />
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
      min-width: 250px;
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
      min-width: 150px;
    }

    /* Tasks Grid */
    .tasks-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: 1.5rem;
    }

    .task-card {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding: 1.5rem;
      min-height: 180px;
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
    }

    .delete-icon:hover {
      color: var(--danger);
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

    .task-card-footer {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.75rem;
      border-top: 1px solid var(--border);
      padding-top: 0.75rem;
      margin-top: auto;
    }

    .category-pill {
      background: var(--surface-hover);
      border: 1px solid var(--border);
      color: var(--text-secondary);
      border-radius: 4px;
      padding: 0.125rem 0.5rem;
      text-transform: capitalize;
    }

    .due-date {
      color: var(--text-muted);
      margin-left: auto;
    }

    /* Checkbox styling */
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
    }

    .checkbox-container .checkmark:after {
      left: 6px;
      top: 3px;
      width: 4px;
      height: 8px;
      border: solid var(--background);
      border-width: 0 2px 2px 0;
      transform: rotate(45deg);
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

    @media (max-width: 768px) {
      .tasks-grid {
        grid-template-columns: 1fr;
      }
      .tasks-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 1rem;
        width: 100%;
      }
      .tasks-header button {
        width: 100%;
      }
      .form-row {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class TasksComponent implements OnInit {
  private taskService = inject(TaskService);
  private route = inject(ActivatedRoute);

  public allTasks: Task[] = [];
  public filteredTasks: Task[] = [];
  public uniqueCategories: string[] = [];

  // Filter models
  public filterSearch = '';
  public filterStatus = 'all';
  public filterPriority = 'all';
  public filterCategory = 'all';

  // Modal control
  public showModal = false;
  public isEditMode = false;
  public modalTask: Partial<Task> = this.resetModalTask();
  private activeEditingId: string | null = null;

  ngOnInit() {
    this.loadTasks();

    // Check if query params have create=true (triggered by Command Palette)
    this.route.queryParams.subscribe((params: any) => {
      if (params['create'] === 'true') {
        this.openCreateModal();
      }
    });
  }

  private loadTasks() {
    this.taskService.getTasks().subscribe((response: any) => {
      if (response.success) {
        this.allTasks = response.tasks;
        this.extractCategories();
        this.applyFilters();
      }
    });
  }

  private extractCategories() {
    const cats = this.allTasks.map(t => t.category.toLowerCase().trim());
    this.uniqueCategories = Array.from(new Set(cats)).filter(c => c !== 'general' && c !== '');
  }

  public applyFilters() {
    this.filteredTasks = this.allTasks.filter(task => {
      // Search filter
      const matchesSearch = !this.filterSearch ||
        task.title.toLowerCase().includes(this.filterSearch.toLowerCase()) ||
        task.description.toLowerCase().includes(this.filterSearch.toLowerCase());

      // Status filter
      let matchesStatus = true;
      if (this.filterStatus === 'pending') matchesStatus = !task.completed;
      if (this.filterStatus === 'completed') matchesStatus = task.completed;

      // Priority filter
      const matchesPriority = this.filterPriority === 'all' || task.priority === this.filterPriority;

      // Category filter
      const matchesCategory = this.filterCategory === 'all' || task.category.toLowerCase().trim() === this.filterCategory.toLowerCase().trim();

      return matchesSearch && matchesStatus && matchesPriority && matchesCategory;
    });
  }

  private resetModalTask(): Partial<Task> {
    return {
      title: '',
      description: '',
      priority: 'medium',
      category: 'general',
      dueDate: ''
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
    
    // Copy task properties
    this.modalTask = {
      title: task.title,
      description: task.description,
      priority: task.priority,
      category: task.category,
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ''
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
        }
      });
    } else {
      this.taskService.createTask(this.modalTask).subscribe((response: any) => {
        if (response.success) {
          this.loadTasks();
          this.closeModal();
        }
      });
    }
  }

  public onComplete(task: Task) {
    if (task.completed) return;
    
    this.taskService.completeTask(task._id).subscribe((response: any) => {
      if (response.success) {
        task.completed = true;
        task.completedAt = response.task.completedAt;
        this.applyFilters();
      }
    });
  }

  public onDelete(id: string) {
    if (confirm('Are you sure you want to delete this task?')) {
      this.taskService.deleteTask(id).subscribe((response: any) => {
        if (response.success) {
          this.loadTasks();
        }
      });
    }
  }
}
