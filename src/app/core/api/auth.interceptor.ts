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

// An expired passport is already cleared by Bastion when it returns HTTP 401.
// Navigate immediately: waiting for a secondary logout fetch can leave the SPA stalled.
// This flag deduplicates concurrent 401 responses only until the browser navigates.
let authenticationRedirectStarted = false;

function recoverKingdomSession(): void {
  if (authenticationRedirectStarted || logoutStarted) return;
  authenticationRedirectStarted = true;

  const returnTo = window.location.origin + window.location.pathname + window.location.search;
  const audience =
    'https://bastion.ioza.dev/audience?returnTo=' + encodeURIComponent(returnTo);

  window.location.replace(audience);
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiBase + '/api/')) return next(req);

  return next(req.clone({ withCredentials: true })).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse) {
        const identityRequest = req.url === environment.apiBase + '/api/v1/me';
        // A forbidden operation is not proof that the session expired.
        const authenticationFailed =
          error.status === 401 || (identityRequest && error.status === 403);
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
