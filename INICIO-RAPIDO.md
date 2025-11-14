# 🚀 INICIO RÁPIDO - WhatsApp Bot con OpenAI

## ⚡ 3 Pasos para Comenzar

### 1️⃣ Configura tu API Key de OpenAI

Edita el archivo `.env` y reemplaza:

```bash
OPENAI_API_KEY=tu_api_key_aqui
```

Por tu API Key real de OpenAI (obtenerla en: https://platform.openai.com/api-keys)

---

### 2️⃣ Inicia el Servidor

```bash
npm start
```

---

### 3️⃣ Escanea el QR

1. Abre tu navegador: **http://localhost:3001/qr-viewer.html**
2. Escanea el QR desde WhatsApp:
   - **WhatsApp** → **Configuración** → **Dispositivos vinculados** → **Vincular dispositivo**

---

## ✅ ¡Listo!

Ahora cuando alguien te envíe un mensaje por WhatsApp, el bot responderá automáticamente usando OpenAI.

---

## 🔧 Personalizar el Bot

Para cambiar la personalidad del bot, edita en `.env`:

```bash
OPENAI_SYSTEM_PROMPT=Tu personalidad personalizada aquí...
```

**Ejemplos:**
- Asistente de ventas
- Soporte técnico
- Secretaria virtual
- Coach personal
- etc.

---

## 📊 Verificar que Todo Funcione

```bash
# Probar configuración de OpenAI
node test-openai.js

# Ver logs del servidor (modo debug)
# En .env cambiar: LOG_LEVEL=debug
npm start
```

---

## 🆘 Problemas Comunes

### ❌ "Cliente de OpenAI no inicializado"
**Solución:** Verifica que `OPENAI_API_KEY` esté correctamente configurada en `.env`

### ❌ "insufficient_quota"
**Solución:** Tu cuenta de OpenAI no tiene crédito. Agrega un método de pago en:
https://platform.openai.com/account/billing

### ❌ El bot no responde
**Solución:** 
1. Verifica que `BOT_MODE=openai` en `.env`
2. Verifica que `AUTO_BOT_ENABLED=true` en `.env`
3. Revisa los logs con `LOG_LEVEL=debug`

---

## 📚 Documentación Completa

- **`OPENAI-SETUP.md`** - Guía completa de configuración
- **`IMPLEMENTACION-COMPLETA.md`** - Detalles técnicos de la implementación
- **`README-BAILEYS.md`** - Documentación de Baileys

---

## 🎯 Cómo Funciona (Resumen)

```
Usuario → WhatsApp → Baileys → OpenAI Assistant → OpenAI API
                                       ↓
Usuario ← WhatsApp ← Baileys ← Respuesta del Asistente
```

**✅ TODO ES INTERNO - SIN BACKENDS EXTERNOS**

---

## 💡 Tips

- Usa `gpt-4o-mini` para ahorrar costos (ya configurado por defecto)
- El bot mantiene el contexto de cada conversación
- Los mensajes se agrupan automáticamente para ahorrar tokens
- Las conversaciones antiguas se limpian automáticamente cada 30 minutos

---

## 🌐 Endpoints Útiles

- **http://localhost:3001/qr-viewer.html** - Ver código QR
- **http://localhost:3001/api/whatsapp/status** - Estado de WhatsApp
- **http://localhost:3001/api/openai/status** - Estado de OpenAI
- **http://localhost:3001/health** - Health check

---

¿Dudas? Revisa `OPENAI-SETUP.md` para documentación completa.
