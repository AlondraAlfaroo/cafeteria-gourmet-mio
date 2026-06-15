// cargarProductosPorSucursal.js
// Este script carga datos masivos en la tabla 'productos_por_sucursal' en Astra DB.

const cassandra = require('cassandra-driver');
const TimeUuid = cassandra.types.TimeUuid;

// --- CONFIGURACIÓN DE CONEXIÓN A CASSANDRA (ASTRA DB) ---
// ¡ASEGÚRATE DE QUE LA RUTA AL ZIP Y LAS CREDENCIALES SEAN LAS CORRECTAS DE TU ASTRA DB!
const client = new cassandra.Client({
    cloud: {
        secureConnectBundle: './secure-connect-nosqlatte-db.zip' // <-- ¡TU RUTA AL ZIP!
    },
    credentials: {
        username: 'token', // <-- ¡TU Client ID!
        password: 'AstraCS:HdypFtnbvKsdrKTjRZsYYvva:0ca21a525804b7106b1c0ace848a5a8737c9dd54ecaf6cedcc1ebc621c1a319a' // <-- ¡TU CLIENT SECRET COMPLETO!
    },
    keyspace: 'cafeteria_gourmet', // Tu keyspace en Astra DB
    protocolOptions: { port: 29042 }, // Puerto estándar de Astra DB para CQL
    queryOptions: { consistency: cassandra.types.consistencies.quorum, readTimeout: 30000 }
});

// --- DATOS BASE DE PRODUCTOS ---
const productosBase = [
    { producto_id: 'espresso_clasico', nombre_producto: 'Espresso Clásico', categoria: 'Café Caliente', descripcion: 'Nuestro café más puro y concentrado.', precio_unitario: 45.00 },
    { producto_id: 'latte_vainilla', nombre_producto: 'Latte Vainilla', categoria: 'Café Caliente', descripcion: 'Café suave con leche vaporizada y toque de vainilla.', precio_unitario: 60.00 },
    { producto_id: 'cappuccino_italiano', nombre_producto: 'Cappuccino Italiano', categoria: 'Café Caliente', descripcion: 'Espresso, leche espumada y un toque de cacao.', precio_unitario: 65.00 },
    { producto_id: 'mocha_chocolate', nombre_producto: 'Mocha Chocolate', categoria: 'Café Caliente', descripcion: 'La combinación perfecta de café y chocolate.', precio_unitario: 70.00 },
    { producto_id: 'americano_intenso', nombre_producto: 'Americano Intenso', categoria: 'Café Caliente', descripcion: 'Doble shot de espresso diluido en agua caliente.', precio_unitario: 50.00 },
    { producto_id: 'frappe_oreo', nombre_producto: 'Frappé Oreo', categoria: 'Café Frío', descripcion: 'Bebida fría con trozos de galleta Oreo y crema batida.', precio_unitario: 75.00 },
    { producto_id: 'te_chai_especiado', nombre_producto: 'Té Chai Especiado', categoria: 'Té e Infusiones', descripcion: 'Mezcla exótica de té negro con especias y leche.', precio_unitario: 55.00 },
    { producto_id: 'croissant_almendras', nombre_producto: 'Croissant Almendras', categoria: 'Panadería Premium', descripcion: 'Crujiente croissant de mantequilla con almendras.', precio_unitario: 40.00 },
    { producto_id: 'muffin_arandano', nombre_producto: 'Muffin Arándano Real', categoria: 'Panadería Premium', descripcion: 'Muffin suave y húmedo con arándanos frescos.', precio_unitario: 38.00 },
    { nombre_producto: 'Jugo Naranja Exprimido', categoria: 'Bebidas Frescas', descripcion: 'Jugo 100% natural, recién exprimido.', precio_unitario: 50.00 },
    { nombre_producto: 'Limonada de Menta', categoria: 'Bebidas Frescas', descripcion: 'Refrescante limonada casera con hojas de menta.', precio_unitario: 48.00 },
    { nombre_producto: 'Brownie Fudge', categoria: 'Postres', descripcion: 'Denso y chocolatoso brownie con nueces.', precio_unitario: 42.00 },
    { nombre_producto: 'Cheesecake Frutos Rojos', categoria: 'Postres', descripcion: 'Cremoso cheesecake con coulis de frutos rojos.', precio_unitario: 58.00 },
    { nombre_producto: 'Sándwich Club', categoria: 'Almuerzos Ligeros', descripcion: 'Clásico sándwich con pavo, tocino y queso.', precio_unitario: 95.00 },
    { nombre_producto: 'Ensalada Cesar', categoria: 'Almuerzos Ligeros', descripcion: 'Fresca ensalada con lechuga, crutones y aderezo César.', precio_unitario: 85.00 },
];

