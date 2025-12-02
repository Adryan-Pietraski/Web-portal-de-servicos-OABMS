const jwt = require('jsonwebtoken');

/**
 * MIDDLEWARE DE AUTENTICAÇÃO OBRIGATÓRIA
 * Verifica e valida tokens JWT em rotas protegidas
 */
const authMiddleware = (req, res, next) => {
  const startTime = Date.now();
  const clientIP = req.ip || req.connection.remoteAddress;
  
  console.log(`🔒 [AUTH MIDDLEWARE] Iniciado - Rota: ${req.path} - IP: ${clientIP}`);

  try {
    // OBTER TOKEN DO HEADER
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      console.log('❌ [AUTH MIDDLEWARE] Token não fornecido');
      return res.status(401).json({
        success: false,
        error: 'Token de autenticação necessário'
      });
    }

    // VALIDAR FORMATO DO TOKEN (Bearer <token>)
    const parts = authHeader.split(' ');
    
    if (parts.length !== 2) {
      console.log('❌ [AUTH MIDDLEWARE] Formato de token inválido');
      return res.status(401).json({
        success: false,
        error: 'Formato de token inválido. Use: Bearer <token>'
      });
    }

    const [scheme, token] = parts;

    if (!/^Bearer$/i.test(scheme)) {
      console.log('❌ [AUTH MIDDLEWARE] Esquema de autenticação inválido');
      return res.status(401).json({
        success: false,
        error: 'Formato de token inválido. Use: Bearer <token>'
      });
    }

    // VERIFICAR TOKEN JWT
    jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] }, (error, decoded) => {
      const authTime = Date.now() - startTime;
      
      if (error) {
        let errorMessage = 'Token inválido';
        
        if (error.name === 'TokenExpiredError') {
          errorMessage = 'Token expirado';
          console.log(`❌ [AUTH MIDDLEWARE] Token expirado - Tempo: ${authTime}ms`);
        } else if (error.name === 'JsonWebTokenError') {
          errorMessage = 'Token malformado';
          console.log(`❌ [AUTH MIDDLEWARE] Token malformado - Tempo: ${authTime}ms`);
        } else {
          console.log(`❌ [AUTH MIDDLEWARE] Erro de token: ${error.message} - Tempo: ${authTime}ms`);
        }
        
        return res.status(401).json({
          success: false,
          error: errorMessage
        });
      }

      // VALIDAR PAYLOAD DO TOKEN
      if (!decoded.userId || !decoded.cpf) {
        console.log(`❌ [AUTH MIDDLEWARE] Token com payload incompleto - Tempo: ${authTime}ms`);
        return res.status(401).json({
          success: false,
          error: 'Token com informações incompletas'
        });
      }

      // ADICIONAR INFORMAÇÕES DO USUÁRIO À REQUISIÇÃO
      req.userId = decoded.userId;
      req.userCpf = decoded.cpf;
      req.user = {
        nome: decoded.nome,
        email: decoded.email,
        ativo: decoded.ativo
      };
      
      // LOG DE ACESSO (AUDITORIA)
      console.log(`✅ [AUTH MIDDLEWARE] Acesso autorizado - Usuário: ${decoded.nome} (${decoded.cpf}) - Rota: ${req.method} ${req.path} - Tempo: ${authTime}ms`);
      
      next();
    });

  } catch (error) {
    const authTime = Date.now() - startTime;
    console.error('🔥 [AUTH MIDDLEWARE ERRO CRÍTICO]', {
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
            
            console.log(`ℹ️ [OPTIONAL AUTH] Usuário autenticado: ${decoded.nome}`);
          }
        } catch (error) {
          // Token inválido, mas não falha pois é opcional
          console.log(`⚠️ [OPTIONAL AUTH] Token inválido ignorado: ${error.message}`);
        }
      }
    }
  }
  
  next();
};

module.exports = { authMiddleware, optionalAuthMiddleware };