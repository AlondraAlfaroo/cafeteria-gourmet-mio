// cargarProductosUsuarios.ts
import * as cassandra from 'cassandra-driver'; // Importa todo el módulo como 'cassandra' para acceso a sus tipos
import { types as CassandraTypes } from 'cassandra-driver'; // Importa específicamente 'types' del driver para mayor claridad

// Aunque TimeUuid no se usa directamente aquí, es buena práctica mantenerlo si se usa en el proyecto.
// const TimeUuid = cassandra.types.TimeUuid; // Esto ya no es necesario si no lo usas

// Configuración del cliente de Cassandra para conectarse a tu clúster.
const client = new cassandra.Client({
    contactPoints: ['192.168.1.130'], // Asegúrate de que esta IP sea la de tu máquina host donde está expuesto cassandra-node1
    localDataCenter: 'DC1', // El centro de datos que definiste en tu Docker Compose
    keyspace: 'cafeteria_gourmet', // El nombre de tu keyspace
    protocolOptions: { port: 9042 } // El puerto por defecto de Cassandra (expuesto en tu Docker Compose)
});

const NUM_SUCURSALES = 20; // Define el número de sucursales que se usarán para generar datos.

// Array de objetos que representan los productos base del menú de la cafetería.
const productosBase = [
    { producto_id: 'espresso_clasico', nombre_producto: 'Espresso Clásico', categoria: 'Café Caliente', descripcion: 'Nuestro café más puro', precio_unitario: 45.00 },
    { producto_id: 'latte_vainilla', nombre_producto: 'Latte Vainilla', categoria: 'Café Caliente', descripcion: 'Latte cremoso con sirope de vainilla', precio_unitario: 60.00 },
    { producto_id: 'cappuccino_italiano', nombre_producto: 'Cappuccino Italiano', categoria: 'Café Caliente', descripcion: 'Café, leche y espuma a la perfección', precio_unitario: 65.00 },
    { producto_id: 'mocha_chocolate', nombre_producto: 'Mocha Chocolate', categoria: 'Café Caliente', descripcion: 'Chocolate y café en una bebida', precio_unitario: 70.00 },
    { producto_id: 'americano_intenso', nombre_producto: 'Americano Intenso', categoria: 'Café Caliente', descripcion: 'Doble shot de espresso con agua caliente', precio_unitario: 50.00 },
    { producto_id: 'frappe_oreo', nombre_producto: 'Frappé Oreo', categoria: 'Café Frío', descripcion: 'Batido frío con trozos de galleta Oreo', precio_unitario: 75.00 },
    { producto_id: 'te_chai_especiado', nombre_producto: 'Té Chai Especiado', categoria: 'Té e Infusiones', precio_unitario: 55.00 },
    { producto_id: 'croissant_almendras', nombre_producto: 'Croissant Almendras', categoria: 'Panadería Premium', descripcion: 'Croissant crujiente relleno de crema de almendras', precio_unitario: 40.00 },
    { producto_id: 'muffin_arandano', nombre_producto: 'Muffin Arándano Real', categoria: 'Panadería Premium', descripcion: 'Muffin húmedo con arándanos frescos', precio_unitario: 38.00 },
    { producto_id: 'jugo_naranja', nombre_producto: 'Jugo Naranja Exprimido', categoria: 'Bebidas Frescas', descripcion: 'Jugo 100% natural de naranja', precio_unitario: 50.00 },
    { producto_id: 'soda_artesanal', nombre_producto: 'Soda Artesanal', categoria: 'Bebidas Frescas', descripcion: 'Refresco casero con sabores naturales', precio_unitario: 45.00 },
    { producto_id: 'sandwich_pollo', nombre_producto: 'Sándwich de Pollo', categoria: 'Almuerzos Ligeros', descripcion: 'Sándwich con pollo a la parrilla y verduras', precio_unitario: 80.00 },
];

