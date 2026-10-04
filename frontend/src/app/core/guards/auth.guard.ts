import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  // Preserve intended target URL securely
  const returnUrl = state.url;
  authService.setReturnUrl(returnUrl);
  router.navigate(['/login'], {
    queryParams: { returnUrl: authService.sanitizeReturnUrl(returnUrl) }
  });
  return false;
};
