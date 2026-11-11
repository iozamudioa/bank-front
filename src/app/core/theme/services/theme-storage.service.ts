import { Injectable } from '@angular/core';
import { ThemePreferences } from '../models/theme-preferences.model';
import {
  browserThemeStorage,
  readPreferences,
  writePreferences,
} from '../utils/theme-preferences.util';
@Injectable({ providedIn: 'root' })
export class ThemeStorageService {
  read(): ThemePreferences {
    return readPreferences(browserThemeStorage());
  }
  write(preferences: ThemePreferences) {
    writePreferences(browserThemeStorage(), preferences);
  }
}
