#!/usr/bin/env node
// ================================================
// GENERADOR DE CLAVES SEGURAS
// Genera API Keys aleatorias para proteger tu servidor
// ================================================

const crypto = require('crypto');

console.log('\n🔐 GENERADOR DE CLAVES DE SEGURIDAD\n');
console.log('Copia estas claves en tu archivo .env para proteger tu servidor:\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

console.log('\n# API Key para endpoints administrativos');
console.log('ADMIN_API_KEY=' + crypto.randomBytes(32).toString('hex'));

console.log('\n# API Key para proteger el QR Viewer');
console.log('QR_ACCESS_KEY=' + crypto.randomBytes(32).toString('hex'));

console.log('\n# Habilitar protección');
console.log('ENABLE_ADMIN_AUTH=true');
console.log('ENABLE_QR_AUTH=true');

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('\n⚠️  IMPORTANTE:');
console.log('   • Guarda estas claves en un lugar seguro');
console.log('   • NO las compartas con nadie');
console.log('   • NO las subas a GitHub');
console.log('   • Usa diferentes claves para producción y desarrollo\n');

console.log('📌 USO:');
console.log('   1. Copia las claves generadas arriba');
console.log('   2. Pégalas en tu archivo .env');
console.log('   3. En Render.com, agrégalas como variables de entorno');
console.log('   4. Reinicia el servidor\n');

console.log('🔗 ACCESO A ENDPOINTS PROTEGIDOS:');
console.log('   • QR Viewer: https://tu-servidor.com/?qr_key=TU_QR_ACCESS_KEY');
console.log('   • API Admin: Agregar header X-Admin-Key: TU_ADMIN_API_KEY\n');

console.log('💡 TIP: Ejecuta este script cada vez que necesites nuevas claves:');
console.log('   node generate-keys.js\n');
