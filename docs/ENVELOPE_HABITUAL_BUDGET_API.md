# Presupuesto habitual administrado desde sobres

> Actualización: el contrato exportado de BANK API implementa el alta atómica con habitualAmount, el PUT de línea habitual y la idempotencia del alta. El frontend ya los consume. La propuesta original se conserva abajo como antecedente. La instancia local en :8080 todavía publicaba el contrato anterior al verificar esta integración.

## Verificación del contrato y código actuales

Verificado el 2026-11-11 contra GET http://127.0.0.1:8080/v3/api-docs y el código local de BANK API. Se hicieron únicamente lecturas; no se crearon sobres ni se guardaron planes reales.

- POST /api/v1/households/{householdId}/envelopes recibe name, accountId, type y category. No acepta un monto habitual. SetupService.createEnvelope guarda el sobre con balance cero, sin crear ni modificar presupuesto.
- GET /budget-template devuelve el presupuesto habitual o 404 si todavía no existe.
- PUT /budget-template recibe expectedIncome y allocations completos. BudgetService.saveTemplate construye una lista nueva y reemplaza todas las líneas. No ofrece una actualización aislada por sobre, revisión del documento o If-Match que impida sobrescribir una edición concurrente leída antes.
- PUT /budget-periods/{periodId}/lines/{envelopeId} modifica únicamente el snapshot de una quincena OPEN. No modifica la plantilla habitual y no sirve para el alta inicial sin quincena.
- BudgetService.createPeriod exige una plantilla existente y copia expectedIncome y lines. No exige expectedIncome > 0. SaveBudgetRequest permite cero.
- Se corrigió el bloqueo anterior de PeriodOpening: una plantilla con líneas positivas ya puede abrir una quincena aunque expectedIncome = 0. Si no hay plantilla o tanto ingreso esperado como planes están en cero, continúa el aviso. No se inventan ingresos ni se crea una plantilla mediante este preflight.

El contrato vivo también incluye los cuatro endpoints nuevos: preview y confirmación de gastos de cuenta, y preview y confirmación de correcciones. Ya se integraron en Registrar gasto y Editar movimiento; esta propuesta se limita al presupuesto habitual por sobre.

## Qué puede hacerse con la API actual

Se puede componer POST sobre → GET plantilla → PUT plantilla completa, creando una plantilla si falta. No es una operación atómica: puede quedar el sobre sin plan si falla el segundo guardado, y un GET seguido de PUT puede perder cambios de otro usuario en otros sobres. El bloqueo interno de saveTemplate serializa las escrituras, pero no detecta que el cuerpo completo procede de una lectura antigua.

Por ello, para que crear/editar un sobre gestione solo su presupuesto habitual y conserve los otros sobres, se propone la ampliación siguiente. No se han añadido campos ni endpoints inexistentes al cliente.

## Contrato propuesto para BANK API

Prefijo H = /api/v1/households/{householdId}. Nombres y respuestas de esta sección son una propuesta, todavía no implementada.

### 1. Crear sobre con presupuesto habitual en una sola transacción

Ampliar POST H/envelopes:

```json
{
  "name": "Central de Abastos",
  "accountId": "account-cash",
  "type": "SPENDING",
  "category": "Alimentación",
  "habitualAmount": 4500.0
}
```

habitualAmount es el importe planeado por quincena, numérico, no negativo y con máximo dos decimales, sin redondeo. Cero es válido y distinto de un plan todavía sin configurar. La nueva interfaz lo pedirá siempre; para compatibilidad puede ser opcional para clientes anteriores.

Si se envía habitualAmount, la misma transacción debe:

1. Validar permisos OWNER/EDITOR, hogar y cuenta activa.
2. Crear el sobre con balance real reservado de $0.00.
3. Crear la plantilla si no existe, con expectedIncome = 0 y su primera línea.
4. Insertar la línea habitual del sobre si la plantilla ya existe, conservando las demás líneas y expectedIncome.
5. Confirmar catálogo y plantilla juntos o revertir ambos.

Coordinar con saveTemplate y createPeriod mediante el mismo bloqueo/revisión del hogar. Si se crea una quincena al mismo tiempo, el snapshot debe ver el alta completa antes o después, nunca un sobre a medio registrar. Mantener unicidad de plantilla por hogar y de línea por sobre.

