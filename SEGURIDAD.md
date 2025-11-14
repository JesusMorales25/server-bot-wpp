# 🔐 GUÍA DE SEGURIDAD - Render.com

## ⚠️ PROBLEMA: Exposición a Internet

Cuando despliegas en Render.com, tu servidor estará **expuesto a internet público**. Esto significa:

❌ **Sin protección, cualquiera puede:**
- Ver tu código QR y conectarse a tu WhatsApp
- Llamar endpoints administrativos (reset, clear session, etc.)
- Acceder a información sensible
- Abusar de tu servidor

---

## ✅ SOLUCIÓN IMPLEMENTADA

Se han implementado **múltiples capas de seguridad**:

### 1. 🔑 Autenticación con API Keys

#### Endpoints Protegidos:

**Administrativos** (requieren `X-Admin-Key`):
- `POST /api/whatsapp/reset-session`
- `POST /api/whatsapp/initialize`
- `POST /api/whatsapp/clear-session`
- `POST /api/whatsapp/toggle-bot`
- `POST /api/whatsapp/toggle-autobot`
- `GET /api/openai/status`
- `POST /api/openai/reset-conversation`
- `POST /api/openai/reset-all`

**QR Viewer** (requiere `X-QR-Key` o query param):
- `GET /` (qr-viewer.html)
- `GET /api/whatsapp/status` (contiene QR)

#### Endpoints Públicos:
- `GET /health` - Health check
- `GET /api/whatsapp/info` - Info básica (sin datos sensibles)
- `GET /api/whatsapp/stats` - Estadísticas
- `POST /api/whatsapp/send-message` - Enviar mensajes (controlado por rate limit)

---

## 🚀 CONFIGURACIÓN PASO A PASO

### Paso 1: Generar Claves Seguras

Ejecuta el generador de claves:

```bash
node generate-keys.js
```

Esto generará algo como:

```bash
ADMIN_API_KEY=a1b2c3d4e5f6...  # 64 caracteres hexadecimales
QR_ACCESS_KEY=9z8y7x6w5v4u...  # 64 caracteres hexadecimales
ENABLE_ADMIN_AUTH=true
ENABLE_QR_AUTH=true
```

### Paso 2: Configurar en .env Local

Agrega las claves generadas en tu `.env`:

```bash
# ================================================
# SEGURIDAD
# ================================================

ADMIN_API_KEY=a1b2c3d4e5f6...
QR_ACCESS_KEY=9z8y7x6w5v4u...
ENABLE_ADMIN_AUTH=true
ENABLE_QR_AUTH=true
```

### Paso 3: Configurar en Render.com

En el dashboard de Render, agrega estas **4 variables adicionales**:

```
ADMIN_API_KEY=a1b2c3d4e5f6...
QR_ACCESS_KEY=9z8y7x6w5v4u...
ENABLE_ADMIN_AUTH=true
ENABLE_QR_AUTH=true
```

---

## 🔗 CÓMO USAR LOS ENDPOINTS PROTEGIDOS

### 1. Acceder al QR Viewer

#### Opción A: Query Parameter (Más fácil)
```
https://tu-app.onrender.com/?qr_key=TU_QR_ACCESS_KEY
```

#### Opción B: Header HTTP
```bash
curl https://tu-app.onrender.com/ \
  -H "X-QR-Key: TU_QR_ACCESS_KEY"
```

### 2. Llamar Endpoints Administrativos

Siempre incluir el header `X-Admin-Key`:

```bash
# Reiniciar sesión
curl -X POST https://tu-app.onrender.com/api/whatsapp/reset-session \
  -H "X-Admin-Key: TU_ADMIN_API_KEY"

# Ver estado de OpenAI
curl https://tu-app.onrender.com/api/openai/status \
  -H "X-Admin-Key: TU_ADMIN_API_KEY"

# Limpiar conversación
curl -X POST https://tu-app.onrender.com/api/openai/reset-all \
  -H "X-Admin-Key: TU_ADMIN_API_KEY"
```

### 3. Desde Frontend/Postman

```javascript
// JavaScript/Fetch
fetch('https://tu-app.onrender.com/api/whatsapp/reset-session', {
  method: 'POST',
  headers: {
    'X-Admin-Key': 'TU_ADMIN_API_KEY'
  }
});
```

---

## 🛡️ NIVELES DE PROTECCIÓN

### Nivel 1: Rate Limiting (Siempre Activo)
- ✅ 100 requests por minuto por IP
- ✅ Previene ataques de fuerza bruta
- ✅ Protege contra DDoS básicos

### Nivel 2: CORS (Configurable)
- ✅ Controla qué dominios pueden acceder
- ✅ Configurado via `ALLOWED_ORIGINS`

