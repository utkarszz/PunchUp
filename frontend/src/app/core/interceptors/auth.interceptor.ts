import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  let authReq = req;
  // Only attach token to requests matching our backend api base URL
  if (token && req.url.startsWith(environment.apiUrl)) {
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Case 3: Token expired or invalid — show login flow and preserve target URL
      if (error.status === 401 && token) {
        authService.handleSessionExpired();
      }
      return throwError(() => error);
    })
  );
};