// --- CONFIGURACIÓN DE GENERACIÓN ---
const NUM_SUCURSALES_EXISTENTES = 20; // Número de sucursales a las que asignar productos
const STOCK_MIN = 50;
const STOCK_MAX = 200;
const PERCENT_ACTIVE = 0.9; // 90% de probabilidad de que un producto esté activo
const BATCH_SIZE = 50; // Número de inserciones por lote

// Calcular el total esperado de registros: NUM_SUCURSALES * productosBase.length
const TOTAL_PRODUCTOS_ESPERADOS = NUM_SUCURSALES_EXISTENTES * productosBase.length;
console.log(`Este script generará ${TOTAL_PRODUCTOS_ESPERADOS} productos (15 productos * 20 sucursales).`);


// --- FUNCIONES AUXILIARES ---
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// --- FUNCIÓN PRINCIPAL DE CARGA ---
async function cargarProductosPorSucursal() {
    try {
        await client.connect();
        console.log('Conectado a Cassandra para cargar productos por sucursal.');

        console.log('Truncando tabla productos_por_sucursal...');
        await client.execute('TRUNCATE productos_por_sucursal');
        console.log('Tabla productos_por_sucursal truncada.');

        const insertQuery = `INSERT INTO productos_por_sucursal 
                             (sucursal_id, producto_id, nombre_producto, categoria, descripcion, precio_unitario, cantidad_disponible, esta_activo) 
                             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
        const promises = [];
        let totalProductosInsertados = 0;

        console.log(`Generando e insertando productos para ${NUM_SUCURSALES_EXISTENTES} sucursales...`);

        for (let s = 1; s <= NUM_SUCURSALES_EXISTENTES; s++) {
            for (const prod of productosBase) {
                // *** ¡LA LÍNEA CRÍTICA CORREGIDA: USA BACKTICKS (`) AQUÍ! ***
                const productoId = `${prod.producto_id}_s${s}`;
                const cantidadDisponible = getRandomInt(STOCK_MIN, STOCK_MAX);
                const estaActivo = Math.random() < PERCENT_ACTIVE;

                const params = [
                    s, // ID de la sucursal actual
                    productoId, // ID único para esta sucursal y producto
                    prod.nombre_producto,
                    prod.categoria,
                    prod.descripcion,
                    prod.precio_unitario,
                    cantidadDisponible,
                    estaActivo
                ];
                promises.push(client.execute(insertQuery, params, { prepare: true }));
                totalProductosInsertados++;

                // DEBUG: Añadir logs para ver los IDs que se están generando y los lotes
                if (s === 1 && prod.producto_id === 'espresso_clasico') {
                    console.log(`DEBUG: Generando ID para Sucursal ${s}, Producto "${prod.nombre_producto}": ${productoId}`);
                }
                if (promises.length % BATCH_SIZE === 0) {
                    console.log(`DEBUG: Lote de ${BATCH_SIZE} promesas listo. Total acumulado: ${totalProductosInsertados}`);
                }

                if (promises.length >= BATCH_SIZE) {
                    await Promise.all(promises);
                    console.log(`Lote de ${BATCH_SIZE} productos insertado. Total: ${totalProductosInsertados} productos.`);
                    promises.length = 0; // Limpiar el array para el siguiente lote
                }
            }
        }

        // Insertar los productos restantes en el último lote
        if (promises.length > 0) {
            await Promise.all(promises);
            console.log(`Último lote de ${promises.length} productos insertado.`);
        }

        console.log(`--- Carga de productos por sucursal completada. Total: ${totalProductosInsertados} productos. ---`);

    } catch (err) {
        console.error('Error durante la carga de productos por sucursal:', err);
    } finally {
        await client.shutdown();
        console.log('Desconectado de Cassandra.');
    }
}

cargarProductosPorSucursal();