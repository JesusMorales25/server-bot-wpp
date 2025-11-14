# 🤖 WhatsApp AI Bot - Integración con OpenAI

## 📋 ¿Cómo Funciona?

```
┌─────────────────┐
│  Usuario WhatsApp│
│   envía mensaje  │
└────────┬─────────┘
         │
         ▼
┌─────────────────┐
│  Baileys Server │
│  (Este Proyecto)│
└────────┬─────────┘
         │
         ▼
┌─────────────────┐
│ openai-assistant│ ◄── Mantiene contexto de conversaciones
│      .js        │     (historial, personalidad, etc.)
└────────┬─────────┘
         │
         ▼
┌─────────────────┐
│   OpenAI API    │ ◄── Procesa el mensaje con IA
│  (gpt-4o-mini)  │     (usa tu OPENAI_API_KEY)
└────────┬─────────┘
         │
         ▼
┌─────────────────┐
│ openai-assistant│ ◄── Recibe respuesta del asistente
│      .js        │
└────────┬─────────┘
         │
         ▼
┌─────────────────┐
│  Baileys Server │ ◄── Envía respuesta a WhatsApp
│  (Este Proyecto)│
└────────┬─────────┘
         │
         ▼
┌─────────────────┐
│  Usuario WhatsApp│
│ recibe respuesta │
└──────────────────┘
```

**✅ TODO ES INTERNO - NO SE COMUNICA CON NINGÚN BACKEND EXTERNO**

---

## 🎯 Configuración Rápida

### 1. Obtener tu API Key de OpenAI

