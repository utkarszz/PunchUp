import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { UserProfile } from './auth.service';

export interface UserProfileStats {
  currentStreak: number;
  longestStreak: number;
  totalTasksCompleted: number;
  posts: number;
  followers: number;
  following: number;
}

export interface PublicProfile {
  user: UserProfile;
  stats: UserProfileStats;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/api/users`;

  public updateProfile(username: string, bio: string, displayName?: string, profilePicture?: string | null, isOnboarded?: boolean): Observable<{ success: boolean; user: UserProfile }> {
    return this.http.put<{ success: boolean; user: UserProfile }>(`${this.baseUrl}/me`, { username, bio, displayName, profilePicture, isOnboarded });
  }

  public checkUsername(username: string): Observable<{ success: boolean; available: boolean }> {
    return this.http.get<{ success: boolean; available: boolean }>(`${this.baseUrl}/check-username/${username}`);
  }

  public deleteAccount(): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.baseUrl}/me`);
  }

  public getUserProfile(id: string): Observable<{ success: boolean; profile: PublicProfile }> {
    return this.http.get<{ success: boolean; profile: PublicProfile }>(`${this.baseUrl}/${id}`);
  }
}
