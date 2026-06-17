import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface GridCell {
  date: string;
  tasksCompleted: number;
  intensity: number;
}

@Injectable({
  providedIn: 'root'
})
export class GridService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/api/grid`;

  public getGridData(): Observable<{ success: boolean; totalContributionDays: number; gridData: GridCell[] }> {
    return this.http.get<{ success: boolean; totalContributionDays: number; gridData: GridCell[] }>(this.baseUrl);
  }
}
