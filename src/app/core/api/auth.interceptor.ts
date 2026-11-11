import { environment } from '../../../environments/environment';
import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { Session } from '../auth/session';
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(Session).authorization();
  return next(
    auth && req.url.startsWith(environment.apiBase + '/api/')
      ? req.clone({ setHeaders: { Authorization: auth, 'Cache-Control': 'no-store' } })
      : req,
  );
};
