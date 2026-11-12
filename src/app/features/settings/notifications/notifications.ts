import { Component, inject } from '@angular/core';
import { PushNotifications } from '../../../core/notifications/push-notifications';
import { Icon } from '../../../shared/components/icon/icon';
@Component({
  selector: 'app-notifications',
  imports: [Icon],
  templateUrl: './notifications.html',
  styleUrl: './notifications.scss',
})
export class Notifications {
  readonly push = inject(PushNotifications);
  constructor() {
    this.push.reopen();
  }
}