// Array de objetos que representan los usuarios de ejemplo para la tabla 'usuarios'.
// Las contraseñas se almacenan como hashs (simulados aquí con texto plano).
const usuariosData = [
    { username: 'admin_global', password_hash: 'hashed_password_admin123', rol: 'admin', sucursal_asignada_id: null, nombre_completo: 'Administrador Global' },
    { username: 'empleado_s1', password_hash: 'hashed_password_emp1', rol: 'empleado', sucursal_asignada_id: 1, nombre_completo: 'Juan Pérez' },
    { username: 'empleado_s2', password_hash: 'hashed_password_emp2', rol: 'empleado', sucursal_asignada_id: 2, nombre_completo: 'María Gómez' },
    { username: 'empleado_s3', password_hash: 'hashed_password_emp3', rol: 'empleado', sucursal_asignada_id: 3, nombre_completo: 'Pedro Ramírez' },
    { username: 'cliente_vip', password_hash: 'hashed_password_vip', rol: 'registrado', sucursal_asignada_id: null, nombre_completo: 'Cliente Frecuente' },
    { username: 'test_user', password_hash: 'hashed_password_test', rol: 'registrado', sucursal_asignada_id: null, nombre_completo: 'Usuario de Prueba' },
];

/**
 * Carga datos en la tabla 'productos_por_sucursal'.
 * Genera un conjunto de productos para cada una de las sucursales definidas.
 */
async function cargarProductos(): Promise<void> {
    console.log('Cargando productos en la tabla productos_por_sucursal...');
    const query = `INSERT INTO productos_por_sucursal (sucursal_id, producto_id, nombre_producto, categoria, descripcion, precio_unitario, cantidad_disponible)
                   VALUES (?, ?, ?, ?, ?, ?, ?)`;
    // Declaración de 'promesas' con el tipo correcto para TypeScript:
    // Un array de Promesas, donde cada Promesa se resuelve a un ResultSet de Cassandra.
    const promesas: Promise<CassandraTypes.ResultSet>[] = [];

    // Itera a través de cada ID de sucursal para asegurar que todas las sucursales tengan productos.
    for (let s = 1; s <= NUM_SUCURSALES; s++) {
        // Para cada sucursal, inserta todos los productos base.
        for (const prod of productosBase) {
            // Genera una cantidad disponible aleatoria para simular inventario.
            const cantidadDisponible = Math.floor(Math.random() * 100) + 50; // Entre 50 y 150 unidades
            const params = [
                s,                  // ID de la sucursal actual
                prod.producto_id,
                prod.nombre_producto,
                prod.categoria,
                prod.descripcion,
                prod.precio_unitario,
                cantidadDisponible
            ];
            // Agrega la promesa de la ejecución de la consulta al array.
            promesas.push(client.execute(query, params, { prepare: true }));
        }
    }
    // Espera a que todas las promesas en el array se resuelvan (todas las inserciones se completen).
    await Promise.all(promesas);
    console.log(`Cargados ${promesas.length} productos para ${NUM_SUCURSALES} sucursales.`);
}

/**
 * Carga datos en la tabla 'usuarios'.
 * Inserta los usuarios de ejemplo predefinidos.
 */
async function cargarUsuarios(): Promise<void> {
    console.log('Cargando usuarios en la tabla usuarios...');
    const query = `INSERT INTO usuarios (username, password_hash, rol, sucursal_asignada_id, nombre_completo)
                   VALUES (?, ?, ?, ?, ?)`;
    // Declaración de 'promesas' con el tipo correcto para TypeScript, similar a la función anterior.
    const promesas: Promise<CassandraTypes.ResultSet>[] = [];

    // Itera a través de cada usuario en el array 'usuariosData'.
    for (const user of usuariosData) {
        const params = [
            user.username,
            user.password_hash,
            user.rol,
            user.sucursal_asignada_id,
            user.nombre_completo
        ];
        // Agrega la promesa de la ejecución de la consulta al array.
        promesas.push(client.execute(query, params, { prepare: true }));
    }
    // Espera a que todas las promesas se resuelvan.
    await Promise.all(promesas);
    console.log(`Cargados ${usuariosData.length} usuarios.`);
}

/**
 * Función principal que orquesta la conexión a Cassandra y la carga de datos.
 */
async function cargarDatosPrincipales(): Promise<void> {
    try {
        await client.connect(); // Establece la conexión con la base de datos Cassandra.
        console.log('Conectado a Cassandra para cargar productos y usuarios!');

        await cargarProductos(); // Llama a la función para cargar datos de productos.
        await cargarUsuarios(); // Llama a la función para cargar datos de usuarios.

        console.log('Carga de datos principales (productos y usuarios) completada.');

    } catch (err) {
        console.error('Error durante la carga de datos principales:', err);
    } finally {
        await client.shutdown(); // Cierra la conexión con Cassandra para liberar recursos.
        console.log('Desconectado de Cassandra.');
    }
}

cargarDatosPrincipales(); // Ejecuta la función principal para iniciar el proceso de carga de datos.