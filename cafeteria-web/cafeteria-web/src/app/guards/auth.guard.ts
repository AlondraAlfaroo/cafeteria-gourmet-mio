// src/app/guards/auth.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service'; // Asegúrate que la ruta sea correcta

declare const M: any; // Para Materialize toasts

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) { // Verifica si el usuario está logueado
    return true; // Si está logueado, permite el acceso
  } else {
    // Si no está logueado, muestra un toast y redirige a la página de login
    M.toast({ html: 'Debes iniciar sesión para acceder a esta página.', classes: 'orange rounded', displayLength: 4000 });
    router.navigate(['/login']);
    return false; // Bloquea el acceso
  }

  if (authService.isLoggedIn() && authService.hasRole(['admin'])) { // <-- VERIFICACIÓN CLAVE
    return true; // PERMITE EL ACCESO
  } else {
    M.toast({ html: 'Acceso denegado. Se requiere rol de Administrador.', classes: 'red rounded' });
    router.navigate(['/login']); // <-- REDIRECCIONA A /login si no es admin
    return false;
  }
};