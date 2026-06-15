// cafeteria-backend/cassandraService.js
// Este archivo contiene la lógica para conectar y realizar operaciones con la base de datos Cassandra.

// Importa el módulo 'cassandra-driver', que es la biblioteca oficial de Node.js para interactuar con Cassandra.
const cassandra = require('cassandra-driver');
// Importa TimeUuid, un tipo especial de ID que garantiza que los IDs sean únicos y ordenados por tiempo, útil para Cassandra.
const TimeUuid = cassandra.types.TimeUuid;

const bcrypt = require('bcryptjs'); // Necesario para hashing de contraseñas

// Configura el cliente de Cassandra para conectar a DataStax Astra DB
const client = new cassandra.Client({
    // --- Configuración CRÍTICA para Astra DB ---
    cloud: {
        // La ruta a tu archivo ZIP descargado. Debe ser relativa a donde ejecutas `node server.js`.
        // Si el ZIP está en la misma carpeta que server.js:
        secureConnectBundle: './secure-connect-nosqlatte-db.zip'
        // Si lo pones en una subcarpeta 'certs' dentro de backend: './certs/secure-connect-bundle.zip'
    },
    credentials: {
        username: 'token', // El Client ID de Astra (generalmente es 'token' para los tokens de aplicación)
        password: 'AstraCS:HdypFtnbvKsdrKTjRZsYYvva:0ca21a525804b7106b1c0ace848a5a8737c9dd54ecaf6cedcc1ebc621c1a319a' // ¡TU Client Secret COMPLETO!
    },
    // --- Fin Configuración CRÍTICA ---

    // Tu Keyspace en Astra DB
    keyspace: 'cafeteria_gourmet',
    // ProtocolOptions y QueryOptions se mantienen como antes (Astra los usa internamente)
    protocolOptions: { port: 29042 }, // Puerto específico de Astra DB para CQLs (a menudo 29042)
    queryOptions: { consistency: cassandra.types.consistencies.quorum, readTimeout: 30000 }
});

// AÑADE ESTOS CONSOLE.LOGS TEMPORALMENTE PARA DEPURAR LA CONEXIÓN
console.log("DEBUG: Configurando cliente de Cassandra para Astra DB...");
console.log("DEBUG: Secure Connect Bundle path:", client.options.cloud.secureConnectBundle);
console.log("DEBUG: Keyspace:", client.options.keyspace);
console.log("DEBUG: Username:", client.options.credentials.username);
// console.log("DEBUG: Password (AVISO: NO LOGUEES CONTRASEÑAS REALES EN PRODUCCIÓN):", client.options.credentials.password);


// --- Funciones de Conexión y Operaciones de BD ---

async function connectDB() {
    try {
        await client.connect();
        console.log('Conectado exitosamente a DataStax Astra DB!');

    } catch (err) {
        console.error('Error FATAL al conectar con DataStax Astra DB:', err);
        process.exit(1);
    }
}

