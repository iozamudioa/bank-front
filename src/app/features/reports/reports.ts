import { Icon } from '../../shared/components/icon/icon';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
@Component({
  imports: [Icon, RouterLink],
  templateUrl: './reports.html',
  styleUrl: './reports.scss',
})
export class Reports {}
