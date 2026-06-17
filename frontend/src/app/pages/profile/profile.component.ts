import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService, UserProfile } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';
import { UploadService } from '../../core/services/upload.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="profile-page-container">
      <header class="profile-header">
        <h1>Profile Settings</h1>
        <p class="subtitle">Update your personal space, profile picture, and workspace bio.</p>
      </header>

      <div class="profile-layout-grid" *ngIf="user">
        <!-- Sidebar profile picture -->
        <div class="card avatar-card">
          <h3>Profile Picture</h3>
          <div class="avatar-wrapper">
            <img 
              [src]="user.profilePicture || 'assets/default-avatar.png'" 
              onerror="this.src='https://api.dicebear.com/7.x/bottts/svg?seed=' + encodeURIComponent(this.title)"
              [title]="user.username"
              alt="Avatar" 
              class="profile-avatar" />
            <div class="upload-overlay" (click)="fileInput.click()">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
              <span>Upload Picture</span>
            </div>
          </div>
          <input 
            #fileInput 
            type="file" 
            accept="image/*" 
            style="display: none" 
            (change)="onFileSelected($event)" />
          
          <p class="upload-hint" *ngIf="!isUploading">Supported format: JPG, PNG. Max 5MB.</p>
          <div class="loading-spinner" *ngIf="isUploading">Uploading to Cloudinary...</div>
          
          <div class="public-link-box" *ngIf="user._id">
            <label>Public Profile Link</label>
            <div class="copy-row">
              <input type="text" readonly [value]="getPublicUrl()" class="copy-input" />
              <button (click)="copyPublicUrl()" class="btn btn-secondary btn-sm">{{ copyText }}</button>
            </div>
          </div>
        </div>

        <!-- Edit Form -->
        <div class="card form-card">
          <h3>Edit Details</h3>
          <p class="section-desc">These details will show up on your workspace public profile.</p>

          <form (submit)="onSaveProfile()" class="profile-form">
            <div class="form-group">
              <label>Username</label>
              <input type="text" [(ngModel)]="username" name="username" required placeholder="e.g. utkarzz" />
            </div>

            <div class="form-group">
              <label>Email Address (read-only)</label>
              <input type="email" [value]="user.email" disabled class="disabled-input" />
            </div>

            <div class="form-group">
              <label>Biography</label>
              <textarea [(ngModel)]="bio" name="bio" rows="4" placeholder="Tell the community what you are working on or tracking..."></textarea>
            </div>

            <div class="form-actions">
              <div class="save-status" *ngIf="saveStatus" [class.success]="saveStatus === 'success'">
                {{ saveStatus === 'success' ? 'Profile saved successfully!' : (serverErrorMessage || 'Failed to save profile.') }}
              </div>
              <button type="submit" [disabled]="isSaving" class="btn btn-primary">
                {{ isSaving ? 'Saving Changes...' : 'Save Settings' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .profile-page-container {
      padding: 2.5rem;
      display: flex;
      flex-direction: column;
      gap: 2rem;
      max-width: 1200px;
      margin: 0 auto;
      width: 100%;
    }

    .profile-header {
      margin-bottom: 0.5rem;
    }

    .subtitle {
      font-size: 0.9rem;
      color: var(--text-secondary);
      margin-top: 0.25rem;
    }

    /* Layout Grid */
    .profile-layout-grid {
      display: grid;
      grid-template-columns: 320px 1fr;
      gap: 1.5rem;
      align-items: start;
    }

    /* Avatar Card */
    .avatar-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 1.25rem;
    }

    .avatar-wrapper {
      position: relative;
      width: 130px;
      height: 130px;
      border-radius: 50%;
      overflow: hidden;
      border: 2px solid var(--border);
      cursor: pointer;
      box-shadow: var(--shadow-md);
    }

    .profile-avatar {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform var(--transition-fast);
    }

    .upload-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(9, 9, 11, 0.75);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.25rem;
      font-size: 0.6875rem;
      color: var(--text-primary);
      opacity: 0;
      transition: opacity var(--transition-fast);
    }

    .avatar-wrapper:hover .upload-overlay {
      opacity: 1;
    }

    .avatar-wrapper:hover .profile-avatar {
      transform: scale(1.05);
    }

    .upload-hint {
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .loading-spinner {
      font-size: 0.75rem;
      color: var(--accent);
      font-weight: 500;
    }

    .public-link-box {
      width: 100%;
      text-align: left;
      border-top: 1px solid var(--border);
      padding-top: 1.25rem;
      margin-top: 0.5rem;
    }

    .copy-row {
      display: flex;
      gap: 0.5rem;
      margin-top: 0.25rem;
    }

    .copy-input {
      flex: 1;
      padding: 0.5rem;
      font-size: 0.75rem;
      color: var(--text-secondary);
      background: rgba(9, 9, 11, 0.4);
    }

    /* Form Card */
    .form-card {
      padding: 2rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .section-desc {
      font-size: 0.8125rem;
      color: var(--text-secondary);
      border-bottom: 1px solid var(--border);
      padding-bottom: 0.85rem;
      margin-top: -0.5rem;
    }

    .profile-form {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
    }

    .disabled-input {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .form-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid var(--border);
      padding-top: 1.5rem;
    }

    .save-status {
      font-size: 0.8125rem;
      color: var(--danger);
    }

    .save-status.success {
      color: var(--success);
    }

    @media (max-width: 768px) {
      .profile-page-container {
        padding: 1.25rem 1rem;
        padding-bottom: calc(var(--mobile-nav-height) + 1.25rem);
        gap: 1.5rem;
      }

      .profile-layout-grid {
        grid-template-columns: 1fr;
      }

      .form-card {
        padding: 1.5rem;
      }

      .profile-form {
        gap: 1.25rem;
      }

      .form-actions {
        flex-direction: column;
        align-items: stretch;
        gap: 0.75rem;
      }

      .form-actions button {
        width: 100%;
      }
    }

    @media (max-width: 480px) {
      .profile-page-container {
        padding: 1rem 0.875rem;
        padding-bottom: calc(var(--mobile-nav-height) + 1rem);
        gap: 1.25rem;
      }

      .profile-page-container h1 {
        font-size: 1.375rem;
      }

      .subtitle {
        font-size: 0.8125rem;
      }

      .avatar-card {
        padding: 1.25rem;
      }

      .avatar-wrapper {
        width: 110px;
        height: 110px;
      }

      .form-card {
        padding: 1.25rem;
        gap: 1rem;
      }

      .copy-row {
        flex-direction: column;
        gap: 0.5rem;
      }

      .copy-row button {
        width: 100%;
      }
    }

    @media (max-width: 360px) {
      .profile-page-container {
        padding: 0.875rem 0.75rem;
        padding-bottom: calc(var(--mobile-nav-height) + 0.875rem);
      }

      .profile-page-container h1 {
        font-size: 1.25rem;
      }

      .avatar-wrapper {
        width: 96px;
        height: 96px;
      }

      .form-card {
        padding: 1rem;
      }
    }
  `]

})
export class ProfileComponent implements OnInit {
  private authService = inject(AuthService);
  private userService = inject(UserService);
  private uploadService = inject(UploadService);

  public user: UserProfile | null = null;
  public username = '';
  public bio = '';

  public isSaving = false;
  public isUploading = false;
  public saveStatus: 'success' | 'error' | null = null;
  public serverErrorMessage = '';
  public copyText = 'Copy';

  ngOnInit() {
    this.authService.currentUser$.subscribe(currentUser => {
      if (currentUser) {
        this.user = currentUser;
        this.username = currentUser.username || '';
        this.bio = currentUser.bio || '';
      }
    });
  }

  public getPublicUrl(): string {
    if (!this.user) return '';
    return `${window.location.origin}/user/${this.user._id}`;
  }

  public copyPublicUrl() {
    const url = this.getPublicUrl();
    if (url) {
      navigator.clipboard.writeText(url).then(() => {
        this.copyText = 'Copied!';
        setTimeout(() => {
          this.copyText = 'Copy';
        }, 2000);
      });
    }
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
            // Update auth state so components refresh
            const updatedUser = { ...this.user!, profilePicture: response.imageUrl };
            this.authService.updateProfileLocally(updatedUser);
            this.saveStatus = 'success';
            setTimeout(() => this.saveStatus = null, 3000);
          }
        },
        error: () => {
          this.isUploading = false;
          this.saveStatus = 'error';
          setTimeout(() => this.saveStatus = null, 3000);
        }
      });
    }
  }

  public onSaveProfile() {
    if (!this.username) return;

    this.isSaving = true;
    this.saveStatus = null;
    this.serverErrorMessage = '';

    this.userService.updateProfile(this.username, this.bio).subscribe({
      next: response => {
        this.isSaving = false;
        if (response.success && response.user) {
          // Sync changes local
          const updatedUser = { 
            ...this.user!, 
            username: response.user.username, 
            bio: response.user.bio 
          };
          this.authService.updateProfileLocally(updatedUser);
          this.saveStatus = 'success';
          setTimeout(() => this.saveStatus = null, 3000);
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

  encodeURIComponent(val: string): string {
    return encodeURIComponent(val || 'user');
  }
}
