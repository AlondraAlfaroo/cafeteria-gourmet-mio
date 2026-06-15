// src/app/services/admin-user.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UserProfile } from '../services/auth.service'; // Asegúrate que esta ruta sea correcta

@Injectable({ providedIn: 'root' })
export class AdminUserService {
  private apiUrl = 'http://localhost:3000/api/admin/usuarios'; // API para usuarios
  private authApiUrl = 'http://localhost:3000/api/auth'; // API para auth/register y auth/login

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

  // >>>>>> ESTA ES LA FUNCIÓN QUE PROBABLEMENTE FALTABA <<<<<<
  // Llama al endpoint /api/auth/register en tu backend
  registerUser(userData: Partial<UserProfile> & { password?: string, confirmPassword?: string }): Observable<any> {
    // El backend espera username, password, nombre_completo, rol, sucursal_asignada_id
    // Los campos password y confirmPassword solo se enviarán en alta.
    return this.http.post(`${this.authApiUrl}/register`, userData);
  }
}
