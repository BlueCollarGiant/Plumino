import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';

export const tokenInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const toastService = inject(ToastService);
  const token = authService.token();

  // Add Authorization header if token exists and request is to API
  if (token && req.url.includes('/api/')) {
    const authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });

    return next(authReq).pipe(
      catchError(error => {
        // Handle stale token (role/department changed)
        if (error.status === 401 && error.error?.requireReauth) {
          console.log('🔄 Token invalidated due to role/department change');
          toastService.show(
            'Your permissions have changed. Logging you out to apply updates...',
            'info',
            3000
          );

          // Auto-logout and redirect after a brief delay
          setTimeout(() => {
            authService.logout();
            router.navigate(['/']);
          }, 1000);

          return throwError(() => error);
        }

        // Handle role change detection (legacy)
        if (error.status === 401 && error.error?.roleChanged) {
          // Show user-friendly toast notification
          toastService.show(
            '🎉 Great news! Your role has been updated and you now have new permissions available. You\'ll be logged out in a moment so you can log back in with your enhanced access.',
            'info',
            0
          );

          // Auto-logout and redirect after a delay
          setTimeout(() => {
            authService.logout();
            router.navigate(['/']);
          }, 3000);
        }

        return throwError(() => error);
      })
    );
  }

  return next(req);
};
