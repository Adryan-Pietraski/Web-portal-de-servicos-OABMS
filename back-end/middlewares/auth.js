const jwt = require('jsonwebtoken');
const logger = require('../config/logger');

/**
 * MIDDLEWARE DE AUTENTICAÇÃO OBRIGATÓRIA
 * Verifica e valida tokens JWT em rotas protegidas
 * Adiciona informações do usuário autenticado ao objeto req
 */
const authMiddleware = (req, res, next) => {
  const startTime = Date.now();
  const clientIP = req.ip || req.connection.remoteAddress;
  
  logger.debug(`🔒 Auth middleware iniciado - Rota: ${req.path}`);

  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      logger.warn('❌ Token não fornecido');
      return res.status(401).json({
        success: false,
        error: 'Token de autenticação necessário'
      });
    }

    const parts = authHeader.split(' ');
    
    if (parts.length !== 2) {
      logger.warn('❌ Formato de token inválido');
      return res.status(401).json({
        success: false,
        error: 'Formato de token inválido. Use: Bearer <token>'
      });
    }

    const [scheme, token] = parts;

    if (!/^Bearer$/i.test(scheme)) {
      logger.warn('❌ Esquema de autenticação inválido');
      return res.status(401).json({
        success: false,
        error: 'Formato de token inválido. Use: Bearer <token>'
      });
    }

    jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] }, (error, decoded) => {
      const authTime = Date.now() - startTime;
      
      if (error) {
        let errorMessage = 'Token inválido';
        
        if (error.name === 'TokenExpiredError') {
          errorMessage = 'Token expirado';
          logger.warn(`❌ Token expirado - Tempo: ${authTime}ms`);
        } else if (error.name === 'JsonWebTokenError') {
          errorMessage = 'Token malformado';
          logger.warn(`❌ Token malformado - Tempo: ${authTime}ms`);
        } else {
          logger.warn(`❌ Erro de token: ${error.message} - Tempo: ${authTime}ms`);
        }
        
        return res.status(401).json({
          success: false,
          error: errorMessage
        });
      }

      if (!decoded.userId || !decoded.cpf) {
        logger.warn(`❌ Token com payload incompleto - Tempo: ${authTime}ms`);
        return res.status(401).json({
          success: false,
          error: 'Token com informações incompletas'
        });
      }

      req.userId = decoded.userId;
      req.userCpf = decoded.cpf;
      req.user = {
        nome: decoded.nome,
        email: decoded.email,
        ativo: decoded.ativo
      };
      
      logger.info(`✅ Acesso autorizado - Usuário: ${decoded.nome} - Rota: ${req.method} ${req.path} - Tempo: ${authTime}ms`);
      
      next();
    });

  } catch (error) {
    const authTime = Date.now() - startTime;
    logger.error('🔥 Erro crítico no auth middleware', {
      mensagem: error.message,
      stack: error.stack,
      tempo: `${authTime}ms`
    });
    
    return res.status(500).json({
      success: false,
      error: 'Erro na autenticação'
    });
  }
};

/**
 * MIDDLEWARE DE AUTENTICAÇÃO OPCIONAL
 * Verifica token se existir, mas não falha se não existir
 * Útil para rotas que funcionam tanto para usuários logados quanto não logados
 * Exemplo: página que mostra conteúdo diferente para usuários logados
 */
const optionalAuthMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (authHeader) {
    const parts = authHeader.split(' ');
    
    if (parts.length === 2) {
      const [scheme, token] = parts;
      
      if (/^Bearer$/i.test(scheme)) {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
          
          if (decoded.userId && decoded.cpf) {
            req.userId = decoded.userId;
            req.userCpf = decoded.cpf;
            req.user = {
              nome: decoded.nome,
              email: decoded.email,
              ativo: decoded.ativo
            };
            
            logger.debug(`ℹ️ Usuário autenticado (opcional): ${decoded.nome}`);
          }
        } catch (error) {
          // Token inválido, mas não falha pois é opcional
          // Apenas logamos em nível debug
          logger.debug(`⚠️ Token inválido ignorado (middleware opcional): ${error.message}`);
        }
      }
    }
  }
  
  next();
};

module.exports = { authMiddleware, optionalAuthMiddleware };