import { Injectable, signal } from '@angular/core';
@Injectable({ providedIn: 'root' })
export class Session {
  readonly authorization = signal('');
  readonly username = signal('');
  set(username: string, password: string) {
    this.authorization.set(
      'Basic ' +
        btoa(
          Array.from(new TextEncoder().encode(username + ':' + password), (b) =>
            String.fromCharCode(b),
          ).join(''),
        ),
    );
    this.username.set(username);
  }
  clear() {
    this.authorization.set('');
    this.username.set('');
  }
}
