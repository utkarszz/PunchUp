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
  user: string;
  createdAt: string;
  updatedAt: string;
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

  public deleteTask(id: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.baseUrl}/${id}`);
  }

  public completeTask(id: string): Observable<{ success: boolean; message: string; task: Task }> {
    return this.http.patch<{ success: boolean; message: string; task: Task }>(`${this.baseUrl}/${id}/complete`, {});
  }
}