1. Ve a [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Inicia sesión o crea una cuenta
3. Crea una nueva API Key
4. **IMPORTANTE**: Copia la key inmediatamente (solo se muestra una vez)

### 2. Configurar el archivo `.env`

Abre el archivo `.env` y configura las siguientes variables:

```bash
# ===== MODO DE OPERACIÓN =====
BOT_MODE=openai

# ===== CONFIGURACIÓN DE OPENAI =====
# Tu API Key de OpenAI (REEMPLAZA con tu key real)
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Modelo a usar (opciones: gpt-4o, gpt-4o-mini, gpt-4-turbo, gpt-3.5-turbo)
# Recomendado: gpt-4o-mini (más económico y rápido)
OPENAI_MODEL=gpt-4o-mini

# Instrucciones del sistema (personaliza el comportamiento del bot)
OPENAI_SYSTEM_PROMPT=Eres un asistente útil de WhatsApp. Responde de forma amigable, concisa y profesional en español.

# ===== ID DE ASISTENTE (OPCIONAL) =====
# Si tienes un asistente creado en OpenAI, coloca su ID aquí
# Déjalo vacío para usar el modelo directo (más simple)
OPENAI_ASSISTANT_ID=
```

### 3. Iniciar el servidor

```bash
npm start
```

### 4. Conectar WhatsApp

1. Abre tu navegador en `http://localhost:3001/qr-viewer.html`
2. Escanea el código QR desde WhatsApp:
   - **WhatsApp** → **Configuración** → **Dispositivos vinculados** → **Vincular un dispositivo**
3. ¡Listo! El bot está conectado y funcionando

---

## 🔧 Modos de Operación

### Modo OpenAI (Recomendado)
```bash
BOT_MODE=openai
```
- ✅ Integración directa con OpenAI
- ✅ Mantiene contexto de conversaciones
- ✅ Respuestas más naturales
- ✅ Configuración simple

### Modo Backend Externo
```bash
BOT_MODE=backend
```
- Usa un servidor backend personalizado
- Requiere configurar `BOT_IA_ENDPOINT`

---

## 💰 Modelos de OpenAI Disponibles

| Modelo | Velocidad | Costo | Calidad | Recomendado para |
|--------|-----------|-------|---------|------------------|
| **gpt-4o-mini** | ⚡⚡⚡ | 💰 | ⭐⭐⭐ | WhatsApp, uso general |
| **gpt-4o** | ⚡⚡ | 💰💰💰 | ⭐⭐⭐⭐⭐ | Respuestas complejas |
| **gpt-4-turbo** | ⚡⚡ | 💰💰💰 | ⭐⭐⭐⭐⭐ | Análisis profundo |
| **gpt-3.5-turbo** | ⚡⚡⚡ | 💰 | ⭐⭐⭐ | Respuestas rápidas |

**Recomendación**: Usa `gpt-4o-mini` para WhatsApp - es el más económico y suficientemente potente.

---

## 📡 Endpoints de la API

### Estado de OpenAI
```http
GET /api/openai/status
```

Respuesta:
```json
{
  "mode": "openai",
  "initialized": true,
  "mode": "chat-completions",
  "model": "gpt-4o-mini",
  "activeConversations": 5
}
```

### Reiniciar una conversación
```http
POST /api/openai/reset-conversation
Content-Type: application/json

{
  "chatId": "5491234567890@s.whatsapp.net"
}
```

### Reiniciar todas las conversaciones
```http
POST /api/openai/reset-all
```

### Estado de WhatsApp
```http
GET /api/whatsapp/status
```

---

## 🎨 Personalización del Bot

### Cambiar la personalidad del bot

Modifica `OPENAI_SYSTEM_PROMPT` en el archivo `.env`:

#### Ejemplo 1: Asistente de ventas
```bash
OPENAI_SYSTEM_PROMPT=Eres un asistente de ventas profesional. Tu objetivo es ayudar a los clientes con información sobre productos, precios y realizar ventas. Sé amable, persuasivo y siempre enfocado en cerrar la venta.
```

#### Ejemplo 2: Soporte técnico
```bash
OPENAI_SYSTEM_PROMPT=Eres un agente de soporte técnico experto. Ayuda a los usuarios a resolver problemas técnicos de forma clara, paso a paso. Usa un lenguaje simple y pregunta cuando necesites más información.
```

#### Ejemplo 3: Asistente personal
```bash
OPENAI_SYSTEM_PROMPT=Eres un asistente personal amigable y eficiente. Ayuda con recordatorios, información general y responde preguntas de forma concisa. Mantén un tono casual pero profesional.
```

---

## 🔐 Seguridad y Mejores Prácticas

### Protege tu API Key
- ❌ **NUNCA** compartas tu API key
- ❌ **NUNCA** la subas a GitHub o repositorios públicos
- ✅ Usa variables de entorno (`.env`)
- ✅ Agrega `.env` a tu `.gitignore`

### Controla el uso
```bash
# Limita mensajes por usuario
BOT_COOLDOWN_MS=3000

# Agrupa mensajes para ahorrar tokens
MESSAGE_GROUPING_DELAY=3000
MAX_GROUPED_MESSAGES=5
```

### Monitorea tu consumo
- Dashboard de OpenAI: [https://platform.openai.com/usage](https://platform.openai.com/usage)
- Configura límites de gasto en tu cuenta

---

## 🛠️ Troubleshooting

### ❌ "Cliente de OpenAI no inicializado"
**Solución**: Verifica que `OPENAI_API_KEY` esté configurada correctamente en `.env`

### ❌ "insufficient_quota"
**Solución**: Tu cuenta de OpenAI no tiene crédito. Agrega un método de pago en [https://platform.openai.com/account/billing](https://platform.openai.com/account/billing)

### ❌ "invalid_api_key"
**Solución**: Tu API key es inválida. Genera una nueva en [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)

### ❌ El bot no responde
**Solución**: 
1. Verifica que `AUTO_BOT_ENABLED=true` en `.env`
2. Revisa que `BOT_MODE=openai`
3. Verifica logs con `LOG_LEVEL=debug`

### ❌ Respuestas muy lentas
**Solución**:
1. Usa un modelo más rápido (`gpt-4o-mini`)
2. Reduce el historial de conversaciones
3. Verifica tu conexión a internet

---

## 💡 Tips Avanzados

### Usar un asistente personalizado de OpenAI

1. Crea un asistente en [https://platform.openai.com/assistants](https://platform.openai.com/assistants)
2. Configura sus instrucciones y comportamiento
3. Copia el ID del asistente (ej: `asst_abc123...`)
4. Agrégalo en `.env`:
   ```bash
   OPENAI_ASSISTANT_ID=asst_abc123...
   ```

### Limpiar conversaciones automáticamente

El sistema limpia automáticamente conversaciones inactivas cada 30 minutos. Para cambiar esto, modifica el código en `whatsapp-baileys-server.js`:

```javascript
// Cambiar 30 minutos por el tiempo deseado
setInterval(() => {
  openaiAssistant.cleanOldConversations();
}, 30 * 60 * 1000); // 30 minutos
```

### Limitar tokens por respuesta

Edita `openai-assistant.js` y cambia `max_tokens`:

```javascript
const completion = await this.openai.chat.completions.create({
  model: this.model,
  messages: conversation.messages,
  temperature: 0.7,
  max_tokens: 300, // Cambiar este valor
});
```

---

## 📊 Logs y Debugging

### Ver logs detallados
```bash
LOG_LEVEL=debug
```

### Logs mínimos (producción)
```bash
LOG_LEVEL=silent
```

### Niveles de log disponibles
- `silent` - Sin logs (ahorro máximo)
- `error` - Solo errores críticos
- `warn` - Advertencias + errores
- `info` - Información importante
- `debug` - Logs detallados
- `trace` - Todo

---

## 🚀 Deployment en Producción

### Railway / Render

1. Configura las variables de entorno en el dashboard
2. Asegúrate de tener `NODE_ENV=production`
3. Usa `LOG_LEVEL=silent` para ahorrar costos
4. Configura volumen para `baileys_auth` (persistencia de sesión)

### Docker

```bash
docker build -t whatsapp-bot .
docker run -p 3001:3001 -v ./baileys_auth:/app/server/baileys_auth --env-file .env whatsapp-bot
```

---

## 📞 Soporte

¿Problemas con la integración? Abre un issue en el repositorio o contacta al desarrollador.

**Nota**: Este bot es solo para uso educativo y personal. Asegúrate de cumplir con los términos de servicio de WhatsApp y OpenAI.
