import { HttpErrorResponse } from '@angular/common/http';
export function errorMessage(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) return 'No se pudo completar la operación.';
  return (
    (
      {
        0: 'No se pudo conectar con BANK. Comprueba la conexión.',
        400: 'Revisa los datos y los saldos disponibles.',
        401: 'Introduce las credenciales válidas de BANK API.',
        403: 'No tienes permisos para esta acción.',
        404: 'El recurso ya no está disponible.',
        409: 'El saldo cambió. Revisa nuevamente la operación.',
        500: 'La confirmación es incierta. Reintenta con los mismos datos.',
        503: 'BANK no está disponible. Reintenta con los mismos datos.',
      } as Record<number, string>
    )[error.status] || 'No se pudo completar la operación.'
  );
}
