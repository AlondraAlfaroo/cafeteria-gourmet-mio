// src/app/services/admin-producto.service.ts
import { Injectable } from '@angular/core'; // 'inject' no es necesario si usas constructor para HttpClient
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ProductoMenu } from '../models/producto-menu.interface'; // Asegúrate que esta ruta sea correcta

@Injectable({ providedIn: 'root' })
export class AdminProductoService {
  private apiUrl = '/api/admin/productos'; // URL base para admin de productos

  constructor(private http: HttpClient) { }

  getProductosPorSucursal(sucursalId: number): Observable<ProductoMenu[]> {
    return this.http.get<ProductoMenu[]>(`${this.apiUrl}/sucursal/${sucursalId}`);
  }

  getProducto(sucursalId: number, productoId: string): Observable<ProductoMenu> {
    return this.http.get<ProductoMenu>(`${this.apiUrl}/${sucursalId}/${productoId}`);
  }

  altaProducto(productoData: Partial<ProductoMenu> & { sucursal_id: number, cantidad_disponible_inicial: number }): Observable<any> {
    return this.http.post(this.apiUrl, productoData);
  }

  modificarProducto(sucursalId: number, productoId: string, productoData: Partial<ProductoMenu>): Observable<any> {
    // Los datos que se envían en el cuerpo del PUT solo deben ser los que se modifican.
    // sucursalId y productoId ya van en la URL.
    // No necesitamos desestructurar sucursal_id de productoData porque no debería estar ahí.
    // Excluimos producto_id (ya que está en la URL) y cantidad_disponible (se maneja por separado).
    const { producto_id: p_id, cantidad_disponible, ...dataToUpdate } = productoData;

    // Asegúrate de que dataToUpdate solo contenga los campos que tu backend espera para una actualización.
    // Por ejemplo, si solo permites modificar nombre, categoría, descripción, precio, esta_activo:
    const payload = {
      nombre_producto: dataToUpdate.nombre_producto,
      categoria: dataToUpdate.categoria,
      descripcion: dataToUpdate.descripcion,
      precio_unitario: dataToUpdate.precio_unitario,
      esta_activo: dataToUpdate.esta_activo
      // No incluimos cantidad_disponible aquí, se usa ajustarInventario para eso.
    };

    return this.http.put(`${this.apiUrl}/${sucursalId}/${productoId}`, payload);
  }

  ajustarInventario(sucursalId: number, productoId: string, nuevaCantidad: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${sucursalId}/${productoId}/inventario`, { nuevaCantidad });
  }

  cambiarEstadoActivo(sucursalId: number, productoId: string, estaActivo: boolean): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${sucursalId}/${productoId}/estado`, { estaActivo });
  }
}
