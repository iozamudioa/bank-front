# BANK Front v1

PWA Angular 22 standalone para finanzas del hogar. Cada peso tiene su destino.

## Ejecutar

Requiere Node **24.15+** (rama 24), 22.22.3+ (rama 22) o 26+, y npm. TypeScript 6.0, Angular 22.2 y RxJS 7.8. Compatibilidad: https://angular.dev/reference/versions.

```powershell
npm.cmd ci
npm.cmd start
```

Abrir http://localhost:4200. En shells sin la restricción de scripts de PowerShell puede usarse `npm start`. Los scripts npm encuentran el Node 24.15 instalado como dependencia de desarrollo; no modifican el Node del sistema. La primera instalación con Node 24.14 puede advertir EBADENGINE: se recomienda actualizarlo antes de instalar.

BANK API debe estar en http://localhost:8080. Se verificó acceso a `/v3/api-docs` y respuesta 401 de `/api/v1/me` sin credenciales. **Es necesario un usuario HTTP Basic configurado por el administrador del backend.** No se incluyen usuarios, contraseñas de ejemplo ni login simulado.

## Qué está implementado

- Acceso HTTP Basic con credenciales solo en memoria, sin almacenamiento persistente.
- Layout adaptable: sidebar, navegación inferior móvil y acceso al gasto.
- Temas claro y oscuro; al abrir la app y cuando cambia el dispositivo, se toma su apariencia.
- Hogares: consulta, selección y creación cuando no existe uno.
- Asistente por pasos: integrantes, cuentas, ingresos esperados, sobres, plantilla/quincena y saldo inicial. Los formularios se conservan al cambiar de paso durante la sesión; los registros guardados se recuperan de la API.
- Consulta y creación de cuentas, sobres y fuentes de ingreso; alta de integrantes.
- Dashboard con dinero total, físico, digital, reservado, libre, sobres y actividad reciente.
- Plantilla habitual editable, creación de quincena OPEN con snapshot, consulta histórica y cierre confirmado.
- Gasto con preview real, faltante, varias fuentes de la misma cuenta, proyección orientativa y confirmación del backend.
- Ingresos, apartados, liberaciones, reasignaciones, transferencias de cuentas y de sobres entre cuentas, saldo inicial y reversión.
- Historial paginado (25 elementos), filtros de cuenta/sobre/quincena y fuentes auditadas de cada gasto.
- Prevención de doble envío, manejo de errores, bloqueos durante operaciones inciertas y actualización de saldos tras confirmar.
- Manifest, iconos y Angular Service Worker limitado a recursos estáticos.

No se presentan ceros ficticios cuando una consulta falla. El dinero libre es el valor `free` del backend; no se presenta como disponibilidad después de compromisos futuros, que el dashboard actual no proporciona.

## API y ambientes

`proxy.conf.json` envía `/api/**` a localhost:8080 en desarrollo, sin cambiar el backend. Base URL en `src/environments/environment.ts` y `environment.production.ts`; por defecto se usa mismo origen. En producción configura un reverse proxy de `/api/**` hacia BANK API. Si se usa otro origen, el backend debe habilitar CORS explícitamente. Usa HTTPS para HTTP Basic en despliegues.

Cliente tipado generado a partir de la copia real `openapi.json` (BANK API 1.0.0). No editar `core/api/generated`. El generador local cubre las operaciones y esquemas presentes en ese contrato y falla en compilación cuando cambian los tipos; revisar el generador si el contrato incorpora otras construcciones OpenAPI.

```powershell
npm.cmd run api:fetch
npm.cmd run api:generate
npm.cmd run build
```

El generador emite todos los métodos, DTOs, parámetros y encabezados requeridos; usa timeout de 20 segundos. El catálogo de respuestas y métodos está en [FRONTEND_API_MAPPING](docs/FRONTEND_API_MAPPING.md); los códigos 400/401/403/404/409/500/503 tienen mensajes uniformes.

## Verificación

```powershell
npm.cmd test
npm.cmd run build
npm.cmd run pwa:check
npm.cmd run format:check
```

Vitest con HttpTestingController: tema, importes, dashboard, quincenas, formulario de gasto, financiamiento múltiple, idempotencia, errores de red, conflictos, bloqueo de navegación y recarga tras movimiento. Los mocks se usan solo en pruebas.

