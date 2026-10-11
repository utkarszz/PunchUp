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
  reminderInterval?: number;
  reminderEnabled?: boolean;
  nextReminderAt?: string;
  lastReminderSentAt?: string;
  recurringTaskId?: string;
  recurrenceDate?: string;
  user: string;
  createdAt: string;
  updatedAt: string;
}

export interface RecurringSchedule {
  _id: string;
  user: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  category: string;
  creationTime: string;
  timeZone: string;
  startDate?: string;
  endDate?: string | null;
  reminderInterval?: number;
  isActive: boolean;
  nextRunAt?: string | null;
  lastGeneratedDate?: string | null;
  lastGeneratedAt?: string | null;
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

  public createTask(task: Partial<Task> & { isRecurring?: boolean; creationTime?: string; timeZone?: string; startDate?: string; endDate?: string }): Observable<{ success: boolean; task: Task; recurringSchedule?: RecurringSchedule }> {
    return this.http.post<{ success: boolean; task: Task; recurringSchedule?: RecurringSchedule }>(this.baseUrl, task);
  }

  public updateTask(id: string, task: Partial<Task>): Observable<{ success: boolean; task: Task }> {
    return this.http.put<{ success: boolean; task: Task }>(`${this.baseUrl}/${id}`, task);
  }

  public deleteTask(id: string, permanent = false, stopRecurrence = false): Observable<{ success: boolean; message: string }> {
    const params: string[] = [];
    if (permanent) params.push('permanent=true');
    if (stopRecurrence) params.push('stopRecurrence=true');
    const query = params.length > 0 ? `?${params.join('&')}` : '';
    return this.http.delete<{ success: boolean; message: string }>(`${this.baseUrl}/${id}${query}`);
  }

  public getRecurringTasks(): Observable<{ success: boolean; count: number; schedules: RecurringSchedule[] }> {
    return this.http.get<{ success: boolean; count: number; schedules: RecurringSchedule[] }>(`${this.baseUrl}/recurring`);
  }

  public createRecurringSchedule(schedule: Partial<RecurringSchedule>): Observable<{ success: boolean; schedule: RecurringSchedule }> {
    return this.http.post<{ success: boolean; schedule: RecurringSchedule }>(`${this.baseUrl}/recurring`, schedule);
  }

  public updateRecurringSchedule(id: string, schedule: Partial<RecurringSchedule>): Observable<{ success: boolean; schedule: RecurringSchedule }> {
    return this.http.put<{ success: boolean; schedule: RecurringSchedule }>(`${this.baseUrl}/recurring/${id}`, schedule);
  }

  public deleteRecurringSchedule(id: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.baseUrl}/recurring/${id}`);
  }

  public getArchivedTasks(): Observable<{ success: boolean; count: number; tasks: Task[] }> {
    return this.http.get<{ success: boolean; count: number; tasks: Task[] }>(`${this.baseUrl}/archived`);
  }

  public completeTask(id: string): Observable<CompleteTaskResponse> {
    return this.http.patch<CompleteTaskResponse>(`${this.baseUrl}/${id}/complete`, {});
  }
}
