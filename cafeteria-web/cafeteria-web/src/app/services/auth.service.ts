// src/app/services/auth.service.ts
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap } from 'rxjs'; // BehaviorSubject para estado reactivo
import { PedidoService } from './pedido.service'; // Para llamar al endpoint de login

export interface UserProfile {
  username: string;
  nombre_completo: string;
  rol: 'registrado' | 'empleado' | 'admin' | null;
  sucursal_asignada_id: number | null;
  // token?: string; // Si usas JWT
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private currentUserSubject = new BehaviorSubject<UserProfile | null>(null);
  public currentUser$: Observable<UserProfile | null> = this.currentUserSubject.asObservable();

  private pedidoService = inject(PedidoService);
  private router = inject(Router);

  constructor() {
    const storedUser = localStorage.getItem('currentUserNoSQLatte');
    if (storedUser) {
      this.currentUserSubject.next(JSON.parse(storedUser));
    }
  }

  getCurrentUser(): UserProfile | null {
    return this.currentUserSubject.value;
  }

  isLoggedIn(): boolean {
    return !!this.currentUserSubject.value;
  }

  hasRole(roles: Array<'registrado' | 'empleado' | 'admin'>): boolean {
    const user = this.getCurrentUser();
    return !!user && roles.includes(user.rol!);
  }

  // Método para obtener la sucursal asignada
  getSucursalAsignadaId(): number | null {
    const user = this.getCurrentUser();
    return user ? user.sucursal_asignada_id : null;
  }

  login(credentials: { username: string, password: string }): Observable<any> {
    return this.pedidoService.login(credentials).pipe(
      tap((response: any) => {
        if (response && response.user) { // Asume que el backend devuelve { message: '...', user: UserProfile }
          this.currentUserSubject.next(response.user);
          localStorage.setItem('currentUserNoSQLatte', JSON.stringify(response.user));
        } else {
          // Manejar respuesta de login fallido sin 'user' si es necesario
          this.currentUserSubject.next(null);
        }
      })
    );
  }

  // NUEVO MÉTODO: registrar
  register(userData: any): Observable<any> {
    // userData debe tener username, password, nombre_completo.
    // rol y sucursal_asignada_id serán manejados por el backend (rol por defecto 'registrado')
    return this.pedidoService.register(userData); // Asume que PedidoService tiene este método
  }

  logout(): void {
    localStorage.removeItem('currentUserNoSQLatte');
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }
}