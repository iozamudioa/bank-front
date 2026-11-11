# Arquitectura de BANK

Angular 22.2, TypeScript estricto, componentes standalone y rutas lazy. No se usan NgModules propios ni estado global externo. Cada componente tiene HTML y SCSS separados. El root coordina sesión y layout; las pantallas se cargan bajo router-outlet.

## Responsabilidades

- `BankApi`: HttpClient tipado y generado; ninguna regla de negocio.
- `HouseholdStore`: Signals para hogar, cuentas, sobres, periodos y dashboard. Una revisión invalida lecturas de actividad. El selector de quincena solo modifica presentación. Una secuencia de peticiones evita que respuestas de un hogar anterior sustituyan las actuales.
- `ExpenseFacade`: preview, selección de financiamiento, validación orientativa decimal y confirmación. El backend determina elegibilidad y valida saldos, periodos, permisos y transacciones.
- `FinancialCommand`: estado por formulario para revisión/confirmación/idempotencia. Captura datos y hogar al revisar; no crea una nueva clave en reintentos inciertos.
- `OperationSafety`: evita navegación y cambio de hogar durante una confirmación pendiente. También solicita advertencia de beforeunload. No sustituye persistencia transaccional.
- Componentes específicos para cada operación; no existe un formulario con campos de todas las operaciones.
- `Theme`: localStorage únicamente para preferencia de tema; media query con listener para automático.

El catálogo y los formularios CRUD llaman a métodos tipados, nunca usan HttpClient directamente. La lógica de dinero vive en la facade y en el backend. Las páginas manejan validación de presentación y coordinación.

## Operaciones

Gasto: seleccionar sobre/importe → POST preview → mostrar faltante y fuentes → cubrir importe exacto incluyendo el principal → confirmación con clave UUID → POST gasto → recuperar datos del servidor. Los cálculos locales son proyecciones y no se persisten como saldos.

0/409/5xx: no reintentar automáticamente, conservar clave y datos, bloquear edición y ofrecer reintento explícito. 409 también invalida las lecturas de saldos. La API no distingue todos los conflictos mediante códigos estables, por lo que se conserva la operación para evitar duplicados. 400: error definitivo de datos o saldo insuficiente; requiere nuevo preview. La idempotencia no reemplaza la validación del backend.

El historial usa filtros AND del servidor antes de paginar. No deriva totales familiares de una página incompleta ni trata reasignaciones como gastos. Muestra cada gasto una vez. Actividad reciente y Tu actividad reutilizan MovementRow: icono por tipo, concepto, sobre o cuenta (origen → destino en transferencias), fecha y usuario; descripción independiente, importe con signo y columnas de acciones alineadas. Las reversiones identifican el movimiento original mediante reversalOf: reutilizan la página cargada o consultan getMovement si está fuera de ella. En móvil la descripción pasa debajo del concepto para mantener visibles importe y acciones. La fila no despliega un detalle. Revertir abre ReverseForm en un modal, consulta el movimiento vigente y exige motivo y quincena abierta antes de revisar y confirmar una única reversión idempotente.

## PWA y seguridad

El service worker contiene solo assetGroups estáticos; no dataGroups. Navegación /api excluida. No hay persistencia de saldos ni gastos offline. El banner identifica datos potencialmente desactualizados al perder conectividad.

HTTP Basic, según OpenAPI: credenciales y cabecera solo en memoria, únicamente al origen/ruta de API configurados. Cerrar sesión limpia el estado. Producción requiere TLS. No hay tokens inventados, registro de usuarios ni secretos en environments.

El cliente usa número JSON conforme al backend. Las entradas restringen el tamaño para mantener centavos en el rango representable. Queda pendiente negociar transporte decimal como string o un parser lossless para balances de magnitud extrema, que el backend permite por encima de las capacidades habituales de number.

## Diseño

Tokens CSS globales para superficies, texto, líneas y acentos. Layout mobile-first con navegación fija inferior; sidebar en pantallas grandes. Los formularios usan etiquetas, focus visible, controles táctiles, validación cercana y estados loading/error/empty. La creación se presenta en modales de Angular Material con foco contenido, restauración del foco y bloqueo del scroll de fondo. Las confirmaciones financieras permanecen dentro del modal.

Los tests HTTP verifican la coordinación financiera. La validación visual, lectores de pantalla, instalación física y flujos autenticados necesitan una siguiente verificación con el entorno de usuario.

## Modales globales

ModalService carga de forma diferida el contenedor y cada formulario. Registrar gasto y Nuevo movimiento están disponibles en el header de escritorio y mediante MobileQuickActions en móvil, sin navegar. Cuentas, sobres, quincenas, integrantes, fuentes de ingreso y hogar inicial tienen formularios de creación separados de sus listados.

