import { EffectiveThemeMode } from '../models/theme-mode.type';
import { HexColor, ThemeTokens } from '../models/theme-palette.model';
import { mix, readable, onColor } from './color.util';
export interface PaletteRoles {
  primary: HexColor;
  secondary: HexColor;
  accent: HexColor;
  paper: HexColor;
  ink: HexColor;
}
export function createTokens(roles: PaletteRoles, mode: EffectiveThemeMode): ThemeTokens {
  const dark = mode === 'dark';
  const background = dark ? mix(roles.ink, '#000000', 0.67) : mix(roles.paper, '#ffffff', 0.84);
  const surface = dark ? mix(roles.ink, '#000000', 0.43) : mix(roles.paper, '#ffffff', 0.98);
  const variant = mix(surface, roles.primary, dark ? 0.13 : 0.07);
  const primaryContainer = mix(surface, roles.primary, dark ? 0.15 : 0.09);
  const secondaryContainer = mix(surface, roles.secondary, dark ? 0.15 : 0.09);
  const backgrounds = [background, surface, variant, primaryContainer, secondaryContainer];
  const primary = readable(roles.primary, backgrounds),
    secondary = readable(roles.secondary, backgrounds),
    accent = readable(roles.accent, backgrounds);
  const text = readable(dark ? '#f7f5f2' : roles.ink, backgrounds, 9);
  const muted = readable(mix(text, surface, 0.3), backgrounds);
  const hero = mix(roles.ink, roles.primary, 0.12);
  const state = (seed: HexColor) => {
    const container = mix(surface, seed, dark ? 0.14 : 0.07);
    return { container, color: readable(seed, [...backgrounds, container]) };
  };
  const success = state('#16713b'),
    warning = state('#805500'),
    danger = state('#b3261e');
  return {
    primary: primary,
    'on-primary': onColor(primary),
    secondary: secondary,
    'on-secondary': onColor(secondary),
    accent: accent,
    'on-accent': onColor(accent),
    background: background,
    surface: surface,
    'surface-variant': variant,
    text: text,
    'text-muted': muted,
    border: mix(surface, text, 0.2),
    'control-border': readable(mix(surface, text, 0.4), [background, surface, variant], 3.1),
    hover: variant,
    focus: readable(primary, backgrounds, 3.1),
    'primary-container': primaryContainer,
    'secondary-container': secondaryContainer,
    success: success.color,
    'success-container': success.container,
    warning: warning.color,
    'warning-container': warning.container,
    danger: danger.color,
    'danger-container': danger.container,
    hero: hero,
    'hero-accent': readable(roles.primary, [hero]),
    'on-hero': onColor(hero),
    'hero-muted': readable(mix(onColor(hero), hero, 0.2), [hero]),
    'hero-border': mix(hero, onColor(hero), 0.2),
    'hero-decoration': mix(hero, onColor(hero), 0.04),
    overlay: 'rgba(0, 0, 0, 0.6)',
    shadow: dark ? 'none' : '0 6px 24px rgba(0, 0, 0, 0.06)',
  };
}
