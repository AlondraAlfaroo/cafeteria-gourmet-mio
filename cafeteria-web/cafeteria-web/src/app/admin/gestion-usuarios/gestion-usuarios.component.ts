// src/app/admin/gestion-usuarios/gestion-usuarios.component.ts
import { Component, OnInit, AfterViewInit, ElementRef, inject, ChangeDetectorRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { UserProfile } from '../../services/auth.service';
import { AdminUserService } from '../../services/admin-user.service';
import { PedidoService } from '../../services/pedido.service';
import { AuthService } from '../../services/auth.service';

declare var M: any;

@Component({
  selector: 'app-gestion-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gestion-usuarios.component.html',
  styleUrls: ['./gestion-usuarios.component.css']
})
export class GestionUsuariosComponent implements OnInit, AfterViewInit {
  @ViewChild('formUsuarioModal') formUsuarioModal!: NgForm;

  usuarios: UserProfile[] = []; // Lista original de usuarios cargados
  usuariosFiltrados: UserProfile[] = []; // Lista de usuarios después de aplicar filtros

  rolesDisponibles: Array<UserProfile['rol']> = ['registrado', 'empleado', 'admin'];
  sucursalesDisponibles: number[] = [];

  // Propiedades para los filtros de usuarios
  filtroUsername: string = '';
  filtroNombreCompleto: string = '';
  filtroRol: string = ''; // 'registrado', 'empleado', 'admin', o '' para todos
  filtroSucursalAsignada: number | null = null; // null para "Todas las Sucursales"

  formUsuario: Partial<UserProfile> & { password?: string, confirmPassword?: string } = {
    username: '',
    nombre_completo: '',
    password: '',
    confirmPassword: '',
    rol: 'registrado',
    sucursal_asignada_id: null
  };
  esModoEdicionUsuario = false;
  modalUsuarioInstancia: any;
  isLoadingUsuarios = false;

  private adminUserService = inject(AdminUserService);
  public authService = inject(AuthService);
  private pedidoService = inject(PedidoService);
  private elementRef = inject(ElementRef);
  private cdr = inject(ChangeDetectorRef);

  constructor() { }

  ngOnInit(): void {
    this.cargarUsuarios(); // Cargar la lista de usuarios al inicio
    this.cargarSucursalesDisponibles(); // Cargar sucursales para el selector en el modal de usuario
    this.resetFormularioUsuario(); // Inicializar el formulario del modal
  }

  ngAfterViewInit(): void {
    const modalUsuarioElems = this.elementRef.nativeElement.querySelectorAll('#modalUsuario');
    if (modalUsuarioElems.length > 0) {
      this.modalUsuarioInstancia = M.Modal.init(modalUsuarioElems, {
        onCloseEnd: () => this.resetFormularioUsuarioConDeteccion()
      })[0];
    }
    // Inicializar selects de filtro al inicio de la vista
    this.initMaterializeSelectsFiltrosUsuarios();
  }

  // --- LÓGICA DE GESTIÓN DE USUARIOS ---

  resetFormularioUsuarioConDeteccion(): void {
    this.resetFormularioUsuario();
    this.cdr.detectChanges();
  }

  cargarUsuarios(): void {
    this.isLoadingUsuarios = true;
    this.adminUserService.getAllUsers().subscribe({
      next: data => {
        this.usuarios = data;
        this.usuariosFiltrados = [...data]; // Inicializa usuariosFiltrados con todos los usuarios
        this.aplicarFiltrosUsuarios(); // Aplica los filtros existentes (si los hay)
        this.isLoadingUsuarios = false;
        this.cdr.detectChanges();
        // Crucial: Re-inicializar los selects de filtro despuÉs de que los usuarios se carguen
        this.initMaterializeSelectsFiltrosUsuarios();
      },
      error: (err: any) => {
        M.toast({ html: `Error cargando usuarios: ${err.error?.error || err.message}`, classes: 'red rounded' });
        this.isLoadingUsuarios = false;
      }
    });
  }

  cargarSucursalesDisponibles(): void {
    this.pedidoService.getSucursales().subscribe({
      next: data => {
        this.sucursalesDisponibles = data;
        this.cdr.detectChanges();
        // Crucial: Re-inicializar los selects de filtro despuÉs de que las sucursales se carguen
        this.initMaterializeSelectsFiltrosUsuarios();
      },
      error: (err: any) => {
        M.toast({ html: `Error cargando sucursales para usuarios: ${err.error?.error || err.message}`, classes: 'red rounded' });
      }
    });
  }

  // Función específica para inicializar selects dentro del modal de usuario
  initMaterializeSelectsModalUsuario(): void {
    setTimeout(() => {
      const modalSelectElems = this.elementRef.nativeElement.querySelectorAll('#modalUsuario select');
      if (modalSelectElems.length > 0) {
        M.FormSelect.init(modalSelectElems);
      }
      M.updateTextFields(); // Para los labels
    }, 50);
  }

  // Función para inicializar selects de los filtros (fuera del modal)
  initMaterializeSelectsFiltrosUsuarios(): void {
    setTimeout(() => {
      const filtroRolSelect = this.elementRef.nativeElement.querySelector('#filtro_rol_select');
      const filtroSucursalSelect = this.elementRef.nativeElement.querySelector('#filtro_sucursal_select');

      if (filtroRolSelect) {
        M.FormSelect.init(filtroRolSelect);
      }
      if (filtroSucursalSelect) {
        M.FormSelect.init(filtroSucursalSelect);
      }
      M.updateTextFields(); // Para los labels
    }, 100); // Pequeño delay
  }

  resetFormularioUsuario(): void {
    this.esModoEdicionUsuario = false;
    this.formUsuario = {
      username: '',
      nombre_completo: '',
      password: '',
      confirmPassword: '',
      rol: 'registrado',
      sucursal_asignada_id: null
    };
    if (this.formUsuarioModal && this.formUsuarioModal.form) {
      this.formUsuarioModal.resetForm(this.formUsuario);
    }
    this.initMaterializeSelectsModalUsuario(); // Reinicializa después de resetear el form
  }

  abrirModalAltaUsuario(): void {
    this.resetFormularioUsuario();
    if (this.modalUsuarioInstancia) this.modalUsuarioInstancia.open();
  }

  abrirModalEdicionUsuario(user: UserProfile): void {
    this.esModoEdicionUsuario = true;
    this.formUsuario = {
      ...user,
      password: '',
      confirmPassword: ''
    };
    this.formUsuario.rol = user.rol;
    this.formUsuario.sucursal_asignada_id = user.sucursal_asignada_id;

    this.cdr.detectChanges();
    this.initMaterializeSelectsModalUsuario(); // Reinicializa después de cargar datos
    if (this.modalUsuarioInstancia) this.modalUsuarioInstancia.open();
  }

  onRolChange(): void {
    if (this.formUsuario.rol !== 'empleado') {
      this.formUsuario.sucursal_asignada_id = null;
    }
    this.cdr.detectChanges(); // Forzar la detección de cambios para actualizar el HTML
    this.initMaterializeSelectsModalUsuario(); // Reinicializa el select de sucursal asignada
  }

  guardarUsuario(): void {
    if (!this.formUsuarioModal.form.valid) {
      M.toast({ html: 'Completa todos los campos requeridos para el usuario.', classes: 'red rounded' });
      Object.values(this.formUsuarioModal.controls).forEach(control => { control.markAsTouched(); });
      this.cdr.detectChanges();
      return;
    }

    if (!this.esModoEdicionUsuario && this.formUsuario.password !== this.formUsuario.confirmPassword) {
      M.toast({ html: 'Las contraseñas no coinciden.', classes: 'red rounded' });
      return;
    }

    if (!this.esModoEdicionUsuario && (!this.formUsuario.password || this.formUsuario.password.length < 6)) {
      M.toast({ html: 'La contraseña debe tener al menos 6 caracteres para nuevos usuarios.', classes: 'red rounded' });
      return;
    }

    // Lógica para que 'empleado' sin sucursal asignada, o si selecciona 'Ninguna/Todas', se guarde como null
    if (this.formUsuario.rol !== 'empleado') {
      this.formUsuario.sucursal_asignada_id = null;
    }

    const datosUsuarioApi: Partial<UserProfile> & { password?: string } = {
      username: this.formUsuario.username!,
      nombre_completo: this.formUsuario.nombre_completo!,
      rol: this.formUsuario.rol || 'registrado',
      sucursal_asignada_id: this.formUsuario.sucursal_asignada_id // Ya es null si no es empleado o si se eligió "Ninguna"
    };

    if (!this.esModoEdicionUsuario) { // Alta de usuario
      datosUsuarioApi.password = this.formUsuario.password;
      this.adminUserService.registerUser(datosUsuarioApi).subscribe({
        next: () => {
          M.toast({ html: 'Usuario agregado exitosamente!', classes: 'green rounded' });
          this.cargarUsuarios();
          if (this.modalUsuarioInstancia) this.modalUsuarioInstancia.close();
        },
        error: (err: any) => M.toast({ html: `Error al agregar usuario: ${err.error?.error || err.message}`, classes: 'red rounded' })
      });
    } else { // Edición de usuario
      this.adminUserService.updateUser(datosUsuarioApi.username!, datosUsuarioApi).subscribe({
        next: () => {
          M.toast({ html: 'Usuario modificado exitosamente!', classes: 'green rounded' });
          this.cargarUsuarios();
          if (this.modalUsuarioInstancia) this.modalUsuarioInstancia.close();
        },
        error: (err: any) => M.toast({ html: `Error al modificar usuario: ${err.error?.error || err.message}`, classes: 'red rounded' })
      });
    }
  }

  eliminarUsuario(user: UserProfile): void {
    const currentUser = this.authService.getCurrentUser();
    if (currentUser && currentUser.username === user.username) {
      M.toast({ html: 'No puedes eliminar tu propia cuenta de administrador.', classes: 'red rounded' });
      return;
    }

    const confirmMsg = `¿Estás seguro de que quieres eliminar al usuario "${user.username}"? Esta acción es irreversible.`;
    if (confirm(confirmMsg)) {
      this.adminUserService.deleteUser(user.username!).subscribe({
        next: () => {
          M.toast({ html: `Usuario "${user.username}" eliminado.`, classes: 'green rounded' });
          this.cargarUsuarios();
        },
        error: (err: any) => M.toast({ html: `Error al eliminar usuario: ${err.error?.error || err.message}`, classes: 'red rounded' })
      });
    }
  }

  // --- Métodos para el filtrado de usuarios ---
  aplicarFiltrosUsuarios(): void {
    let usuariosFiltradosTemp = [...this.usuarios];

    // Filtro por username
    if (this.filtroUsername) {
      const searchTerm = this.filtroUsername.toLowerCase();
      usuariosFiltradosTemp = usuariosFiltradosTemp.filter(user =>
        user.username.toLowerCase().includes(searchTerm)
      );
    }

    // Filtro por nombre completo
    if (this.filtroNombreCompleto) {
      const searchTerm = this.filtroNombreCompleto.toLowerCase();
      usuariosFiltradosTemp = usuariosFiltradosTemp.filter(user =>
        user.nombre_completo.toLowerCase().includes(searchTerm)
      );
    }

    // Filtro por rol
    if (this.filtroRol) {
      usuariosFiltradosTemp = usuariosFiltradosTemp.filter(user =>
        user.rol === this.filtroRol
      );
    }

    // === LÓGICA DE FILTRO POR SUCURSAL ASIGNADA (CORREGIDA PARA TIPO DE DATOS) ===
    if (this.filtroSucursalAsignada !== null) {
      const filtroNum = Number(this.filtroSucursalAsignada); // Asegurar que sea número
      usuariosFiltradosTemp = usuariosFiltradosTemp.filter(user => {
        // console.log(`User ${user.username} - sucursal_asignada_id: ${user.sucursal_asignada_id}, Filtering for: ${filtroNum}`); // Diagnostic
        return user.sucursal_asignada_id === filtroNum;
      });
    }

    this.usuariosFiltrados = usuariosFiltradosTemp;
    this.cdr.detectChanges(); // Asegurar view updates con datos filtrados
    // No es necesario llamar initMaterializeSelectsFiltrosUsuarios aquí, ya se llama en cargarUsuarios y cargarSucursalesDisponibles
  }

  resetFiltrosUsuarios(): void {
    this.filtroUsername = '';
    this.filtroNombreCompleto = '';
    this.filtroRol = '';
    this.filtroSucursalAsignada = null; // Reset to null explicitly
    this.aplicarFiltrosUsuarios();
    this.cdr.detectChanges(); // Para que el DOM del formulario se actualice
    this.initMaterializeSelectsFiltrosUsuarios(); // Reinicializa selects de filtro
  }
}