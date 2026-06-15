// generar_hash.js
const bcrypt = require('bcryptjs');

// Lista de contraseñas de tus usuarios originales
const passwords = [
    'hashed_password_admin123', // Para admin_global
    'hashed_password_emp1',        // Para empleado_s1
    'hashed_password_emp2',        // Para empleado_s2
    'hashed_password_emp3',        // Para empleado_s3
    'b123b123',       // Para empleado_s20
];

const saltRounds = 10; // Número de "salt rounds" para bcrypt

console.log("--- Hashes Generados ---");
passwords.forEach(password => {
    const hashedPassword = bcrypt.hashSync(password, saltRounds);
    console.log(`Contraseña: "${password}"  ->  Hash: "${hashedPassword}"`);
});
console.log("--- Fin de Hashes ---");