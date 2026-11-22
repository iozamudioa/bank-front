import { environment } from '../../../environments/environment';
import { HttpInterceptorFn } from '@angular/common/http';

// Kingdom Passport is an HttpOnly cookie managed by Bastion, not by Angular.
export const authInterceptor: HttpInterceptorFn = (req, next) =>
  next(
    req.url.startsWith(environment.apiBase + '/api/')
      ? req.clone({ withCredentials: true })
      : req,
  );
