import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { UserProfile } from './auth.service';

export interface UserProfileStats {
  currentStreak: number;
  longestStreak: number;
  totalTasksCompleted: number;
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

  public updateProfile(username: string, bio: string): Observable<{ success: boolean; user: UserProfile }> {
    return this.http.put<{ success: boolean; user: UserProfile }>(`${this.baseUrl}/me`, { username, bio });
  }

  public getUserProfile(id: string): Observable<{ success: boolean; profile: PublicProfile }> {
    return this.http.get<{ success: boolean; profile: PublicProfile }>(`${this.baseUrl}/${id}`);
  }
}
