// src/app/components/reportes/reportes.component.ts
import { Component, OnInit, AfterViewInit, ElementRef, inject, ChangeDetectorRef, ViewChild, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PedidoService, ProductoStats, CategoriaStats, ResumenSucursal } from '../../services/pedido.service';
import { AuthService, UserProfile } from '../../services/auth.service';
import { Subscription } from 'rxjs';
import { NombreSucursalPipe } from '../../shared/nombre-sucursal.pipe';

declare var M: any;

export interface Pedido {
  sucursal_id: number;
  fecha_pedido: Date;
  pedido_id: string;
  producto: string;
  categoria: string;
  cantidad: number;
  total: number;
  username: string;
}

interface EstadisticasSucursal {
  totalVentas: number;
  totalPedidos: number;
  promedioVentaPorPedido: number;
  ventasPorCategoria: { [key: string]: number };
  ventasPorProducto: { [key: string]: number };
  ventasPorMes: { [key: string]: number };
}

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule, FormsModule, NombreSucursalPipe],
  templateUrl: './reportes.component.html',
  styleUrls: ['./reportes.component.css']
})
export class ReportesComponent implements OnInit, AfterViewInit, OnDestroy {

  sucursalesDisponibles: number[] = [];
  sucursalSeleccionadaParaReporte: number | null = null;
  pedidosDelReporte: Pedido[] = [];
  cargandoReporte = false;
  errorReporte: string | null = null;

  currentUser: UserProfile | null = null;
  puedeSeleccionarSucursal = false;
  private authSubscription!: Subscription;

  estadisticas: EstadisticasSucursal | null = null;
  mostrarEstadisticas = false;

  filtroProducto: string = '';
  filtroCategoria: string = '';
  filtroUsuario: string = '';
  filtroFechaInicio: string = '';
  filtroFechaFin: string = '';
  ordenPrecio: string = '';

  cargandoComparativo = false;
  errorComparativo: string | null = null;
  resumenComparativo: ResumenSucursal[] = [];
  maxVentaComparativo = 0;

  productosDisponibles: string[] = [];
  categoriasDisponibles: string[] = [];
  pedidosFiltrados: Pedido[] = [];

  chartVentasPorCategoriaData: { label: string, value: number, percentage: number, color: string }[] = [];
  chartVentasPorProductoData: { label: string, value: number, percentage: number }[] = [];
  chartVentasPorMesData: { label: string, value: number, percentage: number }[] = [];

  private pedidoService = inject(PedidoService);
  private authService = inject(AuthService);
  private elementRef = inject(ElementRef);
  private cdr = inject(ChangeDetectorRef);

  constructor() { }

  ngOnInit(): void {
    this.authSubscription = this.authService.currentUser$.subscribe((user: UserProfile | null) => {
      this.currentUser = user;
      this.determinarPermisosYCargar();
      this.cdr.detectChanges();
    });
  }

  ngAfterViewInit(): void { }

  ngOnDestroy(): void {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
    this.destroyMaterializeSelects();
  }

  destroyMaterializeSelects() {
    const sucursalSelect = this.elementRef.nativeElement.querySelector('#sucursal_reporte_select');
    if (sucursalSelect) {
      const instance = M.FormSelect.getInstance(sucursalSelect);
      if (instance) instance.destroy();
    }
  }

  initMaterializeSelects() {
    // Solo inicializar Materialize en el select de sucursal
    // Los selects de filtros los maneja Angular con ngModel directo
    setTimeout(() => {
      const sucursalSelect = this.elementRef.nativeElement.querySelector('#sucursal_reporte_select');

      if (sucursalSelect) {
        const instance = M.FormSelect.getInstance(sucursalSelect);
        if (instance) instance.destroy();

        M.FormSelect.init(sucursalSelect, { dropdownOptions: { coverTrigger: false } });

        setTimeout(() => {
          const wrapper  = sucursalSelect.closest('.select-wrapper') || sucursalSelect.parentElement;
          const dropdown = wrapper?.querySelector('ul.dropdown-content');
          if (dropdown) {
            dropdown.querySelectorAll('li').forEach((li: HTMLElement) => {
              li.addEventListener('click', () => {
                setTimeout(() => {
                  const val = parseInt(sucursalSelect.value, 10);
                  if (!isNaN(val) && val) {
                    this.sucursalSeleccionadaParaReporte = val;
                    this.obtenerReporteYEstadisticas();
                  }
                }, 50);
              });
            });
          }
        }, 100);
      }

      this.cdr.detectChanges();
    }, 150);
  }

