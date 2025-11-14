# 📋 RESUMEN: Deployment en Render.com

## 🔐 PASO 0: Generar Claves de Seguridad (OBLIGATORIO)

**Antes de configurar Render**, genera claves seguras:

```bash
node generate-keys.js
```

Esto generará claves únicas para proteger tu servidor. **GUÁRDALAS EN UN LUGAR SEGURO**.

---

## ✅ Variables de Entorno OBLIGATORIAS

Copia estas **11 variables** al dashboard de Render:

```
# Servidor
NODE_ENV=production
PORT=3001

# WhatsApp Bot  
BOT_MODE=openai
AUTO_BOT_ENABLED=true
AUTO_INIT=true
LOG_LEVEL=error

# OpenAI
OPENAI_API_KEY=tu_api_key_real_de_openai

# Seguridad (Usa las generadas con generate-keys.js)
ADMIN_API_KEY=tu_admin_key_generada_aqui
QR_ACCESS_KEY=tu_qr_key_generada_aqui
ENABLE_ADMIN_AUTH=true
ENABLE_QR_AUTH=true
```

**🔐 CRÍTICO**: Sin las claves de seguridad, cualquiera podrá acceder a tu QR y endpoints administrativos.

---

## 📊 Configuración de Logs (IMPORTANTE)

La variable `LOG_LEVEL` controla **todos los logs** del sistema:

### Para Producción (Recomendado):
```
LOG_LEVEL=error
```
- ✅ Solo muestra errores críticos
- ✅ Ahorra costos de almacenamiento
- ✅ Reduce ruido en los logs
- 💰 **Recomendado para ahorrar dinero**

### Alternativas:

| Nivel | Descripción | Cuándo usar | Costo de logs |
|-------|-------------|-------------|---------------|
| `silent` | Sin logs | Producción estable | 💰 Mínimo |
| `error` | Solo errores | Producción normal | 💰 Bajo |
| `warn` | Advertencias + errores | Monitoreo activo | 💰💰 Medio |
| `info` | Info + advertencias + errores | Staging | 💰💰💰 Alto |
| `debug` | Logs detallados | Debugging | 💰💰💰💰 Muy alto |

**💡 Recomendación**: Usa `error` en producción y cámbialo a `debug` temporalmente solo cuando necesites investigar un problema.

---

## 🔧 Pasos Rápidos

### 1. Crear Web Service en Render
- Conecta tu repositorio GitHub
- Build Command: `npm install`
- Start Command: `npm start`

### 2. Agregar Variables de Entorno
Copia las 7 variables obligatorias de arriba

### 3. Configurar Disk (Persistencia)
- Name: `whatsapp-session`
- Mount Path: `/app/baileys_auth`
- Size: 1 GB

### 4. Deploy
- Click "Create Web Service"
- Espera a que termine

### 5. Conectar WhatsApp
- Visita: `https://tu-app.onrender.com/qr-viewer.html`
- Escanea el QR desde WhatsApp

---

## 📁 Archivos de Referencia

- **`RENDER-DEPLOYMENT.md`** - Guía completa paso a paso
- **`.env.render`** - Ejemplo de variables de entorno
- **`render.yaml`** - Configuración automática (opcional)
- **`LOGS.md`** - Documentación completa del sistema de logs

---

## ⚙️ Opciones de Log Level

El sistema de logs es **100% configurable**:

```javascript
// En el código (whatsapp-baileys-server.js):
const LOG_LEVEL_MAP = {
  'silent': 0,   // Sin logs
  'error': 1,    // Solo errores críticos
  'warn': 2,     // Advertencias + errores  
  'info': 3,     // Información importante
  'debug': 4,    // Logs detallados
  'trace': 5     // Absolutamente todo
};
```

**Cambiar en cualquier momento** sin modificar código, solo actualiza la variable de entorno en Render.

---

## 💰 Ahorro de Costos

### Con LOG_LEVEL=error o silent:
- ✅ ~90% menos logs que con debug
- ✅ Menor uso de CPU procesando logs
- ✅ Menor almacenamiento
- ✅ Bills más bajos

### Cuando hacer debugging:
1. Cambiar temporalmente: `LOG_LEVEL=debug`
2. Reproducir el problema
3. Revisar logs
4. Volver a: `LOG_LEVEL=error`

---

## 🎯 Checklist Final

- [ ] Variables de entorno configuradas en Render
- [ ] `LOG_LEVEL=error` configurado ✅
- [ ] `OPENAI_API_KEY` con tu key real
- [ ] Disk configurado para persistencia
- [ ] Deployment exitoso
- [ ] QR escaneado
- [ ] Bot respondiendo

---

## 🆘 Soporte

Si algo falla:
1. Revisa los logs en Render Dashboard
2. Temporalmente cambia `LOG_LEVEL=debug`
3. Reproduce el problema
4. Los logs te dirán exactamente qué pasó
5. Vuelve a `LOG_LEVEL=error`

---

**¡Todo listo para producción! 🚀**
