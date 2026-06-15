// src/app/components/login/login.component.ts
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

declare var M: any;

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  // styleUrls: []
})
export class LoginComponent {
  credentials = { username: '', password: '' };
  errorMessage: string | null = null;
  private authService = inject(AuthService);
  private router = inject(Router);

  onSubmit(): void {
    this.errorMessage = null;
    if (!this.credentials.username || !this.credentials.password) {
      this.errorMessage = 'Por favor, ingresa usuario y contraseña.';
      M.toast({ html: this.errorMessage, classes: 'red rounded' });
      return;
    }
    this.authService.login(this.credentials).subscribe({
      next: (response) => {
        M.toast({ html: response.message || 'Login exitoso!', classes: 'green rounded' });
        this.router.navigate(['/']); // Redirigir a Home o a un dashboard
      },
      error: (err: any) => {
        this.errorMessage = err.error?.error || 'Error en el login. Verifica tus credenciales.';
        M.toast({ html: this.errorMessage, classes: 'red rounded' });
        console.error('Error de login:', err);
      }
    });
  }
}