  determinarPermisosYCargar(): void {
    this.resetearEstadoReporte();

    if (this.currentUser) {
      if (this.currentUser.rol === 'admin') {
        this.cargarReporteComparativo();
      }

      if (this.currentUser.rol === 'admin' || (this.currentUser.rol === 'empleado' && this.currentUser.sucursal_asignada_id === null)) {
        this.puedeSeleccionarSucursal = true;
        this.cargarSucursalesParaFiltro();
      } else if (this.currentUser.rol === 'empleado' && this.currentUser.sucursal_asignada_id !== null) {
        this.puedeSeleccionarSucursal = false;
        this.sucursalSeleccionadaParaReporte = this.currentUser.sucursal_asignada_id;
        this.sucursalesDisponibles = [this.currentUser.sucursal_asignada_id];
        this.obtenerReporteYEstadisticas();
      } else {
        this.errorReporte = "No tienes los permisos necesarios para ver estos reportes o tu configuración de sucursal no es válida.";
        this.puedeSeleccionarSucursal = false;
      }
    } else {
      this.errorReporte = "Debes iniciar sesión para ver los reportes.";
      this.puedeSeleccionarSucursal = false;
    }
  }

  cargarSucursalesParaFiltro(): void {
    this.pedidoService.getSucursales().subscribe({
      next: (data) => {
        this.sucursalesDisponibles = data;
        this.cdr.detectChanges();
        this.initMaterializeSelects();
      },
      error: (err: any) => {
        console.error('Error al cargar sucursales para el filtro de reportes:', err);
        M.toast({ html: 'Error al cargar lista de sucursales.', classes: 'red rounded' });
        this.errorReporte = 'No se pudieron cargar las sucursales para el filtro.';
      }
    });
  }

  onSucursalParaReporteChange(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    const sucursalId = parseInt(selectElement.value, 10);

    if (this.puedeSeleccionarSucursal && !isNaN(sucursalId) && sucursalId) {
      this.sucursalSeleccionadaParaReporte = sucursalId;
      this.obtenerReporteYEstadisticas();
    } else if (!sucursalId) {
      this.resetearEstadoReporte();
      this.errorReporte = "Por favor, selecciona una sucursal.";
    }
  }

  obtenerReporteYEstadisticas(): void {
    if (this.sucursalSeleccionadaParaReporte === null) {
      this.resetearEstadoReporte();
      this.errorReporte = "Por favor, selecciona una sucursal.";
      return;
    }

    this.cargandoReporte = true;
    this.errorReporte = null;
    this.pedidosDelReporte = [];
    this.estadisticas = null;
    this.mostrarEstadisticas = false;
    this.chartVentasPorCategoriaData = [];
    this.chartVentasPorProductoData = [];
    this.chartVentasPorMesData = [];

    this.pedidoService.getPedidosPorSucursal(this.sucursalSeleccionadaParaReporte).subscribe({
      next: (data: Pedido[]) => {
        this.pedidosDelReporte = data;
        this.pedidosFiltrados = [...data];
        this.extraerOpcionesDeFiltro(data);

        if (data.length === 0) {
          this.errorReporte = null;
        } else {
          this.estadisticas = this.calcularEstadisticas(data);
          this.mostrarEstadisticas = true;
          this.prepararDatosParaGraficasCSS();
        }
        this.cargandoReporte = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error(`Error al cargar reporte para sucursal ${this.sucursalSeleccionadaParaReporte}:`, err);
        this.errorReporte = `Error al cargar el reporte para la sucursal ${this.sucursalSeleccionadaParaReporte}.`;
        this.cargandoReporte = false;
        this.resetearEstadoReporte();
      }
    });
  }

  private aFecha(fecha: Date | string): Date {
    return fecha instanceof Date ? fecha : new Date(fecha);
  }

