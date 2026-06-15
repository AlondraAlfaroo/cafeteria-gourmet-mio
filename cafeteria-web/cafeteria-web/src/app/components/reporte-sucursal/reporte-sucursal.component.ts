// src/app/components/reporte-sucursal/reporte-sucursal.component.ts
import { Component, OnInit, inject } from '@angular/core'; // inject para la nueva forma de inyección
import { CommonModule } from '@angular/common'; // Necesario para *ngFor, *ngIf, etc.
import { FormsModule } from '@angular/forms'; // Si vas a usar ngModel para el select
import { PedidoService } from '../../services/pedido.service'; // Ajusta la ruta si es diferente

@Component({
  selector: 'app-reporte-sucursal',
  standalone: true,
  imports: [
    CommonModule, // Importa CommonModule para directivas estructurales
    FormsModule   // Importa FormsModule para ngModel
  ],
  templateUrl: './reporte-sucursal.component.html',
  styleUrls: ['./reporte-sucursal.component.css']
})
export class ReporteSucursalComponent implements OnInit {
  sucursales: number[] = [];
  pedidos: any[] = []; // Deberías crear una interfaz para Pedido
  sucursalSeleccionada: number | null = null;
  errorCargaSucursales: string | null = null;
  errorCargaPedidos: string | null = null;
  cargandoPedidos = false;

  // Inyección de dependencias moderna (o puedes usar el constructor tradicional)
  private pedidoService = inject(PedidoService);
  // constructor(private pedidoService: PedidoService) {} // Forma tradicional

  ngOnInit(): void {
    this.cargarSucursales();
  }

  cargarSucursales(): void {
    this.pedidoService.getSucursales().subscribe({
      next: (data) => {
        console.log('Sucursales cargadas:', data);
        this.sucursales = data;
        if (data.length === 0) {
          this.errorCargaSucursales = 'No se encontraron sucursales.';
        }
      },
      error: (err) => {
        console.error('Error al cargar sucursales:', err);
        this.errorCargaSucursales = 'Error al cargar sucursales. Revisa la consola.';
      }
    });
  }

  onSucursalChange(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    const sucursalId = parseInt(selectElement.value, 10);

    if (!isNaN(sucursalId)) {
      this.sucursalSeleccionada = sucursalId;
      this.cargarPedidosDeSucursal(sucursalId);
    } else {
      this.sucursalSeleccionada = null;
      this.pedidos = [];
    }
  }

  cargarPedidosDeSucursal(sucursalId: number): void {
    this.pedidos = [];
    this.errorCargaPedidos = null;
    this.cargandoPedidos = true;
    this.pedidoService.getPedidosPorSucursal(sucursalId).subscribe({
      next: (data) => {
        console.log(`Pedidos para sucursal ${sucursalId}:`, data);
        this.pedidos = data;
        if (data.length === 0) {
          this.errorCargaPedidos = `No se encontraron pedidos para la sucursal ${sucursalId}.`;
        }
        this.cargandoPedidos = false;
      },
      error: (err) => {
        console.error(`Error al cargar pedidos para sucursal ${sucursalId}:`, err);
        this.errorCargaPedidos = `Error al cargar pedidos para la sucursal ${sucursalId}.`;
        this.cargandoPedidos = false;
      }
    });
  }
}