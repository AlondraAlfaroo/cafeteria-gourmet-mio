import { Pipe, PipeTransform } from '@angular/core';
import { nombreSucursal } from './sucursales';

@Pipe({
  name: 'nombreSucursal',
  standalone: true,
})
export class NombreSucursalPipe implements PipeTransform {
  transform(id: number | null | undefined): string {
    return nombreSucursal(id);
  }
}
