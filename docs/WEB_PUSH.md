# Web Push en BANK

Implementado en Configuración → Notificaciones, reutilizando SwPush y el ngsw-worker.js existente. No se registró un worker adicional ni se modificaron BANK API, Raven, Nginx o producción.

## Contrato verificado

Se consultó https://bank-api.ioza.dev/v3/api-docs el 12/11/2026 y se versionó su respuesta en openapi.json. HTTP Basic global, con operaciones:

| Operación                | Ruta relativa                                                              | OpenAPI remoto                       | Controlador local de BANK |
| ------------------------ | -------------------------------------------------------------------------- | ------------------------------------ | ------------------------- |
| getPushVapidPublicKey    | GET /api/v1/households/{householdId}/push-subscriptions/vapid-public-key   | 200, VapidPublicKeyResponse en _/_   | 200                       |
| registerPushSubscription | POST /api/v1/households/{householdId}/push-subscriptions                   | 200, PushSubscriptionResponse en _/_ | 201                       |
| sendTestPushNotification | POST /api/v1/households/{householdId}/push-subscriptions/test-notification | 200, sin cuerpo                      | 202, sin cuerpo           |

No se hicieron POST reales a producción para inferir sus códigos. La diferencia de códigos es del documento publicado: el cliente acepta respuestas HTTP exitosas y no depende exclusivamente de 201/202. El generador ahora reconoce esquemas application/json y _/_ de respuestas 2xx y modela respuestas sin esquema como void. Conserva timeout de 20 segundos, headers y parámetros en un helper común. Las pruebas de generación cubren también 201 y 202 aunque el OpenAPI actual documente 200.

No hay rutas publicadas para listar o eliminar suscripciones. No se ofrece baja remota ni se afirma una verificación remota al reabrir la sección.

Todos los requests de la aplicación son relativos al origen de BANK: environment.apiBase permanece vacío y se usa BankApi con el interceptor Basic existente. El dominio externo se consulta únicamente al actualizar documentación mediante scripts/fetch-api.mjs, que ahora admite la URL como argumento:

```sh
node scripts/fetch-api.mjs https://bank-api.ioza.dev/v3/api-docs
npm run api:generate
```

## Estado y privacidad

- Se comprueban contexto seguro, APIs del navegador y SwPush.isEnabled antes de suscribirse.
- La clave pública y los permisos OWNER se consultan al entrar a Configuración o cambiar sesión/hogar. No se solicita permiso ni se hace POST automáticamente.
- OWNER se obtiene cruzando getCurrentUser con listHouseholdMembers del hogar, y exige integrante activo. Los permisos antiguos no se reutilizan al cambiar de hogar, incluso antes del siguiente render.
- Activar obtiene o reutiliza una suscripción real, valida endpoint HTTPS y ambas claves, y registra installationId, deviceName, endpoint, p256dh y auth. Los nombres están limitados a 100 caracteres.
- Un único UUID se conserva en localStorage bajo bank.push.installation. Si se borra el almacenamiento, se genera otro. Si el almacenamiento no está disponible se informa antes de pedir permiso.
- bank.push.last-registration guarda solo householdId, installationId y hash SHA-256 del endpoint; nunca claves Push ni un indicador confiable de estado remoto.
- Registrado en BANK (esta sesión) requiere respuesta activa que corresponda al hogar e instalación. Reabrir la sección muestra suscripción local / registro remoto no verificado.
- Cambios de suscripción invalidan la confirmación local y piden sincronización explícita, sin POST automático. Si cambia la clave VAPID, la siguiente activación explícita reemplaza la suscripción local antes de registrarla.
- Logout limpia los estados de interfaz y no cancela la suscripción local. Las operaciones pendientes no registran en otro hogar después de un cambio de sesión.
- Enviar prueba requiere OWNER y muestra Solicitud aceptada por BANK. No verifica entrega ni existencia de suscriptores activos.
- No se escriben endpoints o claves en logs. No se usa fingerprinting, identificadores de hardware, Raven API keys ni VAPID privada.
- El servicio se carga con la sección de Configuración y conserva listeners durante la sesión de la aplicación; no se invoca desde el flujo financiero.

## Incompatibilidad real con Raven: recepción bloqueada

