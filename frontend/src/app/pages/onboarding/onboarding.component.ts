import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, UserProfile } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';
import { UploadService } from '../../core/services/upload.service';
import { Subject, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="onboarding-page animate-fade-in">
      <div class="onboarding-glow"></div>
      
      <div class="onboarding-card card animate-slide-up">
        <!-- Logo -->
        <div class="logo">
          <img src="assets/logo.png" alt="PunchUp" class="logo-img" />
          <span class="logo-text">PunchUp <span class="logo-v1">V2</span></span>
        </div>

        <div class="header-text">
          <h2>Create Your Profile</h2>
          <p>Welcome! Let's set up your identity on PunchUp before you jump in.</p>
        </div>

        <form (submit)="onCompleteOnboarding()" class="onboarding-form">
          
          <!-- Profile Picture -->
          <div class="form-group avatar-group">
            <div class="avatar-edit-wrapper">
              <img
                [src]="profilePictureUrl || 'assets/default-avatar.png'"
                onerror="this.src='https://api.dicebear.com/7.x/bottts/svg?seed=user'"
                alt="Avatar"
                class="onboarding-avatar"
              />
              <button type="button" class="avatar-upload-btn" (click)="fileInput.click()" [disabled]="isUploading" title="Upload Photo">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
              </button>
              <input #fileInput type="file" accept="image/*" style="display:none" (change)="onFileSelected($event)" />
              
              <button *ngIf="profilePictureUrl"
                      type="button"
                      class="avatar-remove-btn"
                      (click)="removeProfilePicture()"
                      title="Remove Photo">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <span class="avatar-label">Choose a profile picture</span>
          </div>

          <!-- Display Name -->
          <div class="form-group">
            <label for="displayName">Display Name</label>
            <input 
              id="displayName" 
              type="text" 
              [(ngModel)]="displayName" 
              name="displayName" 
              placeholder="e.g. Utkarsh Singh" 
              required
            />
          </div>

          <!-- Username -->
          <div class="form-group">
            <label for="username">Username</label>
            <div class="input-wrapper">
              <span class="username-prefix">&#64;</span>
              <input 
                id="username" 
                type="text" 
                [(ngModel)]="username" 
                name="username" 
                (ngModelChange)="onUsernameChange()"
                placeholder="username" 
                required
              />
              <!-- Inline Status Indicator -->
              <div class="status-indicator">
                <div class="spinner-small" *ngIf="isCheckingUsername"></div>
                <svg class="success-icon" *ngIf="!isCheckingUsername && username && isUsernameValid" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                <svg class="error-icon" *ngIf="!isCheckingUsername && username && !isUsernameValid" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </div>
            </div>
            <p class="error-text" *ngIf="usernameError">{{ usernameError }}</p>
            <p class="success-text" *ngIf="!isCheckingUsername && username && isUsernameValid">Username is available</p>
          </div>

          <!-- Biography -->
          <div class="form-group">
            <label for="bio">Biography</label>
            <textarea 
              id="bio" 
              [(ngModel)]="bio" 
              name="bio" 
              rows="3" 
              placeholder="What are you currently building or working on?"
            ></textarea>
          </div>

          <!-- Submit Actions -->
          <div class="form-actions">
            <p class="form-error" *ngIf="formError">{{ formError }}</p>
            <button type="submit" class="btn btn-primary submit-btn" [disabled]="isSaving || !isUsernameValid || isCheckingUsername">
              {{ isSaving ? 'Finalizing Profile...' : 'Complete Profile Setup' }}
            </button>
          </div>

        </form>
      </div>

      <!-- Upload status overlay -->
      <div class="upload-toast animate-fade-in" *ngIf="isUploading">
        <div class="spinner-small"></div>
        <span>Uploading avatar...</span>
      </div>
    </div>
  `,
  styles: [`
    .onboarding-page {
      position: relative;
      background-color: var(--background);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2.5rem 1.5rem;
      overflow: hidden;
    }

    .onboarding-glow {
      position: absolute;
      top: 10%;
      left: 50%;
      transform: translateX(-50%);
      width: 500px;
      height: 500px;
      background: radial-gradient(circle, rgba(199, 199, 204, 0.08) 0%, transparent 70%);
      pointer-events: none;
      z-index: 1;
    }

    .onboarding-card {
      position: relative;
      z-index: 2;
      width: 100%;
      max-width: 480px;
      padding: 3rem 2.5rem;
      display: flex;
      flex-direction: column;
      gap: 2rem;
      background: rgba(18, 18, 18, 0.4);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-xl);
    }

    .logo {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      font-family: var(--font-display);
      font-weight: 700;
      font-size: 1.35rem;
      color: var(--text-primary);
    }

    .logo-img {
      width: 28px;
      height: 28px;
      object-fit: contain;
    }

    .logo-v1 {
      color: var(--text-muted);
      font-size: 0.8em;
      font-weight: 500;
    }

    .header-text {
      text-align: center;
    }

    .header-text h2 {
      font-size: 1.5rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
      color: var(--text-primary);
      letter-spacing: -0.01em;
    }

    .header-text p {
      font-size: 0.875rem;
      color: var(--text-secondary);
      line-height: 1.5;
    }

    .onboarding-form {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      text-align: left;
    }

    /* Avatar specific styles */
    .avatar-group {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 0.5rem;
    }

    .avatar-edit-wrapper {
      position: relative;
      width: 96px;
      height: 96px;
    }

    .onboarding-avatar {
      width: 96px;
      height: 96px;
      border-radius: 50%;
      border: 2px solid var(--border-hover);
      object-fit: cover;
    }

    .avatar-upload-btn {
      position: absolute;
      bottom: 0;
      right: 0;
      width: 28px;
      height: 28px;
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
      width: 28px;
      height: 28px;
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

    .avatar-label {
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    /* Form Fields */
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .form-group label {
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--text-secondary);
    }

    .input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
      width: 100%;
    }

    .username-prefix {
      position: absolute;
      left: 1rem;
      font-size: 0.95rem;
      color: var(--text-muted);
      pointer-events: none;
    }

    .input-wrapper input {
      padding-left: 2rem;
      padding-right: 2.5rem;
    }

    .status-indicator {
      position: absolute;
      right: 1rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .spinner-small {
      width: 16px;
      height: 16px;
      border: 2px solid var(--border);
      border-top-color: var(--text-primary);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    .success-icon {
      color: var(--success);
    }

    .error-icon {
      color: var(--danger);
    }

    .error-text {
      font-size: 0.75rem;
      color: var(--danger);
      margin: 0;
    }

    .success-text {
      font-size: 0.75rem;
      color: var(--success);
      margin: 0;
    }

    .form-error {
      font-size: 0.875rem;
      color: var(--danger);
      background: rgba(239, 68, 68, 0.06);
      border: 1px solid rgba(239, 68, 68, 0.15);
      border-radius: var(--radius);
      padding: 0.6rem 1rem;
      width: 100%;
    }

    .submit-btn {
      width: 100%;
      padding: 0.85rem;
      font-weight: 600;
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .submit-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .upload-toast {
      position: fixed;
      bottom: 2rem;
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
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    @media (max-width: 576px) {
      .onboarding-card {
        padding: 2rem 1.5rem;
        gap: 1.5rem;
      }
    }
  `]
})
export class OnboardingComponent implements OnInit {
  private authService = inject(AuthService);
  private userService = inject(UserService);
  private uploadService = inject(UploadService);
  private router = inject(Router);

  public user: UserProfile | null = null;

  public displayName = '';
  public username = '';
  public bio = '';
  public profilePictureUrl = '';

  public isUploading = false;
  public isSaving = false;
  public isCheckingUsername = false;
  public isUsernameValid = false;
  public usernameError = '';
  public formError = '';

  private usernameChanged$ = new Subject<string>();

  ngOnInit() {
    // If not authenticated, guard handles redirect, but check just in case
    this.authService.currentUser$.subscribe(u => {
      if (u) {
        this.user = u;
        
        // If they are already onboarded, redirect out
        if (u.isOnboarded) {
          this.router.navigate(['/dashboard']);
          return;
        }

        // Initialize values from Google OAuth data if not already set
        this.displayName = this.displayName || u.displayName || '';
        this.username = this.username || u.username || '';
        this.profilePictureUrl = this.profilePictureUrl || u.profilePicture || '';
        this.bio = this.bio || u.bio || '';
        
        // Validate Google-generated username initially
        if (this.username) {
          this.checkUsernameAvailability(this.username);
        }
      }
    });

    // Handle username typing checks
    this.usernameChanged$.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      switchMap(username => {
        const trimmed = username.trim().toLowerCase();
        if (!trimmed) {
          this.isUsernameValid = false;
          this.usernameError = 'Username is required.';
          this.isCheckingUsername = false;
          return of(null);
        }
        if (trimmed.length < 3 || trimmed.length > 20) {
          this.isUsernameValid = false;
          this.usernameError = 'Username must be between 3 and 20 characters.';
          this.isCheckingUsername = false;
          return of(null);
        }
        if (!/^[a-z0-9_]+$/.test(trimmed)) {
          this.isUsernameValid = false;
          this.usernameError = 'Username must contain only lowercase letters, numbers, and underscores.';
          this.isCheckingUsername = false;
          return of(null);
        }
        this.isCheckingUsername = true;
        this.usernameError = '';
        return this.userService.checkUsername(trimmed);
      })
    ).subscribe({
      next: res => {
        this.isCheckingUsername = false;
        if (!res) return;
        
        if (res.available) {
          this.isUsernameValid = true;
          this.usernameError = '';
        } else {
          // If it matches their existing username, allow it
          if (this.user && this.username.trim().toLowerCase() === this.user.username.toLowerCase()) {
            this.isUsernameValid = true;
            this.usernameError = '';
          } else {
            this.isUsernameValid = false;
            this.usernameError = 'Username is already taken.';
          }
        }
      },
      error: () => {
        this.isCheckingUsername = false;
        this.isUsernameValid = false;
        this.usernameError = 'Could not verify username availability.';
      }
    });
  }

  public onUsernameChange() {
    this.usernameError = '';
    this.isUsernameValid = false;
    const trimmed = this.username.trim().toLowerCase();
    if (trimmed) {
      this.isCheckingUsername = true;
    }
    this.usernameChanged$.next(this.username);
  }

  private checkUsernameAvailability(username: string) {
    this.isCheckingUsername = true;
    this.usernameError = '';
    this.userService.checkUsername(username.toLowerCase()).subscribe({
      next: res => {
        this.isCheckingUsername = false;
        if (res.available || (this.user && username.toLowerCase() === this.user.username.toLowerCase())) {
          this.isUsernameValid = true;
          this.usernameError = '';
        } else {
          this.isUsernameValid = false;
          this.usernameError = 'Username is already taken.';
        }
      },
      error: () => {
        this.isCheckingUsername = false;
        this.isUsernameValid = false;
        this.usernameError = 'Could not verify username availability.';
      }
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
            this.profilePictureUrl = response.imageUrl;
          }
        },
        error: () => { 
          this.isUploading = false; 
          this.formError = 'Failed to upload image. Please try again.';
        }
      });
    }
  }

  public removeProfilePicture() {
    this.profilePictureUrl = '';
  }

  public onCompleteOnboarding() {
    if (!this.username || !this.displayName) {
      this.formError = 'Please fill out all required fields.';
      return;
    }

    if (!this.isUsernameValid || this.isCheckingUsername) {
      this.formError = 'Please choose a valid and available username.';
      return;
    }

    this.isSaving = true;
    this.formError = '';

    // Update profile in backend and set isOnboarded to true
    this.userService.updateProfile(
      this.username.trim().toLowerCase(),
      this.bio.trim(),
      this.displayName.trim(),
      this.profilePictureUrl || null,
      true
    ).subscribe({
      next: response => {
        this.isSaving = false;
        if (response.success && response.user) {
          // Update the locally stored user profile
          const updatedUser = { 
            ...this.user!, 
            displayName: response.user.displayName,
            username: response.user.username, 
            bio: response.user.bio,
            profilePicture: response.user.profilePicture,
            isOnboarded: true
          };
          this.authService.updateProfileLocally(updatedUser);
          
          // Redirect to dashboard
          this.router.navigate(['/dashboard']);
        }
      },
      error: err => {
        this.isSaving = false;
        this.formError = err.error?.message || 'Failed to complete profile onboarding.';
      }
    });
  }
}
