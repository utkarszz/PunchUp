import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface FollowUser {
  _id: string;
  username: string;
  displayName?: string;
  profilePicture?: string;
  bio?: string;
  following?: FollowUser; // backend follow records nest the target user here
}

@Injectable({ providedIn: 'root' })
export class FollowService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api`;

  follow(username: string): Observable<any> {
    return this.http.post(`${this.base}/follows/${username}`, {});
  }

  unfollow(username: string): Observable<any> {
    return this.http.delete(`${this.base}/follows/${username}`);
  }

  getSuggestions(): Observable<{ success: boolean; users: FollowUser[] }> {
    return this.http.get<{ success: boolean; users: FollowUser[] }>(`${this.base}/users/suggestions`);
  }

  getFollowers(username: string): Observable<{ success: boolean; followers: FollowUser[] }> {
    return this.http.get<{ success: boolean; followers: FollowUser[] }>(`${this.base}/follows/followers/${username}`);
  }

  getFollowing(username: string): Observable<{ success: boolean; following: FollowUser[] }> {
    return this.http.get<{ success: boolean; following: FollowUser[] }>(`${this.base}/follows/following/${username}`);
  }
}
