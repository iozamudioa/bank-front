import { TestBed } from '@angular/core/testing';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { Theme } from './theme';
import { THEME_STORAGE_KEY } from './models/theme-preferences.model';
import { THEME_PALETTES } from './catalog/theme-palettes.catalog';
describe('Tema central', () => {
  let listener: (event: MediaQueryListEvent) => void;
  let media: {
    matches: boolean;
    addEventListener: ReturnType<typeof vi.fn>;
    removeEventListener: ReturnType<typeof vi.fn>;
  };
  beforeEach(() => {
    localStorage.clear();
    media = {
      matches: false,
      addEventListener: vi.fn((_name, fn) => (listener = fn)),
      removeEventListener: vi.fn(),
    };
    vi.stubGlobal('matchMedia', () => media);
    TestBed.configureTestingModule({});
  });
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
  function system(dark: boolean) {
    media.matches = dark;
    listener({ matches: dark } as MediaQueryListEvent);
  }
  it('carga las cuatro paletas tipadas y usa Calcite con modo sistema', () => {
    const t = TestBed.inject(Theme);
    expect(t.getAvailablePalettes().map((p) => p.id)).toEqual([
      'calcite',
      'seashell-garnet-afternoon',
      'honey-opal-sunset',
      'yacht-club',
    ]);
    expect(t.mode()).toBe('system');
    expect(t.paletteId()).toBe('calcite');
  });
  it('cambia paleta inmediatamente sin modificar el modo', () => {
    const t = TestBed.inject(Theme);
    t.setMode('dark');
    t.setPalette('yacht-club');
    expect(t.palette().name).toBe('Yacht Club');
    expect(t.mode()).toBe('dark');
    expect(document.documentElement.dataset['palette']).toBe('yacht-club');
  });
  it('cambia claro y oscuro manteniendo la paleta', () => {
    const t = TestBed.inject(Theme);
    t.setPalette('honey-opal-sunset');
    t.setMode('dark');
    expect(t.effectiveMode()).toBe('dark');
    t.setMode('light');
    expect(t.effectiveMode()).toBe('light');
    expect(t.paletteId()).toBe('honey-opal-sunset');
  });
  it('detecta la apariencia inicial del dispositivo', () => {
    media.matches = true;
    const t = TestBed.inject(Theme);
    expect(t.effectiveMode()).toBe('dark');
    expect(document.documentElement.dataset['theme']).toBe('dark');
  });
  it('responde a cambios automáticos sin alterar la paleta', () => {
    const t = TestBed.inject(Theme);
    t.setPalette('yacht-club');
    system(true);
    expect(t.effectiveMode()).toBe('dark');
    system(false);
    expect(t.effectiveMode()).toBe('light');
    expect(t.paletteId()).toBe('yacht-club');
  });
  it('sigue los cambios del dispositivo incluso después de una selección manual', () => {
    const t = TestBed.inject(Theme);
    t.setMode('light');
    system(true);
    expect(t.effectiveMode()).toBe('dark');
    expect(document.documentElement.dataset['theme']).toBe('dark');
    expect(t.mode()).toBe('system');
  });
  it('persiste únicamente paleta y modo en la clave versionada', () => {
    const t = TestBed.inject(Theme);
    t.setPalette('yacht-club');
    t.setMode('dark');
    expect(JSON.parse(localStorage.getItem(THEME_STORAGE_KEY)!)).toEqual({
      paletteId: 'yacht-club',
      mode: 'dark',
    });
  });
  it('recupera la paleta y toma el modo del dispositivo al abrirse', () => {
    localStorage.setItem(
      THEME_STORAGE_KEY,
      JSON.stringify({ paletteId: 'honey-opal-sunset', mode: 'dark' }),
    );
    const t = TestBed.inject(Theme);
    expect(t.paletteId()).toBe('honey-opal-sunset');
    expect(t.effectiveMode()).toBe('light');
  });
  it('ignora una selección de paleta inexistente', () => {
    const t = TestBed.inject(Theme);
    t.setPalette('yacht-club');
    t.setPalette('missing');
    expect(t.paletteId()).toBe('yacht-club');
  });
  it('normaliza una paleta guardada inexistente', () => {
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify({ paletteId: 'missing', mode: 'dark' }));
    const t = TestBed.inject(Theme);
    expect(t.paletteId()).toBe('calcite');
    expect(t.mode()).toBe('system');
  });
  it.each(['{', 'null', '[]', '"hello"', '{"mode":"unexpected"}'])(
    'recupera preferencias corruptas: %s',
    (raw) => {
      localStorage.setItem(THEME_STORAGE_KEY, raw);
      const t = TestBed.inject(Theme);
      expect(t.paletteId()).toBe('calcite');
      expect(t.mode()).toBe('system');
    },
  );
  it('migra la preferencia anterior auto a system', () => {
    localStorage.setItem('bank-theme', 'auto');
    expect(TestBed.inject(Theme).mode()).toBe('system');
  });
  it('toma el tema del dispositivo en lugar del modo manual de una sesión anterior', () => {
    localStorage.setItem('bank-theme', 'dark');
    expect(TestBed.inject(Theme).effectiveMode()).toBe('light');
  });
  it('aplica todos los tokens CSS y color-scheme al documento', () => {
    const t = TestBed.inject(Theme);
    t.setPalette('yacht-club');
    t.setMode('dark');
    for (const [key, value] of Object.entries(THEME_PALETTES[3].darkTokens))
      expect(document.documentElement.style.getPropertyValue('--bank-' + key)).toBe(value);
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });
  it('destruye el listener al destruir el servicio', () => {
    TestBed.inject(Theme);
    TestBed.resetTestingModule();
    expect(media.removeEventListener).toHaveBeenCalledWith('change', listener);
  });
  it('funciona cuando localStorage no permite leer ni escribir', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Blocked');
    });
    const t = TestBed.inject(Theme);
    expect(() => {
      t.setMode('dark');
      t.setPalette('yacht-club');
    }).not.toThrow();
    expect(t.effectiveMode()).toBe('dark');
    expect(t.paletteId()).toBe('yacht-club');
  });
  it('funciona sin matchMedia disponible', () => {
    vi.stubGlobal('matchMedia', undefined);
    expect(TestBed.inject(Theme).effectiveMode()).toBe('light');
  });
  it('alterna únicamente claro y oscuro y actualiza el color de la barra del navegador', () => {
    const t = TestBed.inject(Theme);
    expect(t.modeLabel()).toBe('Claro');
    t.cycle();
    expect(t.modeLabel()).toBe('Oscuro');
    expect(document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.content).toBe(
      t.palette().darkTokens.surface,
    );
    t.cycle();
    expect(t.modeLabel()).toBe('Claro');
    system(true);
    expect(t.effectiveMode()).toBe('dark');
    expect(document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.content).toBe(
      t.palette().darkTokens.surface,
    );
    t.setPalette('yacht-club');
    expect(document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.content).toBe(
      t.palette().darkTokens.surface,
    );
  });
});
