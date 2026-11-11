import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { build } = require(
  require.resolve('esbuild', { paths: [require.resolve('@angular/build/package.json')] }),
);
const result = await build({
  entryPoints: ['src/app/core/icons/icon-names.ts'],
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'node',
});
const { ICON_NAMES } = await import(
  'data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text).toString('base64')
);
const names = [...ICON_NAMES].sort().join(',');
const cssUrl =
  'https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0..1,0&icon_names=' +
  names +
  '&display=block';
const response = await fetch(cssUrl, {
  headers: {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  },
});
if (!response.ok) throw new Error('Google Fonts HTTP ' + response.status);
const css = await response.text();
const fontUrl = css.match(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\) format\('woff2'\)/)?.[1];
if (!fontUrl) throw new Error('Google did not return a WOFF2 font.');
const [fontResponse, licenseResponse] = await Promise.all([
  fetch(fontUrl),
  fetch('https://raw.githubusercontent.com/google/material-design-icons/master/LICENSE'),
]);
if (!fontResponse.ok || !licenseResponse.ok) throw new Error('Font or license download failed.');
const bytes = new Uint8Array(await fontResponse.arrayBuffer()),
  license = await licenseResponse.text();
if (Buffer.from(bytes.subarray(0, 4)).toString() !== 'wOF2')
  throw new Error('Invalid WOFF2 asset.');
if (!license.includes('Apache License')) throw new Error('Unexpected font license.');
mkdirSync('public/fonts', { recursive: true });
writeFileSync('public/fonts/material-symbols-rounded.woff2', bytes);
writeFileSync('public/fonts/LICENSE.txt', license);
writeFileSync(
  'public/fonts/material-symbols.source.json',
  JSON.stringify(
    {
      family: 'Material Symbols Rounded',
      license: 'Apache-2.0',
      source: cssUrl,
      icons: [...ICON_NAMES].sort(),
    },
    null,
    2,
  ) + '\n',
);
console.log(
  'Google Material Symbols: ' +
    ICON_NAMES.length +
    ' icons, ' +
    bytes.length +
    ' bytes, locally hosted.',
);
