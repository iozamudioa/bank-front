import { Icon } from '../../shared/components/icon/icon';
import { RouterLink } from '@angular/router';
import { Component, inject } from '@angular/core';
import { Appearance } from './appearance/appearance';
import { Members } from '../members/members';
import { IncomeSources } from '../income-sources/income-sources';
import { SetupGuide } from '../onboarding/setup-guide';
@Component({
  imports: [Icon, RouterLink, Members, IncomeSources, SetupGuide, Appearance],
  templateUrl: './settings.html',
  styleUrl: './settings.scss',
})
export class Settings {}
