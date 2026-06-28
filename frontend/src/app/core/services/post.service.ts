import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Post {
  _id: string;
  content: string;
  images?: string[];
  user: {
    _id: string;
    username: string;
    displayName?: string;
    profilePicture?: string;
  };
  likes: string[];
  saves: string[];
  commentsCount?: number;
  createdAt: string;
}

export interface Comment {
  _id: string;
  content: string;
  user: {
    _id: string;
    username: string;
    displayName?: string;
    profilePicture?: string;
  };
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class PostService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api`;

  getFeed(): Observable<{ success: boolean; posts: Post[] }> {
    return this.http.get<{ success: boolean; posts: Post[] }>(`${this.base}/posts`);
  }

  createPost(content: string, images?: string[]): Observable<{ success: boolean; post: Post }> {
    return this.http.post<{ success: boolean; post: Post }>(`${this.base}/posts`, { content, images });
  }

  likePost(postId: string): Observable<{ liked: boolean }> {
    return this.http.post<{ liked: boolean }>(`${this.base}/posts/${postId}/like`, {});
  }

  savePost(postId: string): Observable<{ saved: boolean }> {
    return this.http.post<{ saved: boolean }>(`${this.base}/posts/${postId}/save`, {});
  }

  getComments(postId: string): Observable<{ success: boolean; comments: Comment[] }> {
    return this.http.get<{ success: boolean; comments: Comment[] }>(`${this.base}/comments/${postId}`);
  }

  addComment(postId: string, content: string): Observable<{ success: boolean; comment: Comment }> {
    return this.http.post<{ success: boolean; comment: Comment }>(`${this.base}/comments/${postId}`, { content });
  }

  // Save is a toggle: POST to save, DELETE to unsave
  toggleSavePost(postId: string, isSaved: boolean): Observable<any> {
    if (isSaved) {
      return this.http.delete(`${this.base}/posts/${postId}/save`);
    } else {
      return this.http.post(`${this.base}/posts/${postId}/save`, {});
    }
  }

  deletePost(postId: string): Observable<any> {
    return this.http.delete(`${this.base}/posts/${postId}`);
  }

  deleteComment(commentId: string): Observable<any> {
    return this.http.delete(`${this.base}/comments/${commentId}`);
  }

  getUserPosts(username: string): Observable<{ success: boolean; posts: Post[] }> {
    return this.http.get<{ success: boolean; posts: Post[] }>(`${this.base}/posts/user/${username}`);
  }

  getSavedPosts(): Observable<{ success: boolean; savedPosts: any[] }> {
    return this.http.get<{ success: boolean; savedPosts: any[] }>(`${this.base}/posts/saved`);
  }
}
