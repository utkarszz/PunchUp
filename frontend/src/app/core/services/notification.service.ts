import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
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
    return this.http.get<{ success: boolean; notifications: any[] }>(this.base).pipe(
      map(res => ({
        ...res,
        notifications: (res.notifications || []).map((n: any) => ({
          _id: n._id,
          type: n.type,
          // Backend uses 'sender', frontend template expects 'from'
          from: n.sender || n.from || null,
          post: n.post || null,
          // Backend uses 'isRead', frontend template expects 'read'
          read: n.isRead ?? n.read ?? false,
          createdAt: n.createdAt,
        }))
      }))
    );
  }

  markRead(id: string): Observable<any> {
    return this.http.patch(`${this.base}/${id}/read`, {});
  }

  markAllRead(): Observable<any> {
    return this.http.patch(`${this.base}/read-all`, {});
  }
}