  // Los inputs type="date" entregan "YYYY-MM-DD", y new Date(str) lo interpreta como
  // medianoche UTC, no local. En zonas horarias detrás de UTC eso recorta el día
  // seleccionado por completo. Se construye la fecha con componentes locales en su lugar.
  private fechaLocalDesdeInput(valor: string, finDelDia: boolean): Date {
    const [anio, mes, dia] = valor.split('-').map(Number);
    return finDelDia
      ? new Date(anio, mes - 1, dia, 23, 59, 59, 999)
      : new Date(anio, mes - 1, dia, 0, 0, 0, 0);
  }

  private calcularEstadisticas(pedidos: Pedido[]): EstadisticasSucursal {
    const totalVentas = pedidos.reduce((sum, pedido) => sum + Number(pedido.total), 0);
    const totalPedidos = pedidos.length;
    const promedioVentaPorPedido = totalPedidos > 0 ? totalVentas / totalPedidos : 0;

    const ventasPorCategoria: { [key: string]: number } = {};
    pedidos.forEach(pedido => {
      ventasPorCategoria[pedido.categoria] = (ventasPorCategoria[pedido.categoria] || 0) + Number(pedido.total);
    });

    const ventasPorProducto: { [key: string]: number } = {};
    pedidos.forEach(pedido => {
      ventasPorProducto[pedido.producto] = (ventasPorProducto[pedido.producto] || 0) + Number(pedido.total);
    });

    const ventasPorMes: { [key: string]: number } = {};
    pedidos.forEach(pedido => {
      const fecha = pedido.fecha_pedido instanceof Date ? pedido.fecha_pedido : new Date(pedido.fecha_pedido);
      const mesAnio = `${fecha.getFullYear()}-${(fecha.getMonth() + 1).toString().padStart(2, '0')}`;
      ventasPorMes[mesAnio] = (ventasPorMes[mesAnio] || 0) + Number(pedido.total);
    });

    return { totalVentas, totalPedidos, promedioVentaPorPedido, ventasPorCategoria, ventasPorProducto, ventasPorMes };
  }

  private prepararDatosParaGraficasCSS(): void {
    if (!this.estadisticas) return;

    const colors = ['#00704A', '#1E3932', '#CBA258', '#4BC0C0', '#9966FF', '#FF9F40', '#D4E9E2', '#808080'];
    let colorIndex = 0;

    const totalVentasCategorias = Object.values(this.estadisticas.ventasPorCategoria).reduce((sum, val) => sum + val, 0);
    this.chartVentasPorCategoriaData = Object.entries(this.estadisticas.ventasPorCategoria)
      .sort(([, a], [, b]) => Number(b) - Number(a))
      .map(([label, value]) => ({
        label,
        value: Number(value),
        percentage: totalVentasCategorias > 0 ? (Number(value) / totalVentasCategorias) * 100 : 0,
        color: colors[(colorIndex++) % colors.length]
      }));

    const productosOrdenados = Object.entries(this.estadisticas.ventasPorProducto)
      .sort(([, a], [, b]) => Number(b) - Number(a))
      .slice(0, 10);
    const maxVentaProducto = productosOrdenados.length > 0 ? Math.max(...productosOrdenados.map(([, v]) => Number(v))) : 0;

    this.chartVentasPorProductoData = productosOrdenados.map(([label, value]) => ({
      label,
      value: Number(value),
      percentage: maxVentaProducto > 0 ? (Number(value) / maxVentaProducto) * 100 : 0
    }));

    const mesesOrdenados = Object.keys(this.estadisticas.ventasPorMes).sort();
    const maxVentaMes = mesesOrdenados.length > 0 ? Math.max(...mesesOrdenados.map(mes => Number(this.estadisticas!.ventasPorMes[mes]))) : 0;

    this.chartVentasPorMesData = mesesOrdenados.map(mes => {
      const [año, mesNum] = mes.split('-');
      const fecha = new Date(parseInt(año), parseInt(mesNum) - 1);
      return {
        label: fecha.toLocaleDateString('es-MX', { month: 'short', year: 'numeric' }),
        value: Number(this.estadisticas!.ventasPorMes[mes]),
        percentage: maxVentaMes > 0 ? (Number(this.estadisticas!.ventasPorMes[mes]) / maxVentaMes) * 100 : 0
      };
    });
  }

