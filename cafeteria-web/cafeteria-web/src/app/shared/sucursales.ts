// Nombres de sucursales por colonia/municipio de Aguascalientes.
// El id numérico sigue siendo la clave real (Cassandra, JWT, middleware); esto es solo para mostrar.
export const NOMBRES_SUCURSALES: { [id: number]: string } = {
  1: 'Centro',
  2: 'Las Trojes',
  3: 'Jardines de la Asunción',
  4: 'San Marcos',
  5: 'Bosques del Prado',
  6: 'Villas de Nuestra Señora de la Asunción',
  7: 'Olivares',
  8: 'Pulgas Pandas',
  9: 'Heroes',
  10: 'Jesús María',
  11: 'San Francisco de los Romo',
  12: 'Calvillo',
  13: 'Asientos',
  14: 'Pabellón de Arteaga',
  15: 'Rincón de Romos',
  16: 'El Cortijo',
  17: 'Cumbres',
  18: 'Morelos',
  19: 'Ojocaliente',
  20: 'Insurgentes',
};

export function nombreSucursal(id: number | null | undefined): string {
  if (id === null || id === undefined) {
    return 'N/A';
  }
  return NOMBRES_SUCURSALES[id] ?? `Sucursal ${id}`;
}
