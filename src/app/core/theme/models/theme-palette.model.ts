export type HexColor = `#${string}`;
export type ThemeToken =
  | 'primary'
  | 'on-primary'
  | 'secondary'
  | 'on-secondary'
  | 'accent'
  | 'on-accent'
  | 'background'
  | 'surface'
  | 'surface-variant'
  | 'text'
  | 'text-muted'
  | 'border'
  | 'control-border'
  | 'hover'
  | 'focus'
  | 'primary-container'
  | 'secondary-container'
  | 'success'
  | 'success-container'
  | 'warning'
  | 'warning-container'
  | 'danger'
  | 'danger-container'
  | 'hero'
  | 'hero-accent'
  | 'on-hero'
  | 'hero-muted'
  | 'hero-border'
  | 'hero-decoration'
  | 'overlay'
  | 'shadow';
export type ThemeTokens = Readonly<Record<ThemeToken, string>>;
export interface ThemePalette {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly colors: readonly HexColor[];
  readonly lightTokens: ThemeTokens;
  readonly darkTokens: ThemeTokens;
  readonly previewColors: readonly HexColor[];
}
