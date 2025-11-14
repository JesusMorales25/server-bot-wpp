# WhatsApp AI Connector - Copilot Instructions

## Architecture Overview

This is a **WhatsApp AI Bot Backend** using `@whiskeysockets/baileys` (NOT whatsapp-web.js/Puppeteer). The server provides a REST API for WhatsApp automation with AI integration capabilities.

### Core Components
- **`whatsapp-baileys-server.js`** - Main server with Baileys WebSocket client
- **`openai-assistant.js`** - OpenAI integration module with conversation management
- **Session Management** - Multi-file auth state in `./baileys_auth` directory  
- **Message Grouping System** - Batches consecutive messages before AI processing
- **Security Layer** - CORS, rate limiting, security headers
- **Deployment Ready** - Railway/Render optimized with Docker support

## Key Patterns & Conventions

### Environment Configuration
- Use `.env` for all configuration - never hardcode values
- `BOT_MODE` controls operation mode: `openai` (direct OpenAI) or `backend` (external service)
- `OPENAI_API_KEY` required when using OpenAI mode
- `LOG_LEVEL` controls both Baileys library and app logging (silent/error/warn/info/debug/trace)
- `AUTO_INIT=true` automatically connects to WhatsApp on server start

### AI Integration Modes
```javascript
// Mode 1: OpenAI Direct (Recommended)
BOT_MODE=openai
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini

// Mode 2: External Backend
BOT_MODE=backend
BOT_IA_ENDPOINT=http://localhost:8081/api/chat/send
```

### Session & Connection Management
```javascript
// Sessions persist in ./baileys_auth directory - NEVER delete manually
const { state, saveCreds } = await useMultiFileAuthState('./baileys_auth');

// Connection states: disconnected, connecting, qr_received, connected
// QR codes auto-refresh, limited to MAX_QR_ATTEMPTS (10)
```

### Message Processing Flow
1. **Grouping**: Messages from same sender batched for `MESSAGE_GROUPING_DELAY` (3s)
2. **Cooldown**: Per-user cooldowns prevent spam (`BOT_COOLDOWN_MS`)  
3. **AI Integration**: 
   - OpenAI mode: Uses `openai-assistant.js` with conversation context
   - Backend mode: Sends to external `BOT_IA_ENDPOINT`
4. **Response**: Typing indicator + delayed response for natural feel

### OpenAI Assistant Pattern
```javascript
// Conversation management with context preservation
const openaiAssistant = require('./openai-assistant');
const reply = await openaiAssistant.processMessage(chatId, message, phoneNumber);

// Clean old conversations automatically (30min interval)
// Supports both Chat Completions API and Assistants API
```

### API Endpoints Pattern
All WhatsApp endpoints follow `/api/whatsapp/*` convention:
- `GET /api/whatsapp/status` - Connection status, QR code, stats
- `POST /api/whatsapp/send-message` - Send individual message
- `POST /api/whatsapp/initialize` - Start WhatsApp connection
- `POST /api/whatsapp/clear-session` - Reset session (forces new QR)

OpenAI management endpoints:
- `GET /api/openai/status` - OpenAI module status and active conversations
- `POST /api/openai/reset-conversation` - Reset specific chat context
- `POST /api/openai/reset-all` - Clear all conversation histories

## Development Workflows

### Local Development
```bash
npm run dev  # Uses nodemon for auto-restart
# Server runs on PORT=3001 (configurable)
# QR viewer available at http://localhost:3001/qr-viewer.html
```

### Testing & Debugging
- **`test-baileys-server.js`** - Quick health check script
- **Log Levels**: Use `LOG_LEVEL=debug` for development, `silent` for production cost savings
- **QR Testing**: Visit `/api/whatsapp/status` to see QR code data
- **Message Testing**: Use `/api/whatsapp/send-message` endpoint

### Production Deployment
- **Railway**: Uses `railway.json` config with volume mounting for sessions
- **Docker**: Multi-stage build with Node 18, session persistence
- **Environment**: Set `NODE_ENV=production` and `LOG_LEVEL=silent` for cost optimization

## Critical Implementation Details

### Session Persistence
- Sessions MUST persist across restarts - use volumes in production
- Session corruption auto-detected and cleaned (triggers new QR)
- Never delete `./baileys_auth` directory while connected

### Message Deduplication  
```javascript
// Processed messages tracked to prevent duplicates
const processedMessages = new Set();
// Use message.key.id for deduplication
```

### Error Handling Strategy
- Connection drops trigger auto-reconnect with exponential backoff
- QR limit exceeded stops auto-reconnection (manual reset required)
- Session corruption auto-clears and restarts QR flow

### Security Considerations
- Rate limiting: 100 requests/minute per IP
- CORS configured via `ALLOWED_ORIGINS` environment variable
- API key authentication for AI endpoint (`X-API-KEY` header)
- Security headers (CSP, XSS protection) automatically applied

## Common Issues & Solutions

### "QR Code not scanning"
- Check `qrAttempts` hasn't exceeded `MAX_QR_ATTEMPTS` 
- Clear session: `POST /api/whatsapp/clear-session`
- Verify phone has internet and WhatsApp updated

### "Bot not responding"
- Verify `AUTO_BOT_ENABLED=true` in environment
- Check `BOT_IA_ENDPOINT` is reachable
- Review message grouping settings in logs

### "Connection keeps dropping" 
- Check session file permissions in production
- Ensure volume mounting for `./baileys_auth` directory
- Review `LOG_LEVEL=debug` output for Baileys errors

When modifying this codebase, always preserve the session management logic and maintain backward compatibility with the existing API contract.