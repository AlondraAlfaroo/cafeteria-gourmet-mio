// src/app/guards/admin-auth.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service'; // Ajusta la ruta si es necesario

declare const M: any;

export const adminAuthGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn() && authService.hasRole(['admin'])) { // Verifica si está logueado Y es admin
    return true;
  } else {
    // Redirigir a login o a una página de acceso denegado
    M.toast({ html: 'Acceso denegado. Se requiere rol de Administrador.', classes: 'red rounded' });
    router.navigate(['/login']);
    return false;
  }
};