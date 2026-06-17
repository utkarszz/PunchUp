import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface StreakData {
  _id: string;
  user: string;
  currentStreak: number;
  longestStreak: number;
  lastCompletedDate?: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class StreakService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/api/streaks`;

  public getStreak(): Observable<{ success: boolean; streak: StreakData | null }> {
    return this.http.get<{ success: boolean; streak: StreakData | null }>(this.baseUrl);
  }
}
