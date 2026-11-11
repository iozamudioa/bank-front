# Plan de sobres en una quincena abierta

## Contrato verificado e implementado

El OpenAPI publicado por BANK API incluye la operación upsertPeriodBudgetLine:

```http
PUT /api/v1/households/{householdId}/budget-periods/{periodId}/lines/{envelopeId}
Content-Type: application/json

{
  "amount": 1500.00
}
```

Responde HTTP 200 con BudgetPeriodResponse actualizado. Solo admite periodos OPEN, sobre y cuenta activos del hogar, permisos OWNER/EDITOR e importe no negativo con máximo dos decimales. Cero es válido. No requiere Idempotency-Key porque el PUT sustituye el importe de una sola línea.

La API no modifica la plantilla habitual, otras líneas, otros periodos, saldos ni movimientos. Un 409 puede indicar cierre del periodo o escritura concurrente.

## Flujo disponible

En Crear sobre aparece «Planeado para esta quincena (opcional)» cuando hay una quincena abierta. Se precarga la única abierta, independientemente de un periodo histórico seleccionado en el dashboard. Si hay varias, se exige elegir el destino al capturar un importe. Sin importe se conserva el alta simple; cero se guarda expresamente.

La creación sigue esta secuencia:

1. POST de sobre con los campos originales del catálogo.
2. Conservar el id devuelto por el servidor.
3. Consultar el periodo vigente y comprobar OPEN.
4. PUT de la línea con el importe capturado.
5. Refrescar los datos confirmados y seleccionar la quincena modificada.
6. Cerrar el modal y mostrar el toast de éxito.

Si falla guardar el plan, el modal permanece abierto con un mensaje que informa que el sobre ya fue creado. Sus datos de catálogo quedan bloqueados y el reintento usa el mismo id para guardar únicamente el plan. No se repite POST ni se permite omitir accidentalmente el plan pendiente borrando el importe. El usuario puede corregirlo o elegir otra quincena abierta.

Para sobres existentes, la tarjeta en Sobres ofrece «Plan de quincena». Ese modal carga lo planeado del periodo, permite agregar o cambiar la línea y admite cero. El botón está separado del acceso a Registrar gasto y del enlace Historial.

## Confirmación y conflictos

PeriodPlanWriter consulta getBudgetPeriod antes de cada PUT. Si el estado no es OPEN, no envía la escritura. Ante un 409 vuelve a consultar el periodo y conserva la captura; no hay reintento automático. Si se confirma el cierre, el selector lo identifica y bloquea guardar en ese periodo.

Solo las respuestas del servidor actualizan las líneas de HouseholdStore. Las proyecciones de saldo y los movimientos monetarios no participan en esta operación. Dashboard y Apartar dinero usan las líneas confirmadas del periodo; guardar el presupuesto habitual sigue afectando solamente nuevas quincenas.

## Validación

Las pruebas cubren altas con/sin plan, monto cero, selección de periodo abierto, múltiples periodos, precisión inválida, conexión, recuperación parcial sin duplicar sobres, edición de líneas existentes, conservación de saldos y otras líneas, cierre concurrente y conflictos sin reintento automático.

La verificación HTTP automatizada usa mocks. No se crean sobres ni se modifican presupuestos reales para comprobar el flujo.