La API de lectura OpenAPI fue comprobada. No se ejecutaron operaciones financieras reales ni pruebas autenticadas porque no se proporcionaron credenciales. No se verificó visualmente en un navegador ni se probó instalación en un dispositivo físico.

## PWA de producción

`npm run build` produce `dist/bank/browser`. Sirve esa carpeta sobre HTTPS o localhost, con fallback de rutas a `index.html`, excepto `/api/**`. Prueba el build de producción: el service worker está desactivado durante `ng serve`.

La configuración `ngsw-config.json` no contiene data groups. No se cachean saldos, movimientos ni respuestas autenticadas. Sin conexión se identifica que los datos visibles pueden estar desactualizados y se bloquea confirmar dinero; no existe cola offline.

Las claves idempotentes y credenciales permanecen en memoria. Ante 0/409/5xx se mantiene la misma operación, se bloquea cambiar de hogar/pantalla y se permite reintento explícito con la misma clave. En 409 se recargan los saldos. No se deduce la causa del conflicto leyendo mensajes del backend. Un 400 definitivo permite corregir y recalcular. Evita cerrar la pestaña durante una confirmación incierta: se solicita la advertencia nativa del navegador, pero no existe recuperación durable de esa clave después de terminar el proceso.

## Estructura

```text
src/app/
  core/
    api/generated/           DTOs y cliente desde OpenAPI
    auth/                    Credenciales en memoria
    config/                  Hogar, conectividad, protección de operaciones
    errors/                  Mensajes de error
    theme/                   Preferencias y detección del sistema
  shared/utils/              Importes decimales
  features/
    onboarding/              Hogar inicial y asistente modular
    dashboard/               Resumen y actividad reciente
    accounts/                Cuentas y saldos iniciales
    envelopes/               Sobres
    income-sources/          Catálogo de ingresos
    members/                 Integrantes
    budgets/                 Plantilla presupuestal
    budget-periods/           Historial, creación y cierre
    expenses/                Página, facade, selección de financiamiento
    income/                  Registro de ingresos
    allocations/             Apartados y liberaciones
    transfers/               Tres operaciones separadas
    movements/               Historial, ejecución y reversión
    settings/                Preferencias y configuración
src/environments/
public/icons/
scripts/
docs/
```

Para una feature nueva: añadir una carpeta, componentes standalone con HTML/SCSS separados, facade para coordinar lógica, métodos del cliente generado y ruta `loadComponent`. Probar las reglas que afectan dinero con HTTP de pruebas. Nunca guardar saldos calculados en el frontend. Los importes de entrada se limitan a 13 dígitos enteros y 2 decimales para el transporte JSON numérico; proyecciones y sumas usan decimal.js, y el backend conserva la autoridad.

Pendientes y límites: [PENDING_BACKEND_FEATURES](docs/PENDING_BACKEND_FEATURES.md). Diseño técnico: [ARCHITECTURE](docs/ARCHITECTURE.md).

## Creación y operaciones en modales

En escritorio, Registrar gasto y Nuevo movimiento están juntos en el header y funcionan desde cualquier pantalla. En móvil se accede desde un FAB + situado sobre la navegación inferior: despliega dos acciones solo con iconos y etiquetas accesibles. Desde un sobre se abre el gasto con ese destino seleccionado. Los botones Crear cuenta, Crear sobre y Abrir una quincena abren formularios modales; lo mismo aplica al hogar inicial, integrantes y fuentes de ingreso.

Los modales respetan los temas, adaptan su tamaño al dispositivo, bloquean el scroll de fondo y contienen el foco. Se cierran con el botón, Escape o el fondo cuando no hay un guardado/confirmación pendiente. Al completar una creación, gasto o movimiento se recargan los datos, se cierra el modal y se muestra un toast de éxito. Los errores permanecen dentro del modal y no generan toast. Cerrar un formulario sin guardar descarta sus campos.

## Paletas y apariencia

En **Configuración → Apariencia** puedes elegir Calcite, Seashell Garnet Afternoon, Honey Opal Sunset o Yacht Club. La paleta y el modo (Claro u Oscuro) son independientes. Elegir otra combinación es inmediato, no recarga la página, no necesita recompilación ni cambia el hogar, la quincena o las consultas financieras.

