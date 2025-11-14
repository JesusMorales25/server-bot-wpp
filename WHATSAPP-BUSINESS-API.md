# ⚠️ WhatsApp Business API - Advertencia Importante

## 🔴 Problema: Cuenta Verificada con Meta Business API

Si tu número de WhatsApp está **verificado con Meta Business API** (Meta for Business), **NO podrás** usarlo con Baileys.

### ¿Cómo saber si mi número está en Meta Business API?

Tu número usa Meta Business API si:
- ✅ Lo registraste en **Facebook Business Manager**
- ✅ Usas **WhatsApp Business API oficial** (Cloud API)
- ✅ Tiene el check verde de "Verified Business"
- ✅ Lo usas para enviar notificaciones automáticas vía API oficial
- ✅ Aparece en Meta Developer Console

### 🚫 Síntomas del Problema

Cuando intentas usar un número de Business API con Baileys:

1. **El QR se escanea correctamente** ✅
2. **Dice "Conectado"** ✅
3. **Pero al enviar mensajes:**
   - Cliente dice "esperando mensaje" ⏳
   - El bot NO responde ❌
   - En el bot SÍ se ve lo que responde (solo local) ✅
   - Los mensajes NO llegan al cliente ❌

**Razón:** Meta detecta la conexión no oficial y bloquea los mensajes.

### ✅ Solución

**Opción 1: Usar Cuenta Personal (Recomendado)**
```
1. Desconecta el número Business API del bot
2. Usa una cuenta personal de WhatsApp
3. Escanea el QR con WhatsApp normal (no Business)
4. Todo funcionará perfectamente
```

**Opción 2: Mantener Business API Oficial**
```
Si necesitas usar un número Business API oficial:
- NO uses Baileys
- Usa Meta Cloud API oficial
- Requiere cambios en el backend
- Ver: https://developers.facebook.com/docs/whatsapp/cloud-api
```

## 🔍 Diagnóstico en los Logs

Cuando conectas un número, el bot mostrará:

```bash
✅ WhatsApp conectado exitosamente!
📱 Número conectado: 549123456789
🆔 JID: 549123456789@s.whatsapp.net

# Si es cuenta Business:
⚠️ ADVERTENCIA: Cuenta de negocio detectada
⚠️ Si esta cuenta usa Meta Business API oficial, puede tener problemas
⚠️ Recomendación: Usar cuenta personal de WhatsApp para Baileys
```

## 📋 Tipos de Cuentas WhatsApp

| Tipo | Compatible con Baileys | Notas |
|------|------------------------|-------|
| **Personal** | ✅ SÍ | Funciona perfectamente |
| **Business (App)** | ✅ SÍ | WhatsApp Business app normal |
| **Business API (Meta)** | ❌ NO | Verificado en Meta Developer |
| **Business API (On-Premise)** | ❌ NO | Servidor propio de Meta |
| **Cloud API** | ❌ NO | API oficial de Meta |

## 🛠️ Cómo Cambiar de Número en el Bot

### Método 1: Desde el Frontend
1. Abre el QR Viewer: `https://tu-servidor.com/qr-viewer`
2. Cuando esté conectado, haz clic en **"🔌 Desconectar WhatsApp"**
3. Confirma la acción
4. Espera 5 segundos
5. Aparecerá un nuevo QR
6. Escanéalo con el nuevo número

### Método 2: Desde la API
```bash
# 1. Desconectar sesión actual
POST /api/whatsapp/clear-session
Headers: X-Admin-Key: tu_admin_key

# 2. Generar nuevo QR
POST /api/whatsapp/initialize
Headers: X-Admin-Key: tu_admin_key

# 3. Esperar 3 segundos y verificar
GET /api/whatsapp/status
```

## 🔎 Logs de Diagnóstico

### Cuando llega un mensaje:
```bash
📩 Mensaje recibido de: 549123456789
   fromMe: false
   hasMessage: true
   messageType: conversation
   isGroup: false
💬 Mensaje extraído: "Hola bot"
📊 Stats: Recibidos=1, Bot=ON
⚡ Agrupando mensaje para procesar...
🔄 Agrupando mensaje de 549123456789@s.whatsapp.net
🤖 Procesando con bot: 549123456789@s.whatsapp.net
🤖 Usando modo OpenAI...
✅ Respuesta de OpenAI recibida: "Hola! ¿En qué puedo ayudarte?"
📤 Enviando respuesta: "Hola! ¿En qué puedo ayudarte?"
✅ Respuesta enviada exitosamente
```

### Si NO procesa el mensaje:
```bash
📩 Mensaje recibido de: 549123456789
⏩ Ignorando mensaje propio          # ← Mensaje del bot mismo
```
O:
```bash
📩 Mensaje recibido de: 549123456789
📊 Stats: Recibidos=1, Bot=OFF       # ← Bot desactivado
🤖 Bot desactivado - mensaje ignorado
```

## 🔧 Comandos Útiles

### Verificar si el bot está activo:
```bash
GET /api/whatsapp/status
```
Busca: `"autoBotEnabled": true`

### Activar/Desactivar bot:
```bash
POST /api/whatsapp/toggle-bot
Headers: X-Admin-Key: tu_admin_key
Body: {"enabled": true}
```

### Ver logs en tiempo real (Render):
```bash
# En tu dashboard de Render
Logs → Tail logs (últimos 100)
```

## ❓ FAQ

**P: ¿Puedo usar WhatsApp Business (la app)?**  
R: SÍ, si es la app normal descargada de Play Store/App Store.

**P: ¿Puedo usar un número con check verde de verificación?**  
R: Depende. Si es verificación simple de Business App: SÍ. Si es API de Meta: NO.

**P: ¿Cómo sé si mi número está en Business API?**  
R: Si lo registraste en Facebook Business Manager o Meta Developer Console, está en Business API.

**P: El bot responde pero el cliente no recibe los mensajes**  
R: Tu número probablemente está en Business API de Meta. Cambia a cuenta personal.

**P: ¿Puedo tener dos números conectados?**  
R: No en el mismo bot. Necesitas dos instancias separadas (dos servidores).

## 📞 Recomendación Final

Para un bot de prueba o personal:
- ✅ Usa una cuenta personal de WhatsApp
- ✅ O usa WhatsApp Business App (no API)
- ❌ NO uses números de Business API oficial

Para producción con muchos clientes:
- Considera usar Meta Cloud API oficial
- O mantén cuentas personales en Baileys (funciona perfectamente)
