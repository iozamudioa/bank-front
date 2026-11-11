import { ThemePalette, HexColor } from '../models/theme-palette.model';
import { createTokens, PaletteRoles } from '../utils/theme-tokens.util';
function palette(
  id: string,
  name: string,
  description: string,
  colors: readonly HexColor[],
  roles: PaletteRoles,
): ThemePalette {
  return {
    id,
    name,
    description,
    colors,
    previewColors: colors,
    lightTokens: createTokens(roles, 'light'),
    darkTokens: createTokens(roles, 'dark'),
  };
}
export const THEME_PALETTES: readonly ThemePalette[] = [
  palette(
    'calcite',
    'Calcite',
    'Naranja mineral y neutros cálidos para un hogar con energía.',
    ['#DDDCDB', '#FD7B41', '#EDBF9B', '#3C4044'],
    {
      primary: '#FD7B41',
      secondary: '#3C4044',
      accent: '#EDBF9B',
      paper: '#DDDCDB',
      ink: '#3C4044',
    },
  ),
  palette(
    'seashell-garnet-afternoon',
    'Seashell Garnet Afternoon',
    'Coral, turquesa y azul suave con una personalidad luminosa.',
    ['#F6C992', '#FA6E81', '#ACC0D3', '#D396A6', '#09A1A1', '#5484A4'],
    {
      primary: '#09A1A1',
      secondary: '#FA6E81',
      accent: '#5484A4',
      paper: '#ACC0D3',
      ink: '#294653',
    },
  ),
  palette(
    'honey-opal-sunset',
    'Honey Opal Sunset',
    'Miel y tierra para una experiencia cálida y serena.',
    ['#ECB914', '#F6D579', '#9D8108', '#CBB8A0', '#4F3D35'],
    {
      primary: '#ECB914',
      secondary: '#9D8108',
      accent: '#4F3D35',
      paper: '#CBB8A0',
      ink: '#4F3D35',
    },
  ),
  palette(
    'yacht-club',
    'Yacht Club',
    'Azul profundo, terracota y neutros de inspiración náutica.',
    ['#F2F0EF', '#BBBDBC', '#245F73', '#733E24'],
    {
      primary: '#245F73',
      secondary: '#733E24',
      accent: '#245F73',
      paper: '#F2F0EF',
      ink: '#20323b',
    },
  ),
];
