// src/app/services/admin-user.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UserProfile } from '../services/auth.service'; // Asegúrate que esta ruta sea correcta

@Injectable({ providedIn: 'root' })
export class AdminUserService {
  private apiUrl = '/api/admin/usuarios'; // API para usuarios

  constructor(private http: HttpClient) { }

  getAllUsers(): Observable<UserProfile[]> {
    return this.http.get<UserProfile[]>(this.apiUrl);
  }

  updateUser(username: string, userData: Partial<UserProfile>): Observable<any> {
    return this.http.put(`${this.apiUrl}/${username}`, userData);
  }

  deleteUser(username: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${username}`);
  }

  // Alta de usuario desde el panel de admin: puede crear cualquier rol (registrado/empleado/admin).
  // Usa el endpoint admin-only, NO el de auto-registro público (ese siempre fuerza rol 'registrado').
  registerUser(userData: Partial<UserProfile> & { password?: string, confirmPassword?: string }): Observable<any> {
    return this.http.post(this.apiUrl, userData);
  }
}
