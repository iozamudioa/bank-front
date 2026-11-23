import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
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

// Throttle recovery to avoid a redirect loop for an identity without permissions.
const recoveryKey = 'bank.kingdom.auth-recovery';

function recoverKingdomSession(): void {
  const lastRecovery = Number(sessionStorage.getItem(recoveryKey) || '0');
  if (logoutStarted || Date.now() - lastRecovery < 60_000) return;
  sessionStorage.setItem(recoveryKey, String(Date.now()));
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
      // Bastion/Keycloak can perform interactive authentication even if revocation failed.
      window.location.replace(audience);
    });
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiBase + '/api/')) return next(req);

  return next(req.clone({ withCredentials: true })).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse) {
        const identityRequest = req.url === environment.apiBase + '/api/v1/me';
        const authenticationFailed = error.status === 401 || error.status === 403;
        // A cross-origin login redirect can be hidden by CORS and surface as status 0.
        // Only retry authentication for the identity check when the browser is online.
        const hiddenLoginRedirect = identityRequest && error.status === 0 && navigator.onLine;
        if (authenticationFailed || hiddenLoginRedirect) {
          recoverKingdomSession();
        }
      }
      return throwError(() => error);
    }),
  );
};
