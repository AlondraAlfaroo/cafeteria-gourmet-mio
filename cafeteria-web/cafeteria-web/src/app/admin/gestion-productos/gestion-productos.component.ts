// src/app/admin/gestion-productos/gestion-productos.component.ts
import { Component, OnInit, AfterViewInit, ElementRef, inject, ChangeDetectorRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { ProductoMenu } from '../../models/producto-menu.interface';
import { AdminProductoService } from '../../services/admin-producto.service';
import { PedidoService } from '../../services/pedido.service';

declare var M: any;

@Component({
  selector: 'app-gestion-productos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gestion-productos.component.html',
  styleUrls: ['./gestion-productos.component.css']
})
export class GestionProductosComponent implements OnInit, AfterViewInit {
  @ViewChild('formProductoModal') formProductoModal!: NgForm;

  sucursalesDisponibles: number[] = [];
  sucursalSeleccionada: number | null = null;
  productos: ProductoMenu[] = [];

  // Propiedades para los filtros de productos
  filtroNombreProducto: string = '';
  filtroCategoriaProducto: string = '';
  filtroEstadoProducto: string = ''; // 'activo', 'inactivo', '' (todos)
  productosFiltrados: ProductoMenu[] = []; // Nueva propiedad para los productos filtrados

  categoriasDisponibles: string[] = [
    'Café Caliente', 'Café Frío', 'Té e Infusiones',
    'Panadería Premium', 'Bebidas Frescas', 'Postres', 'Otros'
  ];

  formProducto: Partial<ProductoMenu> & { cantidad_disponible_inicial?: number } = {
    producto_id: '',
    nombre_producto: '',
    categoria: '',
    descripcion: '',
    precio_unitario: undefined,
    cantidad_disponible_inicial: 10,
    esta_activo: true
  };
  esModoEdicion = false;
  modalInstancia: any;
  isLoadingProductos = false;

  private adminService = inject(AdminProductoService);
  private pedidoService = inject(PedidoService);
  private elementRef = inject(ElementRef);
  private cdr = inject(ChangeDetectorRef);

  constructor() { }

  ngOnInit(): void {
    this.cargarSucursales();
    this.resetFormulario();
  }

  ngAfterViewInit(): void {
    this.initMaterialize();
  }

  initMaterialize() {
    setTimeout(() => {
      const selectElems = this.elementRef.nativeElement.querySelectorAll('select');
      if (selectElems.length > 0) M.FormSelect.init(selectElems);

      const modalElems = this.elementRef.nativeElement.querySelectorAll('.modal');
      if (modalElems.length > 0) {
        this.modalInstancia = M.Modal.init(modalElems, {
          onCloseStart: () => {
            this.resetFormularioConDeteccion();
          }
        })[0];
      }
      M.updateTextFields();
    }, 200);
  }

  resetFormularioConDeteccion() {
    this.resetFormulario();
    this.cdr.detectChanges();
  }

  cargarSucursales(): void {
    this.pedidoService.getSucursales().subscribe(data => {
      this.sucursalesDisponibles = data;
      this.cdr.detectChanges();
      this.initMaterialize();
    });
  }

  onSucursalChange(): void {
    if (this.sucursalSeleccionada !== null && this.sucursalSeleccionada !== undefined) {
      this.cargarProductos(this.sucursalSeleccionada);
    } else {
      this.productos = [];
      this.productosFiltrados = [];
      this.resetFiltrosProductos(); // Reset filtros al cambiar de sucursal
    }
  }

  cargarProductos(sucursalId: number): void {
    this.isLoadingProductos = true;
    this.adminService.getProductosPorSucursal(sucursalId).subscribe({
      next: data => {
        this.productos = data;
        this.productosFiltrados = [...data]; // Inicializa los productos filtrados con todos los productos
        this.aplicarFiltrosProductos(); // Aplica cualquier filtro existente
        this.isLoadingProductos = false;
        this.cdr.detectChanges();
        this.initMaterialize(); // Re-inicializar selects para los filtros
      },
      error: (err: any) => {
        M.toast({ html: `Error cargando productos: ${err.error?.error || err.message}`, classes: 'red rounded' });
        this.isLoadingProductos = false;
      }
    });
  }

  resetFormulario(): void {
    this.esModoEdicion = false;
    this.formProducto = {
      producto_id: 'prod_' + Date.now().toString().slice(-6) + Math.random().toString(36).substring(2, 5),
      nombre_producto: '',
      categoria: '',
      descripcion: '',
      precio_unitario: undefined,
      cantidad_disponible_inicial: 10,
      esta_activo: true
    };

    if (this.formProductoModal && this.formProductoModal.form) {
      this.formProductoModal.resetForm(this.formProducto);
    }

    setTimeout(() => {
      M.updateTextFields();
      const modalSelectElems = this.elementRef.nativeElement.querySelectorAll('#modalProducto select');
      if (modalSelectElems.length > 0) {
        M.FormSelect.init(modalSelectElems);
      }
    }, 50);
  }

  abrirModalAlta(): void {
    this.resetFormulario();
    if (this.modalInstancia) this.modalInstancia.open();
  }

  abrirModalEdicion(producto: ProductoMenu): void {
    this.esModoEdicion = true;
    this.formProducto = {
      producto_id: producto.producto_id,
      nombre_producto: producto.nombre_producto,
      categoria: producto.categoria,
      descripcion: producto.descripcion || '',
      precio_unitario: Number(producto.precio_unitario),
      esta_activo: producto.esta_activo
    };
    this.cdr.detectChanges();
    setTimeout(() => {
      M.updateTextFields();
      const modalSelectElems = this.elementRef.nativeElement.querySelectorAll('#modalProducto select');
      if (modalSelectElems.length > 0) {
        M.FormSelect.init(modalSelectElems);
      }
    }, 50);
    if (this.modalInstancia) this.modalInstancia.open();
  }

  guardarProducto(): void {
    console.log('Intentando guardar producto. Formulario válido:', this.formProductoModal.form.valid);
    console.log('Valores del formulario:', this.formProducto);

    if (!this.formProductoModal.form.valid) {
      M.toast({ html: 'Por favor, completa todos los campos requeridos (*).', classes: 'red rounded' });
      Object.values(this.formProductoModal.controls).forEach(control => {
        control.markAsTouched();
      });
      this.cdr.detectChanges();
      return;
    }

    if (!this.sucursalSeleccionada) {
      M.toast({ html: 'Error: No hay sucursal seleccionada para la operación.', classes: 'red rounded' });
      return;
    }

    if (this.esModoEdicion) {
      const datosActualizacion: Partial<ProductoMenu> = {
        producto_id: this.formProducto.producto_id,
        nombre_producto: this.formProducto.nombre_producto,
        categoria: this.formProducto.categoria,
        descripcion: this.formProducto.descripcion,
        precio_unitario: Number(this.formProducto.precio_unitario),
        esta_activo: this.formProducto.esta_activo === undefined ? true : this.formProducto.esta_activo
      };

      this.adminService.modificarProducto(this.sucursalSeleccionada, datosActualizacion.producto_id!, datosActualizacion).subscribe({
        next: () => {
          M.toast({ html: 'Producto modificado exitosamente!', classes: 'green rounded' });
          this.cargarProductos(this.sucursalSeleccionada!);
          if (this.modalInstancia) this.modalInstancia.close();
        },
        error: (err: any) => M.toast({ html: `Error al modificar: ${err.error?.error || err.message}`, classes: 'red rounded' })
      });
    } else {
      const datosAlta: Partial<ProductoMenu> & { sucursal_id: number, cantidad_disponible_inicial: number } = {
        sucursal_id: this.sucursalSeleccionada,
        producto_id: this.formProducto.producto_id,
        nombre_producto: this.formProducto.nombre_producto,
        categoria: this.formProducto.categoria,
        descripcion: this.formProducto.descripcion,
        precio_unitario: Number(this.formProducto.precio_unitario),
        cantidad_disponible_inicial: Number(this.formProducto.cantidad_disponible_inicial) >= 0 ? Number(this.formProducto.cantidad_disponible_inicial) : 0,
        esta_activo: this.formProducto.esta_activo === undefined ? true : this.formProducto.esta_activo
      };

      console.log('Datos para altaProducto:', datosAlta);

      this.adminService.altaProducto(datosAlta).subscribe({
        next: () => {
          M.toast({ html: 'Producto agregado exitosamente!', classes: 'green rounded' });
          this.cargarProductos(this.sucursalSeleccionada!);
          if (this.modalInstancia) this.modalInstancia.close();
        },
        error: (err: any) => {
          console.error("Error en altaProducto:", err);
          M.toast({ html: `Error al agregar: ${err.error?.error || err.message}`, classes: 'red rounded' });
        }
      });
    }
  }

  ajustarStock(producto: ProductoMenu): void {
    const nuevaCantidadStr = prompt(`Ajustar stock para "${producto.nombre_producto}" (Suc. ${this.sucursalSeleccionada}). Stock actual: ${producto.cantidad_disponible}.\nIngresa la nueva cantidad total:`, producto.cantidad_disponible.toString());
    if (nuevaCantidadStr !== null) {
      const nuevaCantidad = parseInt(nuevaCantidadStr, 10);
      if (!isNaN(nuevaCantidad) && nuevaCantidad >= 0) {
        this.adminService.ajustarInventario(this.sucursalSeleccionada!, producto.producto_id, nuevaCantidad).subscribe({
          next: () => {
            M.toast({ html: 'Stock actualizado!', classes: 'green rounded' });
            this.cargarProductos(this.sucursalSeleccionada!);
          },
          error: (err: any) => M.toast({ html: `Error al ajustar stock: ${err.error?.error || err.message}`, classes: 'red rounded' })
        });
      } else {
        M.toast({ html: 'Cantidad inválida. Debe ser un número no negativo.', classes: 'orange rounded' });
      }
    }
  }

  cambiarEstado(producto: ProductoMenu): void {
    const nuevoEstado = !producto.esta_activo;
    const accionTexto = nuevoEstado ? 'activar' : 'desactivar (dar de baja)';
    const confirmMsg = `¿Estás seguro de que quieres ${accionTexto} el producto "${producto.nombre_producto}"?`;

    if (confirm(confirmMsg)) {
      this.adminService.cambiarEstadoActivo(this.sucursalSeleccionada!, producto.producto_id, nuevoEstado).subscribe({
        next: () => {
          M.toast({ html: `Producto ${nuevoEstado ? 'activado' : 'desactivado'}`, classes: 'green rounded' });
          this.cargarProductos(this.sucursalSeleccionada!);
        },
        error: (err: any) => M.toast({ html: `Error al cambiar estado: ${err.error?.error || err.message}`, classes: 'red rounded' })
      });
    }
  }

  // --- Métodos para el filtrado de productos ---
  aplicarFiltrosProductos(): void {
    let productosFiltradosTemp = [...this.productos];

    // Filtro por nombre de producto
    if (this.filtroNombreProducto) {
      const searchTerm = this.filtroNombreProducto.toLowerCase();
      productosFiltradosTemp = productosFiltradosTemp.filter(producto =>
        producto.nombre_producto.toLowerCase().includes(searchTerm) ||
        producto.producto_id.toLowerCase().includes(searchTerm)
      );
    }

    // Filtro por categoría
    if (this.filtroCategoriaProducto) {
      productosFiltradosTemp = productosFiltradosTemp.filter(producto =>
        producto.categoria === this.filtroCategoriaProducto
      );
    }

    // Filtro por estado
    if (this.filtroEstadoProducto === 'activo') {
      productosFiltradosTemp = productosFiltradosTemp.filter(producto => producto.esta_activo);
    } else if (this.filtroEstadoProducto === 'inactivo') {
      productosFiltradosTemp = productosFiltradosTemp.filter(producto => !producto.esta_activo);
    }

    this.productosFiltrados = productosFiltradosTemp;
    this.cdr.detectChanges(); // Asegura que la vista se actualice
    this.initMaterialize(); // Re-inicializar selects para reflejar cambios si es necesario
  }

  resetFiltrosProductos(): void {
    this.filtroNombreProducto = '';
    this.filtroCategoriaProducto = '';
    this.filtroEstadoProducto = '';
    this.aplicarFiltrosProductos(); // Aplicar para limpiar la vista
    this.initMaterialize(); // Re-inicializar selects
  }
}