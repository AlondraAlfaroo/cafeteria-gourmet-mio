// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./cassandraService');
const {
    generarToken,
    authenticateToken,
    requireRole,
    forzarSucursalEnPedido,
    restringirAccesoASucursal
} = require('./authMiddleware');

const app = express();
const PORT = process.env.PORT || 3000;

const bcrypt = require('bcryptjs');

app.use(cors());
app.use(express.json());

// Requiere sesión válida y rol de administrador.
const isAdmin = [authenticateToken, requireRole('admin')];

app.get('/api/admin/producto/:sucursalId/:productoId', isAdmin, async (req, res) => {
    try {
        const producto = await db.adminGetProducto(parseInt(req.params.sucursalId), req.params.productoId);
        if (producto) {
            res.json(producto);
        } else {
            res.status(404).json({ error: 'Producto no encontrado.' });
        }
    } catch (err) { /* ... manejo de error ... */ }
});

// Ejemplo para app.post('/api/admin/productos', ...)
app.post('/api/admin/productos', isAdmin, async (req, res) => {
    try {
        const resultado = await db.adminAltaProducto(req.body);
        res.status(201).json(resultado);
    } catch (err) {
        console.error('Error en POST /api/admin/productos:', err); // Loguea el error en el backend
        res.status(500).json({ error: err.message || 'Error al dar de alta el producto.' }); // Envía un mensaje de error al frontend
    }
});

app.put('/api/admin/productos/:sucursalId/:productoId', isAdmin, async (req, res) => { // Modificar detalles
    try {
        const productoData = { ...req.body, sucursal_id: parseInt(req.params.sucursalId), producto_id: req.params.productoId };
        const resultado = await db.adminModificarProducto(productoData);
        res.json(resultado);
    } catch (err) { /* ... manejo de error ... */ }
});

app.patch('/api/admin/productos/:sucursalId/:productoId/inventario', isAdmin, async (req, res) => { // Ajustar inventario
    try {
        const { nuevaCantidad } = req.body;
        if (typeof nuevaCantidad !== 'number') {
            return res.status(400).json({ error: 'nuevaCantidad debe ser un número.' });
        }
        const resultado = await db.adminAjustarInventario(parseInt(req.params.sucursalId), req.params.productoId, nuevaCantidad);
        res.json(resultado);
    } catch (err) { /* ... manejo de error ... */ }
});

app.patch('/api/admin/productos/:sucursalId/:productoId/estado', isAdmin, async (req, res) => { // Dar de baja/alta (activar/desactivar)
    try {
        const { estaActivo } = req.body; // Espera un booleano
        if (typeof estaActivo !== 'boolean') {
            return res.status(400).json({ error: 'estaActivo debe ser un booleano.' });
        }
        const resultado = await db.adminCambiarEstadoActivoProducto(parseInt(req.params.sucursalId), req.params.productoId, estaActivo);
        res.json(resultado);
    } catch (err) { /* ... manejo de error ... */ }
});

// RUTAS DE ADMINISTRACIÓN DE PRODUCTOS (protegidas por isAdmin)
app.get('/api/admin/productos/sucursal/:sucursalId', isAdmin, async (req, res) => {
    try {
        const productos = await db.adminGetAllProductosPorSucursal(parseInt(req.params.sucursalId));
        res.json(productos);
    } catch (err) { /* ... manejo de error ... */ }
});

app.get('/api/admin/producto/:sucursalId/:productoId', isAdmin, async (req, res) => {
    try {
        const producto = await db.adminGetProducto(parseInt(req.params.sucursalId), req.params.productoId);
        if (producto) {
            res.json(producto);
        } else {
            res.status(404).json({ error: 'Producto no encontrado.' });
        }
    } catch (err) { /* ... manejo de error ... */ }
});

app.post('/api/admin/productos', isAdmin, async (req, res) => { // Alta de producto
    try {
        const resultado = await db.adminAltaProducto(req.body);
        res.status(201).json(resultado);
    } catch (err) { /* ... manejo de error ... */ }
});

app.put('/api/admin/productos/:sucursalId/:productoId', isAdmin, async (req, res) => { // Modificar detalles
    try {
        const productoData = { ...req.body, sucursal_id: parseInt(req.params.sucursalId), producto_id: req.params.productoId };
        const resultado = await db.adminModificarProducto(productoData);
        res.json(resultado);
    } catch (err) { /* ... manejo de error ... */ }
});

