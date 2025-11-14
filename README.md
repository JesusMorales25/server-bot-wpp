# 🤖 WhatsApp AI Bot - OpenAI Integration

Bot de WhatsApp con integración directa de OpenAI usando Baileys. Todo funciona internamente sin backends externos.

## 🚀 Inicio Rápido

### 1. Instalar dependencias
```bash
npm install
```

### 2. Configurar OpenAI
Edita `.env` y agrega tu API Key:
```bash
OPENAI_API_KEY=sk-proj-tu_key_real_aqui
```

### 3. Iniciar servidor
```bash
npm start
```

### 4. Conectar WhatsApp
1. Abre: `http://localhost:3001/qr-viewer.html`
2. Escanea el QR desde WhatsApp → Configuración → Dispositivos vinculados

¡Listo! El bot responderá automáticamente usando OpenAI.

---

## 📚 Documentación

- **[INICIO-RAPIDO.md](INICIO-RAPIDO.md)** - Guía de inicio rápido
- **[OPENAI-SETUP.md](OPENAI-SETUP.md)** - Configuración completa de OpenAI
- **[RENDER-SETUP-RAPIDO.md](RENDER-SETUP-RAPIDO.md)** - Deploy en Render.com
- **[IMPLEMENTACION-COMPLETA.md](IMPLEMENTACION-COMPLETA.md)** - Detalles técnicos

---

## 🔧 Configuración Mínima

```bash
# .env
BOT_MODE=openai
OPENAI_API_KEY=tu_key_aqui
OPENAI_MODEL=gpt-4o-mini
AUTO_BOT_ENABLED=true
LOG_LEVEL=error  # Producción: error o silent
```

---

## 🎯 Características

✅ Integración directa con OpenAI  
✅ Mantiene contexto de conversaciones  
✅ Agrupamiento inteligente de mensajes  
✅ Sistema de cooldowns anti-spam  
✅ Logs configurables  
✅ Personalidad customizable  
✅ Deployment en Render/Railway  
✅ Sin backends externos  

---

## 🧪 Probar Configuración

```bash
node test-openai.js
```

---

## 📡 Endpoints

- `GET /api/whatsapp/status` - Estado de WhatsApp
- `GET /api/openai/status` - Estado de OpenAI
- `GET /health` - Health check
- `POST /api/whatsapp/send-message` - Enviar mensaje

---

## 💰 Producción

Para deployment en Render.com, consulta [RENDER-SETUP-RAPIDO.md](RENDER-SETUP-RAPIDO.md).

Variables obligatorias:
```bash
NODE_ENV=production
LOG_LEVEL=error
OPENAI_API_KEY=tu_key
```

---

## 🆘 Problemas Comunes

**OpenAI no inicializado**  
→ Verifica `OPENAI_API_KEY` en `.env`

**Bot no responde**  
→ Verifica `BOT_MODE=openai` y `AUTO_BOT_ENABLED=true`

**Sesión se desconecta**  
→ No borres la carpeta `baileys_auth`

---

## 📞 Soporte

Para más ayuda, revisa la documentación completa en los archivos MD.

---

**Stack**: Node.js + Baileys + OpenAI + Express
