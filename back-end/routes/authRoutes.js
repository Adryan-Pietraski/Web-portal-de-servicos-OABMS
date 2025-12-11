const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authMiddleware, optionalAuthMiddleware } = require('../middlewares/auth');
const rateLimit = require('express-rate-limit');
const logger = require('../config/logger');

/**
 * RATE LIMITER PARA LOGIN
 * Prevenção contra brute force attacks
 * 5 tentativas por IP a cada 15 minutos
 * Não conta tentativas bem-sucedidas
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    error: 'Muitas tentativas de login. Tente novamente em 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true
});


// ROTAS PÚBLICAS (não requerem autenticação)

/**
 * POST /api/login
 * Autenticação de usuário
 * Protegida por rate limiting contra ataques de força bruta
 */
router.post('/login', loginLimiter, authController.login);

/**
 * GET /api/health
 * Verifica saúde da API e conexão com banco
 * Usado por sistemas de monitoramento
 */
router.get('/health', authController.healthCheck);

/**
 * GET /api/usuario/:cpf
 * Busca informações de usuário por CPF
 * ⚠️ APENAS PARA DESENVOLVIMENTO E DEBUG ⚠️
 */
router.get('/usuario/:cpf', authController.buscarUsuario);

// ROTA DE DEBUG
/**
 * GET /api/debug/tabela/:tabela
 * Ver estrutura de tabela específica
 * ⚠️ APENAS PARA DESENVOLVIMENTO ⚠️
 */
router.get('/debug/tabela/:tabela', authController.debugTabela);

// ROTAS PROTEGIDAS (requerem token JWT válido)

/**
 * GET /api/verify
 * Verifica validade do token JWT
 * Rota usada pelo frontend para validar token periodicamente
 */
router.get('/verify', authMiddleware, authController.verificarToken);

/**
 * GET /api/profile
 * Obtém perfil completo do usuário autenticado
 */
router.get('/profile', authMiddleware, authController.getProfile);

/**
 * POST /api/logout
 * Logout simbólico (remove token no frontend)
 * Em JWT stateless, o logout é gerenciado no cliente
 */
router.post('/logout', authMiddleware, authController.logout);

// ROTA DE TESTE (autenticação opcional)

/**
 * GET /api/teste
 * Rota de teste com autenticação opcional
 * Útil para verificar se a API está funcionando
 * Mostra informações diferentes para usuários logados/não logados
 */
router.get('/teste', optionalAuthMiddleware, (req, res) => {
  logger.debug(`🛠️ Rota de teste acessada - Autenticado: ${!!req.user}`);
  
  res.json({ 
    message: 'Rota de teste funcionando!',
    autenticado: !!req.user,
    usuario: req.user || null,
    timestamp: new Date().toISOString()
  });
});

// ROTAS DE CADASTRO - IMPORTANDO DIRETAMENTE
const cadastroRoutes = require('./cadastroRoutes');
router.use('/cadastro', cadastroRoutes);

module.exports = router;