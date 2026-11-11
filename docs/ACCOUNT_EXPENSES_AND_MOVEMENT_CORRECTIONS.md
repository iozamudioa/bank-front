# Gastos directos de cuenta y corrección de movimientos

> Estado 2026-11-11: la API ya implementa gasto directo de cuenta y corrección atómica, con sus previews. El contenido siguiente conserva la propuesta original como antecedente; el contrato vivo y la entrega de API son la referencia para la integración de frontend, ahora implementada en Registrar gasto y Editar movimiento.

## Revisión del contrato en ejecución

Se consultó http://127.0.0.1:8080/v3/api-docs y se revisaron ExpenseRequest, MovementController y MovementService del backend local.

Las dos capacidades solicitadas todavía no están disponibles:

- ExpenseRequest requiere periodId, targetEnvelopeId y amount. No contiene accountId como origen alternativo. La cuenta de pago siempre se obtiene del sobre principal.
- previewExpense y registerExpense necesitan ese sobre. Las fuentes adicionales también son sobres de la misma cuenta.
- MovementController expone consulta, creación por tipo y reverseMovement; no publica PUT/PATCH ni una operación de corrección o reemplazo.
- reverseMovement genera la operación inversa y conserva el original como REVERSED. No recibe valores nuevos para sustituir el movimiento.

No se han modificado saldos ni movimientos reales para realizar esta revisión. Las rutas siguientes son propuestas para el backend, no endpoints existentes.

## Gasto directo desde una cuenta

Propuesta: incorporar una operación con una solicitud explícita de cuenta, manteniendo compatible el gasto actual por sobres:

```http
POST /api/v1/households/{householdId}/movements/account-expenses
Idempotency-Key: <uuid>
Content-Type: application/json

{
  "periodId": "quincena-abierta",
  "accountId": "cuenta",
  "amount": 150.00,
  "description": "Gasto directo"
}
```

Reglas propuestas:

- OWNER/EDITOR y quincena OPEN; cuenta activa del hogar.
- Importe positivo con las reglas decimales actuales.
- Consumir únicamente dinero libre, manteniendo intactas las reservas de los sobres. Validar amount <= account.free dentro de la transacción.
- Reducir el total real y el dinero libre de la cuenta por el importe; conservar los saldos de los sobres.
- Guardar un gasto auditado con efecto de cuenta, sin targetEnvelopeId, sin funding de sobres y sin envelopeEffects.
- Reutilizar MovementResponse y EXPENSE si el backend adopta esa representación. Documentar el origen de cuenta para su consulta, filtro, reversión y corrección.
- Mantener la misma garantía de Idempotency-Key y revalidación concurrente de los otros comandos monetarios.
- Ofrecer un preview de solo lectura con cuenta, total/libre actuales e importes resultantes, sin donantes ni liberaciones implícitas de reserva.

Cuando exista el contrato, Registrar gasto podrá permitir elegir «Desde un sobre» o «Desde una cuenta». El resumen de cuenta mostrará el dinero libre y el total resultante.

## Corrección segura de movimientos

Para permitir editar importe, cuentas, sobres, fuentes y descripción, se recomienda una operación de corrección auditada y atómica. Encadenar reverseMovement y otro POST desde el frontend deja un resultado parcial si falla la segunda solicitud.

Propuesta ilustrativa:

```http
POST /api/v1/households/{householdId}/movements/{id}/corrections
Idempotency-Key: <uuid>
Content-Type: application/json

{
  "periodId": "quincena-abierta",
  "reason": "Corrección de captura",
  "replacement": {
    "type": "INCOME",
    "accountId": "cuenta",
    "amount": 1200.00,
    "description": "Ingreso corregido"
  }
}
```

El contrato debe definir DTOs por tipo, con los campos y validaciones correspondientes a INCOME, ALLOCATE, RELEASE, REALLOCATE, EXPENSE, TRANSFER y ENVELOPE_TRANSFER. La propuesta inicial conserva el tipo original. El gasto directo deberá incluirse cuando se agregue.

Requisitos:

- Permisos de escritura y recursos del mismo hogar; rechazar originales ya revertidos y movimientos REVERSAL.
- Registrar la corrección en una quincena OPEN sin reabrir ni reescribir periodos cerrados. Conservar la fecha y el historial del original.
- Aplicar de forma atómica la compensación del original y los efectos del reemplazo; si falla cualquier validación, conservar todo el estado anterior.
- Validar el resultado final de cuentas, reservas y sobres frente a los saldos actuales. No aceptar correcciones que dejen saldos negativos ni reservas superiores al total real.
- No introducir como requisito un saldo intermedio artificial al deshacer y rehacer: por ejemplo, corregir al alza un ingreso puede ser válido por su efecto neto aunque el ingreso anterior ya se haya utilizado.
- Conservar trazabilidad entre original, compensación y reemplazo; devolver esos vínculos y los efectos confirmados.
- Mantener Idempotency-Key para que los reintentos inciertos no compensen ni registren dos veces.
- Definir conflictos concurrentes y revalidar dentro de la transacción.
- Exponer un preview de corrección con los efectos netos antes/cambio/después para revisar antes de confirmar.

El saldo inicial necesita una regla adicional si se decide incluirlo: actualmente solo puede registrarse una vez en la historia de la cuenta, incluso después de revertirlo. No se propone eludir esa restricción.

## Integración del frontend posterior al cambio de API

1. Regenerar el cliente desde el OpenAPI publicado.
2. Agregar la selección cuenta/sobre en Registrar gasto y mostrar la disponibilidad correspondiente.
3. Incorporar «Editar» en Actividad para los movimientos que la API declare corregibles.
4. Precargar datos originales, capturar el motivo y revisar los efectos netos.
5. Confirmar mediante una sola operación de corrección con clave estable.
6. Refrescar datos y mostrar el toast después de cerrar el modal; conservar el error en el modal si falla.

Pruebas necesarias: gasto directo con saldo libre suficiente/insuficiente, reservas intactas, gasto sin sobre, permisos, periodo cerrado, corrección de cada tipo, resultado neto, preservación de otros movimientos, rechazo de doble reversión, conflictos y replay de la misma clave.
