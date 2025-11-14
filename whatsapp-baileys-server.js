// ================================================
// WHATSAPP BOT CON BAILEYS - MIGRACIÓN COMPLETA
// Mantiene toda la lógica del bot original
// pero usa @whiskeysockets/baileys en lugar de whatsapp-web.js
// ================================================

// Cargar variables de entorno
require('dotenv').config();

const { default: makeWASocket, DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const P = require('pino');
const crypto = require('crypto');
const openaiAssistant = require('./openai-assistant');

const app = express();
const PORT = process.env.PORT || 3001;

// Configuración específica para Railway/Render/Producción
const isProduction = process.env.NODE_ENV === 'production';

// ================================================
// SISTEMA DE LOGS UNIFICADO
// ================================================
// LOG_LEVEL controla AMBOS: Baileys (librería) y la app
// Valores: silent, error, warn, info, debug, trace
const logLevelEnv = (process.env.LOG_LEVEL || 'silent').toLowerCase();

// Mapeo de niveles de log de usuario a niveles numéricos
const LOG_LEVEL_MAP = {
  'silent': 0,   // Sin logs (solo Baileys silencioso)
  'error': 1,    // Solo errores críticos
  'warn': 2,     // Advertencias + errores  
  'info': 3,     // Información importante (default producción)
  'debug': 4,    // Logs detallados (default desarrollo)
  'trace': 5     // Absolutamente todo
};

// Nivel actual basado en LOG_LEVEL
const currentLogLevel = LOG_LEVEL_MAP[logLevelEnv] ?? (isProduction ? LOG_LEVEL_MAP.info : LOG_LEVEL_MAP.debug);

// Logger de Baileys con el nivel configurado
const logger = P({ level: logLevelEnv === 'silent' ? 'silent' : (logLevelEnv === 'trace' ? 'trace' : 'warn') });

// Sistema de logs de la aplicación
const log = {
  error: (...args) => currentLogLevel >= LOG_LEVEL_MAP.error && console.error('❌', ...args),
  warn: (...args) => currentLogLevel >= LOG_LEVEL_MAP.warn && console.warn('⚠️', ...args),
  info: (...args) => currentLogLevel >= LOG_LEVEL_MAP.info && console.log('ℹ️', ...args),
  debug: (...args) => currentLogLevel >= LOG_LEVEL_MAP.debug && console.log('🔍', ...args),
  trace: (...args) => currentLogLevel >= LOG_LEVEL_MAP.trace && console.log('📝', ...args)
};

// ================================================
// MIDDLEWARE DE SEGURIDAD (igual que antes)
// ================================================

// Headers HTTP de seguridad
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Content-Security-Policy', "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; img-src 'self' data:");
  
  if (isProduction) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  res.removeHeader('X-Powered-By');
  next();
});

// Configuración de CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:8080', 'http://localhost:5173'];

const corsOptions = {
  origin: function (origin, callback) {
    // Permitir peticiones sin origin (mismo servidor, Postman, curl, etc)
    if (!origin) return callback(null, true);
    
    // Permitir localhost en desarrollo (cualquier puerto)
    if (!isProduction && origin.startsWith('http://localhost:')) {
      return callback(null, true);
    }
    
    // Verificar lista de orígenes permitidos
    if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      console.log(`⚠️ CORS blocked origin: ${origin}`);
      callback(new Error('No permitido por CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-API-Key', 'X-Admin-Key', 'X-QR-Key'],
  optionsSuccessStatus: 200
};

// Rate limiting
const requestCounts = new Map();
const RATE_LIMIT = {
  windowMs: 60000,
  maxRequests: 100
};

const rateLimitMiddleware = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  
  if (!requestCounts.has(ip)) {
    requestCounts.set(ip, { count: 1, resetTime: now + RATE_LIMIT.windowMs });
  } else {
    const data = requestCounts.get(ip);
    
    if (now > data.resetTime) {
      data.count = 1;
      data.resetTime = now + RATE_LIMIT.windowMs;
    } else {
      data.count++;
      if (data.count > RATE_LIMIT.maxRequests) {
        return res.status(429).json({
          error: 'Demasiadas solicitudes',
          message: 'Por favor, intenta más tarde',
          retryAfter: Math.ceil((data.resetTime - now) / 1000)
        });
      }
    }
  }
  
  next();
};

// Aplicar middlewares
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(rateLimitMiddleware);

// ================================================
// CONFIGURACIÓN DE SESIONES
// ================================================
// Generar session secret único si no existe
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: isProduction, // Solo HTTPS en producción
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 horas
    sameSite: 'lax'
  },
  name: 'wa_bot_session'
}));

// ================================================
// MIDDLEWARE DE AUTENTICACIÓN
// ================================================

// Configuración de seguridad
const SECURITY_CONFIG = {
  ADMIN_API_KEY: process.env.ADMIN_API_KEY,
  QR_ACCESS_KEY: process.env.QR_ACCESS_KEY,
  ENABLE_ADMIN_AUTH: process.env.ENABLE_ADMIN_AUTH !== 'false',
  ENABLE_QR_AUTH: process.env.ENABLE_QR_AUTH !== 'false'
};

// Middleware para proteger endpoints administrativos
const adminAuthMiddleware = (req, res, next) => {
  // Si la autenticación está deshabilitada en desarrollo, permitir acceso
  if (!SECURITY_CONFIG.ENABLE_ADMIN_AUTH) {
    return next();
  }

  const apiKey = req.headers['x-admin-key'] || req.query.admin_key;

  if (!SECURITY_CONFIG.ADMIN_API_KEY) {
    log.warn('ADMIN_API_KEY no configurada - endpoint desprotegido');
    return next();
  }

  if (!apiKey || apiKey !== SECURITY_CONFIG.ADMIN_API_KEY) {
    log.warn('Intento de acceso no autorizado a endpoint administrativo desde:', req.ip);
    return res.status(401).json({
      error: 'No autorizado',
      message: 'Se requiere X-Admin-Key válida en headers o admin_key en query params'
    });
  }

  next();
};

// Middleware para verificar autenticación de QR viewer (basado en sesión)
const qrSessionAuthMiddleware = (req, res, next) => {
  // Si la autenticación está deshabilitada, permitir acceso
  if (!SECURITY_CONFIG.ENABLE_QR_AUTH) {
    return next();
  }

  // Verificar si el usuario tiene sesión activa
  if (req.session && req.session.qrAuthenticated) {
    return next();
  }

  // No autenticado - redirigir a login
  return res.redirect('/login');
};

