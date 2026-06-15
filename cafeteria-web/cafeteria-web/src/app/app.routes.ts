// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { ReportesComponent } from './components/reportes/reportes.component';
import { LoginComponent } from './components/login/login.component';
import { RegistrarPedidoComponent } from './components/registrar-pedido/registrar-pedido.component';
import { adminAuthGuard } from './guards/admin-auth.guard';
import { GestionProductosComponent } from './admin/gestion-productos/gestion-productos.component';
import { authGuard } from './guards/auth.guard';
import { RegisterComponent } from './components/register/register.component';
import { GestionUsuariosComponent } from './admin/gestion-usuarios/gestion-usuarios.component';

export const routes: Routes = [
    { path: '', component: HomeComponent },
    {
        path: 'admin/productos',
        component: GestionProductosComponent,
        canActivate: [adminAuthGuard] // Protegida por el guard de admin
    },
    {
        path: 'admin/usuarios',
        component: GestionUsuariosComponent,
        canActivate: [adminAuthGuard] // Protegida por el guard de admin
    },
    { path: 'registrar-pedido', component: RegistrarPedidoComponent, canActivate: [authGuard] }, // <--- DESCOMENTA Y APLICA
    { path: 'reportes', component: ReportesComponent, canActivate: [authGuard] }, // <--- DESCOMENTA Y APLICA
    { path: 'login', component: LoginComponent },
    { path: 'register', component: RegisterComponent },
    { path: '**', redirectTo: '', pathMatch: 'full' }
];