app.patch('/api/admin/productos/:sucursalId/:productoId/inventario', isAdmin, async (req, res) => { // Ajustar inventario
    try {
        const { nuevaCantidad } = req.body;
        if (typeof nuevaCantidad !== 'number') {
            return res.status(400).json({ error: 'nuevaCantidad debe ser un número.' });
        }
        const resultado = await db.adminAjustarInventario(parseInt(req.params.sucursalId), req.params.productoId, nuevaCantidad);
        res.json(resultado);
    } catch (err) { /* ... manejo de error ... */ }
});

app.patch('/api/admin/productos/:sucursalId/:productoId/estado', isAdmin, async (req, res) => { // Dar de baja/alta (activar/desactivar)
    try {
        const { estaActivo } = req.body; // Espera un booleano
        if (typeof estaActivo !== 'boolean') {
            return res.status(400).json({ error: 'estaActivo debe ser un booleano.' });
        }
        const resultado = await db.adminCambiarEstadoActivoProducto(parseInt(req.params.sucursalId), req.params.productoId, estaActivo);
        res.json(resultado);
    } catch (err) { /* ... manejo de error ... */ }
});


// --- RUTAS DE ADMINISTRACIÓN DE USUARIOS (protegidas por isAdmin) ---
app.get('/api/admin/usuarios', isAdmin, async (req, res) => {
    try {
        const users = await db.adminGetAllUsers();
        res.json(users);
    } catch (err) {
        console.error('Error en GET AdU /usuarios:', err);
        res.status(500).json({ error: err.message || 'Error AdU: obtener usuarios.' });
    }
});

app.put('/api/admin/usuarios/:username', isAdmin, async (req, res) => {
    try {
        const userData = { ...req.body, username: req.params.username };
        const resultado = await db.adminUpdateUser(userData);
        res.json(resultado);
    } catch (err) {
        console.error(`Error en PUT AdU /usuarios/${req.params.username}:`, err);
        res.status(500).json({ error: err.message || 'Error AdU: modificar usuario.' });
    }
});

app.delete('/api/admin/usuarios/:username', isAdmin, async (req, res) => {
    try {
        const username = req.params.username;
        const resultado = await db.adminDeleteUser(username);
        res.json(resultado);
    } catch (err) {
        console.error(`Error en DELETE AdU /usuarios/${req.params.username}:`, err);
        res.status(500).json({ error: err.message || 'Error AdU: eliminar usuario.' });
    }
});