El servicio central existente `Theme` usa Signals de preferencias, paleta, modo seleccionado y modo efectivo. `ThemeStorageService` guarda exclusivamente `{ paletteId, mode }` bajo `bank.theme.preferences.v1`. Se reconoce la preferencia anterior `bank-theme` y se traduce `auto` a `system`. La paleta se recupera al iniciar; el modo inicial siempre sigue el dispositivo. Una elección manual dura durante la sesión hasta el siguiente cambio del dispositivo. El almacenamiento bloqueado, JSON corrupto y valores desconocidos tienen un fallback seguro a Calcite y la apariencia del sistema.

### Agregar una paleta

1. Abre `src/app/core/theme/catalog/theme-palettes.catalog.ts`.
2. Agrega una entrada `palette(...)` con ID único, nombre, descripción, colores base en formato `#RRGGBB` y sus roles `primary`, `secondary`, `accent`, `paper` e `ink`. El helper produce `lightTokens`, `darkTokens` y `previewColors`.
3. No cambies el servicio ni los selectores: leen el catálogo automáticamente. Si necesitas una dirección visual especial, la interfaz `ThemePalette` también permite definir ambos juegos de tokens explícitamente en esa misma definición.
4. Ejecuta `npm run theme:generate`, `npm test` y `npm run build`. Extender el catálogo forma parte del build normal; los usuarios pueden alternar después entre sus paletas sin recompilar.

Los tonos de acción se derivan de los originales para mantener contraste; las muestras conservan los colores originales completos. Éxito usa verde, advertencia ámbar y error rojo, independientemente de la identidad de la paleta.

### Tokens y Angular Material

Toda la interfaz consume variables `--bank-*`: primary/on-primary, secondary, accent, background, surface/surface-variant, text/text-muted, border/control-border, hover, focus, success/warning/danger y sus contenedores. Hay tokens adicionales para tarjetas destacadas, overlays y elevación. No se introducen colores literales en los SCSS de componentes.

`src/styles.scss` conecta estos roles con `mat.theme-overrides` y los overrides públicos de botones, diálogos y tooltips. Se aplican en `html`, por lo que también los heredan menús y overlays montados fuera del árbol de la pantalla. Cambiar paleta conserva un modal que ya esté abierto.

Las combinaciones principales de texto se comprueban a 4.5:1 y los bordes/foco de controles a 3:1. Referencias: [contraste de texto WCAG 2.2](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) y [contraste no textual](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html). Esto verifica los tokens; no sustituye una auditoría completa con dispositivos y lectores de pantalla.

### Inicialización sin parpadeo

`src/app/core/theme/theme-bootstrap.ts` reutiliza catálogo, lectura validada y aplicación de tokens del servicio. `npm run theme:generate` produce `public/theme-init.js`, incluido de forma síncrona en el head antes de iniciar Angular. No editar ese archivo generado. Los scripts start/build/watch/test lo regeneran automáticamente. El script usa el esbuild ya incluido por el builder Angular, sin agregar dependencias.

`npm run theme:check` verifica el arranque sin Angular con las 24 combinaciones de paleta/modo/dispositivo, almacenamiento bloqueado y preferencias inválidas. La PWA incluye el script en su caché estática; no cambia su política de datos financieros.

## Iconos de Google

BANK utiliza **Material Symbols Rounded** en navegación, header, dashboard, movimientos, creación, confirmaciones, modales y selectores de apariencia. La identidad tipográfica BANK se conserva.

El componente standalone `Icon` de `shared/components/icon` centraliza tamaños, peso y relleno. Importa el componente y usa, por ejemplo:

```html
<button (click)="guardar()">
  <app-icon name="save" size="sm" />
  Guardar
</button>
```

Los nombres permitidos están tipados en `core/icons/icon-names.ts`. Los iconos heredan el color semántico de su contenedor, incluidas todas las paletas y ambos modos. Se admite `[filled]="seleccionado"` y tamaños xs/sm/md/lg/xl/hero. Son decorativos (`aria-hidden`): conserva el texto del botón o un `aria-label` en el control cuando tenga únicamente un icono.

La fuente WOFF2 está alojada en `public/fonts`, con preload y caché estática de la PWA. No se hacen solicitudes a Google durante el uso de BANK. Su subconjunto actual ocupa aproximadamente 7 KB.

Para agregar un icono:

