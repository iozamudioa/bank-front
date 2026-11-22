import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

// Only Bastion can revoke the session and clear its HttpOnly passport.
let logoutStarted = false;
export function destroyKingdomSession(): void {
  if (logoutStarted) return;
  logoutStarted = true;

  // An explicit credentialed fetch sends BANK's origin rather than Origin: null.
  // Bastion clears the HttpOnly cookie; then the browser displays confirmation.
  void fetch('https://bastion.ioza.dev/audience/destroy', {
    method: 'POST',
    credentials: 'include',
    cache: 'no-store',
  })
    .then((response) => {
      if (!response.ok) throw new Error('Kingdom logout failed');
      window.location.replace('https://bastion.ioza.dev/audience/signed-out');
    })
    .catch((error: unknown) => {
      logoutStarted = false;
      console.error('No se pudo cerrar la sesión de Kingdom', error);
      window.alert('No se pudo cerrar la sesión de Kingdom. Inténtalo de nuevo.');
    });
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
