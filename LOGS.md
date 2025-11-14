# 📊 Sistema de Logs Optimizado

## 🎯 Reducir Costos en Render/Railway

Los servicios cloud cobran por almacenamiento de logs. Este sistema te permite controlar cuánto se registra.

## 🔧 Configuración

**YA TIENES** la variable `LOG_LEVEL` configurada. Solo necesitas cambiar su valor:

```bash
LOG_LEVEL=silent
```

Esta variable controla **TODOS** los logs (Baileys + App).

## 📋 Niveles Disponibles

### `silent` - Sin logs (MÁXIMO AHORRO 💰)
✅ **Casi sin logs**
- Solo errores críticos de consola
- Sin logs de Baileys (librería WhatsApp)
- Sin logs de aplicación

**Logs por hora**: ~5-10 líneas
**Ahorro**: 99% menos logs
**💰 Recomendado**: Para producción estable con bajo presupuesto

---

### `error` - Mínimo (Producción con presupuesto bajo)
✅ **Solo errores críticos**
- ❌ Errores de conexión
- ❌ Fallos al enviar mensajes
- ❌ Problemas de sesión

**Logs por hora**: ~10-50 líneas
**Ahorro**: 95% menos logs

---

### `warn` - Advertencias (Producción equilibrada)
✅ Todo lo de error +
- ⚠️ QR código regenerado
- ⚠️ Reconexiones
- ⚠️ Límites alcanzados
- ⚠️ Logs importantes de Baileys

**Logs por hora**: ~50-100 líneas
**Ahorro**: 80% menos logs

---

### `info` - Información Importante (Default producción)
✅ Todo lo de warn +
- ℹ️ Mensajes enviados exitosamente
- ℹ️ Grupos de mensajes procesados
- ℹ️ Conexión establecida/cerrada
- ℹ️ Máximo de mensajes alcanzado

**Logs por hora**: ~200-500 líneas
**Ahorro**: 50% menos logs

---

### `debug` - Desarrollo (Default en local)
✅ Todo lo de info +
- 🔍 Cada mensaje agrupado
- 🔍 Timeouts configurados
- 🔍 Contexto de mensajes
- 🔍 Detalles de envío

**Logs por hora**: ~500-1000 líneas
**Recomendado**: Solo en desarrollo

---

### `trace` - Todo (Solo para debugging)
✅ **ABSOLUTAMENTE TODO**
- 📝 Cada actualización de conexión
- 📝 Cada request HTTP
- 📝 Todos los detalles internos de Baileys
- 📝 Logs de red

**Logs por hora**: 2000+ líneas
**⚠️ ADVERTENCIA**: Solo usar temporalmente para resolver problemas complejos

---

## 💰 Ejemplo de Ahorro

### Escenario: 100 mensajes/día

| Nivel | Líneas/día | Costo mensual estimado* |
|-------|------------|-------------------------|
| trace | ~60,000 | $15-20 |
| debug | ~30,000 | $8-12 |
| info | ~15,000 | $4-6 |
| warn | ~6,000 | $2-3 |
| error | ~3,000 | $1-2 |
| **silent** | **~300** | **$0.50** 💰 |

*Basado en precios de Render (aprox. $0.00033 por MB de logs)

**🎯 TU CONFIGURACIÓN ACTUAL: `LOG_LEVEL=silent`** ✅
Ya tienes el máximo ahorro configurado.

---

## 🚀 Cómo Cambiar el Nivel

### En Render:
1. Dashboard → Tu servicio
2. Environment → Edit
3. Cambiar: `LOG_LEVEL=silent` (ya existe)
4. Opciones: `silent`, `error`, `warn`, `info`, `debug`, `trace`
5. Save Changes (auto-redeploy)

### En Railway:
1. Dashboard → Tu proyecto
2. Variables → Buscar `LOG_LEVEL`
3. Cambiar valor a: `silent`, `error`, `warn`, etc.
4. Guardar (auto-redeploy)

### En Local (.env):
```bash
LOG_LEVEL=debug
```

---

## 📈 Monitorear en Tiempo Real

```bash
# Render
render logs --tail

# Railway
railway logs --follow
```

---

## 🎯 Recomendaciones

**Producción estable + ahorro**: `silent` ← **TU CONFIGURACIÓN ACTUAL** ✅
**Producción con logs mínimos**: `error`
**Producción con más contexto**: `warn` o `info`
**Desarrollo local**: `debug`
**Debugging problemas**: `trace` (temporal)

---

## ⚠️ Importante

**Tu configuración actual `LOG_LEVEL=silent` es PERFECTA** para:
- ✅ Bot funcionando correctamente
- ✅ Producción estable
- ✅ Máximo ahorro de costos
- ✅ Sin necesidad de debugging

Solo cambia a `error` o `warn` si necesitas:
- 🔍 Investigar problemas
- 📊 Ver estadísticas de uso
- 🐛 Debugging temporal

**Después de resolver el problema, vuelve a `silent`**
