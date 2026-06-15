// cargarPedidos.js
const cassandra = require('cassandra-driver');
const TimeUuid = cassandra.types.TimeUuid;

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

// Datos de productos para generar pedidos aleatorios.
const productosData = [
    { nombre: 'Espresso Clásico', categoria: 'Café Caliente', precio: 45.00 },
    { nombre: 'Latte Vainilla', categoria: 'Café Caliente', precio: 60.00 },
    { nombre: 'Cappuccino Italiano', categoria: 'Café Caliente', precio: 65.00 },
    { nombre: 'Mocha Chocolate', categoria: 'Café Caliente', precio: 70.00 },
    { nombre: 'Americano Intenso', categoria: 'Café Caliente', precio: 50.00 },
    { nombre: 'Frappé Oreo', categoria: 'Café Frío', precio: 75.00 },
    { nombre: 'Té Chai Especiado', categoria: 'Té e Infusiones', precio: 55.00 },
    { nombre: 'Croissant Almendras', categoria: 'Panadería Premium', precio: 40.00 },
    { nombre: 'Muffin Arándano Real', categoria: 'Panadería Premium', precio: 38.00 },
    { nombre: 'Jugo Naranja Exprimido', categoria: 'Bebidas Frescas', precio: 50.00 },
];

const NUM_SUCURSALES = 20;
const NUM_PEDIDOS_TOTALES = 250;

// --- NUEVO: Lista de usuarios (se cargará de la BD) ---
let usernamesDisponibles = []; // Este array se llenará con los usernames de tu tabla usuarios

// Función auxiliar para obtener un entero aleatorio entre min y max (inclusive).
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Función auxiliar para obtener una fecha aleatoria dentro de un rango.
function getRandomDate(start, end) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// --- NUEVO: Función para cargar usuarios de la base de datos ---
async function cargarUsernamesDesdeBD() {
    try {
        // No necesitamos conectarnos aquí de nuevo si connect() se hace en generarYCargarPedidos
        // Pero haremos una query simple para obtener los usernames
        const query = 'SELECT username FROM usuarios';
        const result = await client.execute(query, [], { prepare: true });
        usernamesDisponibles = result.rows.map(row => row.username);

        if (usernamesDisponibles.length === 0) {
            console.warn("ADVERTENCIA: No se encontraron usuarios en la tabla 'usuarios'. Los pedidos se asignarán a un usuario por defecto si se continúa.");
            // Si no hay usuarios, puedes añadir un placeholder o salir
            // usernamesDisponibles = ['default_user'];
        } else {
            console.log(`Cargados ${usernamesDisponibles.length} usernames desde la BD.`);
        }
    } catch (err) {
        console.error("Error al cargar usernames desde la BD:", err);
        throw err; // Relanzar el error para que la función principal lo capture
    }
}

// Función principal para generar y cargar los datos de pedidos.
async function generarYCargarPedidos() {
    try {
        await client.connect();
        console.log('Conectado a Cassandra para cargar datos de pedidos!');

        await cargarUsernamesDesdeBD(); // <--- Llamar para cargar los usernames

        // Asegúrate de tener al menos un usuario para asignar
        if (usernamesDisponibles.length === 0) {
            console.error("ERROR: No hay usuarios para asignar a los pedidos. Por favor, asegúrate de tener usuarios en la tabla 'usuarios' antes de ejecutar este script.");
            return; // Salir si no hay usuarios
        }

        // Query INSERT para la tabla 'pedidos' (AÑADIR USERNAME)
        const query = `INSERT INTO pedidos
                       (sucursal_id, fecha_pedido, pedido_id, producto, categoria, cantidad, precio_unitario, total, username)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`; // <-- AÑADIDO 'username' aquí (9 valores)

        const promesas = [];
        const fechaFin = new Date();
        const fechaInicio = new Date();
        fechaInicio.setDate(fechaFin.getDate() - 90);

        console.log(`Generando e insertando ${NUM_PEDIDOS_TOTALES} pedidos para ${NUM_SUCURSALES} sucursales...`);

        for (let i = 0; i < NUM_PEDIDOS_TOTALES; i++) {
            const productoItem = productosData[getRandomInt(0, productosData.length - 1)];
            const cantidad = getRandomInt(1, 3);
            const sucursalId = getRandomInt(1, NUM_SUCURSALES);
            const randomUsername = usernamesDisponibles[getRandomInt(0, usernamesDisponibles.length - 1)]; // Selecciona un username aleatorio

            const params = [
                sucursalId,
                getRandomDate(fechaInicio, fechaFin),
                TimeUuid.now(),
                productoItem.nombre,
                productoItem.categoria,
                cantidad,
                productoItem.precio,
                parseFloat((cantidad * productoItem.precio).toFixed(2)),
                randomUsername // <-- ¡AÑADIDO EL USERNAME AQUÍ!
            ];
            promesas.push(client.execute(query, params, { prepare: true }));

            if (promesas.length >= 50 || i === NUM_PEDIDOS_TOTALES - 1) {
                await Promise.all(promesas);
                console.log(`Lote de ${promesas.length} pedidos insertado. Total: <span class="math-inline">\{i \+ 1\}/</span>{NUM_PEDIDOS_TOTALES}`);
                promesas.length = 0;
            }
        }
        console.log('Carga de datos de pedidos completada.');

    } catch (err) {
        console.error('Error durante la carga de datos de pedidos:', err);
    } finally {
        await client.shutdown();
        console.log('Desconectado de Cassandra.');
    }
}

generarYCargarPedidos();