ModalShell usa MatDialog para accesibilidad y scroll; ModalState protege el guardado de catálogos. Escape, el fondo y el botón de cierre solo cierran cuando no hay solicitudes de creación ni operaciones financieras pendientes. OperationSafety.modalOpen evita abrir dos modales, cambiar de hogar o navegar mientras están abiertos. Las altas completadas cierran el modal después de actualizar los datos; los errores se conservan en el formulario. El modal de movimientos mantiene los formularios financieros específicos y sus claves idempotentes.

## Sistema de paletas

Se conserva un único servicio Theme y se extraen modelos tipados, almacenamiento y utilidades puras. El catálogo define los cuatro juegos de colores y sus roles. createTokens deriva superficies y tonos con contraste para los dos modos; los estados financieros conservan semántica independiente de la paleta.

applyTheme aplica los tokens --bank-* y atributos data-palette/data-theme al documento. Se usa tanto desde Theme como desde el arranque síncrono theme-bootstrap.ts, compilado a public/theme-init.js. La preferencia persistida es bank.theme.preferences.v1 con paletteId y mode. La UI ofrece únicamente Claro/Oscuro; el valor interno system sigue admitiéndose para compatibilidad y seguimiento del dispositivo. Tanto el bootstrap como Theme inician desde la apariencia actual del dispositivo, conservando la paleta, y un evento del sistema sustituye cualquier elección manual de la sesión. Los valores no válidos no se aplican como CSS.

Los selectores usan grupos nativos de radio para navegación por teclado, foco visible e identificación textual del estado seleccionado. PalettePreview aísla sus tokens en un contenedor para previsualizar otra paleta sin modificar el documento. Apariencia está aislada de los servicios financieros.

Angular Material consume los mismos roles mediante las APIs públicas de Sass en html; los overlays heredan los cambios sin recreación. Los estilos de la pantalla de acceso se separan en src/styles/_login.scss manteniendo su alcance bajo app-root.

Las pruebas incluyen ocho juegos de tokens, contraste de texto/acciones/estado/foco, persistencia, corrupción, listeners, selección desde UI sin HTTP ni cambio de quincena y cambio de paleta con un modal abierto. El check de arranque ejecuta el mismo bundle previo a Angular en 24 combinaciones de preferencias y dispositivo.

## Iconografía

Un componente Icon standalone renderiza Material Symbols Rounded mediante una fuente WOFF2 local. IconName se deriva de un catálogo único en core/icons; el compilador rechaza nombres no incluidos. Las pantallas importan el componente sin duplicar reglas de fuente, tamaño o selección. Los iconos son decorativos y usan currentColor, con nombres accesibles en los controles que los contienen.

El script icons:update genera el subconjunto desde el catálogo, registra la procedencia y conserva la licencia Apache 2.0. La fuente está versionada, precargada y incluida en assetGroups del service worker; no hay dependencias externas durante el uso ni cambios en el caché financiero. icons:check comprueba que catálogo y fuente local estén sincronizados.

## Cabecera y footer de movimientos

ModalShell permite un layout framed para Nuevo movimiento: altura limitada al viewport y cuerpo sin scroll exterior. MovementDialog distribuye cabecera de pestañas, detalle desplazable y footer con flex; los formularios específicos reciben embedded=true y presentan solo sus campos en el detalle.

MovementFooter coordina la presentación de Revisar operación, resumen y Aceptar con el formulario activo mediante MovementFormView. Observa statusChanges y libera la suscripción al cambiar de operación. Delega review/confirm/cancel a los mismos componentes y FinancialCommand; no replica reglas financieras ni genera claves nuevas. Los formularios fuera de este modal mantienen sus botones inline.

## Cambio de quincena con confirmación

PeriodOpening separa la coordinación de apertura/cierre del formulario PeriodCreate. Consulta primero los periodos reales, valida el traslape y captura una solicitud inmutable. Solo después de un Sí explícito vuelve a consultar, verifica que no haya nuevos periodos abiertos sin autorizar, cierra los aprobados secuencialmente y crea la nueva quincena. No hace escrituras después de No o de un error de validación/cierre.

ModalState bloquea el cierre mientras hay una petición en curso. La confirmación muestra las fechas reales y enfoca No por defecto. Si falla una segunda llamada después de un cierre exitoso, muestra el resultado parcial y refresca el estado. Es coordinación frontend con los endpoints existentes; no constituye una transacción atómica de backend.

MovementFooter usa projectMovement para una proyección de presentación de los siete comandos. Calcula con Decimal, no escribe en HouseholdStore y congela la estimación al revisar para no aplicar dos veces el importe tras un reintento incierto. Los saldos desconocidos se muestran como no disponibles. El resumen puede desplazarse en pantallas pequeñas y las acciones quedan fuera de su contenedor de scroll. MoneyInput es un ControlValueAccessor compartido por los siete formularios y Registrar gasto: formatea la vista en MXN y mantiene cadenas decimales en el formulario; no redondea entradas inválidas.

