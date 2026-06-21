// cafeteria-backend/authMiddleware.js
// Autenticacion (JWT) y autorizacion por rol/sucursal para restringir el acceso
// de usuarios no autorizados dentro de cada sucursal, segun lo exige el proyecto.

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error('Falta JWT_SECRET en las variables de entorno (.env).');
}
const JWT_EXPIRES_IN = '8h';

function generarToken(user) {
    return jwt.sign(
        {
            username: user.username,
            rol: user.rol,
            sucursal_asignada_id: user.sucursal_asignada_id ?? null
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
}

// Verifica el header Authorization: Bearer <token> y carga req.user
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
        return res.status(401).json({ error: 'No autenticado. Se requiere iniciar sesión.' });
    }

    jwt.verify(token, JWT_SECRET, (err, payload) => {
        if (err) {
            return res.status(401).json({ error: 'Sesión inválida o expirada. Inicia sesión de nuevo.' });
        }
        req.user = payload;
        next();
    });
}

// Restringe el acceso a uno o más roles (ej. requireRole('admin'))
function requireRole(...rolesPermitidos) {
    return (req, res, next) => {
        if (!req.user || !rolesPermitidos.includes(req.user.rol)) {
            return res.status(403).json({ error: 'Acceso denegado. No tienes el rol necesario para esta acción.' });
        }
        next();
    };
}

// Para consultar/reportar una sucursal especifica: admin entra a cualquiera,
// empleado solo entra a la suya (si no tiene sucursal asignada, no entra a ninguna),
// y cualquier otro rol queda fuera.
function restringirAccesoASucursal(getSucursalId) {
    return (req, res, next) => {
        const user = req.user;
        const sucursalSolicitada = parseInt(getSucursalId(req), 10);

        if (user.rol === 'admin') return next();
        if (user.rol === 'empleado' && user.sucursal_asignada_id === sucursalSolicitada) return next();

        return res.status(403).json({ error: 'Acceso denegado. No tienes permiso para ver datos de esta sucursal.' });
    };
}

module.exports = {
    generarToken,
    authenticateToken,
    requireRole,
    restringirAccesoASucursal
};
