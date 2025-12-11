require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const { closeConnection } = require('./config/database');
const logger = require('./config/logger');

const app = express();
const PORT = process.env.PORT || 3000;

// 1. HELMET - HEADERS DE SEGURANÇA
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// 2. CORS - COMPARTILHAMENTO DE RECURSOS ENTRE ORIGENS
const corsOptions = {
  origin: process.env.CORS_ORIGIN 
    ? process.env.CORS_ORIGIN.split(',') 
    : ['http://localhost:3000', 'http://localhost:8080', 'http://localhost:3001'],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

// 3. RATE LIMITING - PROTEÇÃO CONTRA ABUSO
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    error: 'Muitas requisições deste IP. Tente novamente em 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    error: 'Muitas tentativas de login. Tente novamente em 15 minutos.'
  },
  skipSuccessfulRequests: true
});

app.use(apiLimiter);

// 4. PARSERS DE REQUEST BODY
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// 5. LOGGING DE REQUISIÇÕES HTTP - APENAS EM ARQUIVO
// Morgan para arquivo de logs HTTP
app.use(morgan('combined', { stream: logger.stream }));

// 6. ROTAS DA APLICAÇÃO - CORREÇÃO CRÍTICA
const authRoutes = require('./routes/authRoutes');

// Carregar cadastroRoutes separadamente
const cadastroRoutes = require('./routes/cadastroRoutes');

// Log para debug
console.log('🔍 Debug - authRoutes:', typeof authRoutes);
console.log('🔍 Debug - cadastroRoutes:', typeof cadastroRoutes);

// Montar rotas corretamente
app.use('/api', authRoutes);

logger.info('🛣️ Todas as rotas configuradas');

// 7. ROTA RAIZ (DOCUMENTAÇÃO BÁSICA)
app.get('/', (req, res) => {
  logger.http(`🏠 Acesso à rota raiz - IP: ${req.ip}`);
  
  res.json({ 
    message: 'API Login OAB-MS',
    status: 'online',
    ambiente: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      login: 'POST /api/login',
      profile: 'GET /api/profile (protegido)',
      verify: 'GET /api/verify (protegido)',
      logout: 'POST /api/logout (protegido)',
      health: 'GET /api/health'
    },
    documentacao: 'Consulte o README para mais informações'
  });
});

// 8. ROTA 404 (NÃO ENCONTRADA)
app.use((req, res) => {
  logger.warn(`❓ Rota não encontrada: ${req.originalUrl} - IP: ${req.ip}`);
  
  res.status(404).json({
    success: false,
    error: 'Rota não encontrada',
    path: req.originalUrl,
    timestamp: new Date().toISOString()
  });
});

// 9. MIDDLEWARE DE ERRO GLOBAL
app.use((err, req, res, next) => {
  logger.error('🔥 Erro não tratado:', {
    mensagem: err.message,
    stack: err.stack,
    rota: req.originalUrl,
    metodo: req.method,
    ip: req.ip
  });
  
  const errorResponse = {
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'Erro interno do servidor' 
      : err.message,
    timestamp: new Date().toISOString()
  };
  
  if (process.env.NODE_ENV !== 'production' && err.stack) {
    errorResponse.stack = err.stack;
  }
  
  res.status(err.status || 500).json(errorResponse);
});

// 10. SHUTDOWN GRACEFUL
process.on('SIGTERM', async () => {
  logger.info('🔄 Recebido SIGTERM, encerrando graciosamente...');
  await closeConnection();
  logger.info('✅ Conexões fechadas, encerrando processo');
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('🔄 Recebido SIGINT (Ctrl+C), encerrando graciosamente...');
  await closeConnection();
  logger.info('✅ Conexões fechadas, encerrando processo');
  process.exit(0);
});

// 11. INICIAR SERVIDOR
const server = app.listen(PORT, () => {
  console.log(`
==============================================
🚀 API OAB-MS INICIADA COM SUCESSO
==============================================
📍 Porta: ${PORT}
📊 Banco: ${process.env.DB_DATABASE || 'Não configurado'}
🔐 Autenticação: JWT + CRC32 (compatibilidade)
🌍 Ambiente: ${process.env.NODE_ENV || 'development'}
⏰ Iniciado em: ${new Date().toISOString()}
🔗 URL: http://localhost:${PORT}
==============================================

📌 ENDPOINTS DISPONÍVEIS:
   POST /api/login          - Login (rate limited: 5/15min)
   GET  /api/profile        - Perfil (JWT required)
   GET  /api/verify         - Verificar token
   POST /api/logout         - Logout
   GET  /api/health         - Saúde da API
==============================================
  `);
  
  logger.info(`🚀 API iniciada na porta ${PORT}`);
  logger.info(`📊 Banco de dados: ${process.env.DB_DATABASE}`);
  
  // VERIFICAÇÕES DE CONFIGURAÇÃO CRÍTICA
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    logger.warn('⚠️ JWT_SECRET muito curto ou não configurado!');
  }
  
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.DB_PASSWORD) {
      logger.error('❌ DB_PASSWORD não configurado em produção!');
    }
    if (!process.env.JWT_SECRET) {
      logger.error('❌ JWT_SECRET não configurado em produção!');
    }
  }
});

// 12. TRATAMENTO DE ERROS NÃO CAPTURADOS
process.on('uncaughtException', (error) => {
  logger.error('💥 Erro não capturado:', {
    mensagem: error.message,
    stack: error.stack,
    hora: new Date().toISOString()
  });
  
  server.close(() => {
    logger.info('🔄 Servidor fechado devido a erro não capturado');
    process.exit(1);
  });
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('💥 Promise rejeitada não tratada:', {
    motivo: reason,
    hora: new Date().toISOString()
  });
});

module.exports = { app, server };