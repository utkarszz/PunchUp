import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Notification {
  _id: string;
  type: 'follow' | 'like' | 'comment';
  from: {
    _id: string;
    username: string;
    displayName?: string;
    profilePicture?: string;
  };
  post?: { _id: string; content: string };
  read: boolean;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api/notifications`;

  getAll(): Observable<{ success: boolean; notifications: Notification[] }> {
    return this.http.get<{ success: boolean; notifications: Notification[] }>(this.base);
  }

  markRead(id: string): Observable<any> {
    return this.http.patch(`${this.base}/${id}/read`, {});
  }

  markAllRead(): Observable<any> {
    return this.http.patch(`${this.base}/read-all`, {});
  }
}
