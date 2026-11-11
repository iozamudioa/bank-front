import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
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
const metadata = JSON.parse(readFileSync('public/fonts/material-symbols.source.json', 'utf8'));
assert.equal(new Set(ICON_NAMES).size, ICON_NAMES.length);
assert.deepEqual(
  metadata.icons,
  [...ICON_NAMES].sort(),
  'Regenerate the font with npm run icons:update.',
);
assert.equal(
  readFileSync('public/fonts/material-symbols-rounded.woff2').subarray(0, 4).toString(),
  'wOF2',
);
assert.ok(readFileSync('public/fonts/LICENSE.txt', 'utf8').includes('Apache License'));
assert.ok(
  readFileSync('src/index.html', 'utf8').includes('href="fonts/material-symbols-rounded.woff2"'),
);
console.log(
  'Icons OK: ' + ICON_NAMES.length + ' typed Google symbols, local WOFF2, preload and license.',
);
