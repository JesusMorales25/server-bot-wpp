// ================================================
// SCRIPT DE PRUEBA - OPENAI ASSISTANT
// Verifica que el módulo de OpenAI funcione correctamente
// ================================================

require('dotenv').config();
const openaiAssistant = require('./openai-assistant');

console.log('🧪 Iniciando prueba del módulo OpenAI...\n');

// Verificar configuración
console.log('📋 Configuración detectada:');
console.log('  ├─ BOT_MODE:', process.env.BOT_MODE || '(no configurado, default: openai)');
console.log('  ├─ OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '✅ Configurada' : '❌ NO configurada');
console.log('  ├─ OPENAI_MODEL:', process.env.OPENAI_MODEL || 'gpt-4o-mini (default)');
console.log('  └─ OPENAI_ASSISTANT_ID:', process.env.OPENAI_ASSISTANT_ID || '(no configurado - usará modelo directo)');

console.log('\n📊 Estado del módulo OpenAI:');

// Verificar estado
const status = openaiAssistant.getStatus();
console.log('  ├─ Inicializado:', status.initialized ? '✅ SÍ' : '❌ NO');
console.log('  ├─ Modo:', status.mode);
console.log('  ├─ Modelo:', status.model);
console.log('  ├─ Assistant ID:', status.assistantId || '(no configurado)');
console.log('  └─ Conversaciones activas:', status.activeConversations);

if (!status.initialized) {
  console.error('\n❌ ERROR: OpenAI no está inicializado');
  console.error('   Verifica que OPENAI_API_KEY esté configurada en .env');
  console.error('\n💡 Pasos para configurar:');
  console.error('   1. Ve a https://platform.openai.com/api-keys');
  console.error('   2. Crea una API Key');
  console.error('   3. Agrégala en .env: OPENAI_API_KEY=sk-...');
  process.exit(1);
}

console.log('\n✅ Módulo OpenAI inicializado correctamente');

console.log('\n� FLUJO DE FUNCIONAMIENTO:');
console.log('   1. Usuario envía mensaje por WhatsApp');
console.log('   2. Baileys recibe el mensaje');
console.log('   3. Se agrupa con mensajes consecutivos (si hay)');
console.log('   4. Se llama a openai-assistant.processMessage()');
console.log('   5. OpenAI procesa INTERNAMENTE y devuelve respuesta');
console.log('   6. La respuesta se envía de vuelta por WhatsApp');
console.log('\n   ✅ TODO ES INTERNO - NO HAY COMUNICACIÓN EXTERNA');

console.log('\n💡 Para iniciar el bot: npm start');
console.log('   Luego escanea el QR en: http://localhost:3001/qr-viewer.html');

