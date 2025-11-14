# 🚀 Deployment en Render.com

## 📋 Variables de Entorno OBLIGATORIAS

Configura estas variables en el dashboard de Render.com:

### 🔐 OpenAI (REQUERIDAS)
```
OPENAI_API_KEY=sk-proj-tu_key_real_de_openai
```

### 🤖 Bot de WhatsApp
```
BOT_MODE=openai
AUTO_BOT_ENABLED=true
AUTO_INIT=true
```

### 🌐 Servidor
```
NODE_ENV=production
PORT=3001
```

### 📊 Logs (IMPORTANTE para Producción)
```
LOG_LEVEL=error
```
**Opciones de LOG_LEVEL:**
- `silent` - Sin logs (máximo ahorro 💰)
- `error` - Solo errores críticos (recomendado para producción)
- `warn` - Advertencias + errores
- `info` - Información importante
- `debug` - Logs detallados (solo para debugging)

**💡 Recomendación**: Usa `error` o `silent` en producción para ahorrar costos de logs.

---

## 📋 Variables de Entorno OPCIONALES

### OpenAI Avanzado
```
OPENAI_ASSISTANT_ID=asst_tu_asistente_id  # Si usas un asistente específico
OPENAI_MODEL=gpt-4o-mini  # Por defecto
OPENAI_SYSTEM_PROMPT=Tu personalidad personalizada aquí...
```

### Configuración del Bot
```
BOT_COOLDOWN_MS=3000
TYPING_DELAY_MS=1000
MESSAGE_GROUPING_DELAY=3000
MAX_GROUPED_MESSAGES=5
MAX_MESSAGES_PER_CHAT=10
```

### CORS
```
ALLOWED_ORIGINS=https://tu-frontend.com,https://otro-dominio.com
```

---

## 🛠️ Pasos para Deployment

### 1. Crear Servicio en Render

1. Ve a [https://render.com](https://render.com) y crea una cuenta
2. Click en **"New +"** → **"Web Service"**
3. Conecta tu repositorio de GitHub

### 2. Configuración del Servicio

**Build Command:**
```bash
npm install
```

**Start Command:**
```bash
npm start
```

**Environment:**
- Node

**Plan:**
- Free o Starter (según tus necesidades)

### 3. Variables de Entorno

En el dashboard de Render, ve a **Environment** y agrega:

#### ⚠️ OBLIGATORIAS
```
NODE_ENV=production
PORT=3001
LOG_LEVEL=error
BOT_MODE=openai
AUTO_BOT_ENABLED=true
AUTO_INIT=true
OPENAI_API_KEY=sk-proj-TU_API_KEY_REAL_AQUI
```

#### 📌 OPCIONALES (si las necesitas)
```
OPENAI_ASSISTANT_ID=asst_tu_id
OPENAI_MODEL=gpt-4o-mini
OPENAI_SYSTEM_PROMPT=Tu personalidad...
BOT_COOLDOWN_MS=3000
TYPING_DELAY_MS=1000
ALLOWED_ORIGINS=*
```

### 4. Configurar Persistencia de Sesión

⚠️ **IMPORTANTE**: Render reinicia el contenedor periódicamente, lo que borrará la sesión de WhatsApp.

**Opciones:**

#### Opción A: Usar Render Disk (Recomendado)
1. En el dashboard, ve a **Disks**
2. Click en **"Add Disk"**
3. Configuración:
   - **Name**: `whatsapp-session`
   - **Mount Path**: `/app/baileys_auth`
   - **Size**: 1 GB (suficiente)

#### Opción B: Aceptar re-escanear QR ocasionalmente
- No configurar disk
- Cuando Render reinicie, tendrás que escanear el QR nuevamente

### 5. Deploy

1. Click en **"Create Web Service"**
2. Render automáticamente:
   - Clona tu repo
   - Instala dependencias
   - Inicia el servidor
3. Espera a que termine el deployment

### 6. Conectar WhatsApp

1. Una vez desplegado, visita:
   ```
   https://tu-app.onrender.com/qr-viewer.html
   ```

2. Escanea el QR desde WhatsApp:
   - **WhatsApp** → **Configuración** → **Dispositivos vinculados**

3. ¡Listo! El bot está funcionando

---

## 📊 Monitoreo

### Ver Estado
```
https://tu-app.onrender.com/api/whatsapp/status
```

### Ver Logs
En el dashboard de Render → **Logs**

### Health Check
```
https://tu-app.onrender.com/health
```

---

## 🔧 Configuración de Logs para Producción

### Modo Producción (Recomendado)
```bash
NODE_ENV=production
LOG_LEVEL=error  # Solo errores críticos
```

**Ventajas:**
- ✅ Ahorra costos de almacenamiento de logs
- ✅ Reduce ruido en logs
- ✅ Solo muestra problemas reales

### Modo Debug (Solo para troubleshooting)
```bash
LOG_LEVEL=debug
```

**Usar solo temporalmente cuando necesites investigar un problema.**

---

## 💰 Costos Estimados

### Render Free Tier
- ✅ 750 horas gratis al mes
- ✅ El servicio se duerme después de 15 min sin uso
- ⚠️ Primer request después de dormir tarda ~30 seg

### Render Starter ($7/mes)
- ✅ Siempre activo
- ✅ No se duerme
- ✅ Mejor rendimiento

### OpenAI
- **gpt-4o-mini**: ~$0.15 por 1M tokens de entrada
- **Estimado**: $5-20/mes con uso moderado

---

## 🐛 Troubleshooting

### ❌ "Application failed to respond"
**Solución**: 
- Verifica que `PORT=3001` esté configurado
- Verifica que el start command sea `npm start`

### ❌ "OpenAI no inicializado"
**Solución**: Verifica que `OPENAI_API_KEY` esté correctamente configurada

### ❌ Sesión se pierde constantemente
**Solución**: Configura un Disk para persistir `baileys_auth`

### ❌ El bot no responde
**Solución**:
1. Verifica logs en Render dashboard
2. Temporalmente cambia `LOG_LEVEL=debug`
3. Revisa los logs para identificar el problema
4. Vuelve a `LOG_LEVEL=error` cuando termines

---

## 📌 Checklist de Deployment

- [ ] Repositorio de GitHub actualizado con el código
- [ ] Variables de entorno configuradas en Render
- [ ] `NODE_ENV=production`
- [ ] `LOG_LEVEL=error` (para producción)
- [ ] `OPENAI_API_KEY` configurada
- [ ] Disk configurado para persistencia (opcional pero recomendado)
- [ ] Deployment exitoso
- [ ] QR escaneado
- [ ] Bot respondiendo mensajes

---

## 🔗 URLs Útiles

- **Dashboard Render**: https://dashboard.render.com
- **OpenAI API Keys**: https://platform.openai.com/api-keys
- **OpenAI Usage**: https://platform.openai.com/usage
- **Documentación Render**: https://render.com/docs

---

¡Listo! Sigue estos pasos y tu bot estará funcionando en producción. 🚀
