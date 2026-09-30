import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Task {
  _id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  category: string;
  dueDate?: string;
  completed: boolean;
  completedAt?: string;
  pointsAwarded?: boolean;
  user: string;
  createdAt: string;
  updatedAt: string;
}

export interface CompleteTaskResponse {
  success: boolean;
  message: string;
  task: Task;
  pointsAwarded?: number;
  newTotalPoints?: number;
  league?: string;
  alreadyCompleted?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class TaskService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/api/tasks`;

  public getTasks(): Observable<{ success: boolean; count: number; tasks: Task[] }> {
    return this.http.get<{ success: boolean; count: number; tasks: Task[] }>(this.baseUrl);
  }

  public createTask(task: Partial<Task>): Observable<{ success: boolean; task: Task }> {
    return this.http.post<{ success: boolean; task: Task }>(this.baseUrl, task);
  }

  public updateTask(id: string, task: Partial<Task>): Observable<{ success: boolean; task: Task }> {
    return this.http.put<{ success: boolean; task: Task }>(`${this.baseUrl}/${id}`, task);
  }

  public deleteTask(id: string, permanent = false): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.baseUrl}/${id}${permanent ? '?permanent=true' : ''}`);
  }

  public getArchivedTasks(): Observable<{ success: boolean; count: number; tasks: Task[] }> {
    return this.http.get<{ success: boolean; count: number; tasks: Task[] }>(`${this.baseUrl}/archived`);
  }

  public completeTask(id: string): Observable<CompleteTaskResponse> {
    return this.http.patch<CompleteTaskResponse>(`${this.baseUrl}/${id}/complete`, {});
  }
}