Para reintentos seguros del alta, admitir Idempotency-Key con almacenamiento y replay de la respuesta, en la misma transacción. Repetir la misma clave/cuerpo devuelve el mismo sobre; otros datos con la misma clave producen 409. No basta con devolver 409 en caso de duplicado de nombre.

Respuesta: EnvelopeResponse extendida con habitualAmount (number | null) confirmado. Alternativamente devolver una respuesta compuesta explícita con envelope y budgetTemplate; el contrato debe permitir comprobar ambos resultados. No representar el monto habitual con balance.

### 2. Actualizar solo el plan habitual de un sobre

```http
PUT H/budget-template/lines/{envelopeId}
Content-Type: application/json

{"amount": 4800.00}
```

Respuesta propuesta: BudgetTemplateResponse actualizado.

Reglas:

- Funciona aunque no haya ninguna quincena.
- Crea la plantilla si no existe, con expectedIncome = 0.
- Inserta o reemplaza exclusivamente la línea indicada.
- Conserva las demás líneas y el ingreso esperado existente.
- Valida permisos y sobre/cuenta activos del mismo hogar, importe >= 0 y precisión.
- Usa el mismo bloqueo/revisión que las otras escrituras de plantilla; no recibe una copia de las líneas ajenas.
- PUT idempotente, sin necesidad de clave financiera.
- No cambia balances, reservas, movimientos ni quincenas ya creadas.

Añadir habitualAmount al listado de sobres, o garantizar su consulta por GET budget-template para combinar por envelopeId sin necesitar una quincena abierta. Una única fuente de verdad: la línea habitual; el campo de respuesta puede derivarse de ella. Evitar dos montos independientes que puedan desincronizarse.

### 3. Abrir quincena desde el plan de sobres

La quincena copia las líneas habituales confirmadas. No requiere capturar otra vez la plantilla ni un ingreso esperado manual mayor a cero. expectedIncome puede seguir en cero si no se planificaron ingresos; no sustituirlo por la suma de gastos.

Si se conserva la regla de no abrir una quincena sin presupuesto, definirla respecto al plan de los sobres (por ejemplo, al menos una línea activa positiva), con error estable y mensaje específico. Esa validación de negocio debe estar también en API, no solo en frontend. Es un cambio propuesto: el backend actual solo comprueba la existencia de plantilla.

Un campo de consulta como plannedTotal puede mostrar la suma de las líneas con aritmética decimal. Es presupuesto destinado, no ingreso esperado ni dinero depositado.

Mantener el snapshot: editar lo habitual afecta nuevas quincenas. Para aplicar también un importe a la quincena actualmente OPEN se usa expresamente el endpoint ya existente de líneas del periodo; nunca cambiar periodos cerrados ni actualizarlo implícitamente.

## Resultado de interfaz al disponer del contrato

- Crear sobre siempre muestra «Planeado por quincena» desde la configuración inicial.
- La tarjeta del sobre muestra su plan habitual y permite editarlo sin una quincena.
- Si hay una quincena abierta, se distingue «Habitual» de «Solo esta quincena» y se solicita expresamente aplicar al periodo actual.
- Se elimina la captura separada obligatoria de «Tu presupuesto habitual». Ese modal puede conservarse como resumen, no como un paso necesario para comenzar.
- Abrir quincena copia los planes y continúa a Cargar y distribuir saldos.
- Guardar planes nunca registra ingresos ni apartados; estos se confirman en la guía financiera.
- El preflight ya acepta líneas positivas sin ingreso esperado > 0; al disponer del alta atómica podrá usar el plan desde la configuración inicial.

## Criterios de aceptación para backend

- Alta inicial sin plantilla ni quincenas crea un sobre y su línea habitual; balance cero.
- Alta sobre una plantilla existente conserva todas las líneas y expectedIncome.
- Fallo al guardar la plantilla revierte el alta completa.
- Replay del alta no crea dos sobres ni dos líneas.
- Editar una línea habitual no elimina ni modifica otras, incluso con escrituras concurrentes.
- Cuenta/sobre inactivos, otro hogar o permisos insuficientes no producen escrituras.
- Cero se conserva expresamente; negativos o más de dos decimales se rechazan.
- Abrir la primera quincena copia los montos habituales sin crear depósitos, reservas o movimientos.
- Edición posterior del habitual conserva los snapshots históricos y la quincena abierta.
- Pruebas transaccionales con Mongo real cubren rollback, replay, unicidad y concurrencia con createPeriod y saveTemplate.
