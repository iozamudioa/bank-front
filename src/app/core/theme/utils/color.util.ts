import { HexColor } from '../models/theme-palette.model';
function channels(hex: string): number[] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
}
export function mix(a: string, b: string, weight: number): HexColor {
  const end = channels(b);
  return ('#' +
    channels(a)
      .map((v, i) =>
        Math.round(v * (1 - weight) + end[i] * weight)
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')) as HexColor;
}
function luminance(hex: string): number {
  return channels(hex)
    .map((c) => {
      const v = c / 255;
      return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    })
    .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
}
export function contrastRatio(a: string, b: string): number {
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
export function readable(seed: string, backgrounds: readonly string[], ratio = 4.8): HexColor {
  const target =
    contrastRatio('#000000', backgrounds[0]) > contrastRatio('#ffffff', backgrounds[0])
      ? '#000000'
      : '#ffffff';
  for (let i = 0; i <= 100; i++) {
    const color = mix(seed, target, i / 100);
    if (backgrounds.every((bg) => contrastRatio(color, bg) >= ratio)) return color;
  }
  return target;
}
export function onColor(background: string): HexColor {
  return contrastRatio('#ffffff', background) > contrastRatio('#000000', background)
    ? '#ffffff'
    : '#000000';
}
