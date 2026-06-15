// actualizarProductosActivos.js
const cassandra = require('cassandra-driver');

// Configuración del cliente de Cassandra
const client = new cassandra.Client({
    contactPoints: ['192.168.1.130'], // Asegúrate de que esta IP sea la de tu máquina host donde está expuesto cassandra-node1
    localDataCenter: 'DC1',
    keyspace: 'cafeteria_gourmet',
    protocolOptions: { port: 9042 }
});

async function actualizarProductosComoActivos() {
    try {
        await client.connect();
        console.log('Conectado a Cassandra para actualizar productos.');

        // 1. Obtener todas las combinaciones de sucursal_id y producto_id existentes
        console.log('Obteniendo IDs de productos y sucursales existentes...');
        const selectQuery = 'SELECT sucursal_id, producto_id FROM productos_por_sucursal';
        const result = await client.execute(selectQuery);
        const productosExistentes = result.rows;

        if (productosExistentes.length === 0) {
            console.log('No se encontraron productos existentes para actualizar.');
            return;
        }

        console.log(`Encontrados ${productosExistentes.length} productos para actualizar.`);

        // 2. Preparar la consulta UPDATE
        // La clave primaria de productos_por_sucursal es ((sucursal_id), producto_id)
        const updateQuery = `UPDATE productos_por_sucursal SET esta_activo = ? WHERE sucursal_id = ? AND producto_id = ?`;

        const promesasActualizacion = [];
        let contadorActualizados = 0;

        // 3. Iterar sobre los productos existentes y generar promesas de actualización
        for (const row of productosExistentes) {
            const params = [
                true, // Establecer esta_activo a true
                row.sucursal_id,
                row.producto_id
            ];
            promesasActualizacion.push(client.execute(updateQuery, params, { prepare: true }));

            // Ejecutar en lotes para no saturar la base de datos o la memoria
            if (promesasActualizacion.length % 1000 === 0) { // Lote de 1000 actualizaciones
                await Promise.all(promesasActualizacion);
                contadorActualizados += promesasActualizacion.length;
                console.log(`Actualizado lote de ${promesasActualizacion.length} productos. Total actualizados: ${contadorActualizados}`);
                promesasActualizacion.length = 0; // Limpiar el array para el siguiente lote
            }
        }

        // Ejecutar las promesas restantes (si las hay)
        if (promesasActualizacion.length > 0) {
            await Promise.all(promesasActualizacion);
            contadorActualizados += promesasActualizacion.length;
        }

        console.log(`¡Actualización completada! Total de productos marcados como activos: ${contadorActualizados}`);

    } catch (err) {
        console.error('Error durante la actualización de productos:', err);
    } finally {
        await client.shutdown();
        console.log('Desconectado de Cassandra.');
    }
}

// Ejecutar la función principal
actualizarProductosComoActivos();