import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
const source = readFileSync('public/theme-init.js', 'utf8');
for (const paletteId of ['calcite', 'seashell-garnet-afternoon', 'honey-opal-sunset', 'yacht-club'])
  for (const mode of ['system', 'light', 'dark'])
    for (const deviceDark of [false, true]) {
      const dom = new JSDOM('<!doctype html><meta name="theme-color"><body></body>', {
        url: 'https://bank.test',
        runScripts: 'outside-only',
      });
      dom.window.matchMedia = () => ({ matches: deviceDark });
      dom.window.localStorage.setItem(
        'bank.theme.preferences.v1',
        JSON.stringify({ paletteId, mode }),
      );
      dom.window.eval(source);
      const root = dom.window.document.documentElement;
      assert.equal(root.dataset.palette, paletteId);
      assert.equal(root.dataset.theme, deviceDark ? 'dark' : 'light');
      assert.ok(root.style.getPropertyValue('--bank-primary'));
      assert.equal(
        dom.window.document.querySelector('meta').getAttribute('content'),
        root.style.getPropertyValue('--bank-surface'),
      );
      dom.window.close();
    }
for (const raw of ['{', 'null', '{"paletteId":"missing","mode":"unknown"}']) {
  const dom = new JSDOM('<!doctype html>', {
    url: 'https://bank.test',
    runScripts: 'outside-only',
  });
  dom.window.localStorage.setItem('bank.theme.preferences.v1', raw);
  dom.window.eval(source);
  assert.equal(dom.window.document.documentElement.dataset.palette, 'calcite');
  dom.window.close();
}
const blocked = new JSDOM('<!doctype html>', {
  url: 'https://bank.test',
  runScripts: 'outside-only',
});
Object.defineProperty(blocked.window, 'localStorage', {
  get() {
    throw new Error('Blocked');
  },
});
assert.doesNotThrow(() => blocked.window.eval(source));
blocked.window.close();
const index = readFileSync('src/index.html', 'utf8');
assert.ok(index.indexOf('theme-init.js') < index.indexOf('<body>'));
console.log(
  'Theme bootstrap OK: 24 palette/mode/device combinations, corrupt preferences and blocked storage before Angular.',
);
