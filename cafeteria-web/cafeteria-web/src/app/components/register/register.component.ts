// src/app/components/register/register.component.ts
import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router'; // RouterLink para el enlace a Login
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

declare var M: any;

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink], // Añade RouterLink
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'] // Crea este archivo si lo necesitas
})
export class RegisterComponent {
  userData = { username: '', password: '', confirmPassword: '', nombre_completo: '' };
  errorMessage: string | null = null;
  successMessage: string | null = null;

  private authService = inject(AuthService);
  private router = inject(Router);

  onSubmit(): void {
    this.errorMessage = null;
    this.successMessage = null;

    if (!this.userData.username || !this.userData.password || !this.userData.nombre_completo || !this.userData.confirmPassword) {
      this.errorMessage = 'Por favor, completa todos los campos.';
      M.toast({ html: this.errorMessage, classes: 'red rounded' });
      return;
    }
    if (this.userData.password.length < 6) {
      this.errorMessage = 'La contraseña debe tener al menos 6 caracteres.';
      M.toast({ html: this.errorMessage, classes: 'red rounded' });
      return;
    }
    if (this.userData.password !== this.userData.confirmPassword) {
      this.errorMessage = 'Las contraseñas no coinciden.';
      M.toast({ html: this.errorMessage, classes: 'red rounded' });
      return;
    }

    this.authService.register(this.userData).subscribe({
      next: (response) => {
        this.successMessage = response.message || 'Registro exitoso. ¡Ahora puedes iniciar sesión!';
        M.toast({ html: this.successMessage, classes: 'green rounded' });
        // Opcional: limpiar formulario o redirigir a login
        this.userData = { username: '', password: '', confirmPassword: '', nombre_completo: '' };
        this.router.navigate(['/login']);
      },
      error: (err: any) => {
        this.errorMessage = err.error?.error || 'Error desconocido al registrar usuario.';
        M.toast({ html: this.errorMessage, classes: 'red rounded' });
        console.error('Error de registro:', err);
      }
    });
  }
}