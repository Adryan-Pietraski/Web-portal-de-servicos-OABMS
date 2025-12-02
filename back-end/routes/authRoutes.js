const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authMiddleware, optionalAuthMiddleware } = require('../middlewares/auth');
const rateLimit = require('express-rate-limit');

/**
 * RATE LIMITER PARA LOGIN
 * Prevenção contra brute force attacks
 * 5 tentativas por IP a cada 15 minutos
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5,                   // 5 tentativas por IP
  message: {
    success: false,
    error: 'Muitas tentativas de login. Tente novamente em 15 minutos.'
  },
  standardHeaders: true,    // Inclui headers de rate limit
  legacyHeaders: false,     // Não usa headers legados
  skipSuccessfulRequests: true // Não conta tentativas bem-sucedidas
});

// ROTAS PÚBLICAS (não requerem autenticação)

/**
 * POST /api/login
 * Autenticação de usuário
 * Protegida por rate limiting
 */
router.post('/login', loginLimiter, authController.login);

/**
 * GET /api/health
 * Verifica saúde da API e conexão com banco
 */
router.get('/health', authController.healthCheck);

/**
 * GET /api/usuario/:cpf
 * Busca informações de usuário por CPF
 * APENAS PARA DESENVOLVIMENTO
 */
router.get('/usuario/:cpf', authController.buscarUsuario);

// ROTAS PROTEGIDAS (requerem token JWT válido)

/**
 * GET /api/verify
 * Verifica validade do token JWT
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
 */
router.post('/logout', authMiddleware, authController.logout);

// ROTA DE TESTE (autenticação opcional)

/**
 * GET /api/teste
 * Rota de teste com autenticação opcional
 * Útil para verificar se a API está funcionando
 */
router.get('/teste', optionalAuthMiddleware, (req, res) => {
  console.log(`🛠️ [ROTA TESTE] Acessada - Autenticado: ${!!req.user}`);
  
  res.json({ 
    message: 'Rota de teste funcionando!',
    autenticado: !!req.user,
    usuario: req.user || null,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;