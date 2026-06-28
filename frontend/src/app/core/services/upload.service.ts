import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { UserProfile } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class UploadService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/api/upload`;

  public uploadProfilePicture(file: File): Observable<{ success: boolean; imageUrl: string; user: UserProfile }> {
    const formData = new FormData();
    formData.append('image', file);

    return this.http.post<{ success: boolean; imageUrl: string; user: UserProfile }>(
      `${this.baseUrl}/profile-picture`,
      formData
    );
  }

  public uploadImage(file: File): Observable<{ success: boolean; imageUrl: string }> {
    const formData = new FormData();
    formData.append('image', file);

    return this.http.post<{ success: boolean; imageUrl: string }>(
      `${this.baseUrl}/image`,
      formData
    );
  }
}