1. Busca su nombre en [Google Fonts Icons](https://fonts.google.com/icons).
2. Agrégalo al catálogo `ICON_NAMES`.
3. Ejecuta `npm run icons:update` con conexión. Descarga el subconjunto oficial y su licencia; no se ejecuta automáticamente en builds.
4. Ejecuta `npm run icons:check` y `npm run build`.

La procedencia y nombres incluidos quedan registrados en `public/fonts/material-symbols.source.json`; la licencia Apache 2.0 se conserva en `public/fonts/LICENSE.txt`. Integración basada en la [guía oficial de Material Symbols](https://developers.google.com/fonts/docs/material_symbols).

En el modal Nuevo movimiento, las operaciones se muestran arriba como pestañas horizontales con desplazamiento mediante flechas laterales, sin barra visible. El modal usa el mismo ancho de escritorio que Registrar gasto (1050 px), limitado al espacio disponible en móvil. Apartar dinero es la primera pestaña y se abre por defecto; cambiar de pestaña conserva los campos capturados durante la sesión del modal. Las flechas, Inicio y Fin permiten navegar con teclado. El cambio de operación se bloquea mientras existe una confirmación financiera pendiente.

El modal Nuevo movimiento mantiene el título y las pestañas en la cabecera fija. Solo el detalle de campos se desplaza; el footer permanece visible con Revisar operación y, después de revisar, Aceptar y Volver a editar. El resumen de importe y origen/destino se muestra junto a la confirmación. Cada formulario conserva sus validaciones y su comando idempotente. Las confirmaciones inciertas mantienen bloqueados el cierre, el cambio de pestaña y la edición.

## Apertura de una nueva quincena

Al confirmar fechas, BANK consulta las quincenas actuales. Si ya hay una abierta, muestra sus fechas y pregunta si estás de acuerdo en cerrarla antes de abrir la nueva. **No** cancela el cambio sin modificar quincenas; **Sí** vuelve a validar, cierra las anteriores confirmadas y después crea y selecciona la nueva. Si hubiera varias abiertas, la alerta enumera todas antes de pedir autorización.

Se comprueban fechas sin traslape antes de cualquier cierre. Si aparece otra quincena abierta mientras se muestra la alerta, se requiere una nueva confirmación. No se permiten dobles envíos. Saldos y remanentes permanecen intactos.

La API ofrece cierre y creación por separado: si el cierre se completa pero la apertura falla, se informa el resultado parcial y se recarga el estado real. No hay rollback automático ni reapertura de periodos cerrados.

La selección de fechas de Abrir quincena usa un único componente de rango: un solo campo y un solo calendario para elegir primero el inicio y luego el fin. El selector compartido DateRangeSelector integra Reactive Forms, etiquetas en español de México y fechas locales YYYY-MM-DD; no convierte los días a UTC. Un rango incompleto o inválido impide abrir la quincena.

Antes de aceptar cualquiera de los siete movimientos se muestra el cambio con signo y el total resultante de cada sobre o cuenta afectado. Apartar/liberar modifica la reserva y el dinero libre, conservando el total de cuenta; transferir sobres entre cuentas muestra ambos efectos. Son estimaciones con aritmética decimal, fijadas al revisar; la API valida y devuelve los saldos definitivos. Los importes se capturan con signo de pesos, separador de miles y dos decimales al salir del campo, conservando valores decimales sin formato para el envío.

La apertura verifica que exista un presupuesto habitual antes de pedir el cierre de la quincena anterior y nuevamente antes de cerrarla. Acepta ingreso esperado cero y planes en cero según la API; si no existe plantilla, muestra un aviso para configurar un plan habitual desde los sobres.

Tus sobres compara el saldo actual con el monto planeado del periodo seleccionado mediante una barra sin porcentaje visible. El ancho llega como máximo al total de la barra y cualquier excedente aparece como Extra en pesos; sin plan se indica la ausencia del monto, sin inventar porcentajes.

En móvil, el dashboard oculta el consejo «Un pequeño hábito…» y el resumen «¿Dónde está tu dinero?». Configuración tiene un icono junto al selector de tema en la cabecera; se elimina el indicador En línea en todos los tamaños, conservando el aviso de desconexión.

Tocar un sobre en el dashboard o su tarjeta en Sobres abre Registrar gasto con ese destino precargado, mostrando su nombre, cuenta y saldo disponible. Historial conserva un enlace independiente; el importe se captura manualmente. Si el periodo seleccionado estaba cerrado, el gasto selecciona una quincena abierta cuando existe.

Todos los formularios modales comparten ModalViewport: adapta el contenedor al alto y desplazamiento de VisualViewport, usa innerHeight como respaldo y mantiene visible el campo enfocado con scroll dentro del modal. El footer de movimientos se adapta al espacio disponible para mantener las acciones accesibles durante la captura móvil.

El gasto y los otros comandos generan claves de idempotencia UUID v4 con Web Crypto también al acceder por una IP local HTTP: usan getRandomValues si randomUUID no está disponible. El reintento conserva la misma clave y datos. El gasto no muestra el bloque introductorio «Gasta con claridad»; el formulario ocupa el ancho disponible antes de la revisión.

En móvil se oculta también la tarjeta Tu quincena (A TU RITMO). La barra de los navegadores compatibles recibe el color surface de la paleta activa a través de theme-color, actualizado al cambiar modo o paleta. El tema mostrado solo ofrece Claro/Oscuro, se inicializa desde el dispositivo y atiende sus cambios incluso tras una elección manual.

El login móvil prioriza el formulario en la primera pantalla: marca compacta, campos y botón de acceso sin el bloque promocional grande. Se elimina del login el aviso técnico de HTTP Basic y el selector de tema; la apariencia sigue usando el tema del dispositivo.

Las notificaciones de éxito se presentan en un toast global accesible después de cerrar el modal, tanto en escritorio como en móvil. Se pueden cerrar manualmente y desaparecen a los seis segundos. Los errores y las confirmaciones inciertas mantienen el modal abierto, sus mensajes locales y la clave de idempotencia para reintentar.

Crear sobre permite capturar opcionalmente lo planeado para una quincena abierta. Si hay una sola se precarga; con varias se elige el destino. El importe se guarda por separado del saldo y admite cero. Si falla el plan después del alta, el modal conserva el sobre creado y reintenta solo guardar su planificación, sin duplicarlo. Para sobres existentes, **Sobres → Plan de quincena** permite agregar o actualizar el importe. Solo se modifican líneas de periodos abiertos; la plantilla habitual y el dinero real permanecen independientes.

Después de abrir una quincena se inicia **Cargar y distribuir saldos**: registrar uno o varios ingresos → transferir entre cuentas → recorrer los sobres para apartar dinero → revisar pendientes. Cada movimiento muestra su resultado estimado y requiere confirmación. Se pueden omitir pasos y agregar un sobre con su plan para esa misma quincena. El importe de apartado se precarga con el plan completo del sobre para esa quincena; el saldo y el faltante se muestran por separado, los pasos omitidos o con saldo pendiente se distinguen en la revisión. Desde el historial de quincenas abiertas se puede volver a iniciar la guía. Cerrar la guía conserva las operaciones ya confirmadas.

Registrar gasto permite elegir **Desde un sobre** o **Saldo libre de una cuenta**. El segundo usa solo dinero sin reservar y muestra los saldos total/libre resultantes antes de confirmar. Las reservas de los sobres se conservan.

En Movimientos, **Editar** abre un modal con los datos actuales y un motivo obligatorio. Soporta ingresos, apartados, liberaciones, reasignaciones, transferencias de cuentas/sobres y gastos; los gastos permiten cambiar entre sobre y cuenta y conservar o ajustar sus aportaciones. La revisión consulta los efectos netos al servidor y la confirmación es una sola corrección atómica. No se editan saldos iniciales, reversiones ni movimientos ya revertidos. Las correcciones sobre movimientos históricos se registran en una quincena abierta sin reescribir el original.

Crear sobre incluye Planeado habitual por quincena desde el inicio y lo guarda en el mismo POST con clave idempotente. Las tarjetas muestran habitualAmount y permiten editarlo con Plan habitual, sin quincena; Solo esta quincena sigue siendo un ajuste independiente. Dashboard redirige a /setup si no hay una OPEN, incluso cuando existen periodos cerrados. El asistente no permite finalizar sin una abierta.

## Docker

Dockerfile y compose.yaml incluidos. Consulta [el despliegue de la PWA](docs/DEPLOYMENT.md) para configurar BANK_API_URL y adaptar el Compose que vive fuera del repositorio.