  private extraerOpcionesDeFiltro(pedidos: Pedido[]): void {
    const productos = new Set<string>();
    const categorias = new Set<string>();

    pedidos.forEach(pedido => {
      productos.add(pedido.producto);
      categorias.add(pedido.categoria);
    });

    this.productosDisponibles = Array.from(productos).sort();
    this.categoriasDisponibles = Array.from(categorias).sort();

    this.initMaterializeSelects();
  }

  aplicarFiltrosYActualizar(): void {
    let pedidos = [...this.pedidosDelReporte];

    if (this.filtroProducto) {
      pedidos = pedidos.filter(pedido => pedido.producto === this.filtroProducto);
    }

    if (this.filtroCategoria) {
      pedidos = pedidos.filter(pedido => pedido.categoria === this.filtroCategoria);
    }

    if (this.filtroUsuario) {
      const searchTerm = this.filtroUsuario.toLowerCase();
      pedidos = pedidos.filter(pedido => pedido.username.toLowerCase().includes(searchTerm));
    }

    if (this.filtroFechaInicio) {
      const inicio = this.fechaLocalDesdeInput(this.filtroFechaInicio, false);
      pedidos = pedidos.filter(pedido => this.aFecha(pedido.fecha_pedido) >= inicio);
    }

    if (this.filtroFechaFin) {
      const fin = this.fechaLocalDesdeInput(this.filtroFechaFin, true);
      pedidos = pedidos.filter(pedido => this.aFecha(pedido.fecha_pedido) <= fin);
    }

    if (this.ordenPrecio) {
      pedidos.sort((a, b) => {
        if (this.ordenPrecio === 'asc') {
          return Number(a.total) - Number(b.total);
        } else {
          return Number(b.total) - Number(a.total);
        }
      });
    }

    this.pedidosFiltrados = pedidos;
    this.cdr.detectChanges();
  }

  resetearEstadoReporte(): void {
    this.sucursalSeleccionadaParaReporte = null;
    this.pedidosDelReporte = [];
    this.estadisticas = null;
    this.mostrarEstadisticas = false;
    this.errorReporte = null;

    this.filtroProducto = '';
    this.filtroCategoria = '';
    this.filtroUsuario = '';
    this.filtroFechaInicio = '';
    this.filtroFechaFin = '';
    this.ordenPrecio = '';
    this.productosDisponibles = [];
    this.categoriasDisponibles = [];
    this.pedidosFiltrados = [];

    this.chartVentasPorCategoriaData = [];
    this.chartVentasPorProductoData = [];
    this.chartVentasPorMesData = [];

    this.initMaterializeSelects();
  }

  cargarReporteComparativo(): void {
    this.cargandoComparativo = true;
    this.errorComparativo = null;

    this.pedidoService.getReporteComparativo().subscribe({
      next: (data: ResumenSucursal[]) => {
        this.resumenComparativo = data;
        this.maxVentaComparativo = data.length > 0 ? Math.max(...data.map(d => Number(d.totalVentas))) : 0;
        this.cargandoComparativo = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Error al cargar el reporte comparativo:', err);
        this.errorComparativo = 'No se pudo cargar el reporte comparativo de sucursales.';
        this.cargandoComparativo = false;
      }
    });
  }

  exportarCSV(): void {
    if (this.pedidosFiltrados.length === 0) {
      M.toast({ html: 'No hay datos para exportar.', classes: 'orange rounded' });
      return;
    }

    const encabezados = ['ID Pedido', 'Fecha', 'Producto', 'Categoria', 'Cantidad', 'Total', 'Usuario'];
    const filas = this.pedidosFiltrados.map(pedido => [
      pedido.pedido_id,
      this.aFecha(pedido.fecha_pedido).toLocaleString('es-MX'),
      `"${pedido.producto}"`,
      `"${pedido.categoria}"`,
      pedido.cantidad,
      Number(pedido.total).toFixed(2),
      pedido.username
    ].join(','));

    const csv = [encabezados.join(','), ...filas].join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = `reporte_sucursal_${this.sucursalSeleccionadaParaReporte}_${new Date().toISOString().slice(0, 10)}.csv`;
    enlace.click();
    URL.revokeObjectURL(url);
  }
}