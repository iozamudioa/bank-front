import { Component, inject } from '@angular/core';
import { Icon } from '../components/icon/icon';
import { ToastService } from './toast.service';
@Component({
  selector: 'app-toast-outlet',
  imports: [Icon],
  templateUrl: './toast-outlet.html',
  styleUrl: './toast-outlet.scss',
})
export class ToastOutlet {
  readonly toasts = inject(ToastService);
}