// Middleware LEGACY para compatibilidad con query params/headers (solo para API)
const qrAuthMiddleware = (req, res, next) => {
  // Si la autenticación está deshabilitada, permitir acceso
  if (!SECURITY_CONFIG.ENABLE_QR_AUTH) {
    return next();
  }

  const qrKey = req.headers['x-qr-key'] || req.query.qr_key;

  if (!SECURITY_CONFIG.QR_ACCESS_KEY) {
    log.warn('QR_ACCESS_KEY no configurada - QR viewer desprotegido');
    return next();
  }

  if (!qrKey || qrKey !== SECURITY_CONFIG.QR_ACCESS_KEY) {
    log.warn('Intento de acceso no autorizado al QR viewer desde:', req.ip);
    return res.status(401).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Acceso Denegado</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
          .container { background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 500px; margin: 0 auto; }
          h1 { color: #d32f2f; }
          p { color: #666; }
          code { background: #f5f5f5; padding: 2px 6px; border-radius: 3px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🔒 Acceso Denegado</h1>
          <p>Se requiere autenticación para acceder al QR Viewer.</p>
          <p>Agrega <code>?qr_key=tu_key</code> a la URL o el header <code>X-QR-Key</code></p>
        </div>
      </body>
      </html>
    `);
  }

  next();
};

// Log de configuración de seguridad (solo si LOG_LEVEL >= info)
if (currentLogLevel >= LOG_LEVEL_MAP.info) {
  console.log('🔐 Seguridad:', SECURITY_CONFIG.ENABLE_ADMIN_AUTH ? '✅' : '❌', '|', 
              SECURITY_CONFIG.ENABLE_QR_AUTH ? '✅' : '❌');
}

// Servir archivos estáticos (para el QR viewer) - SIN protección para otros archivos
app.use(express.static(__dirname));

// ================================================
// ESTADO GLOBAL DEL BOT
// ================================================

let sock = null; // Socket de Baileys
let qrCodeData = null; // QR code en base64
let connectionStatus = 'disconnected'; // Estado: disconnected, connecting, qr_received, connected
let isClientReady = false;
let saveCreds = null; // Función para guardar credenciales

// Estadísticas del bot
const botStats = {
  startTime: new Date(),
  messagesReceived: 0,
  messagesSent: 0,
  errors: 0,
  autoReplies: 0
};

// Bot automático activado por defecto
let autoBotEnabled = process.env.AUTO_BOT_ENABLED !== 'false';
let botReadyTime = null;
let shouldAutoReconnect = true; // Control de reconexión automática

// Control de QR codes para evitar spam infinito
let qrAttempts = 0;
const MAX_QR_ATTEMPTS = 10; // Aumentado para permitir más intentos hasta escanear
let hasValidSession = false; // Nueva variable para rastrear sesión válida
let isConnecting = false; // Flag para evitar reconexiones concurrentes
let qrRefreshInterval = null; // Interval para auto-renovar QR

// Control de mensajes procesados (evitar duplicados)
const processedMessages = new Set();

// Configuración del bot
const BOT_CONFIG = {
  MODE: (process.env.BOT_MODE || 'openai').toLowerCase(), // 'openai' o 'backend'
  COOLDOWN_MS: parseInt(process.env.BOT_COOLDOWN_MS) || 0,
  MAX_MESSAGES_PER_CHAT: parseInt(process.env.MAX_MESSAGES_PER_CHAT) || 10,
  TYPING_DELAY_MS: parseInt(process.env.TYPING_DELAY_MS) || 1000,
  BOT_IA_ENDPOINT: process.env.BOT_IA_ENDPOINT || 'http://localhost:8081/api/chat',
  MESSAGE_GROUPING_DELAY: parseInt(process.env.MESSAGE_GROUPING_DELAY) || 3000, // 3 segundos para agrupar
  MAX_GROUPED_MESSAGES: parseInt(process.env.MAX_GROUPED_MESSAGES) || 5 // Máximo 5 mensajes por grupo
};

// Sistema de agrupación de mensajes
const messageGroups = new Map(); // jid -> { messages: [], timeout: timeoutId, timestamp: Date }
const userCooldowns = new Map(); // jid -> timestamp del último procesamiento

// Log de configuración del bot (solo si LOG_LEVEL >= info)
if (currentLogLevel >= LOG_LEVEL_MAP.info) {
  console.log('🤖 Bot:', autoBotEnabled ? '✅' : '❌', '|', 
              BOT_CONFIG.MODE === 'openai' ? 'OpenAI' : 'Backend');
}

// ================================================
// DIRECTORIO DE SESIÓN (AUTH STATE)
// ================================================

const SESSION_DIR = './baileys_auth';

// Crear directorio si no existe
if (!fs.existsSync(SESSION_DIR)) {
  fs.mkdirSync(SESSION_DIR, { recursive: true });
  console.log('📁 Directorio de sesión creado:', SESSION_DIR);
}

// ================================================
// FUNCIONES DE WHATSAPP (BAILEYS)
// ================================================

// Conectar a WhatsApp
async function connectToWhatsApp() {
  try {
    // Evitar conexiones múltiples concurrentes
    if (isConnecting && sock) {
      log.warn('Conexión ya en progreso, abortando nueva conexión');
      return;
    }
    
    log.info('Conectando a WhatsApp...');
    
    // Cerrar socket anterior si existe
    if (sock) {
      try {
        sock.end();
      } catch (err) {
        // Ignorar errores al cerrar socket anterior
      }
    }
    
    // Verificar si hay archivos de sesión válidos
    const credsPath = path.join(SESSION_DIR, 'creds.json');
    hasValidSession = fs.existsSync(credsPath);
    
    if (hasValidSession) {
      log.info('Sesión existente encontrada');
      qrAttempts = 0;
    } else {
      log.info('Nueva sesión - Se requerirá QR');
    }
    
    // Cargar autenticación guardada
    const { state, saveCreds: saveCredsFunc } = await useMultiFileAuthState(SESSION_DIR);
    saveCreds = saveCredsFunc;
    
    // Obtener versión más reciente de Baileys
    const { version, isLatest } = await fetchLatestBaileysVersion();
    log.debug(`Usando WA v${version.join('.')}, es la última: ${isLatest}`);
    
    // Crear socket de WhatsApp con configuración optimizada para sesión única
    sock = makeWASocket({
      version,
      logger,
      auth: state,
      defaultQueryTimeoutMs: 30000,    // 30 segundos timeout (reducido de 60)
      keepAliveIntervalMs: 20000,      // Keep alive cada 20 segundos (más frecuente)
      connectTimeoutMs: 15000,         // 15 segundos para conectar (reducido)
      markOnlineOnConnect: true,       // Marcar como online al conectar
      fireInitQueries: true,           // Enviar queries iniciales
      shouldSyncHistoryMessage: (msg) => false, // No sincronizar historial completo
      shouldIgnoreJid: (jid) => false,
      printQRInTerminal: false,        // No imprimir QR en terminal
      browser: ['Bot WhatsApp Único', 'Desktop', '1.0.0'], // ID único para evitar conflictos
      retryRequestDelayMs: 1000,       // Delay entre reintentos
      maxMsgRetryCount: 3,             // Máximo 3 reintentos por mensaje
      generateHighQualityLinkPreview: false, // Optimización
      syncFullHistory: false,          // No sincronizar historial completo
      getMessage: async (key) => {     // Evitar errores de mensajes no encontrados
        return { conversation: "" };
      }
    });
    
    connectionStatus = 'connecting';
    
    // ================================================
    // EVENT HANDLERS
    // ================================================
    
    // Manejo de actualizaciones de conexión
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;
      
      // Solo loguear cambios importantes (no updates vacíos)
      if (connection || qr || lastDisconnect) {
        log.trace('Connection update:', { 
          connection, 
          hasQR: !!qr,
          statusCode: lastDisconnect?.error?.output?.statusCode,
          reason: lastDisconnect?.error?.message 
        });
      }
      
      // QR Code recibido
      if (qr) {
        // Verificar límite de QR ANTES de procesar
        if (qrAttempts >= MAX_QR_ATTEMPTS) {
          log.warn(`Límite de QRs alcanzado (${qrAttempts}/${MAX_QR_ATTEMPTS})`);
          return;
        }
        
        // Si tenemos sesión válida, no deberíamos estar viendo QRs
        if (hasValidSession) {
          log.warn('QR recibido con sesión válida - limpiando sesión corrupta');
          if (fs.existsSync(SESSION_DIR)) {
            fs.rmSync(SESSION_DIR, { recursive: true, force: true });
            hasValidSession = false;
            qrAttempts = 0;
            setTimeout(() => connectToWhatsApp(), 2000);
            return;
          }
        }
        
        qrAttempts++;
        connectionStatus = 'qr_received';
        
        // Limpiar interval anterior si existe
        if (qrRefreshInterval) {
          clearInterval(qrRefreshInterval);
          qrRefreshInterval = null;
        }
        
        // Convertir QR a base64 para el frontend
        try {
          qrCodeData = await QRCode.toDataURL(qr);
          log.info(`📱 QR generado (${qrAttempts}/${MAX_QR_ATTEMPTS}) - Escanea desde WhatsApp`);
        } catch (err) {
          log.error('Error convirtiendo QR:', err);
        }
      }
      
      // Conexión cerrada
      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const errorMessage = lastDisconnect?.error?.message || 'Desconocida';
        
        console.log('⚠️ Conexión cerrada, código:', statusCode, 'reconectar:', shouldAutoReconnect);
        console.log('   Razón:', errorMessage);
        
        // Limpiar estado
        connectionStatus = 'disconnected';
        isClientReady = false;
        qrCodeData = null;
        
        // Determinar tipo de desconexión y estrategia
        let reconnectDelay = 3000; // Default 3 segundos
        let shouldAttemptReconnect = shouldAutoReconnect;
        
        // Manejar QR expirado específicamente - Permitir auto-renovación
        if (statusCode === 408 && errorMessage.includes('QR refs attempts ended')) {
          console.log(`🔄 QR expirado (${qrAttempts}/${MAX_QR_ATTEMPTS} intentos) - Renovando automáticamente`);
          
          // Solo detener si hemos excedido realmente el límite de intentos
          if (qrAttempts >= MAX_QR_ATTEMPTS) {
            console.log('🛑 Límite real de QRs alcanzado - Deteniendo');
            console.log('💡 Para reactivar: POST /api/whatsapp/reset-session y luego /api/whatsapp/initialize');
            shouldAutoReconnect = false;
            shouldAttemptReconnect = false;
            
            // Limpiar interval de QR
            if (qrRefreshInterval) {
              clearInterval(qrRefreshInterval);
              qrRefreshInterval = null;
            }
          } else {
            // Continuar renovando QR automáticamente
            console.log('🔄 Renovando QR automáticamente...');
            reconnectDelay = 2000; // Reconectar rápido para nuevo QR
          }
        }
        // Manejar diferentes tipos de desconexión
        else if (statusCode === DisconnectReason.badSession) {
          console.log('🗑️ Sesión corrupta detectada, limpiando...');
          if (fs.existsSync(SESSION_DIR)) {
            fs.rmSync(SESSION_DIR, { recursive: true, force: true });
            console.log('✅ Sesión corrupta eliminada');
          }
          hasValidSession = false;
          qrAttempts = 0; // Reset QR attempts para nueva sesión
        } 
        else if (statusCode === DisconnectReason.connectionClosed) {
          console.log('🔌 Conexión cerrada por WhatsApp - reconectando con sesión existente');
          reconnectDelay = hasValidSession ? 5000 : 3000; // Delay menor si hay sesión
        } 
        else if (statusCode === DisconnectReason.connectionLost) {
          console.log('📡 Conexión perdida - problema de red, reconectando...');
          reconnectDelay = hasValidSession ? 5000 : 3000;
        } 
        else if (statusCode === DisconnectReason.connectionReplaced || statusCode === 440) {
          console.log('📱 Conexión reemplazada o conflicto detectado');
          console.log('⚠️ Posible causa: Múltiples intentos de conexión simultáneos');
          
          // NO eliminar sesión, solo desconectar temporalmente
          shouldAutoReconnect = false;
          shouldAttemptReconnect = false;
          
          // Mantener sesión válida para futuros intentos manuales
          console.log('💡 Sesión mantenida - Usa POST /api/whatsapp/initialize para reintentar');
          console.log('� O usa POST /api/whatsapp/reset-session si persiste el problema');
        } 
        else if (statusCode === DisconnectReason.timedOut) {
          console.log('⏰ Timeout de conexión - reintentar');
          reconnectDelay = 10000; // Delay mayor para timeouts
        } 
        else if (statusCode === DisconnectReason.restartRequired) {
          console.log('🔄 Reinicio requerido por WhatsApp');
          reconnectDelay = 5000;
        }
        else if (statusCode === DisconnectReason.loggedOut) {
          console.log('🚪 Desconectado por logout - limpiar sesión');
          if (fs.existsSync(SESSION_DIR)) {
            fs.rmSync(SESSION_DIR, { recursive: true, force: true });
            console.log('✅ Sesión eliminada tras logout');
          }
          hasValidSession = false;
          shouldAutoReconnect = false;
          shouldAttemptReconnect = false;
        }
        
        if (shouldAttemptReconnect) {
          console.log(`🔄 Reconectando en ${reconnectDelay/1000} segundos...`);
          console.log(`   Estrategia: ${hasValidSession ? 'Con sesión existente' : 'Nueva sesión (QR requerido)'}`);
          setTimeout(() => connectToWhatsApp(), reconnectDelay);
        } else {
          console.log('🔴 No se reconectará automáticamente');
          sock = null; // Limpiar socket
        }
      }
      
      // Conexión abierta (autenticado)
      if (connection === 'open') {
        console.log('✅ WhatsApp conectado exitosamente!');
        connectionStatus = 'connected';
        isClientReady = true;
        qrCodeData = null;
        botReadyTime = new Date();
        
        // Marcar sesión como válida y reiniciar contadores
        hasValidSession = true;
        qrAttempts = 0;
        shouldAutoReconnect = true;
        isConnecting = false;
        
        console.log('🤖 Bot listo para recibir mensajes desde:', botReadyTime.toISOString());
        console.log('🔐 Sesión autenticada y guardada correctamente');
        console.log('� Bot esperando mensajes...');
        
        // Enviar presence UNA SOLA VEZ de forma suave (sin await para no bloquear)
        sock.sendPresenceUpdate('available').catch((err) => {
          console.warn('⚠️ No se pudo establecer presencia (ignorado):', err.message);
        });
      }
    });
    
    // Guardar credenciales cuando cambien (con manejo de errores)
    sock.ev.on('creds.update', async () => {
      try {
        // Asegurar que el directorio existe antes de guardar
        if (!fs.existsSync(SESSION_DIR)) {
          fs.mkdirSync(SESSION_DIR, { recursive: true });
          console.log('📁 Directorio de sesión recreado para guardar credenciales');
        }
        await saveCreds();
      } catch (err) {
        console.error('❌ Error guardando credenciales:', err.message);
        // No hacer nada más, solo log del error
      }
    });
    
    // Manejo de mensajes
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;
      
      for (const msg of messages) {
        await handleIncomingMessage(msg);
      }
    });
    
    // Sistema de keepalive PASIVO para mantener conexión estable (SIN reconexiones automáticas)
    const keepAliveInterval = setInterval(async () => {
      if (sock && isClientReady) {
        try {
          // Solo enviar presence update suave - NO forzar reconexiones
          await sock.sendPresenceUpdate('available').catch(() => {
            // Ignorar errores de presence, no reconectar
          });
          
        } catch (err) {
          // Solo log, NO reconectar desde keepalive
          console.warn('⚠️ Error en keepalive (ignorado):', err.message);
        }
      } else {
        // Limpiar interval si no hay conexión válida
        if (!shouldAutoReconnect) {
          clearInterval(keepAliveInterval);
          console.log('🔄 Keepalive detenido - reconexión automática deshabilitada');
        }
      }
    }, 30000); // Cada 30 segundos (menos agresivo)
    
  } catch (error) {
    console.error('❌ Error conectando a WhatsApp:', error);
    connectionStatus = 'disconnected';
    throw error;
  }
}

// ================================================
// MANEJO DE MENSAJES ENTRANTES
// ================================================

async function handleIncomingMessage(msg) {
  try {
    // Ignorar mensajes propios
    if (msg.key.fromMe) return;
    
    // Ignorar mensajes sin contenido
    if (!msg.message) return;
    
    // Extraer información del mensaje
    const messageId = msg.key.id;
    const from = msg.key.remoteJid; // Número del remitente
    
    // Extraer texto del mensaje según el tipo (iPhone, Android, Web, etc.)
    let messageText = '';
    
    if (msg.message.conversation) {
      // Mensaje normal (iPhone/Android)
      messageText = msg.message.conversation;
    } else if (msg.message.extendedTextMessage?.text) {
      // Mensaje desde WhatsApp Web o con formato extendido
      messageText = msg.message.extendedTextMessage.text;
    } else if (msg.message.imageMessage?.caption) {
      // Imagen con caption
      messageText = msg.message.imageMessage.caption;
    } else if (msg.message.documentMessage?.caption) {
      // Documento con caption
      messageText = msg.message.documentMessage.caption;
    } else if (msg.message.videoMessage?.caption) {
      // Video con caption
      messageText = msg.message.videoMessage.caption;
    } else if (msg.message.buttonsResponseMessage?.selectedButtonId) {
      // Respuesta a botones
      messageText = msg.message.buttonsResponseMessage.selectedButtonId;
    } else if (msg.message.listResponseMessage?.singleSelectReply?.selectedRowId) {
      // Respuesta a lista
      messageText = msg.message.listResponseMessage.singleSelectReply.selectedRowId;
    } else {
      // Tipo de mensaje no soportado para bot IA
      console.log(`⚠️ Tipo de mensaje no soportado para bot IA:`, Object.keys(msg.message));
      return;
    }
    
    // Si no hay texto, ignorar
    if (!messageText.trim()) {
      console.log(`⚠️ Mensaje sin texto válido de ${from}`);
      return;
    }
    
    // Evitar procesar el mismo mensaje dos veces
    if (processedMessages.has(messageId)) {
      return;
    }
    processedMessages.add(messageId);
    
    // Limpiar set de mensajes procesados si tiene más de 1000
    if (processedMessages.size > 1000) {
      const toDelete = Array.from(processedMessages).slice(0, 500);
      toDelete.forEach(id => processedMessages.delete(id));
    }
    
    botStats.messagesReceived++;    
    if (!autoBotEnabled) {
      return;
    }
    
    // **NUEVA LÓGICA: Agrupar mensajes consecutivos**
    await groupAndProcessMessage(from, messageText, msg);
    
  } catch (error) {
    console.error('❌ Error manejando mensaje:', error);
    botStats.errors++;
  }
}

// ================================================
// SISTEMA DE AGRUPACIÓN DE MENSAJES
// ================================================

async function groupAndProcessMessage(chatId, messageText, originalMessage) {
  try {
    const now = Date.now();
    
    // NO verificar cooldown aquí - dejar que los mensajes se agrupen
    // El cooldown se verificará AL PROCESAR el grupo completo
    
    // Obtener o crear grupo de mensajes para este chat
    let group = messageGroups.get(chatId);
    
    if (!group) {
      // Crear nuevo grupo
      group = {
        messages: [],
        timeout: null,
        timestamp: now,
        chatId: chatId,
        originalMessage: originalMessage
      };
      messageGroups.set(chatId, group);
    }
    
    // Agregar mensaje al grupo
    group.messages.push({
      text: messageText.trim(),
      timestamp: now
    });
    
    log.debug(`Mensaje agrupado: "${messageText.substring(0, 30)}..." (${group.messages.length}/${BOT_CONFIG.MAX_GROUPED_MESSAGES})`);
    
    // Limpiar timeout anterior si existe
    if (group.timeout) {
      clearTimeout(group.timeout);
    }
    
    // Si alcanzamos el máximo de mensajes, procesar inmediatamente
    if (group.messages.length >= BOT_CONFIG.MAX_GROUPED_MESSAGES) {
      log.info(`Máximo alcanzado (${BOT_CONFIG.MAX_GROUPED_MESSAGES}), procesando grupo`);
      await processGroupedMessages(chatId);
      return;
    }
    
    // Configurar nuevo timeout para procesar el grupo
    group.timeout = setTimeout(async () => {
      await processGroupedMessages(chatId);
    }, BOT_CONFIG.MESSAGE_GROUPING_DELAY);
    
    log.trace(`Timeout ${BOT_CONFIG.MESSAGE_GROUPING_DELAY/1000}s configurado`);
    
  } catch (error) {
    console.error('❌ Error agrupando mensaje:', error);
    // En caso de error, procesar mensaje individual
    await processMessageWithBot(chatId, messageText, originalMessage);
  }
}

async function processGroupedMessages(chatId) {
  try {
    const group = messageGroups.get(chatId);
    if (!group || group.messages.length === 0) {
      return;
    }
    
    // ✅ VERIFICAR COOLDOWN AQUÍ - después de agrupar mensajes
    const now = Date.now();
    const lastProcessed = userCooldowns.get(chatId);
    if (lastProcessed && (now - lastProcessed) < BOT_CONFIG.COOLDOWN_MS) {
      const remainingTime = BOT_CONFIG.COOLDOWN_MS - (now - lastProcessed);
      log.debug(`Usuario en cooldown (${Math.ceil(remainingTime/1000)}s), ignorando ${group.messages.length} msgs`);
      messageGroups.delete(chatId);
      if (group.timeout) {
        clearTimeout(group.timeout);
      }
      return;
    }
    
    // Remover grupo del mapa
    messageGroups.delete(chatId);
    
    // Limpiar timeout si existe
    if (group.timeout) {
      clearTimeout(group.timeout);
    }
    
    // Construir contexto completo
    const contextualMessage = group.messages
      .map(msg => msg.text)
      .join(' '); // Unir mensajes con espacio
    
    const messageCount = group.messages.length;
    const timeSpan = Date.now() - group.timestamp;
    
    log.info(`Procesando ${messageCount} mensaje${messageCount > 1 ? 's' : ''} agrupado${messageCount > 1 ? 's' : ''} (${timeSpan}ms)`);
    log.debug(`Contexto: "${contextualMessage.substring(0, 80)}${contextualMessage.length > 80 ? '...' : ''}"`);
    
    // Procesar mensaje completo con contexto
    await processMessageWithBot(chatId, contextualMessage, group.originalMessage);
    
    // Actualizar cooldown del usuario
    userCooldowns.set(chatId, Date.now());
    
    // Limpiar cooldowns antiguos (mayores a 1 hora)
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    for (const [userId, timestamp] of userCooldowns.entries()) {
      if (timestamp < oneHourAgo) {
        userCooldowns.delete(userId);
      }
    }
    
  } catch (error) {
    console.error('❌ Error procesando mensajes agrupados:', error);
    botStats.errors++;
  }
}

// ================================================
// INTEGRACIÓN CON BOT IA
// ================================================

async function processMessageWithBot(chatId, messageText, originalMessage) {
  try {
    // Simular indicador de escritura (typing)
    if (BOT_CONFIG.TYPING_DELAY_MS > 0) {
      try {
        if (!isClientReady || !sock) await ensureConnected(2, 1000);
        if (sock && typeof sock.sendPresenceUpdate === 'function') {
          await sock.sendPresenceUpdate('composing', chatId);
        }
      } catch (err) {
        console.warn('⚠️ No se pudo enviar presence update (composing):', err.message || err);
      }

      await new Promise(resolve => setTimeout(resolve, BOT_CONFIG.TYPING_DELAY_MS));
    }
    
    // Extraer número de chatId (ej: 549123456789@s.whatsapp.net -> 549123456789)
    const numero = String(chatId).split('@')[0];
    
    let botReply = null;
    
    // ===== MODO OPENAI =====
    if (BOT_CONFIG.MODE === 'openai') {
      try {
        botReply = await openaiAssistant.processMessage(chatId, messageText, numero);
      } catch (openaiError) {
        console.error('❌ Error con OpenAI:', openaiError.message);
        botReply = null;
      }
    }
    // ===== MODO BACKEND EXTERNO =====
    else if (BOT_CONFIG.MODE === 'backend') {
      try {
        // Construir headers con X-API-KEY si está disponible
        const headers = { 'Content-Type': 'application/json' };
        const apiKey = process.env.BOT_API_KEY || process.env.KEY || process.env.X_API_KEY || process.env['X-API-KEY'];
        if (apiKey) headers['X-API-KEY'] = apiKey;

        const response = await fetch(BOT_CONFIG.BOT_IA_ENDPOINT, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            numero,
            mensaje: messageText
          })
        });

        if (response.ok) {
          const data = await response.json();
          botReply = data.response || data.message || data.data || data.respuesta || data.texto || data.reply || null;
          if (!botReply && typeof data === 'string') {
            botReply = data;
          }
        } else {
          throw new Error(`Backend IA error: ${response.status}`);
        }
      } catch (primaryError) {
        console.warn('Primary IA endpoint failed, attempting fallback format...', primaryError.message);

        // Intentar fallback: si la API espera { numero, mensaje } en /api/chat/send
        try {
          let fallbackUrl = BOT_CONFIG.BOT_IA_ENDPOINT;
          if (fallbackUrl.endsWith('/api/chat')) {
            fallbackUrl = fallbackUrl.replace(/\/api\/chat$/, '/api/chat/send');
          } else if (!fallbackUrl.endsWith('/send')) {
            fallbackUrl = fallbackUrl.replace(/\/$/, '') + '/send';
          }

          const headers = { 'Content-Type': 'application/json' };
          const apiKey = process.env.BOT_API_KEY || process.env.X_API_KEY || process.env['X-API-KEY'];
          if (apiKey) headers['X-API-KEY'] = apiKey;

          const fbResponse = await fetch(fallbackUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify({ numero: numero, mensaje: messageText })
          });

          if (fbResponse.ok) {
            const fbData = await fbResponse.json();
            
            botReply = fbData.response || fbData.message || fbData.data || fbData.respuesta || fbData.texto || fbData.reply || null;
            
            if (!botReply && typeof fbData === 'string') {
              botReply = fbData;
            }
          } else {
            throw new Error(`Fallback IA error: ${fbResponse.status}`);
          }
        } catch (fallbackErr) {
          console.error('Fallback IA failed:', fallbackErr.message);
          throw primaryError;
        }
      }
    }

    if (!botReply) {
      botReply = 'Lo siento, no pude procesar tu mensaje.';
    }
    
    // Enviar respuesta usando sendMessage (maneja reconexión y reintentos)
    try {
      await sendMessage(chatId, botReply);
      botStats.autoReplies++;
    } catch (sendErr) {
      console.error('❌ Error enviando respuesta del bot:', sendErr.message || sendErr);
      throw sendErr;
    }
    
    // Remover indicador de escritura
    try {
      if (!isClientReady || !sock) await ensureConnected(2, 1000);
      if (sock && typeof sock.sendPresenceUpdate === 'function') {
        await sock.sendPresenceUpdate('available', chatId);
      }
    } catch (err) {
      console.warn('⚠️ No se pudo enviar presence update (available):', err.message || err);
    }
    
  } catch (error) {
    console.error('❌ Error procesando mensaje con bot:', error);
    botStats.errors++;
    
    // Enviar mensaje de error genérico
    try {
      await sock.sendMessage(chatId, { 
        text: 'Disculpa, hubo un error procesando tu mensaje. Por favor, intenta de nuevo más tarde.' 
      });
    } catch (sendError) {
      console.error('❌ Error enviando mensaje de error:', sendError);
    }
  }
}

// ================================================
// FUNCIONES AUXILIARES
// ================================================

// Espera (sleep)
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Intentar reconectar si el cliente no está listo
async function ensureConnected(retries = 3, delayMs = 2000) {
  if (isClientReady && sock) return true;

  // Evitar reconexiones concurrentes
  if (isConnecting) {
    console.log('� Reconexión ya en progreso, esperando...');
    // Esperar hasta 10 segundos a que termine la reconexión actual
    for (let i = 0; i < 10; i++) {
      await wait(1000);
      if (isClientReady && sock && !isConnecting) return true;
    }
    return false;
  }

  console.log('�🔎 ensureConnected: socket no listo, intentando reconectar...');
  isConnecting = true;
  
  try {
    for (let i = 0; i < retries; i++) {
      try {
        // Verificar si ya está conectado antes de intentar reconectar
        if (isClientReady && sock) {
          console.log('🔌 Socket ya disponible');
          return true;
        }
        
        // Intentar conectar de nuevo
        await connectToWhatsApp();

        if (isClientReady && sock) {
          console.log('🔌 Reconexión exitosa');
          return true;
        }
      } catch (err) {
        console.log(`⚠️ Reconexión fallida (intento ${i + 1}/${retries}):`, err.message || err);
      }

      await wait(delayMs * (i + 1)); // backoff lineal
    }

    console.log('❌ No fue posible reconectar después de varios intentos');
    return false;
  } finally {
    isConnecting = false;
  }
}


// Enviar mensaje programático
async function sendMessage(phone, message) {
  // Asegurarnos de que el socket esté listo antes de intentar enviar
  if (!isClientReady || !sock) {
    const ok = await ensureConnected(3, 2000);
    if (!ok) throw new Error('WhatsApp no está conectado');
  }

  try {
    // Limpiar y formatear número
    let cleanPhone = String(phone).trim();
    
    // Remover caracteres no numéricos excepto @
    if (!cleanPhone.includes('@')) {
      cleanPhone = cleanPhone.replace(/[^0-9]/g, '');
      
      // Si el número no tiene código de país, asumir Perú (+51)
      if (cleanPhone.length < 11 && !cleanPhone.startsWith('51')) {
        cleanPhone = '51' + cleanPhone;
      }
    }
    
    // Formatear número (agregar @s.whatsapp.net si no lo tiene)
    const jid = cleanPhone.includes('@') ? cleanPhone : `${cleanPhone}@s.whatsapp.net`;
    
    log.debug(`Enviando mensaje: "${message.substring(0, 40)}..."`);
    
    // Intentar enviar con reintentos en caso de cierre de conexión
    const maxSendRetries = 2;
    for (let attempt = 0; attempt <= maxSendRetries; attempt++) {
      try {
        // Verificar que el socket y sus métodos estén disponibles
        if (!sock || !sock.sendMessage || typeof sock.sendMessage !== 'function') {
          throw new Error('Socket no está disponible o métodos no definidos');
        }
        
        await sock.sendMessage(jid, { text: message });
        botStats.messagesSent++;
        log.info(`✅ Mensaje enviado correctamente`);
        return { success: true, message: 'Mensaje enviado' };
      } catch (err) {
        // Detectar error de conexión cerrada y tratar de reconectar
        const statusCode = err?.output?.statusCode || null;
        const msg = err?.message || '';
        log.error(`Error enviando (intento ${attempt + 1}):`, msg);

        // Lista de errores que indican socket desconectado o problemas de estado
        const connectionErrors = [
          'Connection Closed',
          'Cannot read properties of undefined',
          'Socket not open',
          'closed',
          'Socket no está disponible'
        ];
        
        const isConnectionError = connectionErrors.some(error => 
          msg.toLowerCase().includes(error.toLowerCase())
        );

        if (statusCode === 428 || isConnectionError) {
          console.log('🔄 Detectado socket cerrado, intentando reconectar antes de reintentar...');
          isClientReady = false;
          sock = null;
          const reok = await ensureConnected(3, 2000);
          if (!reok) {
            // Si no se puede reconectar, lanzar el error final
            throw err;
          }
          // conseguir nuevo socket en variable global 'sock' y reintentar
          continue;
        } else {
          // Si no es error de conexión, no reintentamos
          throw err;
        }
      }
    }

    // Si llegamos aquí, todos los reintentos fallaron
    throw new Error('No se pudo enviar el mensaje después de varios intentos');
  } catch (error) {
    console.error('❌ Error enviando mensaje:', error);
    botStats.errors++;
    throw error;
  }
}

// Limpiar sesión
async function clearSession() {
  try {
    console.log('🗑️ Limpiando sesión de WhatsApp...');
    
    // Desactivar reconexión automática
    shouldAutoReconnect = false;
    
    // Solo intentar logout si el socket está conectado
    if (sock && connectionStatus === 'connected') {
      try {
        await sock.logout();
        console.log('✅ Logout exitoso');
      } catch (logoutError) {
        console.log('⚠️ No se pudo hacer logout (conexión ya cerrada):', logoutError.message);
      }
    }
    
    // Limpiar socket
    sock = null;
    
    // Eliminar archivos de autenticación
    if (fs.existsSync(SESSION_DIR)) {
      fs.rmSync(SESSION_DIR, { recursive: true, force: true });
      console.log('✅ Archivos de sesión eliminados');
    }
    
    connectionStatus = 'disconnected';
    isClientReady = false;
    qrCodeData = null;
    processedMessages.clear();
    
    // Recrear directorio
    fs.mkdirSync(SESSION_DIR, { recursive: true });
    
  } catch (error) {
    console.error('❌ Error limpiando sesión:', error);
    throw error;
  }
}

// ================================================
// API REST ENDPOINTS
// ================================================

// ========================================
// RUTAS DE AUTENTICACIÓN
// ========================================

// Página de login (siempre accesible)
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

// API de login - verifica credenciales y crea sesión
app.post('/api/auth/login', (req, res) => {
  const { accessKey } = req.body;

  if (!accessKey) {
    return res.status(400).json({ 
      error: 'Access key requerida',
      message: 'Debes proporcionar una access key válida' 
    });
  }

  // Verificar access key
  if (!SECURITY_CONFIG.QR_ACCESS_KEY) {
    console.warn('⚠️ QR_ACCESS_KEY no configurada en .env');
    return res.status(500).json({ 
      error: 'Configuración incorrecta',
      message: 'El servidor no tiene configurada una access key' 
    });
  }

  if (accessKey !== SECURITY_CONFIG.QR_ACCESS_KEY) {
    console.warn('🚫 Intento de login fallido desde:', req.ip);
    return res.status(401).json({ 
      error: 'Access key inválida',
      message: 'La access key proporcionada no es correcta' 
    });
  }

  // Autenticación exitosa - crear sesión
  req.session.qrAuthenticated = true;
  req.session.loginTime = Date.now();
  
  console.log('✅ Login exitoso desde:', req.ip);
  
  res.json({ 
    success: true,
    message: 'Autenticación exitosa' 
  });
});

// API de logout
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error al cerrar sesión:', err);
      return res.status(500).json({ error: 'Error al cerrar sesión' });
    }
    res.json({ success: true, message: 'Sesión cerrada' });
  });
});

// Verificar estado de autenticación
app.get('/api/auth/check', (req, res) => {
  const isAuthenticated = req.session && req.session.qrAuthenticated;
  res.json({ 
    authenticated: isAuthenticated,
    loginTime: req.session?.loginTime || null
  });
});

// ========================================
// RUTAS DEL QR VIEWER (PROTEGIDAS)
// ========================================

// QR Viewer - Protegido con sesión
app.get('/qr-viewer', qrSessionAuthMiddleware, (req, res) => {
  res.sendFile(path.join(__dirname, 'qr-viewer.html'));
});

// Ruta raíz - redirige al viewer si está autenticado, sino a login
app.get('/', (req, res) => {
  if (req.session && req.session.qrAuthenticated) {
    res.redirect('/qr-viewer');
  } else {
    res.redirect('/login');
  }
});

// Obtener estado de conexión y QR (PROTEGIDO - requiere sesión o API key)
app.get('/api/whatsapp/status', (req, res, next) => {
  // Permitir acceso con sesión O con API key (para integraciones externas)
  const hasSession = req.session && req.session.qrAuthenticated;
  const hasApiKey = req.headers['x-qr-key'] === SECURITY_CONFIG.QR_ACCESS_KEY;
  
  if (!SECURITY_CONFIG.ENABLE_QR_AUTH || hasSession || hasApiKey) {
    return next();
  }
  
  return res.status(401).json({ 
    error: 'No autorizado',
    message: 'Debes estar autenticado para acceder a este recurso'
  });
}, async (req, res) => {
  try {
    const hasSession = fs.existsSync(path.join(SESSION_DIR, 'creds.json'));
    
    res.json({
      status: connectionStatus,
      isReady: isClientReady,
      qrCode: qrCodeData,
      hasSession: hasSession,
      hasValidSession: hasValidSession,
      autoBotEnabled: autoBotEnabled,
      qrAttempts: qrAttempts,
      maxQrAttempts: MAX_QR_ATTEMPTS,
      shouldAutoReconnect: shouldAutoReconnect,
      stats: {
        ...botStats,
        uptime: Math.floor((Date.now() - botStats.startTime.getTime()) / 1000)
      },
      message: connectionStatus === 'qr_received' && qrAttempts >= MAX_QR_ATTEMPTS - 1 
        ? 'QR generado - Escanéalo desde WhatsApp > Dispositivos vinculados'
        : hasValidSession && !isClientReady
        ? 'Reconectando con sesión existente...'
        : 'WhatsApp Auto-Bot Service (Baileys)'
    });
  } catch (error) {
    console.error('❌ Error en /status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Limpiar sesión y reiniciar (agresivo) - PROTEGIDO
app.post('/api/whatsapp/reset-session', adminAuthMiddleware, async (req, res) => {
  try {
    console.log('🗑️ Forzando limpieza COMPLETA de sesión desde API...');
    
    // Limpiar intervals
    if (qrRefreshInterval) {
      clearInterval(qrRefreshInterval);
      qrRefreshInterval = null;
      console.log('🔄 Interval de QR limpiado');
    }
    
    // Cerrar socket actual de forma agresiva
    if (sock) {
      try {
        console.log('🔌 Cerrando socket actual...');
        await sock.logout();
        sock.end();
        sock = null;
      } catch (err) {
        console.log('⚠️ Error cerrando socket (normal):', err.message);
      }
    }
    
    // Limpiar TODOS los estados
    isClientReady = false;
    connectionStatus = 'disconnected';
    qrCodeData = null;
    hasValidSession = false;
    qrAttempts = 0;
    shouldAutoReconnect = true;
    isConnecting = false;
    
    // Eliminar archivos de sesión COMPLETAMENTE
    if (fs.existsSync(SESSION_DIR)) {
      try {
        fs.rmSync(SESSION_DIR, { recursive: true, force: true });
        console.log('✅ Directorio de sesión eliminado completamente');
      } catch (err) {
        console.error('❌ Error eliminando sesión:', err.message);
      }
    }
    
    // Recrear directorio limpio
    fs.mkdirSync(SESSION_DIR, { recursive: true });
    console.log('📁 Directorio de sesión recreado limpio');
    
    // Esperar un momento para asegurar limpieza completa
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    res.json({ 
      success: true, 
      message: 'Sesión COMPLETAMENTE limpia - Usa /api/whatsapp/initialize para nueva conexión',
      qrAttempts: qrAttempts,
      hasValidSession: hasValidSession,
      shouldAutoReconnect: shouldAutoReconnect,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error limpiando sesión:', error);
    res.status(500).json({ error: error.message });
  }
});

// Inicializar conexión (con sesión única) - PROTEGIDO
app.post('/api/whatsapp/initialize', adminAuthMiddleware, async (req, res) => {
  try {
    console.log('🔄 Inicializando WhatsApp con sesión única...');
    
    if (isClientReady) {
      return res.json({ 
        success: true, 
        message: 'WhatsApp ya está conectado y estable',
        qrAttempts: qrAttempts,
        hasValidSession: hasValidSession,
        shouldAutoReconnect: shouldAutoReconnect,
        status: connectionStatus
      });
    }
    
    // FORZAR sesión limpia siempre para evitar conflictos
    console.log('🗑️ Forzando limpieza de sesión para conexión única...');
    
    // Cerrar socket existente
    if (sock) {
      try {
        sock.end();
        sock = null;
      } catch (err) {
        console.log('⚠️ Error cerrando socket anterior:', err.message);
      }
    }
    
    // Limpiar intervals
    if (qrRefreshInterval) {
      clearInterval(qrRefreshInterval);
      qrRefreshInterval = null;
    }
    
    // Limpiar sesión anterior para evitar conflictos
    if (fs.existsSync(SESSION_DIR)) {
      try {
        fs.rmSync(SESSION_DIR, { recursive: true, force: true });
        console.log('🗑️ Sesión anterior eliminada para evitar conflictos');
      } catch (err) {
        console.warn('⚠️ Error limpiando sesión anterior:', err.message);
      }
    }
    
    // Recrear directorio limpio
    fs.mkdirSync(SESSION_DIR, { recursive: true });
    
    // Reiniciar todos los contadores y estados
    shouldAutoReconnect = true;
    qrAttempts = 0;
    hasValidSession = false;
    isConnecting = false;
    isClientReady = false;
    connectionStatus = 'initializing';
    qrCodeData = null;
    
    console.log('🔄 Estados reiniciados - Iniciando conexión limpia');
    console.log('� Se generará QR que se auto-renovará hasta ser escaneado');
    
    // Iniciar conexión
    await connectToWhatsApp();
    
    res.json({ 
      success: true, 
      message: 'Conexión única iniciada - QR se renovará automáticamente hasta ser escaneado',
      qrAttempts: qrAttempts,
      hasValidSession: hasValidSession,
      shouldAutoReconnect: shouldAutoReconnect,
      autoRefresh: true,
      maxAttempts: MAX_QR_ATTEMPTS
    });
  } catch (error) {
    console.error('❌ Error inicializando:', error);
    res.status(500).json({ error: error.message });
  }
});

// Enviar mensaje (versión nueva con phone/message)
app.post('/api/whatsapp/send-message', async (req, res) => {
  try {
    const { phone, message } = req.body;
    
    if (!phone || !message) {
      return res.status(400).json({ 
        error: 'Faltan parámetros requeridos: phone y message' 
      });
    }
    
    const result = await sendMessage(phone, message);
    res.json(result);
  } catch (error) {
    console.error('❌ Error enviando mensaje:', error);
    res.status(500).json({ error: error.message });
  }
});

// Enviar mensaje (compatibilidad con frontend - numero/mensaje)
app.post('/api/whatsapp/send', async (req, res) => {
  try {
    // Soportar ambos formatos: {phone, message} y {numero, mensaje}
    const phone = req.body.phone || req.body.numero;
    const message = req.body.message || req.body.mensaje;
    
    if (!phone || !message) {
      return res.status(400).json({ 
        success: false,
        message: 'Faltan parámetros requeridos: numero/phone y mensaje/message' 
      });
    }
    
    const result = await sendMessage(phone, message);
    
    // Formatear respuesta compatible con frontend
    res.json({
      success: true,
      message: 'Mensaje enviado correctamente',
      messageId: `baileys_${Date.now()}`,
      to: phone
    });
  } catch (error) {
    console.error('❌ Error enviando mensaje desde frontend:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error al enviar mensaje',
      error: error.message 
    });
  }
});

// Limpiar sesión - PROTEGIDO
app.post('/api/whatsapp/clear-session', adminAuthMiddleware, async (req, res) => {
  try {
    await clearSession();
    res.json({ message: 'Sesión eliminada correctamente' });
  } catch (error) {
    console.error('❌ Error limpiando sesión:', error);
    res.status(500).json({ error: error.message });
  }
});

// Toggle bot automático - PROTEGIDO
app.post('/api/whatsapp/toggle-bot', adminAuthMiddleware, async (req, res) => {
  try {
    const { enabled } = req.body;
    
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ 
        error: 'Parámetro "enabled" debe ser boolean' 
      });
    }
    
    autoBotEnabled = enabled;
    console.log(`🤖 Bot automático ${enabled ? 'ACTIVADO ✅' : 'DESACTIVADO ❌'}`);
    
    res.json({ 
      message: `Bot automático ${enabled ? 'activado' : 'desactivado'}`,
      autoBotEnabled: autoBotEnabled
    });
  } catch (error) {
    console.error('❌ Error en toggle-bot:', error);
    res.status(500).json({ error: error.message });
  }
});

// Alias para toggle-autobot (compatibilidad con frontend) - PROTEGIDO
app.post('/api/whatsapp/toggle-autobot', adminAuthMiddleware, async (req, res) => {
  try {
    const { enabled } = req.body;
    
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ 
        error: 'Parámetro "enabled" debe ser boolean' 
      });
    }
    
    autoBotEnabled = enabled;
    console.log(`🤖 Bot automático ${enabled ? 'ACTIVADO ✅' : 'DESACTIVADO ❌'}`);
    
    res.json({ 
      success: true,
      message: `Bot automático ${enabled ? 'activado' : 'desactivado'}`,
      autoBotEnabled: autoBotEnabled
    });
  } catch (error) {
    console.error('❌ Error en toggle-autobot:', error);
    res.status(500).json({ error: error.message });
  }
});

// Información del bot
app.get('/api/whatsapp/info', async (req, res) => {
  try {
    res.json({
      status: connectionStatus,
      isReady: isClientReady,
      autoBotEnabled: autoBotEnabled,
      botReadyTime: botReadyTime,
      serverTime: new Date().toISOString(),
      config: {
        ...BOT_CONFIG,
        messageGrouping: {
          enabled: true,
          delayMs: BOT_CONFIG.MESSAGE_GROUPING_DELAY,
          maxMessages: BOT_CONFIG.MAX_GROUPED_MESSAGES
        }
      }
    });
  } catch (error) {
    console.error('❌ Error obteniendo info:', error);
    res.status(500).json({ error: error.message });
  }
});

// Estadísticas del bot
app.get('/api/whatsapp/stats', async (req, res) => {
  try {
    res.json({
      ...botStats,
      uptime: Math.floor((new Date() - botStats.startTime) / 1000),
      autoBotEnabled: autoBotEnabled,
      connectionStatus: connectionStatus,
      isReady: isClientReady
    });
  } catch (error) {
    console.error('❌ Error obteniendo stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    service: 'WhatsApp Bot (Baileys)'
  });
});

// Endpoint para monitorear agrupamiento de mensajes
app.get('/api/whatsapp/message-groups', async (req, res) => {
  try {
    const activeGroups = [];
    
    for (const [chatId, group] of messageGroups.entries()) {
      activeGroups.push({
        chatId,
        messageCount: group.messages.length,
        firstMessageTime: new Date(group.timestamp).toISOString(),
        timeRemaining: group.timeout ? Math.max(0, group.timestamp + BOT_CONFIG.MESSAGE_GROUPING_DELAY - Date.now()) : 0,
        messages: group.messages.map(msg => ({
          text: msg.text.substring(0, 50) + (msg.text.length > 50 ? '...' : ''),
          timestamp: new Date(msg.timestamp).toISOString()
        }))
      });
    }
    
    res.json({
      config: {
        groupingDelayMs: BOT_CONFIG.MESSAGE_GROUPING_DELAY,
        maxGroupedMessages: BOT_CONFIG.MAX_GROUPED_MESSAGES,
        cooldownMs: BOT_CONFIG.COOLDOWN_MS
      },
      activeGroups,
      totalActiveGroups: messageGroups.size,
      userCooldowns: userCooldowns.size
    });
  } catch (error) {
    console.error('❌ Error obteniendo grupos de mensajes:', error);
    res.status(500).json({ error: error.message });
  }
});

// Estado de OpenAI Assistant
app.get('/api/openai/status', adminAuthMiddleware, async (req, res) => {
  try {
    if (BOT_CONFIG.MODE !== 'openai') {
      return res.json({
        mode: BOT_CONFIG.MODE,
        message: 'OpenAI no está en uso. Modo actual: ' + BOT_CONFIG.MODE
      });
    }
    
    const status = openaiAssistant.getStatus();
    res.json({
      mode: BOT_CONFIG.MODE,
      ...status
    });
  } catch (error) {
    console.error('❌ Error obteniendo estado de OpenAI:', error);
    res.status(500).json({ error: error.message });
  }
});

// Reiniciar conversación de OpenAI - PROTEGIDO
app.post('/api/openai/reset-conversation', adminAuthMiddleware, async (req, res) => {
  try {
    if (BOT_CONFIG.MODE !== 'openai') {
      return res.status(400).json({
        error: 'OpenAI no está en uso',
        mode: BOT_CONFIG.MODE
      });
    }
    
    const { chatId } = req.body;
    
    if (!chatId) {
      return res.status(400).json({ error: 'Se requiere chatId' });
    }
    
    const existed = openaiAssistant.resetConversation(chatId);
    
    res.json({
      success: true,
      message: existed ? 'Conversación reiniciada' : 'No había conversación activa',
      chatId
    });
  } catch (error) {
    console.error('❌ Error reiniciando conversación:', error);
    res.status(500).json({ error: error.message });
  }
});

// Reiniciar todas las conversaciones de OpenAI - PROTEGIDO
app.post('/api/openai/reset-all', adminAuthMiddleware, async (req, res) => {
  try {
    if (BOT_CONFIG.MODE !== 'openai') {
      return res.status(400).json({
        error: 'OpenAI no está en uso',
        mode: BOT_CONFIG.MODE
      });
    }
    
    const count = openaiAssistant.resetAllConversations();
    
    res.json({
      success: true,
      message: `${count} conversaciones reiniciadas`,
      count
    });
  } catch (error) {
    console.error('❌ Error reiniciando conversaciones:', error);
    res.status(500).json({ error: error.message });
  }
});

// ================================================
// INICIAR SERVIDOR
// ================================================

app.listen(PORT, async () => {
  console.log(`\n🚀 WhatsApp Bot Server - Puerto ${PORT}`);
  console.log(`📡 Modo: ${isProduction ? 'PRODUCCIÓN' : 'DESARROLLO'} | Bot: ${BOT_CONFIG.MODE.toUpperCase()}`);
  
  // Iniciar limpieza periódica de conversaciones antiguas (cada 30 minutos)
  if (BOT_CONFIG.MODE === 'openai') {
    setInterval(() => {
      openaiAssistant.cleanOldConversations();
    }, 30 * 60 * 1000);
  }
  
  // Auto-inicializar si está configurado
  if (process.env.AUTO_INIT !== 'false') {
    log.info('Iniciando conexión con WhatsApp...');
    try {
      await connectToWhatsApp();
    } catch (error) {
      log.error('Error en auto-inicialización:', error);
    }
  }
});

// Manejo de señales de terminación
process.on('SIGINT', async () => {
  console.log('\n⚠️ Recibido SIGINT - cerrando servidor...');
  if (sock) {
    await sock.logout();
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n⚠️ Recibido SIGTERM - cerrando servidor...');
  if (sock) {
    await sock.logout();
  }
  process.exit(0);
});
