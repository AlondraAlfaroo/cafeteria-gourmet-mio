// src/app/components/registrar-pedido/registrar-pedido.component.ts
import { Component, OnInit, AfterViewInit, ElementRef, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router'; // Importa ActivatedRoute y Router
import { PedidoService } from '../../services/pedido.service'; // Ajusta la ruta si es necesario
import { ProductoMenu } from '../../models/producto-menu.interface'; // Ajusta la ruta si es necesario
import { AuthService, UserProfile } from '../../services/auth.service'; // <-- ¡IMPORTANTE: DESCOMENTA Y USA AuthService!

declare var M: any;

@Component({
  selector: 'app-registrar-pedido',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './registrar-pedido.component.html',
  styleUrls: ['./registrar-pedido.component.css']
})
export class RegistrarPedidoComponent implements OnInit, AfterViewInit {
  productosDelMenu: ProductoMenu[] = [];
  sucursalParaMenu: number | null = null;

  nuevoPedido = {
    sucursal_id: null as number | null,
    producto_id: '',
    nombre_producto: '',
    categoria: '',
    cantidad: 1,
    precio_unitario: 0,
    username: '' // <-- Esta propiedad se llenará automáticamente
  };
  sucursalesDisponibles: number[] = [];

  errorCargaProductos: string | null = null;
  errorRegistroPedido: string | null = null;

  // Inyección de dependencias
  private pedidoService = inject(PedidoService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService); // <-- Inyecta AuthService
  private elementRef = inject(ElementRef);
  private cdr = inject(ChangeDetectorRef);

  constructor() { }

  ngOnInit(): void {
    // 1. Obtener el usuario logueado e inicializar nuevoPedido.username
    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      this.nuevoPedido.username = currentUser.username;
      // Lógica para preseleccionar sucursal si el usuario es empleado
      if (currentUser.rol === 'empleado' && currentUser.sucursal_asignada_id !== null) {
        this.nuevoPedido.sucursal_id = currentUser.sucursal_asignada_id;
        this.sucursalParaMenu = currentUser.sucursal_asignada_id;
        this.cargarMenuPorSucursal(this.sucursalParaMenu);
      }
    } else {
      // Si llega aquí y no hay usuario logueado (y la ruta está protegida por authGuard),
      // debería haber sido redirigido al login. Esto es una advertencia de seguridad.
      console.warn("RegistrarPedidoComponent: Se accedió sin un usuario logueado (o su rol no es válido para pedido).");
      // Si la ruta no estuviera protegida, aquí redirigirías al login:
      this.router.navigate(['/login']);
    }

    this.cargarSucursalesDisponibles();

    // 2. Leer queryParams para preseleccionar producto
    this.route.queryParams.subscribe(params => {
      const queryProductoId = params['producto_id'];
      const queryNombreProducto = params['nombre_producto'];
      const queryPrecioUnitario = params['precio_unitario'];
      const queryCategoria = params['categoria'];

      if (queryProductoId && queryNombreProducto && queryPrecioUnitario) {
        console.log('Producto preseleccionado desde Home:', { queryProductoId, queryNombreProducto, queryPrecioUnitario, queryCategoria });

        this.nuevoPedido.producto_id = queryProductoId;
        this.nuevoPedido.nombre_producto = queryNombreProducto;
        this.nuevoPedido.precio_unitario = parseFloat(queryPrecioUnitario);
        this.nuevoPedido.categoria = queryCategoria || '';

        M.toast({ html: `Producto "${queryNombreProducto}" listo para tu pedido. Por favor, selecciona la sucursal.`, classes: 'teal lighten-2 black-text rounded', displayLength: 5000 });

        this.cdr.detectChanges();
        setTimeout(() => {
          M.updateTextFields();
          this.initMaterializeSelects();
        }, 100);
      }
    });
  }

  ngAfterViewInit() {
    this.initMaterializeSelects();
    M.updateTextFields();
  }

  initMaterializeSelects() {
    setTimeout(() => {
      const selectElems = this.elementRef.nativeElement.querySelectorAll('select');
      if (selectElems.length) {
        M.FormSelect.init(selectElems);
      }
    }, 150);
  }

  cargarSucursalesDisponibles(): void {
    this.pedidoService.getSucursales().subscribe({
      next: (data) => {
        this.sucursalesDisponibles = data;
        this.cdr.detectChanges();
        this.initMaterializeSelects();
      },
      error: (err: any) => { // Tipar explícitamente err si no lo haces en tsconfig
        console.error('Error al cargar sucursales disponibles:', err);
        M.toast({ html: 'Error al cargar sucursales.', classes: 'red rounded' });
      }
    });
  }

  onSucursalParaMenuChange(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    const sucursalId = parseInt(selectElement.value, 10);
    if (!isNaN(sucursalId) && sucursalId) {
      this.sucursalParaMenu = sucursalId;
      this.cargarMenuPorSucursal(sucursalId);
    } else {
      this.sucursalParaMenu = null;
      this.productosDelMenu = [];
    }
  }

  cargarMenuPorSucursal(sucursalId: number): void {
    this.errorCargaProductos = null;
    this.productosDelMenu = [];
    this.pedidoService.getProductosPorSucursal(sucursalId).subscribe({
      next: (data: ProductoMenu[]) => {
        this.productosDelMenu = data;
        if (data.length === 0) {
          this.errorCargaProductos = `No hay productos activos o con stock para la sucursal ${sucursalId}.`;
        }
        console.log(`Productos cargados para sucursal ${sucursalId}:`, data);
      },
      error: (err: any) => { // Tipar err
        console.error(`Error al cargar productos para sucursal ${sucursalId}:`, err);
        this.errorCargaProductos = `Error al cargar productos para la sucursal ${sucursalId}.`;
        this.productosDelMenu = [];
      }
    });
  }

  seleccionarProducto(producto: ProductoMenu): void {
    if (producto.cantidad_disponible <= 0) {
      M.toast({ html: `"${producto.nombre_producto}" está agotado.`, classes: 'orange rounded' });
      return;
    }
    this.nuevoPedido.producto_id = producto.producto_id;
    this.nuevoPedido.nombre_producto = producto.nombre_producto;
    this.nuevoPedido.categoria = producto.categoria;
    this.nuevoPedido.precio_unitario = producto.precio_unitario;
    this.nuevoPedido.cantidad = 1;

    // Autocompletar la sucursal del pedido con la sucursal del menú actualmente visible
    // O con la sucursal asignada al empleado si el usuario es empleado
    const currentUser = this.authService.getCurrentUser();
    if (currentUser && currentUser.rol === 'empleado' && currentUser.sucursal_asignada_id !== null) {
      this.nuevoPedido.sucursal_id = currentUser.sucursal_asignada_id;
    } else if (this.sucursalParaMenu !== null) {
      this.nuevoPedido.sucursal_id = this.sucursalParaMenu;
    }
    // Si no hay sucursal de usuario ni menú seleccionado, el usuario deberá elegirla manualmente.

    this.cdr.detectChanges();
    this.initMaterializeSelects(); // Reinicializar el select de sucursal del pedido
    setTimeout(() => M.updateTextFields(), 50);

    M.toast({ html: `"${producto.nombre_producto}" seleccionado. Disp: ${producto.cantidad_disponible}`, classes: 'blue rounded lighten-1' });
  }

  onSubmitPedido(): void {
    this.errorRegistroPedido = null;
    // Ahora 'username' es tomado del AuthService, no del formulario
    if (!this.nuevoPedido.sucursal_id || !this.nuevoPedido.producto_id || !this.nuevoPedido.cantidad || !this.nuevoPedido.username) {
      M.toast({ html: 'Por favor, completa todos los campos requeridos (sucursal, producto, cantidad, y asegúrate de estar logueado).', classes: 'red rounded', displayLength: 6000 });
      return;
    }
    if (this.nuevoPedido.cantidad < 1) {
      M.toast({ html: 'La cantidad debe ser al menos 1.', classes: 'red rounded' });
      return;
    }

    // Validación de stock en el frontend
    let productoParaValidarStock: ProductoMenu | undefined;
    if (this.nuevoPedido.sucursal_id === this.sucursalParaMenu) {
      productoParaValidarStock = this.productosDelMenu.find(p => p.producto_id === this.nuevoPedido.producto_id);
    } else {
      console.warn("El menú visible es de una sucursal diferente a la del pedido. El backend validará el stock.");
    }

    if (productoParaValidarStock && this.nuevoPedido.cantidad > productoParaValidarStock.cantidad_disponible) {
      M.toast({ html: `Stock insuficiente para "${this.nuevoPedido.nombre_producto}" en la sucursal ${this.nuevoPedido.sucursal_id}. Disponibles: ${productoParaValidarStock.cantidad_disponible}`, classes: 'red rounded', displayLength: 5000 });
      return;
    }

    const pedidoFinal = {
      sucursal_id: Number(this.nuevoPedido.sucursal_id),
      producto_id: this.nuevoPedido.producto_id,
      nombre_producto: this.nuevoPedido.nombre_producto,
      categoria: this.nuevoPedido.categoria,
      cantidad: Number(this.nuevoPedido.cantidad),
      precio_unitario: Number(this.nuevoPedido.precio_unitario),
      username: this.nuevoPedido.username // <-- ¡USERNAME SE ENVÍA AUTOMÁTICAMENTE!
    };

    this.pedidoService.registrarPedido(pedidoFinal).subscribe({
      next: (response: any) => {
        M.toast({ html: `¡Pedido registrado! "${pedidoFinal.nombre_producto}". Stock restante: ${response.nuevaCantidad !== undefined ? response.nuevaCantidad : 'N/A'}`, classes: 'green rounded' });

        this.nuevoPedido.producto_id = '';
        this.nuevoPedido.nombre_producto = '';
        this.nuevoPedido.categoria = '';
        this.nuevoPedido.cantidad = 1;
        this.nuevoPedido.precio_unitario = 0;
        // No reseteamos nuevoPedido.username ni nuevoPedido.sucursal_id aquí.

        const sucursalAActualizar = this.sucursalParaMenu || this.nuevoPedido.sucursal_id;
        if (sucursalAActualizar) {
          this.cargarMenuPorSucursal(sucursalAActualizar);
        }

        this.cdr.detectChanges();
        setTimeout(() => {
          M.updateTextFields();
          this.initMaterializeSelects();
        }, 50);
      },
      error: (err: any) => {
        console.error('Error al registrar pedido:', err);
        const mensajeError = err.error?.error || err.message || 'Error desconocido al registrar el pedido.';
        M.toast({ html: `Error: ${mensajeError}`, classes: 'red rounded', displayLength: 6000 });
        this.errorRegistroPedido = mensajeError;
      }
    });
  }
}