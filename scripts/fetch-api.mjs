import { writeFileSync } from 'node:fs';
const response = await fetch('http://localhost:8080/v3/api-docs');
if (!response.ok) throw new Error('OpenAPI HTTP ' + response.status);
const spec = await response.json();
if (!spec.openapi || !spec.paths) throw new Error('Contrato inv?lido');
writeFileSync('openapi.json', JSON.stringify(spec, null, 2));
