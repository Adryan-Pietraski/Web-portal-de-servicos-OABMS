/**
 * API DE AUTENTICAÇÃO OAB-MS
 * Sistema de login para o portal de serviços da OAB-MS
 * Banco de dados: SQL Server com sistema legado
 * Autenticação: JWT + CRC32 (compatibilidade com sistema legado)
 */

require('dotenv').config(); // Carrega variáveis de ambiente
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { closeConnection } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;

// 1. HELMET - HEADERS DE SEGURANÇA
// Protege contra vulnerabilidades web comuns
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],              // Só permite recursos do próprio domínio
      styleSrc: ["'self'", "'unsafe-inline'"], // Permite CSS inline
      scriptSrc: ["'self'"],               // Só permite scripts do próprio domínio
      imgSrc: ["'self'", "data:", "https:"], // Permite imagens do próprio domínio e HTTPS
    },
  },
  hsts: {
    maxAge: 31536000,      // Força HTTPS por 1 ano
    includeSubDomains: true,
    preload: true
  }
}));

// 2. CORS - COMPARTILHAMENTO DE RECURSOS ENTRE ORIGENS
// Configura quais domínios podem acessar a API
const corsOptions = {
  origin: process.env.CORS_ORIGIN 
    ? process.env.CORS_ORIGIN.split(',') 
    : ['http://localhost:3000', 'http://localhost:8080'], // Domínios permitidos
  credentials: true,               // Permite envio de cookies/credenciais
  optionsSuccessStatus: 200,       // Status para requisições OPTIONS
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Métodos permitidos
  allowedHeaders: ['Content-Type', 'Authorization']     // Headers permitidos
};

app.use(cors(corsOptions));

// 3. RATE LIMITING - PROTEÇÃO CONTRA ABUSO
// Limita requisições por IP para prevenir DDoS e brute force
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,       // Janela de 15 minutos
  max: 100,                        // 100 requisições por IP
  message: {
    success: false,
    error: 'Muitas requisições deste IP. Tente novamente em 15 minutos.'
  },
  standardHeaders: true,           // Headers padrão de rate limit
  legacyHeaders: false,
});

// Limite específico para login (mais restritivo)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,       // 15 minutos
  max: 5,                          // Apenas 5 tentativas de login
  message: {
    success: false,
    error: 'Muitas tentativas de login. Tente novamente em 15 minutos.'
  },
  skipSuccessfulRequests: true     // Não conta tentativas bem-sucedidas
});

app.use(apiLimiter);

// 4. PARSERS DE REQUEST BODY
// Configura limites para prevenir ataques de tamanho excessivo
app.use(express.json({ limit: '10kb' }));     // Limita JSON a 10KB
app.use(express.urlencoded({ extended: true, limit: '10kb' })); // Limita URL encoded

// 5. LOGGING DE REQUISIÇÕES
// Diferente configuração para desenvolvimento e produção
if (process.env.NODE_ENV !== 'production') {
  // DESENVOLVIMENTO: Logs detalhados
  const morgan = require('morgan');
  app.use(morgan('combined')); // Log formato Apache combined
  console.log('📝 [LOGGING] Modo desenvolvimento - Logs detalhados ativados');
} else {
  // PRODUÇÃO: Logs mínimos (apenas essenciais)
  app.use((req, res, next) => {
    console.log(`🌐 [REQUEST] ${new Date().toISOString()} - ${req.ip} - ${req.method} ${req.url}`);
    next();
  });
  console.log('📝 [LOGGING] Modo produção - Logs mínimos ativados');
}

// 6. ROTAS DA APLICAÇÃO
const authRoutes = require('./routes/authRoutes');
app.use('/api', authRoutes);
console.log('🛣️ [ROUTES] Rotas de autenticação configuradas em /api');

// 7. ROTA RAIZ (DOCUMENTAÇÃO BÁSICA)
app.get('/', (req, res) => {
  console.log('🏠 [ROOT] Acesso à rota raiz');
  
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
  console.warn(`❓ [404] Rota não encontrada: ${req.originalUrl} - IP: ${req.ip}`);
  
  res.status(404).json({
    success: false,
    error: 'Rota não encontrada',
    path: req.originalUrl,
    timestamp: new Date().toISOString()
  });
});

// 9. MIDDLEWARE DE ERRO GLOBAL
app.use((err, req, res, next) => {
  console.error('🔥 [ERROR HANDLER] Erro não tratado:', {
    mensagem: err.message,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : 'Ocultado em produção',
    rota: req.originalUrl,
    metodo: req.method,
    ip: req.ip
  });
  
  // Não expor detalhes do erro em produção
  const errorResponse = {
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'Erro interno do servidor' 
      : err.message,
    timestamp: new Date().toISOString()
  };
  
  // Adicionar stack trace apenas em desenvolvimento
  if (process.env.NODE_ENV !== 'production' && err.stack) {
    errorResponse.stack = err.stack;
  }
  
  res.status(err.status || 500).json(errorResponse);
});

// 10. SHUTDOWN GRACEFUL
// Fecha conexões adequadamente ao receber sinais de desligamento
process.on('SIGTERM', async () => {
  console.log('🔄 [SHUTDOWN] Recebido SIGTERM, encerrando graciosamente...');
  await closeConnection();
  console.log('✅ [SHUTDOWN] Conexões fechadas, encerrando processo');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🔄 [SHUTDOWN] Recebido SIGINT (Ctrl+C), encerrando graciosamente...');
  await closeConnection();
  console.log('✅ [SHUTDOWN] Conexões fechadas, encerrando processo');
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
   GET  /api/teste          - Rota de teste
==============================================
  `);
  
  // VERIFICAÇÕES DE CONFIGURAÇÃO CRÍTICA
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    console.warn('⚠️  [CONFIG AVISO] JWT_SECRET muito curto ou não configurado!');
    console.warn('⚠️  [CONFIG AVISO] Use: JWT_SECRET=seu_segredo_com_pelo_menos_32_chars');
  }
  
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.DB_PASSWORD) {
      console.error('❌ [CONFIG ERRO] DB_PASSWORD não configurado em produção!');
    }
    if (!process.env.JWT_SECRET) {
      console.error('❌ [CONFIG ERRO] JWT_SECRET não configurado em produção!');
    }
  }
});

// 12. TRATAMENTO DE ERROS NÃO CAPTURADOS
// Captura erros que escapam dos try/catch
process.on('uncaughtException', (error) => {
  console.error('💥 [UNCAUGHT EXCEPTION] Erro não capturado:', {
    mensagem: error.message,
    stack: error.stack,
    hora: new Date().toISOString()
  });
  
  // Fecha servidor graciosamente antes de sair
  server.close(() => {
    console.log('🔄 [SHUTDOWN] Servidor fechado devido a erro não capturado');
    process.exit(1);
  });
});

// Captura promises rejeitadas não tratadas
process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 [UNHANDLED REJECTION] Promise rejeitada não tratada:', {
    motivo: reason,
    promise: promise,
    hora: new Date().toISOString()
  });
});

module.exports = { app, server };