import { writeFileSync } from 'node:fs';
const response = await fetch(process.argv[2] || 'http://localhost:8080/v3/api-docs');
if (!response.ok) throw new Error('OpenAPI HTTP ' + response.status);
const spec = await response.json();
if (!spec.openapi || !spec.paths) throw new Error('Contrato invalido');
writeFileSync('openapi.json', JSON.stringify(spec, null, 2));
