# 🔐 Sistema de Autenticación Segura para QR Viewer

## Descripción General

El servidor implementa un **sistema de login seguro** para proteger el acceso al QR viewer de WhatsApp, evitando la exposición de credenciales en URLs.

## ✨ Características

- ✅ **Login con formulario** - No expone keys en URL
- ✅ **Sesiones HTTPOnly** - Cookies seguras con 24h de duración
- ✅ **Logout funcional** - Cierre de sesión desde el viewer
- ✅ **Redirección automática** - Protección de rutas sin autenticación
- ✅ **Compatibilidad con API** - Soporta headers para integraciones externas

## 🚀 Flujo de Uso

### 1. Acceso Inicial
```
http://localhost:3001/
  ↓
Redirige automáticamente a /login
```

### 2. Login
- Accede a `http://localhost:3001/login`
- Ingresa tu `QR_ACCESS_KEY` del archivo `.env`
- Click en "🚀 Acceder al QR Viewer"

### 3. QR Viewer
- Una vez autenticado, accedes a `/qr-viewer`
- La sesión dura **24 horas**
- Puedes cerrar sesión con el botón "🚪 Cerrar Sesión"

## 🔑 Configuración

### Variables de Entorno (.env)

```bash
# Access Key para el QR Viewer (obligatoria)
QR_ACCESS_KEY=fab4e7623de67bcf3d348bffd75f3de6cbb1711290fd97aa9a92d9eab9476495

# Habilitar protección del QR Viewer
ENABLE_QR_AUTH=true

# Secret para sesiones (opcional - se auto-genera si no existe)
SESSION_SECRET=
```

### Generar Keys Seguras

```bash
# Generar nueva QR_ACCESS_KEY
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# O usa el script incluido
node generate-keys.js
```

## 🛡️ Seguridad

### ✅ Ventajas sobre Query Params

| Aspecto | Query Params (?qr_key=...) | Sistema de Login |
|---------|---------------------------|------------------|
| **Historial Browser** | ❌ Se guarda la key | ✅ No se guarda |
| **Logs del Servidor** | ❌ Key visible | ✅ Solo POST /login |
| **Compartir URL** | ❌ Expone la key | ✅ URL limpia |
| **Sesiones** | ❌ Key en cada request | ✅ Cookie HTTPOnly |

### 🔒 Características de Seguridad

#### Cookies Seguras
```javascript
{
  httpOnly: true,           // No accesible desde JavaScript
  secure: true,             // Solo HTTPS en producción
  sameSite: 'lax',         // Protección CSRF
  maxAge: 24 * 60 * 60 * 1000  // 24 horas
}
```

#### Protección de Rutas
- `/` → Redirige a `/login` o `/qr-viewer` según autenticación
- `/qr-viewer` → Solo accesible con sesión válida
- `/api/whatsapp/status` → Requiere sesión O header `X-QR-Key`
- `/login` → Siempre accesible (página pública)

## 📡 API Reference

### POST /api/auth/login
Autentica usuario y crea sesión.

**Request:**
```json
{
  "accessKey": "tu_qr_access_key_aqui"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Autenticación exitosa"
}
```

**Response (401 Unauthorized):**
```json
{
  "error": "Access key inválida",
  "message": "La access key proporcionada no es correcta"
}
```

### POST /api/auth/logout
Cierra la sesión actual.

**Response:**
```json
{
  "success": true,
  "message": "Sesión cerrada"
}
```

### GET /api/auth/check
Verifica estado de autenticación.

**Response:**
```json
{
  "authenticated": true,
  "loginTime": 1699999999999
}
```

### GET /api/whatsapp/status
Obtiene estado del bot y QR code.

**Autenticación:**
- Sesión válida (cookie), O
- Header: `X-QR-Key: tu_key_aqui`

## 🔧 Integraciones Externas

Si necesitas acceder programáticamente (sin navegador):

```javascript
// Opción 1: Login y usar cookies
const response = await fetch('http://localhost:3001/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ accessKey: 'tu_key' }),
  credentials: 'include'  // Importante para cookies
});

// Opción 2: Header en cada request
const status = await fetch('http://localhost:3001/api/whatsapp/status', {
  headers: { 'X-QR-Key': 'tu_key_aqui' }
});
```

## 🎨 Personalización del Login

El archivo `login.html` tiene un diseño moderno con gradientes. Puedes personalizarlo:

### Cambiar Colores
```css
/* En login.html, línea 15 */
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);

/* Botón de login */
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
```

### Cambiar Logo
```html
<!-- En login.html, línea 39 -->
<span class="logo-icon">🔐</span>  <!-- Cambia el emoji aquí -->
```

## 🐛 Troubleshooting

### "No autorizado" después de login

**Problema:** Las cookies no se están guardando.

**Solución:**
```bash
# En .env, verifica que NODE_ENV esté correcto
NODE_ENV=development  # Para localhost (HTTP)
# NODE_ENV=production  # Para HTTPS
```

### Sesión expira muy rápido

**Solución:** Ajusta `maxAge` en `whatsapp-baileys-server.js`:
```javascript
cookie: {
  maxAge: 7 * 24 * 60 * 60 * 1000  // 7 días
}
```

### Login funciona pero /qr-viewer da error

**Verificar:**
1. Las cookies están habilitadas en el navegador
2. No hay extensiones bloqueando cookies
3. Usa `credentials: 'include'` en fetch desde JavaScript

## 📊 Comparación: Antes vs Ahora

### Antes (Query Params)
```
❌ http://localhost:3001/?qr_key=fab4e7623de67bcf3d348bffd75f3de6cbb1711290fd97aa9a92d9eab9476495
   └─ Key visible en URL, logs, historial
```

### Ahora (Sistema de Login)
```
✅ http://localhost:3001/
   ↓ Redirige a /login
✅ http://localhost:3001/login
   ↓ Formulario POST (key no visible en URL)
✅ http://localhost:3001/qr-viewer
   └─ Sesión segura con cookie HTTPOnly
```

## 🚀 Deployment en Producción

### Variables Obligatorias en Render/Railway

```bash
# Obligatorias
QR_ACCESS_KEY=genera_una_key_segura_de_64_caracteres
ENABLE_QR_AUTH=true
NODE_ENV=production

# Recomendadas
SESSION_SECRET=genera_otra_key_diferente_para_sesiones
ALLOWED_ORIGINS=https://tu-dominio.com
```

### HTTPS Automático
En producción (`NODE_ENV=production`):
- Cookies tienen `secure: true` (solo HTTPS)
- HSTS headers activos
- Redirección automática HTTP → HTTPS (según plataforma)

## 🎯 Próximos Pasos

1. **Accede al login:** `http://localhost:3001/`
2. **Ingresa tu QR_ACCESS_KEY** del archivo `.env`
3. **Visualiza el QR** de forma segura
4. **Cierra sesión** cuando termines

---

**💡 Tip:** Para máxima seguridad, cambia `QR_ACCESS_KEY` regularmente y usa un password manager para guardarla.

**🔐 Recomendación:** En producción, considera agregar autenticación de 2 factores (2FA) para mayor seguridad.
