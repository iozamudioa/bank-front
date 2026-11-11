# Contrato consumible por BANK

Generado desde openapi.json. Autenticación global: HTTP Basic.

- `GET /api/v1/households` → `listHouseholds`. Listar mis hogares Respuestas: 200, 401, 500, 503.
- `POST /api/v1/households` → `createHousehold`. Crear hogar Respuestas: 200, 400, 401, 409, 500, 503.
- `GET /api/v1/households/{householdId}` → `getHousehold`. Consultar hogar Respuestas: 200, 401, 403, 404, 500, 503.
- `GET /api/v1/households/{householdId}/accounts` → `listAccounts`. Listar cuentas Respuestas: 200, 401, 403, 404, 500, 503.
- `POST /api/v1/households/{householdId}/accounts` → `createAccount`. Crear cuenta Respuestas: 200, 400, 401, 403, 404, 409, 500, 503.
- `GET /api/v1/households/{householdId}/budget-periods` → `listBudgetPeriods`. Listar quincenas Respuestas: 200, 401, 403, 404, 500, 503.
- `POST /api/v1/households/{householdId}/budget-periods` → `createBudgetPeriod`. Crear quincena Respuestas: 200, 400, 401, 403, 404, 409, 500, 503.
- `GET /api/v1/households/{householdId}/budget-periods/{periodId}` → `getBudgetPeriod`. Consultar quincena Respuestas: 200, 401, 403, 404, 500, 503.
- `POST /api/v1/households/{householdId}/budget-periods/{periodId}/close` → `closeBudgetPeriod`. Cerrar quincena Respuestas: 200, 400, 401, 403, 404, 409, 500, 503.
- `PUT /api/v1/households/{householdId}/budget-periods/{periodId}/lines/{envelopeId}` → `upsertPeriodBudgetLine`. Guardar lo planeado para un sobre Respuestas: 200, 400, 401, 403, 404, 409, 500, 503.
- `GET /api/v1/households/{householdId}/budget-template` → `getBudgetTemplate`. Consultar presupuesto habitual Respuestas: 200, 401, 403, 404, 500, 503.
- `PUT /api/v1/households/{householdId}/budget-template` → `saveBudgetTemplate`. Guardar presupuesto habitual Respuestas: 200, 400, 401, 403, 404, 409, 500, 503.
- `PUT /api/v1/households/{householdId}/budget-template/lines/{envelopeId}` → `upsertTemplateBudgetLine`. Guardar presupuesto habitual de un sobre Respuestas: 200, 400, 401, 403, 404, 409, 500, 503.
- `GET /api/v1/households/{householdId}/dashboard` → `getDashboard`. Consultar dinero total, reservado y libre Respuestas: 200, 401, 403, 404, 500, 503.
- `GET /api/v1/households/{householdId}/envelopes` → `listEnvelopes`. Listar sobres Respuestas: 200, 401, 403, 404, 500, 503.
- `POST /api/v1/households/{householdId}/envelopes` → `createEnvelope`. Crear sobre Respuestas: 200, 400, 401, 403, 404, 409, 500, 503.
- `GET /api/v1/households/{householdId}/income-sources` → `listIncomeSources`. Listar fuentes de ingreso Respuestas: 200, 401, 403, 404, 500, 503.
- `POST /api/v1/households/{householdId}/income-sources` → `createIncomeSource`. Crear fuente de ingreso Respuestas: 200, 400, 401, 403, 404, 409, 500, 503.
- `GET /api/v1/households/{householdId}/members` → `listHouseholdMembers`. Listar integrantes Respuestas: 200, 401, 403, 404, 500, 503.
- `POST /api/v1/households/{householdId}/members` → `addHouseholdMember`. Agregar integrante Respuestas: 200, 400, 401, 403, 404, 409, 500, 503.
- `GET /api/v1/households/{householdId}/movements` → `listMovements`. Consultar historial paginado Respuestas: 200, 400, 401, 403, 404, 500, 503.
- `POST /api/v1/households/{householdId}/movements/account-expenses` → `registerAccountExpense`. Registrar gasto directo de cuenta Respuestas: 200, 400, 401, 403, 404, 409, 500, 503.
- `POST /api/v1/households/{householdId}/movements/account-expenses/preview` → `previewAccountExpense`. Previsualizar gasto directo de cuenta Respuestas: 200, 400, 401, 403, 404, 409, 500, 503.
- `POST /api/v1/households/{householdId}/movements/allocations` → `allocateMoney`. Apartar dinero en un sobre Respuestas: 200, 400, 401, 403, 404, 409, 500, 503.
- `POST /api/v1/households/{householdId}/movements/envelope-transfers` → `transferEnvelopes`. Transferir reserva entre cuentas y sobres Respuestas: 200, 400, 401, 403, 404, 409, 500, 503.
- `POST /api/v1/households/{householdId}/movements/expenses` → `registerExpense`. Confirmar gasto simple o financiado Respuestas: 200, 400, 401, 403, 404, 409, 500, 503.
- `POST /api/v1/households/{householdId}/movements/expenses/preview` → `previewExpense`. Previsualizar gasto y faltante Respuestas: 200, 400, 401, 403, 404, 500, 503.
- `POST /api/v1/households/{householdId}/movements/incomes` → `registerIncome`. Registrar ingreso real Respuestas: 200, 400, 401, 403, 404, 409, 500, 503.
- `POST /api/v1/households/{householdId}/movements/opening-balances` → `registerOpeningBalance`. Registrar saldo inicial real Respuestas: 200, 400, 401, 403, 404, 409, 500, 503.
- `POST /api/v1/households/{householdId}/movements/reallocations` → `reallocateEnvelopes`. Reasignar entre sobres de la misma cuenta Respuestas: 200, 400, 401, 403, 404, 409, 500, 503.
- `POST /api/v1/households/{householdId}/movements/releases` → `releaseReserve`. Liberar reserva Respuestas: 200, 400, 401, 403, 404, 409, 500, 503.
- `POST /api/v1/households/{householdId}/movements/transfers` → `transferAccounts`. Transferir dinero libre entre cuentas Respuestas: 200, 400, 401, 403, 404, 409, 500, 503.
- `GET /api/v1/households/{householdId}/movements/{id}` → `getMovement`. Consultar movimiento Respuestas: 200, 401, 403, 404, 500, 503.
- `POST /api/v1/households/{householdId}/movements/{id}/corrections` → `correctMovement`. Corregir movimiento de forma atomica Respuestas: 200, 400, 401, 403, 404, 409, 500, 503.
- `POST /api/v1/households/{householdId}/movements/{id}/corrections/preview` → `previewMovementCorrection`. Previsualizar correccion de movimiento Respuestas: 200, 400, 401, 403, 404, 409, 500, 503.
- `POST /api/v1/households/{householdId}/movements/{id}/reverse` → `reverseMovement`. Revertir un movimiento Respuestas: 200, 400, 401, 403, 404, 409, 500, 503.
- `GET /api/v1/me` → `getCurrentUser`. Consultar identidad autenticada Respuestas: 200, 401, 500.

