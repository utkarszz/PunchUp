import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Task } from './task.service';

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

export interface AdminStudyTimeUser {
  userId: string;
  username: string;
  displayName: string;
  email: string;
  profilePicture?: string;
  role: 'user' | 'admin';
  todayDuration: number;
  todayFormatted: string;
  weeklyDuration: number;
  weeklyFormatted: string;
  overallDuration: number;
  overallFormatted: string;
}

export interface StudyTimePagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasPrevPage: boolean;
  hasNextPage: boolean;
}

export interface AdminStudyTimeResponse {
  success: boolean;
  users: AdminStudyTimeUser[];
  pagination: StudyTimePagination;
  timeZone: string;
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

  getStudyTime(params: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    timeZone?: string;
  } = {}): Observable<AdminStudyTimeResponse> {
    const queryParts: string[] = [];
    if (params.page) queryParts.push(`page=${params.page}`);
    if (params.limit) queryParts.push(`limit=${params.limit}`);
    if (params.search) queryParts.push(`search=${encodeURIComponent(params.search)}`);
    if (params.sortBy) queryParts.push(`sortBy=${params.sortBy}`);
    if (params.sortOrder) queryParts.push(`sortOrder=${params.sortOrder}`);
    if (params.timeZone) queryParts.push(`timeZone=${encodeURIComponent(params.timeZone)}`);

    const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
    return this.http.get<AdminStudyTimeResponse>(`${this.baseUrl}/study-time${queryString}`);
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

  getUserTasks(userId: string): Observable<{ success: boolean; tasks: Task[]; streak?: any }> {
    return this.http.get<{ success: boolean; tasks: Task[]; streak?: any }>(`${this.baseUrl}/users/${userId}/tasks`);
  }
}
