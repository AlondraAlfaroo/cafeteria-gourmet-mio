import { Component, OnInit, inject, AfterViewInit, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // Para ngModel
import { PedidoService } from '../../services/pedido.service';

declare var M: any; // Para Materialize

// Interfaz para un producto del menú (puedes expandirla)
export interface ProductoMenu {
  id: string; // Podría ser el nombre único del producto
  nombre: string;
  categoria: string;
  precio_unitario: number;
  // imagenUrl: string; // Si quieres mostrar imágenes
  descripcion?: string;
}

@Component({
  selector: 'app-menu-pedidos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './menu-pedidos.component.html',
  styleUrls: ['./menu-pedidos.component.css']
})
export class MenuPedidosComponent implements OnInit, AfterViewInit {
  // Para la demo, el menú puede ser una lista predefinida o podrías fetchearla
  // desde un nuevo endpoint del backend si quieres gestionar el menú desde la BD.
  productosDelMenu: ProductoMenu[] = [
    { id: 'espresso', nombre: 'Espresso Clásico', categoria: 'Café Caliente', precio_unitario: 45.00, descripcion: 'Un shot intenso y aromático.' },
    { id: 'latte', nombre: 'Latte Vainilla', categoria: 'Café Caliente', precio_unitario: 60.00, descripcion: 'Espresso con leche vaporizada y un toque de vainilla.' },
    { id: 'croissant', nombre: 'Croissant Almendras', categoria: 'Panadería Premium', precio_unitario: 40.00, descripcion: 'Croissant hojaldrado con relleno y topping de almendras.' },
    // Añade más productos de tu plantilla HTML (Americano, Cappuccino, Mocha, Tés, etc.)
    // Usa las imágenes y descripciones de tu HTML original
  ];

  // Modelo para el nuevo pedido
  nuevoPedido = {
    sucursal_id: null as number | null, // El usuario logueado o seleccionado
    producto: '',
    categoria: '',
    cantidad: 1,
    precio_unitario: 0,
    // total se calculará
  };

  sucursalesDisponibles: number[] = []; // Para el selector de sucursal al registrar pedido
  pedidoService = inject(PedidoService);

  constructor(private elementRef: ElementRef) { }

  ngOnInit(): void {
    // Para una demo, podríamos preseleccionar la sucursal si el usuario está "logueado"
    // o permitir seleccionarla. Aquí cargamos las sucursales disponibles.
    this.pedidoService.getSucursales().subscribe(data => this.sucursalesDisponibles = data);
  }

  ngAfterViewInit() {
    // Reinicializar modales de Materialize si los usas para el formulario de pedido
    const modalElems = this.elementRef.nativeElement.querySelectorAll('.modal');
    M.Modal.init(modalElems);
    // Reinicializar selects de Materialize
    const selectElems = this.elementRef.nativeElement.querySelectorAll('select');
    M.FormSelect.init(selectElems);
  }

  seleccionarProducto(producto: ProductoMenu): void {
    this.nuevoPedido.producto = producto.nombre;
    this.nuevoPedido.categoria = producto.categoria;
    this.nuevoPedido.precio_unitario = producto.precio_unitario;
    // Abrir un modal para confirmar cantidad y sucursal, luego registrar
    // O tener un formulario visible.
    console.log('Producto seleccionado:', this.nuevoPedido);
    // Para abrir un modal de Materialize (ejemplo si tienes un modal con id 'modalPedido'):
    // const modalInstance = M.Modal.getInstance(document.getElementById('modalPedido'));
    // modalInstance.open();
  }

  registrarPedido(): void {
    if (!this.nuevoPedido.sucursal_id || !this.nuevoPedido.producto || this.nuevoPedido.cantidad < 1) {
      alert('Por favor, completa todos los campos del pedido.');
      M.toast({ html: 'Por favor, completa todos los campos del pedido.', classes: 'red rounded' });
      return;
    }
    // El total se calcula antes de enviar, pero el backend también podría hacerlo
    const pedidoParaEnviar = {
      ...this.nuevoPedido,
      total_venta: this.nuevoPedido.cantidad * this.nuevoPedido.precio_unitario
    };

    this.pedidoService.registrarPedido(pedidoParaEnviar).subscribe({
      next: (response) => {
        console.log('Pedido registrado:', response);
        M.toast({ html: '¡Pedido registrado exitosamente!', classes: 'green rounded' });
        // Limpiar formulario o cerrar modal
        // const modalInstance = M.Modal.getInstance(document.getElementById('modalPedido'));
        // modalInstance.close();
        this.nuevoPedido = { sucursal_id: this.nuevoPedido.sucursal_id, producto: '', categoria: '', cantidad: 1, precio_unitario: 0 };
      },
      error: (err) => {
        console.error('Error al registrar pedido:', err);
        M.toast({ html: 'Error al registrar el pedido.', classes: 'red rounded' });
      }
    });
  }
}