// cargarDatos.js
const cassandra = require('cassandra-driver');
const TimeUuid = cassandra.types.TimeUuid;

// Asegúrate de que tu cliente se conecta a cafeteria_gourmet
const client = new cassandra.Client({
    contactPoints: ['192.168.1.130'], // IP_MAQUINA_A donde está expuesto cassandra-node1
    localDataCenter: 'DC1',
    keyspace: 'cafeteria_gourmet', // Tu nuevo keyspace
    protocolOptions: { port: 9042 }
});

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

const NUM_SUCURSALES = 20; // Cumple el requisito [cite: 2]
const NUM_PEDIDOS_TOTALES = 250; // Cumple el requisito de >200 registros [cite: 2]

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomDate(start, end) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

async function generarYCargarPedidos() {
    try {
        await client.connect();
        console.log('Conectado a Cassandra para cargar datos!');

        const query = `INSERT INTO pedidos 
                   (sucursal_id, fecha_pedido, pedido_id, producto, categoria, cantidad, precio_unitario, total) 
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

        const promesas = [];
        const fechaFin = new Date(); // Hoy
        const fechaInicio = new Date();
        fechaInicio.setDate(fechaFin.getDate() - 90); // Pedidos de los últimos 90 días

        console.log(`Generando e insertando ${NUM_PEDIDOS_TOTALES} pedidos para ${NUM_SUCURSALES} sucursales...`);

        for (let i = 0; i < NUM_PEDIDOS_TOTALES; i++) {
            const productoItem = productosData[getRandomInt(0, productosData.length - 1)];
            const cantidad = getRandomInt(1, 3);
            const sucursalId = getRandomInt(1, NUM_SUCURSALES); // IDs de sucursal del 1 al 20

            const params = [
                sucursalId,
                getRandomDate(fechaInicio, fechaFin),
                TimeUuid.now(),
                productoItem.nombre,
                productoItem.categoria,
                cantidad,
                productoItem.precio,
                cantidad * productoItem.precio
            ];
            promesas.push(client.execute(query, params, { prepare: true }));

            if (promesas.length >= 50 || i === NUM_PEDIDOS_TOTALES - 1) {
                await Promise.all(promesas);
                console.log(`Lote de ${promesas.length} pedidos insertado. Total: <span class="math-inline">\{i \+ 1\}/</span>{NUM_PEDIDOS_TOTALES}`);
                promesas.length = 0; // Limpiar array para el siguiente lote
            }
        }
        console.log('Carga de datos completada.');

    } catch (err) {
        console.error('Error durante la carga de datos:', err);
    } finally {
        await client.shutdown();
        console.log('Desconectado de Cassandra.');
    }
}

generarYCargarPedidos();