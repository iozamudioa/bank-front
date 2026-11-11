import { Pipe, PipeTransform } from '@angular/core';
@Pipe({ name: 'statusLabel' })
export class StatusLabel implements PipeTransform {
  transform(value: string): string {
    return (
      (
        {
          OPEN: 'Abierta',
          CLOSED: 'Cerrada',
          DRAFT: 'Borrador',
          POSTED: 'Registrado',
          REVERSED: 'Revertido',
          OWNER: 'Propietario',
          EDITOR: 'Editor',
          VIEWER: 'Solo consulta',
        } as Record<string, string>
      )[value] || value
    );
  }
}
