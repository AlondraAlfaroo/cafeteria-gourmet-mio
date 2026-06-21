// src/app/services/pedido.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ProductoMenu } from '../models/producto-menu.interface'; // <-- AÑADE ESTA LÍNEA

// --- NUEVAS INTERFACES PARA ESTADÍSTICAS (SE EXPORTAN DESDE AQUÍ) ---
export interface ProductoStats {
  producto: string;
  total_cantidad_vendida: number; // Asegúrate de que el backend los devuelva como Number o String
  total_ingresos: number; // Asegúrate de que el backend los devuelva como Number o String
}

export interface CategoriaStats {
  categoria: string;
  total_cantidad_vendida: number;
  total_ingresos: number;
}

export interface ResumenSucursal {
  sucursal_id: number;
  totalVentas: number;
  totalPedidos: number;
}

@Injectable({
  providedIn: 'root'
})
export class PedidoService {
  private apiUrl = 'http://localhost:3000/api'; // URL de tu backend

  constructor(private http: HttpClient) { }

  getSucursales(): Observable<number[]> {
    return this.http.get<number[]>(`${this.apiUrl}/sucursales`);
  }

  getPedidosPorSucursal(sucursalId: number): Observable<any[]> { // 'any[]' para simplificar, puedes crear una interfaz Pedido
    return this.http.get<any[]>(`${this.apiUrl}/pedidos/sucursal/${sucursalId}`);
  }

  // Nuevo método para registrar pedidos que maneja inventario
  registrarPedido(pedido: any): Observable<any> { // El backend ahora espera producto_id
    return this.http.post<any>(`${this.apiUrl}/pedidos`, pedido);
  }

  getProductosPorSucursal(sucursalId: number): Observable<ProductoMenu[]> { // ProductoMenu es la interfaz que definiste
    return this.http.get<ProductoMenu[]>(`${this.apiUrl}/productos/sucursal/${sucursalId}`);
  }

  register(userData: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/auth/register`, userData);
  }

  getProductosCatalogoGeneral(): Observable<Partial<ProductoMenu>[]> {
    // Usamos Partial<ProductoMenu> porque este endpoint podría no devolver todos los campos
    // de ProductoMenu (ej. cantidad_disponible, esta_activo, ya que son consolidados).
    return this.http.get<Partial<ProductoMenu>[]>(`${this.apiUrl}/catalogo/productos`);
  }

  login(credentials: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/auth/login`, credentials);
  }

  // --- NUEVOS MÉTODOS PARA ESTADÍSTICAS ---
  getEstadisticasPorProductoEnSucursal(sucursalId: number): Observable<ProductoStats[]> {
    return this.http.get<ProductoStats[]>(`${this.apiUrl}/reportes/sucursal/${sucursalId}/productos`);
  }

  getEstadisticasPorCategoriaEnSucursal(sucursalId: number): Observable<CategoriaStats[]> {
    return this.http.get<CategoriaStats[]>(`${this.apiUrl}/reportes/sucursal/${sucursalId}/categorias`);
  }

  getReporteComparativo(): Observable<ResumenSucursal[]> {
    return this.http.get<ResumenSucursal[]>(`${this.apiUrl}/reportes/comparativo`);
  }
}
