import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

// Only Bastion can revoke the session and clear its HttpOnly passport.
let logoutStarted = false;
export function destroyKingdomSession(): void {
  if (logoutStarted) return;
  logoutStarted = true;

  // An explicit credentialed fetch sends BANK's origin rather than Origin: null.
  // Bastion revokes its session; the browser starts a fresh Audience flow.
  void fetch('https://bastion.ioza.dev/audience/destroy', {
    method: 'POST',
    credentials: 'include',
    cache: 'no-store',
  })
    .then((response) => {
      if (!response.ok) throw new Error('Kingdom logout failed');
      // Return to the exact Tavern page that initiated logout, not BANK hardcoded.
      const returnTo = window.location.origin + window.location.pathname + window.location.search;
      window.location.replace(
        'https://bastion.ioza.dev/audience?returnTo=' + encodeURIComponent(returnTo),
      );
    })
    .catch((error: unknown) => {
      logoutStarted = false;
      console.error('No se pudo cerrar la sesión de Kingdom', error);
      window.alert('No se pudo cerrar la sesión de Kingdom. Inténtalo de nuevo.');
    });
}

// Retry authentication once per tab, rather than looping for a forbidden identity.
const recoveryKey = 'bank.kingdom.auth-recovery';

function recoverKingdomSession(): void {
  if (logoutStarted || sessionStorage.getItem(recoveryKey)) return;
  sessionStorage.setItem(recoveryKey, '1');
  logoutStarted = true;

  const returnTo = window.location.href;
  const audience =
    'https://bastion.ioza.dev/audience?returnTo=' + encodeURIComponent(returnTo);

  // Revoke the HttpOnly passport via Bastion; never wait indefinitely.
  void fetch('https://bastion.ioza.dev/audience/destroy', {
    method: 'POST',
    credentials: 'include',
    cache: 'no-store',
    signal: AbortSignal.timeout(5000),
  })
    .then((response) => {
      if (!response.ok) throw new Error('Kingdom session revocation failed');
      window.location.replace(audience);
    })
    .catch((error: unknown) => {
      console.warn('Kingdom recovery: revocation unavailable; checking passport', error);
      // If revocation fails, Royal Guard checks the cookie on a fresh navigation.
      window.location.replace(returnTo);
    });
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiBase + '/api/')) return next(req);

  const isIdentityRequest = req.url === environment.apiBase + '/api/v1/me';

  return next(req.clone({ withCredentials: true })).pipe(
    tap(() => {
      if (isIdentityRequest) sessionStorage.removeItem(recoveryKey);
    }),
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        (error.status === 401 || (isIdentityRequest && error.status === 403))
      ) {
        recoverKingdomSession();
      }
      return throwError(() => error);
    }),
  );
};