## Pantallas y servicios

| Pantalla / servicio               | Operaciones reales utilizadas                                                                                 |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Acceso                            | getCurrentUser, listHouseholds                                                                                |
| Hogar inicial y selector          | createHousehold, listHouseholds                                                                               |
| HouseholdStore / dashboard        | getDashboard, listAccounts, listEnvelopes, listBudgetPeriods                                                  |
| Actividad reciente                | listMovements (page=0, size=5)                                                                                |
| Cuentas                           | createAccount, listAccounts                                                                                   |
| Sobres                            | createEnvelope, listEnvelopes, getBudgetPeriod, upsertPeriodBudgetLine                                        |
| Presupuesto habitual              | getBudgetTemplate, saveBudgetTemplate                                                                         |
| Quincenas                         | listBudgetPeriods, createBudgetPeriod (open=true), closeBudgetPeriod, getBudgetPeriod, upsertPeriodBudgetLine |
| Integrantes                       | listHouseholdMembers, addHouseholdMember                                                                      |
| Fuentes de ingreso                | listIncomeSources, createIncomeSource                                                                         |
| Gasto por sobre o saldo libre     | previewExpense, registerExpense, previewAccountExpense, registerAccountExpense                                |
| Ingresos                          | registerIncome                                                                                                |
| Apartados / liberar               | allocateMoney, releaseReserve                                                                                 |
| Transferencias                    | transferAccounts, reallocateEnvelopes, transferEnvelopes                                                      |
| Saldo inicial                     | registerOpeningBalance                                                                                        |
| Historial, corrección y reversión | listMovements, getMovement, previewMovementCorrection, correctMovement, reverseMovement                       |
| Reportes                          | Sin endpoint de reportes: estado de capacidad no disponible                                                   |

getBudgetPeriod comprueba el estado vigente antes de guardar un plan y permite revisar un conflicto. getMovement consulta el detalle vigente antes de editar y evita corregir una fila obsoleta; getHousehold sigue generado para consultas específicas.

Los parámetros de listMovements son periodId/accountId/envelopeId/page/size. Las fuentes completas se envían en fundingSources; todas las operaciones monetarias requieren Idempotency-Key excepto preview. El contrato incluye permisos y errores por operación en openapi.json.
