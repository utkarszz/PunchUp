import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminService, AdminUser } from '../../core/services/admin.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="admin-container animate-fade-in">
      <header class="admin-header">
        <div>
          <h1>Administration Panel</h1>
          <p class="subtitle">Manage users, view full profiles, ban or delete accounts.</p>
        </div>
      </header>

      <!-- Stats Overview -->
      <section class="admin-stats-grid">
        <div class="card stat-card">
          <span class="stat-label">Total Users</span>
          <span class="stat-value">{{ users.length }}</span>
        </div>
        <div class="card stat-card">
          <span class="stat-label">Banned Users</span>
          <span class="stat-value text-danger">{{ getBannedCount() }}</span>
        </div>
        <div class="card stat-card">
          <span class="stat-label">Admins</span>
          <span class="stat-value text-accent">{{ getAdminCount() }}</span>
        </div>
      </section>

      <!-- Main User Management Section -->
      <section class="card admin-table-card">
        <div class="table-header">
          <h2>User Accounts</h2>
          <div class="search-bar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input type="text" [(ngModel)]="searchQuery" placeholder="Search by username, name, or email..." />
          </div>
        </div>

        <div class="table-responsive">
          <table class="admin-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Joined</th>
                <th>Role</th>
                <th>Status</th>
                <th class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let u of filteredUsers()" [class.row-banned]="u.isBanned">
                <td>
                  <div class="user-cell">
                    <img [src]="u.profilePicture || 'assets/default-avatar.png'" 
                         onerror="this.src='https://api.dicebear.com/7.x/bottts/svg?seed=' + u.username" 
                         alt="Avatar" class="avatar" />
                    <div class="user-info">
                      <span class="display-name">{{ u.displayName || u.username }}</span>
                      <span class="username">&#64;{{ u.username }}</span>
                    </div>
                  </div>
                </td>
                <td class="email-cell">{{ u.email }}</td>
                <td>{{ u.createdAt | date:'mediumDate' }}</td>
                <td>
                  <span class="badge" [class.badge-admin]="u.role === 'admin'" [class.badge-user]="u.role !== 'admin'">
                    {{ u.role }}
                  </span>
                </td>
                <td>
                  <span class="badge" [class.badge-banned]="u.isBanned" [class.badge-active]="!u.isBanned">
                    {{ u.isBanned ? 'Banned' : 'Active' }}
                  </span>
                </td>
                <td class="text-right">
                  <div class="action-buttons">
                    <button *ngIf="!u.isBanned" (click)="openBanModal(u)" class="btn btn-warning btn-sm">
                      Ban
                    </button>
                    <button *ngIf="u.isBanned" (click)="onUnban(u)" class="btn btn-success btn-sm">
                      Unban
                    </button>
                    <button (click)="confirmDelete(u)" class="btn btn-danger btn-sm">
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
              <tr *ngIf="filteredUsers().length === 0">
                <td colspan="6" class="empty-row">No users found matching query.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Ban Reason Modal -->
      <div class="modal-overlay" *ngIf="showBanModal">
        <div class="modal-card animate-slide-up">
          <h3>Ban Account</h3>
          <p class="modal-subtitle">Provide a proper reasoning to ban <strong>&#64;{{ selectedUser?.username }}</strong>.</p>
          
          <div class="form-group">
            <label for="banReason">Reason for Ban</label>
            <textarea id="banReason" [(ngModel)]="banReason" rows="3" placeholder="e.g. Violation of community guidelines, spamming..."></textarea>
          </div>

          <div class="modal-actions">
            <button (click)="closeBanModal()" class="btn btn-secondary">Cancel</button>
            <button (click)="onBanSubmit()" class="btn btn-danger" [disabled]="!banReason.trim()">Ban Account</button>
          </div>
        </div>
      </div>

      <!-- Delete Confirmation Modal -->
      <div class="modal-overlay" *ngIf="showDeleteModal">
        <div class="modal-card animate-slide-up">
          <h3 class="text-danger">Permanently Delete Account?</h3>
          <p class="modal-subtitle">
            Are you sure you want to permanently delete <strong>&#64;{{ selectedUser?.username }}</strong>? 
            This action is irreversible and will delete all their tasks, streaks, posts, comments, and relationships.
          </p>

          <div class="modal-actions">
            <button (click)="closeDeleteModal()" class="btn btn-secondary">Cancel</button>
            <button (click)="onDeleteSubmit()" class="btn btn-danger">Delete Permanently</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .admin-container {
      padding: 2.5rem;
      display: flex;
      flex-direction: column;
      gap: 2rem;
      max-width: 1200px;
      margin: 0 auto;
      width: 100%;
    }

    .admin-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .subtitle {
      font-size: 0.9rem;
      color: var(--text-secondary);
      margin-top: 0.25rem;
    }

    /* Stats */
    .admin-stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1.5rem;
    }

    .stat-card {
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .stat-label {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .stat-value {
      font-size: 2rem;
      font-weight: 700;
      color: var(--text-primary);
      font-family: var(--font-display);
    }

    /* Table Card */
    .admin-table-card {
      padding: 0;
      overflow: hidden;
    }

    .table-header {
      padding: 1.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--border);
      gap: 1rem;
      flex-wrap: wrap;
    }

    .table-header h2 {
      font-size: 1.1rem;
      font-weight: 600;
    }

    .search-bar {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 0.5rem 0.75rem;
      max-width: 350px;
      width: 100%;
    }

    .search-bar input {
      background: transparent;
      border: none;
      color: var(--text-primary);
      font-size: 0.85rem;
      width: 100%;
      outline: none;
    }

    .table-responsive {
      width: 100%;
      overflow-x: auto;
    }

    .admin-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 0.875rem;
    }

    .admin-table th, .admin-table td {
      padding: 1rem 1.5rem;
      border-bottom: 1px solid var(--border);
    }

    .admin-table th {
      background: rgba(255, 255, 255, 0.01);
      font-weight: 600;
      color: var(--text-muted);
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .row-banned {
      background: rgba(239, 68, 68, 0.02);
    }

    .user-cell {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      object-fit: cover;
      border: 1px solid var(--border);
    }

    .user-info {
      display: flex;
      flex-direction: column;
    }

    .display-name {
      font-weight: 600;
      color: var(--text-primary);
    }

    .username {
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .email-cell {
      font-family: monospace;
      color: var(--text-secondary);
    }

    .badge {
      font-size: 0.7rem;
      font-weight: 600;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      text-transform: uppercase;
    }

    .badge-admin { background: rgba(139, 92, 246, 0.1); color: #8b5cf6; }
    .badge-user { background: rgba(255, 255, 255, 0.05); color: var(--text-secondary); }
    
    .badge-active { background: rgba(16, 185, 129, 0.1); color: #10b981; }
    .badge-banned { background: rgba(239, 68, 68, 0.1); color: #ef4444; }

    .action-buttons {
      display: flex;
      gap: 0.5rem;
      justify-content: flex-end;
    }

    .empty-row {
      text-align: center;
      color: var(--text-muted);
      padding: 3rem !important;
    }

    /* Modals */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(4px);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .modal-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 2rem;
      max-width: 480px;
      width: 90%;
      box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5);
    }

    .modal-card h3 {
      font-size: 1.25rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
    }

    .modal-subtitle {
      font-size: 0.875rem;
      color: var(--text-secondary);
      line-height: 1.5;
      margin-bottom: 1.5rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      margin-bottom: 1.5rem;
    }

    .form-group label {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
    }

    .form-group textarea {
      background: rgba(0,0,0,0.2);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 0.75rem;
      color: var(--text-primary);
      font-size: 0.875rem;
      outline: none;
      resize: vertical;
    }

    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
    }

    @media (max-width: 768px) {
      .admin-container {
        padding: 1.25rem 1rem;
      }

      .admin-stats-grid {
        grid-template-columns: 1fr;
        gap: 1rem;
      }
    }
  `]
})
export class AdminComponent implements OnInit {
  private adminService = inject(AdminService);
  private toastService = inject(ToastService);

  users: AdminUser[] = [];
  searchQuery = '';

  // Modal State
  showBanModal = false;
  showDeleteModal = false;
  selectedUser: AdminUser | null = null;
  banReason = '';

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.adminService.getUsers().subscribe({
      next: res => {
        if (res.success) {
          this.users = res.users;
        }
      },
      error: err => {
        this.toastService.showError('Failed to load users');
      }
    });
  }

  getBannedCount() {
    return this.users.filter(u => u.isBanned).length;
  }

  getAdminCount() {
    return this.users.filter(u => u.role === 'admin').length;
  }

  filteredUsers() {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) return this.users;
    return this.users.filter(u => 
      u.username.toLowerCase().includes(q) ||
      u.displayName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    );
  }

  // Ban
  openBanModal(user: AdminUser) {
    this.selectedUser = user;
    this.banReason = '';
    this.showBanModal = true;
  }

  closeBanModal() {
    this.showBanModal = false;
    this.selectedUser = null;
  }

  onBanSubmit() {
    if (!this.selectedUser || !this.banReason.trim()) return;
    this.adminService.banUser(this.selectedUser._id, this.banReason).subscribe({
      next: res => {
        if (res.success) {
          this.toastService.showSuccess(`Successfully banned @${this.selectedUser?.username}`);
          this.loadUsers();
          this.closeBanModal();
        }
      },
      error: err => {
        this.toastService.showError('Failed to ban user');
      }
    });
  }

  onUnban(user: AdminUser) {
    this.adminService.unbanUser(user._id).subscribe({
      next: res => {
        if (res.success) {
          this.toastService.showSuccess(`Successfully unbanned @${user.username}`);
          this.loadUsers();
        }
      },
      error: err => {
        this.toastService.showError('Failed to unban user');
      }
    });
  }

  // Delete
  confirmDelete(user: AdminUser) {
    this.selectedUser = user;
    this.showDeleteModal = true;
  }

  closeDeleteModal() {
    this.showDeleteModal = false;
    this.selectedUser = null;
  }

  onDeleteSubmit() {
    if (!this.selectedUser) return;
    this.adminService.deleteUser(this.selectedUser._id).subscribe({
      next: res => {
        if (res.success) {
          this.toastService.showSuccess(`Successfully deleted @${this.selectedUser?.username}`);
          this.loadUsers();
          this.closeDeleteModal();
        }
      },
      error: err => {
        this.toastService.showError('Failed to delete user');
      }
    });
  }
}