// Función para registrar un nuevo pedido en la tabla 'pedidos' de Cassandra.
async function registrarPedido(pedido) {
    // La consulta INSERT para añadir datos a la tabla 'pedidos'.
    // Los signos '?' son marcadores de posición para los valores que se insertarán de forma segura.
    const query = `INSERT INTO pedidos (sucursal_id, fecha_pedido, pedido_id, producto, categoria, cantidad, precio_unitario, total) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    // 'params' es un array que contiene los valores que reemplazarán a los '?' en la consulta, en el orden correcto.
    const params = [
        pedido.sucursal_id, // ID de la sucursal.
        pedido.fecha_pedido || new Date(), // Fecha del pedido, usa la fecha actual si no se proporciona una.
        TimeUuid.now(), // Genera un ID único basado en el tiempo para el pedido.
        pedido.producto, // Nombre del producto.
        pedido.categoria, // Categoría del producto.
        pedido.cantidad, // Cantidad del producto.
        pedido.precio_unitario, // Precio por unidad.
        // Calcula el total de la venta y lo formatea a 2 decimales.
        parseFloat((pedido.cantidad * pedido.precio_unitario).toFixed(2))
    ];
    // Una nota en el código sobre cómo podrías usar un nivel de consistencia diferente (por ejemplo, ONE para más velocidad).
    // await client.execute(query, params, { prepare: true, consistency: cassandra.types.consistencies.one });
    // Ejecuta la consulta INSERT con los parámetros. 'prepare: true' hace que la consulta se prepare una vez y se reutilice.
    return client.execute(query, params, { prepare: true });
}

// Función para consultar pedidos basados en el ID de la sucursal.
async function consultarPedidosPorSucursal(sucursalId, limite = 2000) {
    // Consulta SELECT para obtener pedidos.
    // 'WHERE sucursal_id = ?' filtra por la sucursal.
    // 'ORDER BY fecha_pedido DESC' ordena los resultados con las ventas más recientes primero.
    // 'LIMIT ?' restringe el número de resultados.
    const query = 'SELECT sucursal_id, fecha_pedido, pedido_id, producto, categoria, cantidad, total FROM pedidos WHERE sucursal_id = ? ORDER BY fecha_pedido DESC LIMIT ?';
    // Ejecuta la consulta con el ID de la sucursal y el límite.
    const result = await client.execute(query, [sucursalId, limite], { prepare: true });
    // Devuelve las filas de resultados.
    return result.rows;
}

// Función para consultar pedidos basados en el nombre del producto.
async function consultarPedidosPorProducto(productoNombre, limite = 2000) {
    // Consulta SELECT para obtener pedidos filtrados por nombre de producto.
    // 'ALLOW FILTERING' permite consultas en columnas que no son parte de la clave primaria o de índices secundarios.
    // Es útil para flexibilidad, pero puede ser ineficiente en grandes tablas y debería usarse con cautela en producción.
    const query = 'SELECT sucursal_id, fecha_pedido, pedido_id, producto, categoria, cantidad, total FROM pedidos WHERE producto = ? LIMIT ? ALLOW FILTERING';
    // Ejecuta la consulta con el nombre del producto y el límite.
    const result = await client.execute(query, [productoNombre, limite], { prepare: true });
    // Devuelve las filas de resultados.
    return result.rows;
}

// Función para obtener una lista de todos los IDs de sucursales únicas que tienen pedidos.
async function getSucursalesUnicas() {
    // Consulta SELECT DISTINCT para obtener valores únicos de 'sucursal_id'.
    const query = 'SELECT DISTINCT sucursal_id FROM pedidos';
    // Ejecuta la consulta.
    const result = await client.execute(query, [], { prepare: true });
    // Procesa los resultados para obtener solo los IDs y los ordena de forma numérica.
    return result.rows.map(row => row.sucursal_id).sort((a, b) => a - b);
}

// --- Funciones de Productos (Públicas/Cliente) ---
// En cassandraService.js (backend)
async function getProductosPorSucursal(sucursalId) {
    const query = `
        SELECT producto_id, nombre_producto, categoria, descripcion, precio_unitario, cantidad_disponible, esta_activo 
        FROM productos_por_sucursal 
        WHERE sucursal_id = ? AND esta_activo = true AND cantidad_disponible > 0
        ALLOW FILTERING; 
    `; // <-- AÑADIDO ALLOW FILTERING

    const result = await client.execute(query, [sucursalId], { prepare: true });
    return result.rows;
}

async function getCatalogoProductosActivos() {
    // Trae productos distintos que estén activos y con stock en CUALQUIER sucursal.
    // Para la demo, ALLOW FILTERING es aceptable. En producción, se necesitaría una tabla de catálogo.
    const query = `
        SELECT producto_id, nombre_producto, categoria, descripcion, precio_unitario 
        FROM productos_por_sucursal 
        WHERE esta_activo = true AND cantidad_disponible > 0 
        ALLOW FILTERING
    `;
    // No seleccionamos cantidad_disponible aquí porque sería confuso (¿de qué sucursal?).
    // Solo queremos mostrar el catálogo de productos disponibles en general.
    // imagen_url se podría añadir si la tienes en la tabla y la quieres usar.

    try {
        const result = await client.execute(query, [], { prepare: true });
        // Deduplicar por producto_id, ya que un mismo producto puede estar en varias sucursales
        const uniqueProductsMap = new Map();
        result.rows.forEach(row => {
            if (!uniqueProductsMap.has(row.producto_id)) {
                uniqueProductsMap.set(row.producto_id, {
                    producto_id: row.producto_id,
                    nombre_producto: row.nombre_producto,
                    categoria: row.categoria,
                    descripcion: row.descripcion,
                    precio_unitario: row.precio_unitario
                    // imagen_url: row.imagen_url // Descomenta si la usas
                });
            }
        });
        return Array.from(uniqueProductsMap.values());
    } catch (err) {
        console.error("Error en getCatalogoProductosActivos:", err);
        throw err; // Para que el endpoint lo maneje
    }
}

async function getTodosLosProductosUnicos() { // Para un selector general de productos, si es necesario
    // Esta consulta podría ser costosa en producción si hay muchos productos.
    // Podrías tener una tabla separada 'catalogo_productos' si esto se vuelve un cuello de botella.
    const query = 'SELECT DISTINCT producto_id, nombre_producto, categoria, descripcion, precio_unitario FROM productos_por_sucursal ALLOW FILTERING';
    const result = await client.execute(query, [], { prepare: true });
    // Simple deduplicación por producto_id ya que pueden estar en múltiples sucursales
    const uniqueProducts = [];
    const map = new Map();
    for (const item of result.rows) {
        if (!map.has(item.producto_id)) {
            map.set(item.producto_id, true);
            uniqueProducts.push(item);
        }
    }
    return uniqueProducts;
}


async function actualizarInventarioProducto(sucursalId, productoId, cantidadVendida) {
    // Esta operación debe ser más robusta en un sistema real (manejar concurrencia, verificar stock negativo)
    // Para la demo, una simple resta. Podrías usar Light-Weight Transactions (LWT) para condicionalidad.
    const selectQuery = 'SELECT cantidad_disponible FROM productos_por_sucursal WHERE sucursal_id = ? AND producto_id = ?';
    const productoActual = await client.execute(selectQuery, [sucursalId, productoId], { prepare: true });

    if (productoActual.rowLength > 0) {
        const cantidadActual = productoActual.first().cantidad_disponible;
        if (cantidadActual >= cantidadVendida) {
            const nuevaCantidad = cantidadActual - cantidadVendida;
            const updateQuery = 'UPDATE productos_por_sucursal SET cantidad_disponible = ? WHERE sucursal_id = ? AND producto_id = ?';
            await client.execute(updateQuery, [nuevaCantidad, sucursalId, productoId], { prepare: true });
            return { success: true, nuevaCantidad };
        } else {
            return { success: false, error: 'Stock insuficiente', cantidadActual };
        }
    }
    return { success: false, error: 'Producto no encontrado' };
}

// Función para encontrar usuario por username (MODIFICADA para usar bcrypt)
async function findUserByUsername(username) {
    const query = 'SELECT username, password_hash, rol, sucursal_asignada_id, nombre_completo FROM usuarios WHERE username = ?';
    const result = await client.execute(query, [username], { prepare: true });
    return result.first();
}

// NUEVA FUNCIÓN: Registrar un nuevo usuario
async function registrarUsuario(userData) {
    // Hashear la contraseña antes de guardarla
    // El '10' es el número de "salt rounds", un valor más alto es más seguro pero más lento. 10 es un buen balance.
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    const query = `INSERT INTO usuarios (username, nombre_completo, password_hash, rol, sucursal_asignada_id) 
                   VALUES (?, ?, ?, ?, ?)`;
    const params = [
        userData.username,
        userData.nombre_completo || null, // Puede ser opcional
        hashedPassword, // Guardamos el hash
        userData.rol || 'registrado', // Rol por defecto 'registrado' si no se especifica
        userData.sucursal_asignada_id || null // Asignar sucursal si es empleado, null si es cliente/admin
    ];

    try {
        await client.execute(query, params, { prepare: true });
        return { success: true, message: 'Usuario registrado exitosamente.' };
    } catch (error) {
        // Manejar error de username duplicado, por ejemplo (Cassandra lanzará un error si la PK se duplica)
        if (error.code === 8704 && error.message.includes('Primary key already exists')) { // Código común para dup. PK
            throw new Error('El nombre de usuario ya está en uso. Por favor, elige otro.');
        }
        console.error("Error al registrar usuario en Cassandra:", error);
        throw error;
    }
}


// --- Funciones de ADMIN - USUARIOS ---
async function adminGetAllUsers() {
    const query = 'SELECT username, nombre_completo, rol, sucursal_asignada_id FROM usuarios';
    const result = await client.execute(query, [], { prepare: true });
    return result.rows;
}

async function adminUpdateUser(userData) {
    // userData debe incluir: username (para WHERE), nombre_completo, rol, sucursal_asignada_id
    const query = `UPDATE usuarios 
                   SET nombre_completo = ?, rol = ?, sucursal_asignada_id = ?
                   WHERE username = ?`;
    const params = [
        userData.nombre_completo,
        userData.rol,
        userData.sucursal_asignada_id || null, // Asegurar null si no tiene asignada
        userData.username
    ];
    await client.execute(query, params, { prepare: true });
    return { message: 'Usuario modificado exitosamente.' };
}

async function adminDeleteUser(username) {
    const query = 'DELETE FROM usuarios WHERE username = ?';
    await client.execute(query, [username], { prepare: true });
    return { message: 'Usuario eliminado exitosamente.' };
}

// ADMIN - PRODUCTOS
async function adminGetAllProductosPorSucursal(sucursalId) {
    // Trae todos, incluyendo los inactivos, para que el admin los vea
    const query = 'SELECT producto_id, nombre_producto, categoria, descripcion, precio_unitario, cantidad_disponible, esta_activo FROM productos_por_sucursal WHERE sucursal_id = ?';
    const result = await client.execute(query, [sucursalId], { prepare: true });
    return result.rows;
}

async function adminGetProducto(sucursalId, productoId) {
    const query = 'SELECT producto_id, nombre_producto, categoria, descripcion, precio_unitario, cantidad_disponible, esta_activo FROM productos_por_sucursal WHERE sucursal_id = ? AND producto_id = ?';
    const result = await client.execute(query, [sucursalId, productoId], { prepare: true });
    return result.first();
}

async function adminAltaProducto(productoData) {
    // productoData debe incluir: sucursal_id, producto_id, nombre_producto, categoria,
    // descripcion, precio_unitario, cantidad_disponible_inicial, imagen_url (opcional)
    const query = `INSERT INTO productos_por_sucursal 
                   (sucursal_id, producto_id, nombre_producto, categoria, descripcion, precio_unitario, cantidad_disponible, esta_activo) 
                   VALUES (?, ?, ?, ?, ?, ?, ?, true)`; // <-- CORREGIDO: 7 '?' y el 'true' directo
    const params = [
        productoData.sucursal_id,
        productoData.producto_id, // Debe ser único por sucursal
        productoData.nombre_producto,
        productoData.categoria,
        productoData.descripcion,
        productoData.precio_unitario,
        productoData.cantidad_disponible_inicial,
    ];
    await client.execute(query, params, {
        prepare: true,
        // Aumenta el timeout de escritura a, por ejemplo, 10 segundos (10000 ms)
        // Puedes probar con 5000, 10000, 15000ms
        readTimeout: 40000 // Esto también es relevante para las escrituras en Cassandra.
    });
    return { message: 'Producto dado de alta exitosamente' };
}

async function adminModificarProducto(productoData) {
    // productoData debe incluir: sucursal_id, producto_id (el que se va a modificar)
    // y los campos a actualizar: nombre_producto, categoria, descripcion, precio_unitario, imagen_url
    const query = `UPDATE productos_por_sucursal 
                   SET nombre_producto = ?, categoria = ?, descripcion = ?, precio_unitario = ?
                   WHERE sucursal_id = ? AND producto_id = ?`;
    const params = [
        productoData.nombre_producto,
        productoData.categoria,
        productoData.descripcion,
        productoData.precio_unitario,
        productoData.sucursal_id,
        productoData.producto_id
    ];
    await client.execute(query, params, { prepare: true });
    return { message: 'Producto modificado exitosamente' };
}

async function adminAjustarInventario(sucursalId, productoId, nuevaCantidad) {
    const query = 'UPDATE productos_por_sucursal SET cantidad_disponible = ? WHERE sucursal_id = ? AND producto_id = ?';
    await client.execute(query, [nuevaCantidad, sucursalId, productoId], { prepare: true });
    return { message: `Inventario de ${productoId} actualizado a ${nuevaCantidad}` };
}

async function adminCambiarEstadoActivoProducto(sucursalId, productoId, estaActivo) {
    // true para "dar de alta" (activar), false para "dar de baja" (desactivar)
    const query = 'UPDATE productos_por_sucursal SET esta_activo = ? WHERE sucursal_id = ? AND producto_id = ?';
    await client.execute(query, [estaActivo, sucursalId, productoId], { prepare: true });
    const action = estaActivo ? 'activado' : 'desactivado (dado de baja)';
    return { message: `Producto ${productoId} ${action} exitosamente` };
}


// REGISTRAR PEDIDO (MODIFICADO para actualizar inventario)
async function registrarPedidoConInventario(pedido) {
    // 1. Verificar y actualizar inventario
    const inventarioResult = await actualizarInventarioProducto(
        Number(pedido.sucursal_id),
        pedido.producto_id,
        Number(pedido.cantidad)
    );

    if (!inventarioResult.success) {
        const error = new Error(inventarioResult.error || 'Error al actualizar inventario');
        // @ts-ignore
        error.details = { cantidadActual: inventarioResult.cantidadActual };
        throw error;
    }

    // 2. Registrar el pedido (AÑADIR username)
    const query = `INSERT INTO pedidos (sucursal_id, fecha_pedido, pedido_id, producto, categoria, cantidad, precio_unitario, total, username)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`; // <-- AÑADIDO 'username' aquí (9 valores)
    const params = [
        Number(pedido.sucursal_id),
        pedido.fecha_pedido || new Date(),
        TimeUuid.now(),
        pedido.nombre_producto,
        pedido.categoria,
        Number(pedido.cantidad),
        Number(pedido.precio_unitario),
        parseFloat((Number(pedido.cantidad) * Number(pedido.precio_unitario)).toFixed(2)),
        pedido.username // <-- ¡NUEVO PARÁMETRO: username!
    ];
    await client.execute(query, params, { prepare: true });
    return { message: 'Pedido registrado e inventario actualizado', nuevaCantidad: inventarioResult.nuevaCantidad };
}

// Función para consultar pedidos basados en el ID de la sucursal (AÑADIR username al SELECT)
async function consultarPedidosPorSucursal(sucursalId, limite = 2000) {
    const query = 'SELECT sucursal_id, fecha_pedido, pedido_id, producto, categoria, cantidad, total, username FROM pedidos WHERE sucursal_id = ? ORDER BY fecha_pedido DESC LIMIT ?'; // <-- AÑADIDO 'username' al SELECT
    const result = await client.execute(query, [sucursalId, limite], { prepare: true });
    return result.rows;
}

// ADMIN - PRODUCTOS
async function adminGetAllProductosPorSucursal(sucursalId) {
    // Trae todos, incluyendo los inactivos, para que el admin los vea
    const query = 'SELECT producto_id, nombre_producto, categoria, descripcion, precio_unitario, cantidad_disponible, esta_activo FROM productos_por_sucursal WHERE sucursal_id = ?';
    const result = await client.execute(query, [sucursalId], { prepare: true });
    return result.rows;
}

async function adminGetProducto(sucursalId, productoId) {
    const query = 'SELECT producto_id, nombre_producto, categoria, descripcion, precio_unitario, cantidad_disponible, esta_activo  FROM productos_por_sucursal WHERE sucursal_id = ? AND producto_id = ?';
    const result = await client.execute(query, [sucursalId, productoId], { prepare: true });
    return result.first();
}

async function adminAltaProducto(productoData) {
    // productoData debe incluir: sucursal_id, producto_id, nombre_producto, categoria,
    // descripcion, precio_unitario, cantidad_disponible_inicial, imagen_url (opcional)
    const query = `INSERT INTO productos_por_sucursal 
                   (sucursal_id, producto_id, nombre_producto, categoria, descripcion, precio_unitario, cantidad_disponible, esta_activo) 
                   VALUES (?, ?, ?, ?, ?, ?, ?, true)`; // esta_activo = true por defecto al dar de alta
    const params = [
        productoData.sucursal_id,
        productoData.producto_id, // Debe ser único por sucursal
        productoData.nombre_producto,
        productoData.categoria,
        productoData.descripcion,
        productoData.precio_unitario,
        productoData.cantidad_disponible_inicial,
    ];
    await client.execute(query, params, { prepare: true });
    return { message: 'Producto dado de alta exitosamente' };
}

async function adminModificarProducto(productoData) {
    // productoData debe incluir: sucursal_id, producto_id (el que se va a modificar)
    // y los campos a actualizar: nombre_producto, categoria, descripcion, precio_unitario, imagen_url
    const query = `UPDATE productos_por_sucursal 
                   SET nombre_producto = ?, categoria = ?, descripcion = ?, precio_unitario = ?
                   WHERE sucursal_id = ? AND producto_id = ?`;
    const params = [
        productoData.nombre_producto,
        productoData.categoria,
        productoData.descripcion,
        productoData.precio_unitario,
        productoData.sucursal_id,
        productoData.producto_id
    ];
    await client.execute(query, params, { prepare: true });
    return { message: 'Producto modificado exitosamente' };
}

async function adminAjustarInventario(sucursalId, productoId, nuevaCantidad) {
    const query = 'UPDATE productos_por_sucursal SET cantidad_disponible = ? WHERE sucursal_id = ? AND producto_id = ?';
    await client.execute(query, [nuevaCantidad, sucursalId, productoId], { prepare: true });
    return { message: `Inventario de ${productoId} actualizado a ${nuevaCantidad}` };
}

async function adminCambiarEstadoActivoProducto(sucursalId, productoId, estaActivo) {
    // true para "dar de alta" (activar), false para "dar de baja" (desactivar)
    const query = 'UPDATE productos_por_sucursal SET esta_activo = ? WHERE sucursal_id = ? AND producto_id = ?';
    await client.execute(query, [estaActivo, sucursalId, productoId], { prepare: true });
    const action = estaActivo ? 'activado' : 'desactivado (dado de baja)';
    return { message: `Producto ${productoId} ${action} exitosamente` };
}


// Exporta las funciones y el cliente de Cassandra para que otros archivos (como server.js) puedan usarlos.
// Al final de tu cassandraService.js
module.exports = {
    connectDB,
    registrarPedido, // Si aún la usas en algún lado
    consultarPedidosPorSucursal,
    consultarPedidosPorProducto,
    getSucursalesUnicas,
    client,
    getProductosPorSucursal,
    getTodosLosProductosUnicos,
    // actualizarInventarioProducto, // Esta es interna a registrarPedidoConInventario, no necesita exportarse si no la llamas directamente desde server.js
    findUserByUsername,
    registrarUsuario, // NUEVA FUNCIÓN
    registrarPedidoConInventario, // Función principal para registrar pedidos

    // FUNCIONES DE ADMIN QUE FALTABAN:
    adminGetAllProductosPorSucursal,
    adminGetProducto,
    adminAltaProducto,
    adminModificarProducto,
    adminAjustarInventario,
    adminCambiarEstadoActivoProducto,
    getCatalogoProductosActivos,
    adminGetAllUsers,
    adminUpdateUser,
    adminDeleteUser
};