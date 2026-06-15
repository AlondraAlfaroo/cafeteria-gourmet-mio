// src/app/app.component.ts
import { Component, AfterViewInit, ElementRef, inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common'; // Necesario para *ngIf
import { Subscription } from 'rxjs'; // Para manejar la suscripción
import { AuthService, UserProfile } from './services/auth.service'; // Asegúrate que la ruta sea correcta

declare var M: any; // Declara M para Materialize

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    CommonModule // Añade CommonModule para *ngIf, etc.
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, AfterViewInit, OnDestroy {
  title = 'NoSQLatte Bar'; // Título actualizado
  private sidenavInstance: any;

  currentUser: UserProfile | null = null;
  private authSubscription!: Subscription; // Para desuscribirse y evitar fugas de memoria

  // Inyección de dependencias
  private elementRef = inject(ElementRef);
  private cdr = inject(ChangeDetectorRef);
  private authService = inject(AuthService); // Inyecta AuthService

  constructor() { }

  ngOnInit(): void {
    // Suscribirse a los cambios del usuario actual
    this.authSubscription = this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      this.cdr.detectChanges(); // Forzar detección de cambios si es necesario para la UI
      console.log('Usuario actual en AppComponent:', this.currentUser);
    });
  }

 

  ngAfterViewInit(): void {
    const sidenavElems = this.elementRef.nativeElement.querySelectorAll('.sidenav');
    if (sidenavElems.length) {
      // Inicializa todos los sidenavs encontrados y guarda la primera instancia
      // (asumiendo que solo tienes uno principal con id 'mobile-demo')
      const instances = M.Sidenav.init(sidenavElems, {});
      if (instances && instances.length > 0) {
        this.sidenavInstance = instances[0];
      }
    }
    // Puedes añadir inicialización para otros componentes globales de Materialize aquí si es necesario
    // Por ejemplo, si tuvieras un slider global en app.component.html:
    // const sliderElems = this.elementRef.nativeElement.querySelectorAll('.slider');
    // if (sliderElems.length) {
    //   M.Slider.init(sliderElems, {full_width: true});
    // }
    this.cdr.detectChanges();
  }

  closeSidenav(): void {
    if (this.sidenavInstance && this.sidenavInstance.isOpen) {
      this.sidenavInstance.close();
    }
  }

  logout(): void {
    this.authService.logout();
    // No es necesario navegar aquí, AuthService ya lo hace.
    M.toast({ html: 'Has cerrado sesión.', classes: 'blue rounded' });
  }

  ngOnDestroy(): void {
    // Desuscribirse para evitar fugas de memoria cuando el componente se destruye
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }
}