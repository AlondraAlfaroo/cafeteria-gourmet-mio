// src/app/models/producto-menu.interface.ts
export interface ProductoMenu {
    producto_id: string;
    nombre_producto: string;
    categoria: string;
    descripcion?: string;
    precio_unitario: number;
    cantidad_disponible: number; // La necesitas para el panel de admin
    esta_activo: boolean;        // La necesitas para el panel de admin
    imagen_url?: string;        // Para la URL de la imagen (opcional)
}