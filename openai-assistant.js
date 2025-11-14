// ================================================
// MÓDULO DE INTEGRACIÓN CON OPENAI ASSISTANT
// ================================================

const OpenAI = require('openai');

class OpenAIAssistant {
  constructor() {
    this.openai = null;
    this.assistantId = process.env.OPENAI_ASSISTANT_ID;
    this.model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    this.systemPrompt = process.env.OPENAI_SYSTEM_PROMPT || 
      'Eres un asistente útil de WhatsApp. Responde de forma amigable, concisa y profesional en español.';
    
    // Mapeo de conversaciones: chatId -> threadId
    this.conversations = new Map();
    
    // Inicializar cliente de OpenAI
    this.initialize();
  }

  initialize() {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      console.error('❌ OPENAI_API_KEY no está configurada en .env');
      return;
    }

    try {
      this.openai = new OpenAI({ apiKey });
      // Solo mostrar log si hay error o modo debug
      if (process.env.LOG_LEVEL === 'debug' || process.env.LOG_LEVEL === 'trace') {
        console.log('✅ Cliente de OpenAI inicializado correctamente');
        
        if (this.assistantId) {
          console.log(`🤖 Usando asistente: ${this.assistantId}`);
        } else {
          console.log(`🤖 Usando modelo directo: ${this.model}`);
        }
      }
    } catch (error) {
      console.error('❌ Error inicializando cliente de OpenAI:', error.message);
    }
  }

  /**
   * Procesa un mensaje y obtiene respuesta del asistente
   * @param {string} chatId - ID del chat de WhatsApp
   * @param {string} message - Mensaje del usuario
   * @param {string} phoneNumber - Número de teléfono del usuario (opcional)
   * @returns {Promise<string>} - Respuesta del asistente
   */
  async processMessage(chatId, message, phoneNumber = null) {
    if (!this.openai) {
      throw new Error('Cliente de OpenAI no inicializado');
    }

    try {
      // Si hay asistente configurado, usar Assistants API
      if (this.assistantId) {
        return await this.processWithAssistant(chatId, message, phoneNumber);
      } else {
        // Usar Chat Completions API (más simple y directo)
        return await this.processWithChatCompletions(chatId, message, phoneNumber);
      }
    } catch (error) {
      console.error('❌ Error procesando mensaje con OpenAI:', error.message);
      
      // Mensajes de error más informativos
      if (error.code === 'insufficient_quota') {
        return 'Lo siento, el servicio de IA no está disponible en este momento (cuota excedida).';
      } else if (error.code === 'invalid_api_key') {
        return 'Lo siento, hay un problema con la configuración del servicio.';
      } else {
        return 'Lo siento, hubo un error procesando tu mensaje. Por favor, intenta de nuevo.';
      }
    }
  }

  /**
   * Procesa mensaje usando la API de Chat Completions (más simple)
   */
  async processWithChatCompletions(chatId, message, phoneNumber) {
    // Obtener o crear historial de conversación
    let conversation = this.conversations.get(chatId);
    
    if (!conversation) {
      conversation = {
        messages: [
          {
            role: 'system',
            content: this.systemPrompt
          }
        ],
        lastActivity: Date.now()
      };
      this.conversations.set(chatId, conversation);
    }

    // Agregar mensaje del usuario
    conversation.messages.push({
      role: 'user',
      content: message
    });

    // Limitar historial a últimos 20 mensajes (10 pares pregunta-respuesta)
    if (conversation.messages.length > 21) {
      // Mantener el system prompt + últimos 20 mensajes
      conversation.messages = [
        conversation.messages[0], // system prompt
        ...conversation.messages.slice(-20)
      ];
    }

    // Llamar a la API de OpenAI
    const completion = await this.openai.chat.completions.create({
      model: this.model,
      messages: conversation.messages,
      temperature: 0.7,
      max_tokens: 500, // Limitar respuestas para WhatsApp
    });

    const assistantMessage = completion.choices[0].message.content;

    return assistantMessage;
  }

  /**
   * Procesa mensaje usando Assistants API (con threads)
   */
  async processWithAssistant(chatId, message, phoneNumber) {
    // Obtener o crear thread para esta conversación
    let threadId = this.conversations.get(chatId);

    if (!threadId) {
      console.log('🆕 Creando nuevo thread para conversación');
      const thread = await this.openai.beta.threads.create();
      threadId = thread.id;
      this.conversations.set(chatId, threadId);
    }

    // Agregar mensaje al thread
    await this.openai.beta.threads.messages.create(threadId, {
      role: 'user',
      content: message
    });

    // Ejecutar asistente
    const run = await this.openai.beta.threads.runs.create(threadId, {
      assistant_id: this.assistantId
    });

    // Esperar a que termine la ejecución
    let runStatus = await this.openai.beta.threads.runs.retrieve(threadId, run.id);
    
    // Polling con timeout de 30 segundos
    const maxWaitTime = 30000;
    const startTime = Date.now();
    
    while (runStatus.status !== 'completed' && runStatus.status !== 'failed') {
      if (Date.now() - startTime > maxWaitTime) {
        throw new Error('Timeout esperando respuesta del asistente');
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
      runStatus = await this.openai.beta.threads.runs.retrieve(threadId, run.id);
    }

    if (runStatus.status === 'failed') {
      throw new Error('El asistente falló al procesar el mensaje');
    }

    // Obtener mensajes del thread
    const messages = await this.openai.beta.threads.messages.list(threadId);
    
    // El primer mensaje es la respuesta más reciente
    const lastMessage = messages.data[0];
    const assistantMessage = lastMessage.content[0].text.value;

    return assistantMessage;
  }

  /**
   * Limpia conversaciones antiguas (más de 1 hora sin actividad)
   */
  cleanOldConversations() {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    let cleaned = 0;

    for (const [chatId, data] of this.conversations.entries()) {
      // Si estamos usando Chat Completions, verificar lastActivity
      if (data.lastActivity && data.lastActivity < oneHourAgo) {
        this.conversations.delete(chatId);
        cleaned++;
      }
      // Si estamos usando Assistants, no eliminamos threads (son persistentes)
      // pero podríamos implementar un límite máximo si queremos
    }

    if (cleaned > 0) {
      console.log(`🧹 Limpiadas ${cleaned} conversaciones antiguas`);
    }
  }

  /**
   * Obtiene el estado del cliente
   */
  getStatus() {
    return {
      initialized: !!this.openai,
      mode: this.assistantId ? 'assistant' : 'chat-completions',
      model: this.model,
      assistantId: this.assistantId,
      activeConversations: this.conversations.size
    };
  }

  /**
   * Reinicia una conversación específica
   */
  resetConversation(chatId) {
    const existed = this.conversations.has(chatId);
    this.conversations.delete(chatId);
    return existed;
  }

  /**
   * Reinicia todas las conversaciones
   */
  resetAllConversations() {
    const count = this.conversations.size;
    this.conversations.clear();
    return count;
  }
}

// Exportar instancia singleton
module.exports = new OpenAIAssistant();