// Función principal asíncrona para controlar el flujo de inicio
async function startServer() {
    try {
        await db.connectDB();

        // Endpoint para registrar un nuevo pedido (MODIFICADO para recibir username)
        app.post('/api/pedidos', authenticateToken, forzarSucursalEnPedido, async (req, res) => {
            try {
                const pedidoData = req.body; // Ahora pedidoData DEBE incluir 'username'
                if (!pedidoData.producto_id || !pedidoData.sucursal_id || !pedidoData.cantidad || !pedidoData.username) { // <-- ¡username ahora es requerido!
                    return res.status(400).json({ error: 'Faltan datos requeridos en el pedido (sucursal_id, producto_id, cantidad, username).' });
                }
                const resultado = await db.registrarPedidoConInventario(pedidoData);
                res.status(201).json(resultado);
            } catch (err) {
                console.error('Error en POST /api/pedidos:', err.message, err.details || '');
                res.status(500).json({ error: err.message || 'Error al registrar pedido o actualizar inventario.' });
            }
        });

        app.get('/api/productos/sucursal/:sucursalId', async (req, res) => {
            try {
                const sucursalId = parseInt(req.params.sucursalId);
                if (isNaN(sucursalId)) {
                    return res.status(400).json({ error: 'ID de sucursal inválido.' });
                }
                const productos = await db.getProductosPorSucursal(sucursalId);
                res.json(productos);
            } catch (err) {
                console.error(`Error en GET /api/productos/sucursal/${req.params.sucursalId}:`, err);
                res.status(500).json({ error: 'Error al obtener productos por sucursal.' });
            }
        });

        app.get('/api/catalogo/productos', async (req, res) => { // Nueva ruta para el catálogo
            try {
                const productos = await db.getCatalogoProductosActivos();
                res.json(productos);
            } catch (err) {
                console.error('Error en GET /api/catalogo/productos:', err);
                res.status(500).json({ error: err.message || 'Error al obtener el catálogo de productos.' });
            }
        });

        app.get('/api/productos', async (req, res) => {
            try {
                const productos = await db.getTodosLosProductosUnicos();
                res.json(productos);
            } catch (err) {
                console.error('Error en GET /api/productos:', err);
                res.status(500).json({ error: 'Error al obtener todos los productos.' });
            }
        });

        // Endpoint de Login (MODIFICADO para bcrypt)
        app.post('/api/auth/login', async (req, res) => {
            const { username, password } = req.body;
            try {
                const user = await db.findUserByUsername(username);
                if (!user) {
                    return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' }); // Mensaje genérico por seguridad
                }

                // Comparar la contraseña ingresada con el hash almacenado
                const passwordMatch = await bcrypt.compare(password, user.password_hash);

                if (passwordMatch) {
                    const userInfo = {
                        username: user.username,
                        nombre_completo: user.nombre_completo,
                        rol: user.rol,
                        sucursal_asignada_id: user.sucursal_asignada_id
                    };
                    const token = generarToken(userInfo);
                    res.json({ message: 'Login exitoso', user: userInfo, token });
                } else {
                    return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' }); // Mensaje genérico por seguridad
                }
            } catch (err) {
                console.error('Error en login:', err);
                res.status(500).json({ error: err.message || 'Error interno del servidor en login.' });
            }
        });


        // NUEVO ENDPOINT: Registrar Usuario
        app.post('/api/auth/register', async (req, res) => {
            const { username, password, nombre_completo, rol, sucursal_asignada_id } = req.body;
            // Validaciones básicas de entrada
            if (!username || !password || !nombre_completo) {
                return res.status(400).json({ error: 'Usuario, contraseña y nombre completo son requeridos.' });
            }
            if (password.length < 6) { // Ejemplo de regla de contraseña
                return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });
            }

            try {
                // rol por defecto 'registrado' si no es admin quien lo crea
                const userRole = rol && rol === 'admin' ? 'admin' : 'registrado';

                // sucursal_asignada_id solo para empleados
                const userSucursal = (userRole === 'empleado' && sucursal_asignada_id !== undefined) ? sucursal_asignada_id : null;

                const newUser = {
                    username,
                    password, // bcrypt.hash espera la contraseña sin hashear
                    nombre_completo,
                    rol: userRole,
                    sucursal_asignada_id: userSucursal
                };

                const result = await db.registrarUsuario(newUser);
                res.status(201).json({ message: result.message || 'Usuario registrado con éxito.' });
            } catch (err) {
                console.error('Error en registro:', err);
                // Si el error del servicio es por usuario duplicado, devuelve 409 Conflict
                if (err.message && err.message.includes('El nombre de usuario ya está en uso')) {
                    res.status(409).json({ error: err.message });
                } else {
                    res.status(500).json({ error: err.message || 'Error al registrar el usuario.' });
                }
            }
        });


        app.get('/api/sucursales', async (req, res) => {
            try {
                const sucursales = await db.getSucursalesUnicas();
                res.json(sucursales);
            } catch (err) {
                console.error('Error obteniendo sucursales:', err);
                res.status(500).json({ error: 'Error al obtener sucursales.' });
            }
        });

        app.get('/api/pedidos/sucursal/:id', authenticateToken, restringirAccesoASucursal(req => req.params.id), async (req, res) => {
            try {
                const sucursalId = parseInt(req.params.id);
                if (isNaN(sucursalId)) {
                    return res.status(400).json({ error: 'ID de sucursal inválido.' });
                }
                const pedidos = await db.consultarPedidosPorSucursal(sucursalId);
                res.json(pedidos);
            } catch (err) {
                console.error(`Error obteniendo pedidos para sucursal ${req.params.id}:`, err);
                res.status(500).json({ error: 'Error al obtener pedidos por sucursal.' });
            }
        });


        // 3. Iniciar el servidor Express para escuchar peticiones
        app.listen(PORT, () => {
            console.log(`Servidor Node.js escuchando en http://localhost:${PORT}`);
            console.log('API Endpoints disponibles:');
            console.log(`  POST /api/pedidos`);
            console.log(`  GET  /api/productos/sucursal/:sucursalId`);
            console.log(`  GET  /api/productos`);
            console.log(`  POST /api/auth/login`);
            console.log(`  GET  /api/sucursales`);
            console.log(`  GET  /api/pedidos/sucursal/:id`);
        });

    } catch (err) {
        // Este catch es por si connectDB() rechaza la promesa (aunque ya tiene su propio process.exit)
        console.error("No se pudo iniciar el servidor:", err);
        process.exit(1);
    }
}

// Llamar a la función principal para iniciar todo
startServer();

// Manejar cierre de la conexión a Cassandra al terminar el proceso Node.js
process.on('SIGINT', async () => {
    console.log('Cerrando conexión a Cassandra...');
    if (db.client) { // Verifica si el cliente existe
        await db.client.shutdown();
    }
    console.log('Conexión a Cassandra cerrada. Saliendo.');
    process.exit(0);
});