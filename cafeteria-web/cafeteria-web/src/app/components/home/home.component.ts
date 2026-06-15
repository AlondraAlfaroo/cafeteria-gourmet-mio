// src/app/components/home/home.component.ts
import { Component, OnInit, AfterViewInit, ElementRef, inject, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService, UserProfile } from '../../services/auth.service';
import { ProductoMenu } from '../../models/producto-menu.interface';

declare var M: any;

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {

  productosFavoritos: Partial<ProductoMenu>[] = [
    {
      producto_id: 'te_manzanilla_static',
      nombre_producto: 'Té de Manzanilla',
      categoria: 'Té e Infusiones',
      descripcion: 'Relajante infusión de manzanilla, perfecta para calmar el alma.',
      precio_unitario: 40.00,
      imagen_url: 'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=600&q=80'
    },
    {
      producto_id: 'mocha_chocolate_static',
      nombre_producto: 'Mocha de Chocolate',
      categoria: 'Café Caliente Especial',
      descripcion: 'Intenso espresso con chocolate de la casa y leche cremosa.',
      precio_unitario: 70.00,
      imagen_url: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=600&q=80'
    },
    {
      producto_id: 'cafe_civet_static',
      nombre_producto: 'Café de Civet (Kopi Luwak)',
      categoria: 'Café de Origen Exótico',
      descripcion: 'Una experiencia única con uno de los cafés más cotizados mundialmente.',
      precio_unitario: 280.00,
      imagen_url: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&q=80'
    },
    {
      producto_id: 'americano_intenso_static',
      nombre_producto: 'Americano Intenso',
      categoria: 'Café Clásico',
      descripcion: 'Doble shot de nuestro mejor espresso, diluido a la perfección.',
      precio_unitario: 45.00,
      imagen_url: 'https://images.unsplash.com/photo-1509785307050-d4066910ec1e?w=600&q=80'
    },
    {
      producto_id: 'jugo_naranja_static',
      nombre_producto: 'Jugo de Naranja Exprimido',
      categoria: 'Bebidas Frescas',
      descripcion: '100% naranjas frescas, exprimidas al momento para un boost de vitalidad.',
      precio_unitario: 50.00,
      imagen_url: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=600&q=80'
    },
    {
      producto_id: 'cappuccino_italiano_static',
      nombre_producto: 'Cappuccino Italiano',
      categoria: 'Café Clásico',
      descripcion: 'El equilibrio perfecto entre espresso, leche vaporizada y espuma aterciopelada.',
      precio_unitario: 60.00,
      imagen_url: 'https://images.unsplash.com/photo-1534778101976-62847782c213?w=600&q=80'
    }
  ];

  currentUser: UserProfile | null = null;
  private authSubscription!: Subscription;

  private authService = inject(AuthService);
  private router = inject(Router);
  private elementRef = inject(ElementRef);
  private cdr = inject(ChangeDetectorRef);

  promocionDelDia = {
    titulo: '¡Combo Mañanero Cafetería Gourmet!',
    descripcion: 'Tu Espresso Clásico + Croissant de Almendras por solo $75.00.',
    validez: 'Válido de Lunes a Viernes, de 8 AM a 11 AM.'
  };

  testimonios = [
    { texto: '¡El mejor Espresso que he probado! La calidad en Cafetería Gourmet es insuperable.', autor: 'Laura G.' },
    { texto: 'Siempre vengo por mi Mocha de Chocolate. ¡Es mi dosis de felicidad diaria!', autor: 'Miguel R.' },
    { texto: 'El ambiente es perfecto para relajarse o trabajar. ¡Y el Cappuccino es delicioso!', autor: 'Sofía P.' }
  ];

  constructor() { }

  ngOnInit(): void {
    this.authSubscription = this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      this.cdr.detectChanges();
    });
  }

  ngAfterViewInit(): void {
    this.initMaterializeComponents();
  }

  ngOnDestroy(): void {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  initMaterializeComponents() {
    setTimeout(() => {
      const sliderElems = this.elementRef.nativeElement.querySelectorAll('.slider');
      if (sliderElems.length > 0) {
        M.Slider.init(sliderElems, { indicators: true, height: 450, duration: 500, interval: 6000 });
      }

      const parallaxElems = this.elementRef.nativeElement.querySelectorAll('.parallax');
      if (parallaxElems.length > 0) {
        M.Parallax.init(parallaxElems);
      }

      const carouselElems = this.elementRef.nativeElement.querySelectorAll('.carousel.carousel-slider');
      if (carouselElems.length > 0) {
        M.Carousel.init(carouselElems, { fullWidth: true, indicators: true, duration: 200 });
      }
      this.cdr.detectChanges();
    }, 250);
  }

  accionProducto(producto?: Partial<ProductoMenu>): void {
    if (this.authService.isLoggedIn()) {
      const queryParams: any = {};
      if (producto && producto.producto_id) {
        queryParams.producto_id = producto.producto_id;
        queryParams.nombre_producto = producto.nombre_producto;
        queryParams.precio_unitario = producto.precio_unitario;
        queryParams.categoria = producto.categoria;
      }
      this.router.navigate(['/registrar-pedido'], { queryParams });
    } else {
      M.toast({ html: 'Por favor, inicia sesión o regístrate para hacer un pedido.', classes: 'orange rounded', displayLength: 4000 });
      this.router.navigate(['/login']);
    }
  }
}