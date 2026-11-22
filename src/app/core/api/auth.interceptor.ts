import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

// Only Bastion can revoke the session and clear its HttpOnly passport.
let logoutStarted = false;
export function destroyKingdomSession(): void {
  if (logoutStarted) return;
  logoutStarted = true;

  // A native navigation POST works without CORS and retains the shared cookie.
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = 'https://bastion.ioza.dev/audience/destroy';
  form.style.display = 'none';
  document.body.appendChild(form);
  form.submit();
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiBase + '/api/')) return next(req);

  return next(req.clone({ withCredentials: true })).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        destroyKingdomSession();
      }
      return throwError(() => error);
    }),
  );
};
