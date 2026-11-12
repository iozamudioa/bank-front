import { readFileSync, mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';

// Execute the installed Angular worker methods, never a replacement worker.
const worker = readFileSync('node_modules/@angular/service-worker/ngsw-worker.js', 'utf8');
const options = JSON.parse(worker.match(/var NOTIFICATION_OPTION_NAMES = (\[[\s\S]*?\]);/)[1]);
function method(start, end) {
  const code = worker.slice(worker.indexOf(start), worker.indexOf(end, worker.indexOf(start)));
  return new Function('NOTIFICATION_OPTION_NAMES', 'return ({' + code + '});')(options);
}
const handlePush = method('async handlePush(data)', 'async handleClick(').handlePush;
const handleClick = method(
  'async handleClick(notification, action)',
  'async handleClose(',
).handleClick;
const shown = [],
  opened = [];
const scope = {
  registration: {
    scope: 'https://bank.example/',
    showNotification: async (title, body) => shown.push({ title, body }),
  },
  clients: { openWindow: async (url) => opened.push(url) },
};
const context = { scope, broadcast: async () => {} };
const currentRavenPayload = { title: 'BANK', message: 'Ingreso registrado', url: '/dashboard' };
await handlePush.call(context, currentRavenPayload);
assert.equal(
  shown.length,
  0,
  'The flat Raven payload currently cannot display with Angular ngsw-worker.',
);
const angularPayload = {
  notification: {
    title: 'BANK',
    body: 'Ingreso registrado',
    data: { onActionClick: { default: { operation: 'openWindow', url: '/dashboard' } } },
  },
};
await handlePush.call(context, angularPayload);
assert.equal(shown[0].body.body, 'Ingreso registrado');
await handleClick.call(context, { ...angularPayload.notification, close() {} }, '');
assert.deepEqual(opened, ['https://bank.example/dashboard']);
console.log(
  'Worker: incompatibilidad del payload plano de Raven confirmada; formato Angular y clic seguro verificados.',
);

// Exercise the real generator with a fixture independent of the published status-code mismatch.
const directory = mkdtempSync(join(tmpdir(), 'bank-openapi-'));
try {
  const schema = { $ref: '#/components/schemas/Result' };
  const operation = (operationId, responses) => ({ get: { operationId, responses } });
  const spec = {
    components: { schemas: { Result: { type: 'object', properties: { id: { type: 'string' } } } } },
    paths: {
      '/json': operation('json', { 200: { content: { 'application/json': { schema } } } }),
      '/created': operation('created', { 201: { content: { '*/*': { schema } } } }),
      '/accepted': operation('accepted', { 202: { description: 'Accepted without body' } }),
    },
  };
  writeFileSync(join(directory, 'openapi.json'), JSON.stringify(spec));
  execFileSync(process.execPath, [resolve('scripts/generate-api.mjs')], { cwd: directory });
  const generated = readFileSync(join(directory, 'src/app/core/api/generated/bank-api.ts'), 'utf8');
  assert.match(generated, /json\(\).*?request<Result>/);
  assert.match(generated, /created\(\).*?request<Result>/);
  assert.match(generated, /accepted\(\).*?request<void>/);
  console.log('Generador: 200 JSON, 201 wildcard y 202 sin cuerpo correctos.');
} finally {
  rmSync(directory, { recursive: true, force: true });
}