PeriodOpening consulta la plantilla junto con los periodos antes de cualquier cierre. La ausencia de plantilla (404 en su GET) genera un mensaje específico en el modal. No impone un ingreso esperado o un plan positivo: admite cero conforme al contrato actualizado. La verificación se repite en la confirmación; no se interpreta un 404 de otros recursos como falta de presupuesto. Dashboard deriva las barras de los saldos actuales y las líneas del periodo seleccionado, limita solo el ancho y mantiene visible el saldo que excede el plan.

ModalViewport se aplica como hostDirective de ModalShell para cubrir todas las altas y operaciones. Observa resize/scroll de VisualViewport, ajusta el wrapper de CDK al área visible y limita el alto del shell; agrupa las actualizaciones con requestAnimationFrame. Conserva el campo enfocado desplazando solo los contenedores del modal y elimina listeners y frames al destruirse. La meta viewport solicita interactive-widget=resizes-content cuando el navegador lo soporta.

MobileQuickActions despliega dos botones con iconos y nombres accesibles sobre la barra inferior; mantiene los bloqueos de OperationSafety, cierra con Escape o toque exterior y delega los mismos modales existentes. Las tarjetas de sobres usan botones nativos para abrir el gasto con envelopeId; el enlace Historial queda fuera del botón para evitar aperturas involuntarias.

createIdempotencyKey utiliza randomUUID cuando existe y, en HTTP sobre IP local, genera un UUID v4 a partir de getRandomValues. Se comparte entre ExpenseFacade y FinancialCommand. Las pruebas cubren consulta de gasto, confirmación y reintento con la misma clave sin randomUUID. La verificación en Chrome usa un origen HTTP no seguro y un API simulado, sin escrituras financieras reales.

El hover de Tus sobres se aplica al fondo de envelope-entry, detrás del contenido; el botón superpuesto permanece transparente. applyTheme sincroniza theme-color con surface para igualar la cabecera. El manifiesto y el HTML tienen colores iniciales de Calcite claro y el arranque aplica inmediatamente la paleta y el modo del dispositivo.

ModalState.complete devuelve un ModalResult con successMessage mediante el cierre del shell. ModalService espera afterClosed, libera modalOpen y publica el toast: cancelar o cerrar sin resultado no notifica. Todos los formularios de creación usan la misma vía; ExpenseFacade y FinancialCommand completan solo después de confirmar y refrescar, liberando OperationSafety antes del cierre. Durante el envío protegen también ModalState.busy. Los errores no llaman complete ni publican toast.

ToastService conserva hasta tres mensajes, usa temporizadores con limpieza al destruirse y permite cierre manual. ToastOutlet permanece fuera del contenido de los modales, anuncia el resultado con role=status y usa los tokens de éxito del tema. Los formularios financieros fuera de un modal conservan su feedback inline.

PeriodPlanFields comparte la selección de periodos OPEN y la captura monetaria entre EnvelopeCreate y EnvelopePlanDialog. PeriodPlanWriter consulta getBudgetPeriod, verifica el estado y envía upsertPeriodBudgetLine; en un conflicto consulta de nuevo y espera un reintento explícito. Solo recuerda periodos confirmados del servidor y no calcula ni modifica saldos. EnvelopeCreate conserva el EnvelopeResponse del alta si la planificación falla y bloquea los campos de catálogo para reintentar únicamente el PUT. Los dos flujos completan por ModalState después del refresco y conservan errores locales.

## Preparación guiada de quincena

Al crear una quincena, PeriodCreate devuelve su ID junto con el éxito. ModalService espera el cierre, publica el toast y carga PeriodSetup en un modal ancho con cabecera y footer fijos. El historial de periodos OPEN permite volver a abrir la guía. No requiere endpoints nuevos ni ejecuta movimientos sin confirmación.

PeriodSetup reutiliza IncomeForm, TransferForm, AllocationForm y MovementFooter. Permite varios ingresos y transferencias, omitir pasos, recorrer los sobres activos con cuenta activa y revisar pendientes al final. Precarga el plan completo de cada sobre mediante AllocationForm.fillPlannedAmount, igual que Nuevo movimiento; el faltante se muestra por separado con Decimal y no reduce el importe predeterminado; nunca persiste balances locales ni interpreta omitir como apartado exitoso. La selección de quincena queda fijada al ID de la guía y los formularios rechazan revisar contra otro periodo.

DialogTabs comparte la barra de pestañas de Nuevo movimiento y Cargar y distribuir saldos, incluidos iconos, selección, flechas sin scrollbar y navegación por teclado.