### Nivel 3: API Keys (Configurable)
- ✅ Autenticación con claves únicas
- ✅ Se puede activar/desactivar con flags
- ✅ Diferente key para admin y QR

### Nivel 4: Security Headers (Siempre Activo)
- ✅ X-Frame-Options: DENY
- ✅ X-Content-Type-Options: nosniff
- ✅ Content-Security-Policy
- ✅ Strict-Transport-Security (producción)

---

## 🔐 MEJORES PRÁCTICAS

### ✅ Hacer:
1. **Generar claves únicas** para cada ambiente (dev, staging, prod)
2. **Rotar claves regularmente** (cada 3-6 meses)
3. **Guardar claves en** gestor de contraseñas (1Password, LastPass, etc.)
4. **Usar HTTPS** siempre (Render lo proporciona gratis)
5. **Monitorear logs** para detectar intentos de acceso no autorizado
6. **Configurar alertas** en Render para uso anormal

### ❌ NO Hacer:
1. ❌ Compartir claves por email/Slack/WhatsApp
2. ❌ Subir claves a GitHub/GitLab
3. ❌ Usar claves simples o predecibles
4. ❌ Reutilizar claves entre proyectos
5. ❌ Desactivar seguridad en producción (`ENABLE_*_AUTH=false`)
6. ❌ Compartir el mismo `QR_ACCESS_KEY` con muchas personas

---

## 🚨 QUÉ HACER SI TUS CLAVES SE EXPONEN

### Acción Inmediata:

1. **Generar nuevas claves**:
   ```bash
   node generate-keys.js
   ```

2. **Actualizar en Render**:
   - Dashboard → Environment
   - Actualizar `ADMIN_API_KEY` y `QR_ACCESS_KEY`
   - Click en "Save"

3. **Reiniciar servicio**:
   - El servicio se reiniciará automáticamente
   - Las claves antiguas ya no funcionarán

4. **Revisar logs**:
   - Buscar accesos no autorizados
   - Verificar si hubo actividad sospechosa

5. **Considerar reset completo**:
   - Si hubo compromiso, hacer reset de sesión de WhatsApp
   - Escanear nuevo QR

---

## 🔍 MONITOREO Y AUDITORÍA

### Ver Intentos de Acceso No Autorizado

Los intentos fallidos se loguean:

```
🚫 Intento de acceso no autorizado a endpoint administrativo desde: 1.2.3.4
🚫 Intento de acceso no autorizado al QR viewer desde: 5.6.7.8
```

En Render Dashboard → Logs, busca:
- `🚫 Intento de acceso no autorizado`
- Revisa las IPs
- Si ves muchos intentos, considera implementar IP blocking

---

## 📊 CONFIGURACIÓN RECOMENDADA POR AMBIENTE

### Desarrollo Local:
```bash
ENABLE_ADMIN_AUTH=false  # Facilita desarrollo
ENABLE_QR_AUTH=false     # No necesario localmente
```

### Staging:
```bash
ENABLE_ADMIN_AUTH=true
ENABLE_QR_AUTH=true
ADMIN_API_KEY=staging_key_diferente
QR_ACCESS_KEY=staging_qr_diferente
```

### Producción:
```bash
ENABLE_ADMIN_AUTH=true
ENABLE_QR_AUTH=true
ADMIN_API_KEY=prod_key_super_segura
QR_ACCESS_KEY=prod_qr_super_segura
LOG_LEVEL=error  # Solo errores en logs
```

---

## 🆘 Problemas Comunes

### ❌ "No autorizado" al acceder a endpoint

**Causa**: Falta el header `X-Admin-Key` o es incorrecto

**Solución**: 
```bash
# Verificar que la key sea correcta
echo $ADMIN_API_KEY

# Incluir header en request
curl -H "X-Admin-Key: tu_key_correcta" ...
```

### ❌ No puedo ver el QR

**Causa**: Falta `qr_key` en la URL o header

**Solución**:
```
# Agregar key en URL
https://tu-app.onrender.com/?qr_key=TU_QR_ACCESS_KEY
```

### ❌ Quiero desactivar temporalmente la seguridad

**NO recomendado en producción**, pero si es necesario:

```bash
# En Render Dashboard → Environment
ENABLE_ADMIN_AUTH=false
ENABLE_QR_AUTH=false
```

---

## 📞 Resumen Ejecutivo

✅ **3 Pasos para Asegurar tu Servidor:**

1. **Generar claves**: `node generate-keys.js`
2. **Configurar en Render**: Agregar 4 variables de entorno
3. **Usar con autenticación**: Incluir headers/params en requests

**Tiempo requerido**: 5 minutos  
**Seguridad ganada**: 95% más protección  

---

¿Dudas? Consulta este archivo o revisa los logs del servidor para diagnóstico.
