# Capacidades pendientes

## No disponibles en el OpenAPI real

- Editar o archivar cuentas y sobres, editar fuentes de ingreso y hogares.
- Endpoint individual de cuenta/sobre. El detalle disponible se muestra desde los listados y el historial filtrado.
- Invitaciones por correo, alta de credenciales, recuperación de contraseña, tokens, refresh de sesión. Agregar un integrante solo crea membresía.
- Abrir un DRAFT existente, reabrir un periodo cerrado y modificar las fechas o el ingreso esperado de un periodo existente.
- Dashboard con resumen por quincena, compromisos pendientes, dinero disponible después de compromisos, aportado/gastado por sobre y acumulados históricos. La respuesta real solo contiene total, reserved, free y accounts. No se inventan cifras.
- Reportes agregados y gráficos financieros consolidados. No se suman páginas incompletas para presentar métricas falsas.
- Filtros de fecha y tipo de movimiento en servidor. Solo existen periodId, accountId y envelopeId. No hay total, cursor ni número de páginas; se usa navegación anterior/siguiente según tamaño recibido.
- Fecha de gasto seleccionable: occurredAt lo fija el servidor.
- Proyección de saldos o token de versión en preview. Se muestran estimaciones decimales orientativas, sin afirmar que reservan dinero.
- Persistencia del progreso del asistente y borradores de formulario. Los datos guardados sí se recargan; campos no guardados se conservan al cambiar de paso mientras el asistente sigue abierto.

## Pendientes de verificación / frontend

- Prueba de punta a punta con usuario HTTP Basic y hogar autorizado: no se entregaron credenciales. No se hicieron escrituras de dinero real para probar.
- Revisión visual en navegador, dispositivos móviles, contraste automatizado/lector de pantalla e instalación PWA física.
- Parser JSON decimal lossless para saldos de magnitud extrema (el backend admite 32 dígitos enteros). Las entradas del frontend se limitan a 13 dígitos y usan decimal.js para proyecciones.
- Recuperación segura de claves idempotentes después de cerrar forzosamente el navegador. Actualmente permanecen en memoria, con bloqueo de navegación y advertencia de cierre mientras existe confirmación pendiente.
- No se proporciona reporte agregado local ni se confunde free con dinero libre después de compromisos futuros.
- No hay un flujo de cambio de hogar sin hogar existente adicional desde el menú; el alta inicial se ofrece al no existir hogares, y la selección permite alternar entre los existentes.

## Soportado, no pendiente

Presupuesto habitual por sobre integrado con habitualAmount en el alta atómica, Idempotency-Key estable y upsertTemplateBudgetLine para cambiar solo su línea sin quincena. El cliente se generó del YAML exportado actualizado (37 operaciones); la instancia local consultada todavía publicaba el contrato anterior y requiere reinicio.

Registrar gasto permite seleccionar sobre o saldo libre de cuenta, con preview y confirmación propios. Movimientos ofrece Editar para operaciones POSTED corregibles, precarga sus datos desde getMovement y usa exclusivamente previewMovementCorrection y correctMovement. Incluye todos los tipos corregibles, financiación completa de gastos y cambio de origen de un gasto entre cuenta y sobre. No permite editar saldo inicial, reversiones ni movimientos REVERSED.

El contrato sí ofrece múltiples fuentes en gastos (misma cuenta), transferencias de cuentas, transferencias de sobres entre cuentas, liberación de reservas, saldo inicial y reversión. Tienen flujos separados en el frontend. Los errores de permisos siguen siendo autoridad del backend; OWNER agrega integrantes, OWNER/EDITOR registra movimientos y VIEWER consulta.

## Planear un sobre nuevo en una quincena ya abierta

Implementado con upsertPeriodBudgetLine del OpenAPI actualizado: crear un sobre puede guardar su plan opcional en una quincena abierta, y las tarjetas de sobres permiten agregar o editar ese plan. Guardar la plantilla sigue sin modificar periodos existentes. El contrato y la recuperación parcial están en [OPEN_PERIOD_ENVELOPE_PLAN.md](OPEN_PERIOD_ENVELOPE_PLAN.md).
