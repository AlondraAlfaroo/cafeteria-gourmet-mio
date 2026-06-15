// cargarUsuarios.js
const cassandra = require('cassandra-driver');
const bcrypt = require('bcryptjs');

// --- CONFIGURACIÓN DE CONEXIÓN A CASSANDRA ---
// ¡ASEGÚRATE DE QUE ESTAS IPS SEAN LAS DE TUS NODOS DE CASSANDRA!
// Si estás en MaquinaA, la IP de tu cassandra-node1 (expuesto en 9042).
// Si tienes un clúster de múltiples máquinas, pon la IP de tu nodo semilla principal.
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

// --- CONFIGURACIÓN DE GENERACIÓN DE USUARIOS ---
const NUM_USERS_TO_GENERATE = 200; // Total de usuarios a generar
const SALT_ROUNDS = 10; // Para bcrypt: más alto = más seguro y lento
const BATCH_SIZE = 50; // Número de inserciones por lote
const NUM_SUCURSALES_EXISTENTES = 20; // Hasta qué sucursal ID asignar (si tienes 20 tiendas)

// --- FUNCIONES AUXILIARES ---
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateRandomName() {
    const firstNames = ["Juan", "María", "Pedro", "Ana", "Luis", "Sofía", "Carlos", "Laura", "Diego", "Elena"];
    const lastNames = ["García", "Rodríguez", "Martínez", "Fernández", "López", "González", "Pérez", "Sánchez", "Ramírez", "Torres"];
    return `${firstNames[getRandomInt(0, firstNames.length - 1)]} ${lastNames[getRandomInt(0, lastNames.length - 1)]}`;
}

// --- FUNCIÓN PRINCIPAL DE CARGA ---
async function cargarUsuarios() {
    try {
        await client.connect();
        console.log('Conectado a Cassandra para cargar usuarios.');

        console.log(`Generando e insertando ${NUM_USERS_TO_GENERATE} usuarios...`);

        const insertQuery = `INSERT INTO usuarios (username, nombre_completo, password_hash, rol, sucursal_asignada_id) 
                             VALUES (?, ?, ?, ?, ?)`;
        const promises = [];

        for (let i = 1; i <= NUM_USERS_TO_GENERATE; i++) {
            const username = `user${i}`;
            const nombreCompleto = generateRandomName();
            const plainPassword = `password${i}`; // Contraseña simple para la demo
            const hashedPassword = bcrypt.hashSync(plainPassword, SALT_ROUNDS); // Hashear la contraseña

            let rol = 'registrado';
            let sucursalAsignadaId = null;

            // Asignar roles aleatoriamente (ej. 80% registrados, 20% empleados)
            const roleChance = Math.random();
            if (roleChance < 0.20) { // 20% de probabilidad de ser empleado
                rol = 'empleado';
                sucursalAsignadaId = getRandomInt(1, NUM_SUCURSALES_EXISTENTES);
            }

            const params = [
                username,
                nombreCompleto,
                hashedPassword,
                rol,
                sucursalAsignadaId
            ];

            promises.push(client.execute(insertQuery, params, { prepare: true }));

            if (promises.length >= BATCH_SIZE) {
                await Promise.all(promises);
                console.log(`Lote de ${BATCH_SIZE} usuarios insertado. Total: <span class="math-inline">\{i\}/</span>{NUM_USERS_TO_GENERATE}`);
                promises.length = 0; // Limpiar el array para el siguiente lote
            }
        }

        // Insertar los usuarios restantes en el último lote
        if (promises.length > 0) {
            await Promise.all(promises);
            console.log(`Último lote de ${promises.length} usuarios insertado.`);
        }

        console.log('Carga masiva de usuarios completada.');

    } catch (err) {
        console.error('Error durante la carga de usuarios:', err);
    } finally {
        await client.shutdown();
        console.log('Desconectado de Cassandra.');
    }
}

cargarUsuarios();