Se leyó la rama proporcionada por el usuario:
[WebPushSenderAdapter.java, feature/webpush-channel](https://github.com/iozamudioa/cctv-api/blob/feature/webpush-channel/src/main/java/mx/london18/cctv/adapters/out/notification/channel/webpush/WebPushSenderAdapter.java),
blob 0bc5d1e4baf3cf55fdda98807e4803b2acf19d40.

El adaptador serializa el siguiente formato, con icon opcional:

```json
{
  "title": "BANK",
  "message": "Ingreso registrado",
  "url": "/dashboard"
}
```

Angular no muestra una notificación para ese JSON: handlePush del worker instalado exige data.notification.title. El payload plano se puede emitir a clientes abiertos, pero no genera una notificación del sistema con ngsw-worker.js. Por lo tanto no se puede afirmar que v1 recibe avisos en segundo plano con esa rama de Raven.

Para completar la integración, Raven debe producir un sobre compatible (se documenta, no se modificó backend):

```json
{
  "notification": {
    "title": "BANK",
    "body": "Ingreso registrado",
    "icon": "/icons/icon-192.png",
    "data": {
      "onActionClick": {
        "default": {
          "operation": "navigateLastFocusedOrOpen",
          "url": "/dashboard"
        }
      }
    }
  }
}
```

No convertir metadata arbitraria en URLs de navegación: conservar una ruta permitida del mismo origen. El cliente, al recibir notificationClicks en una instancia abierta que ya haya inicializado la sección, navega siempre a /dashboard e ignora metadata externa. Con la app cerrada, abrirla depende de que Raven incluya onActionClick como en el formato anterior.

La prueba scripts/check-push-contract.mjs ejecuta los métodos reales handlePush y handleClick del worker instalado: demuestra que el formato actual de Raven no muestra aviso y que el formato compatible muestra body y abre la ruta del mismo origen. Es una prueba de compatibilidad de código, no una entrega Web Push real por FCM/APNs.

Referencia: [Angular, payload y acciones del worker](https://angular.dev/ecosystem/service-workers/push-notifications). No se reemplazó el worker para adaptar el formato incompatible.

## Comprobaciones ejecutables

```sh
npm test
npm run build
npm run pwa:check
npm run format:check
node scripts/check-push-contract.mjs
```

Los tests Angular usan suscripciones y HTTP de prueba, nunca registran suscripciones ficticias en BANK/Raven. Cubren soporte, permisos, VAPID, reutilización/nueva suscripción, claves faltantes, HTTP, UUID, botones, rol, cambios de hogar, logout y rotación de suscripción.

La comprobación pública por HTTPS devolvió 200 para /, /manifest.webmanifest, /ngsw.json y /ngsw-worker.js de bank.ioza.dev; ngsw.json tenía dataGroups vacío. Esto verifica recursos del despliegue existente, no que estos cambios ya estén publicados. No se tuvo una sesión autenticada ni un dispositivo del usuario para validar registro real o entrega.

## Prueba manual en Chrome / Pixel

1. Desplegar el frontend y resolver la incompatibilidad de formato de Raven indicada arriba.
2. Abrir https://bank.ioza.dev, iniciar sesión y seleccionar un hogar. Si hay una actualización de PWA pendiente, cerrar las pestañas y volver a abrir. No probar con ng serve: el worker se deshabilita en desarrollo.
3. En DevTools → Application → Service Workers confirmar ngsw-worker.js activo. En Network comprobar que VAPID y POST usan https://bank.ioza.dev/api/v1/... y nunca el origen externo del backend.
4. Entrar en Configuración → Notificaciones, poner un nombre legible, pulsar Activar notificaciones y aceptar el permiso. Confirmar el registro de esta sesión. No compartir capturas con endpoint o claves.
5. Como OWNER, pulsar Enviar notificación de prueba. BANK solo confirma aceptación; comprobar aparte el aviso del sistema, con BANK en segundo plano y luego con sus ventanas cerradas. En Pixel revisar también los permisos de Chrome/BANK a nivel Android.
6. Tocar el aviso y confirmar que abre BANK en /dashboard. Repetir con la PWA instalada.
7. Registrar un ingreso real que el usuario necesite registrar y comprobar el aviso después del éxito. El frontend no dispara una segunda notificación desde el comando financiero: el evento depende del backend después del commit. No crear un ingreso ficticio en producción para esta prueba.
8. Reabrir Configuración: debe indicar registro remoto no verificado. Sincronizar y confirmar que reutiliza el UUID. Cambiar hogar/logout y comprobar que no hay POST automáticos.
9. Denegar permisos y comprobar las instrucciones sin diálogos repetidos; restaurarlos en ajustes y volver a BANK.

iOS/iPadOS normalmente necesita 16.4 o posterior y la app añadida a pantalla de inicio; no se promete soporte en cualquier pestaña Safari. Fuente: [WebKit, requisitos de Web Push](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/).