Un ModalState local recibe las confirmaciones de los formularios, publica el toast y limpia el ingreso/transferencia o avanza al siguiente sobre. El estado busy se propaga al shell y OperationSafety conserva los bloqueos de revisión y reintento. La lista de sobres conserva la última lectura durante refresh para no destruir el comando en vuelo; después se sustituye por los datos del servidor. Los errores no avanzan ni notifican éxito.

Crear sobre dentro de la guía usa EnvelopeCreate con planPeriodId fijo y monto obligatorio (incluido cero). Primero crea el catálogo, después guarda la línea del plan con PeriodPlanWriter, y finalmente incorpora ese sobre al recorrido para confirmar el apartado por separado. Si falla el plan, el formulario conserva el ID creado y permite reintentar solo su guardado. La guía no es una transacción conjunta: los movimientos ya confirmados permanecen al cerrar o interrumpirla, y al reabrir se consulta el estado real.

La página de Presupuesto y quincenas muestra únicamente el historial. Sus acciones superiores abren Abrir quincena, Presupuesto habitual (reutiliza BudgetEditor en modo embedded) y Cargar y distribuir saldos. La guía usa el periodo seleccionado si está OPEN o la primera abierta disponible; con ninguna abierta el botón se deshabilita. El cierre de un periodo también pide confirmación en un modal. Guardar la plantilla y cerrar el periodo mantienen el patrón de errores locales y éxito mediante cierre y toast.

## Gasto directo y corrección de movimientos

El contrato de 36 operaciones añade gasto libre de cuenta y correcciones atómicas. El generador respeta oneOf/anyOf/allOf: MovementReplacementRequest es una unión discriminada de las ocho variantes de la API. Los archivos generados no se editan manualmente.

ExpensePage mantiene el acceso desde un sobre precargado y permite seleccionar saldo libre de cuenta. ExpenseFacade elige previewExpense/registerExpense o previewAccountExpense/registerAccountExpense y construye cuerpos separados sin campos de la otra operación. El saldo libre procede del dashboard y la revisión de cuenta muestra total/libre antes y después, sin inventar reservas. El preview de cuenta se comprueba antes de habilitar confirmar. El cuerpo se copia al revisar y se congela al primer envío, incluyendo fundingSources, para mantener exactamente el mismo POST y clave en reintentos inciertos.

Movements muestra Editar para POSTED que no sean OPENING_BALANCE ni REVERSAL. MovementEdit recupera getMovement y vuelve a comprobar elegibilidad. Reconstruye los recursos desde los efectos auditados y conserva la fuente de ingreso y las aportaciones completas de gastos. El ingreso puede proceder de un periodo cerrado; compensación y reemplazo se registran en un OPEN elegido explícitamente, sin cambiar el periodo histórico consultado.

La edición reutiliza IncomeForm, AllocationForm, ReleaseForm, TransferForm, ReallocationForm y EnvelopeTransferForm como captura embedded. reviewAction redirige también Enter al preview de corrección, por lo que esos formularios no lanzan altas financieras accidentales. En la edición de apartados se desactiva la precarga de plan para conservar el importe del movimiento al cambiar el sobre. Los gastos permiten editar aportaciones sin restringirse al saldo actual: la API evalúa el efecto neto incluyendo la compensación.

MovementEdit consulta previewMovementCorrection y muestra exclusivamente sus efectos netos before/change/after. FinancialCommand captura un único correctMovement con motivo y reemplazo completo; nunca concatena reverse y otra alta ni suma los efectos virtuales del reemplazo. Durante revisión y confirmación protege edición/cierre y mantiene clave/cuerpo en 0/409/5xx. Los errores conservan el formulario; el éxito refresca el servidor, cierra el modal y notifica mediante toast. El historial se invalida mediante HouseholdStore.revision y muestra el motivo de correcciones enlazadas.

EnvelopeCreate envía habitualAmount junto al catálogo y captura cuerpo/clave para reintentar exactamente el alta en 0/409/5xx, bloqueando edición/cierre hasta resolver. HabitualPlan usa únicamente upsertTemplateBudgetLine y refresca los sobres; nunca reconstruye ni reemplaza la plantilla completa. Se conserva el PUT explícito de periodo para Solo esta quincena. El contrato se tomó de docs/openapi/bank-api-v1.yaml del backend porque el proceso local todavía servía la versión anterior. Dashboard observa carga, errores y bloqueos antes de redirigir a setup cuando falta OPEN; no crea ni reabre periodos automáticamente.

Actividad reciente utiliza canCorrect y ModalService.editMovement como el listado de Movimientos. El lápiz Material Symbols local tiene nombre accesible y se deshabilita mientras hay un modal u operación pendiente. La revisión de cero conserva recursos explícitos de MovementResponse.replacement; las aportaciones de un gasto corregido a cero se envían vacías y se muestra el neto devuelto por la API.
