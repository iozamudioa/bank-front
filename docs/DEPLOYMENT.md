# Despliegue Docker de BANK PWA

El Dockerfile y compose.yaml están en la raíz del repositorio. Node 24.15.0 satisface engines de Angular; npm ci usa el lockfile. El build produce dist/bank/browser/index.html; no se renombra index.csr.html.

## Compose dentro del repositorio

```sh
cd /home/iozamudioa/docker/bank-front/bank-front
git pull
docker compose up -d --build
docker compose logs --tail=100 bank-front
```

El compose del repositorio usa infra-net externa y no publica puertos: el proxy HTTPS de esa red debe enviar al servicio bank-front:80. Si el compose antiguo sigue en el directorio padre, usa solo uno de los dos para administrar el mismo contenedor. La PWA requiere HTTPS en su dominio público.

BANK_API_URL es el origen del backend, sin /api/v1 ni barra final. Por defecto es https://bank-api.ioza.dev. Se puede cambiar desde environment en Compose o desde un archivo .env junto al compose:

```dotenv
BANK_API_URL=https://bank-api.ioza.dev
```

Nginx genera su configuración al iniciar usando la plantilla oficial de su imagen. Angular conserva apiBase vacío: el navegador llama a /api/v1/... del frontend y Nginx lo envía al origen configurado, conservando ruta, query, Authorization e Idempotency-Key. No hay que habilitar CORS para esta conexión del navegador ni recompilar Angular por cambiar el backend.

Después de cambiar BANK_API_URL, recrea el contenedor:

```sh
docker compose up -d --force-recreate
```

No uses docker compose restart para aplicar variables nuevas.

## Si conservas el compose en el directorio padre

Con tu estructura actual, cambia build.context a ./bank-front. El Dockerfile ahora vive dentro del repositorio y todos sus COPY son relativos a él:

```yaml
services:
  bank-front:
    build:
      context: ./bank-front
      dockerfile: Dockerfile
    container_name: bank-front
    environment:
      TZ: America/Mexico_City
      BANK_API_URL: https://bank-api.ioza.dev
    restart: unless-stopped
    networks:
      - infra-net
networks:
  infra-net:
    external: true
```

Ya no necesitas el Dockerfile ni nginx.conf antiguos del directorio padre.

```sh
cd /home/iozamudioa/docker/bank-front/bank-front
git pull
cd ..
docker compose up -d --build
docker compose exec bank-front nginx -t
docker compose logs --tail=100 bank-front
```

No es necesario ejecutar down antes de reconstruir.

## Comprobaciones

- docker compose config: valida el Compose y las variables efectivas.
- docker compose exec bank-front nginx -t: valida Nginx generado.
- Abre /dashboard directamente: debe servir Angular.
- Comprueba /manifest.webmanifest, /ngsw.json y /ngsw-worker.js en el dominio HTTPS.
- /api/v1/me sin credenciales puede devolver 401; nunca debe devolver index.html.
- Las solicitudes de API no se cachean por Nginx ni por el service worker. Index, manifiesto del worker y scripts se revalidan; se mantiene intacto el contenido que Angular registra en ngsw.json.

El contenedor necesita resolver y conectar por HTTPS al backend. La verificación TLS y SNI están habilitados. Las variables del frontend no deben contener secretos.
