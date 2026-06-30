import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map, filter, take } from 'rxjs/operators';

export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.isLoaded$.pipe(
    filter(loaded => loaded),
    take(1),
    map(() => {
      const user = authService.currentUserValue;
      if (user && user.email === 'utkarzz1705@gmail.com') {
        return true;
      }
      router.navigate(['/dashboard']);
      return false;
    })
  );
};
