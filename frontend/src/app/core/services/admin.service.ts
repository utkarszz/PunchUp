import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AdminUser {
  _id: string;
  googleId?: string | null;
  displayName: string;
  username: string;
  email: string;
  profilePicture: string;
  bio: string;
  role: 'user' | 'admin';
  isOnboarded: boolean;
  isBanned: boolean;
  banReason?: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/api/admin`;

  getUsers(): Observable<{ success: boolean; count: number; users: AdminUser[] }> {
    return this.http.get<{ success: boolean; count: number; users: AdminUser[] }>(`${this.baseUrl}/users`);
  }

  deleteUser(userId: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.baseUrl}/users/${userId}`);
  }

  banUser(userId: string, reason: string): Observable<{ success: boolean; message: string; user: AdminUser }> {
    return this.http.post<{ success: boolean; message: string; user: AdminUser }>(`${this.baseUrl}/users/${userId}/ban`, { reason });
  }

  unbanUser(userId: string): Observable<{ success: boolean; message: string; user: AdminUser }> {
    return this.http.post<{ success: boolean; message: string; user: AdminUser }>(`${this.baseUrl}/users/${userId}/unban`, {});
  }
}
