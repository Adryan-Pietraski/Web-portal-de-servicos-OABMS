const { query, comparePasswords } = require('../config/database');
const jwt = require('jsonwebtoken');
const logger = require('../config/logger');

/**
 * FORMATA CPF PARA O PADRÃO XXX.XXX.XXX-XX
 * @param {string} cpf - CPF em qualquer formato
 * @returns {string} CPF formatado
 */
const formatarCPF = (cpf) => {
  const numeros = cpf.replace(/\D/g, ''); // Remove tudo que não é número
  return numeros.length === 11
    ? numeros.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
    : cpf; // Retorna original se não for CPF válido
};

/**
 * VALIDA SE UM CPF É VÁLIDO
 * Implementa algoritmo oficial de validação de CPF
 * @param {string} cpf - CPF a ser validado
 * @returns {boolean} true se CPF é válido
 */
const validarCPF = (cpf) => {
  const numeros = cpf.replace(/\D/g, '');
  
  // Validações básicas
  if (numeros.length !== 11 || /^(\d)\1+$/.test(numeros)) return false;
  
  // Cálculo do primeiro dígito verificador
  let soma = 0;
  for (let i = 0; i < 9; i++) soma += parseInt(numeros[i]) * (10 - i);
  let resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(numeros[9])) return false;
  
  // Cálculo do segundo dígito verificador
  soma = 0;
  for (let i = 0; i < 10; i++) soma += parseInt(numeros[i]) * (11 - i);
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  
  return resto === parseInt(numeros[10]);
};

class AuthController {
  async login(req, res) {
    const startTime = Date.now();
    const clientIP = req.ip || req.connection.remoteAddress;
    
    logger.info(`🔍 Login iniciado - IP: ${clientIP}`);

    try {
      const { cpfCnpj, password } = req.body;
      
      logger.debug('📋 Dados recebidos no login', {
        cpf: cpfCnpj ? cpfCnpj.replace(/\d(?=\d{4})/g, '*') : 'vazio',
        passwordPresent: !!password
      });

      // VALIDAÇÃO DOS DADOS DE ENTRADA
      if (!cpfCnpj || !password) {
        logger.warn('❌ Login com dados incompletos');
        return res.status(400).json({
          success: false,
          error: 'CPF e senha são obrigatórios'
        });
      }

      // LIMPAR E VALIDAR CPF
      const cpfNumeros = cpfCnpj.replace(/\D/g, '');
      
      if (!validarCPF(cpfNumeros)) {
        logger.warn(`❌ CPF inválido: ${cpfCnpj}`);
        return res.status(400).json({
          success: false,
          error: 'CPF inválido'
        });
      }

      const cpfFormatado = formatarCPF(cpfNumeros);
      logger.debug(`🔍 Buscando usuário: ${cpfFormatado}`);

      // BUSCAR USUÁRIO NO BANCO DE DADOS
      const result = await query(`
        SELECT TOP 1 
          ID,
          UserID,
          UserName,
          Password,
          IsActive,
          LastLogin
        FROM LoginUsers 
        WHERE UserID = @cpfFormatado
          OR REPLACE(REPLACE(REPLACE(UserID, '.', ''), '-', ''), '/', '') = @cpfNumeros
      `, { cpfFormatado, cpfNumeros });

      logger.debug(`📊 Usuários encontrados: ${result.recordset.length}`);

      if (result.recordset.length === 0) {
        logger.warn(`❌ Usuário não encontrado: ${cpfFormatado}`);
        return res.status(401).json({
          success: false,
          error: 'Credenciais inválidas'
        });
      }

      const usuario = result.recordset[0];
      logger.debug('👤 Usuário encontrado', {
        id: usuario.ID,
        nome: usuario.UserName,
        status: usuario.IsActive
      });

      // VERIFICAR STATUS DO USUÁRIO
      if (usuario.IsActive === '.') {
        logger.warn(`❌ Usuário inativo: ${usuario.UserName}`);
        return res.status(401).json({
          success: false,
          error: 'Usuário inativo. Entre em contato com o administrador.'
        });
      }

      if (usuario.IsActive !== 'X') {
        logger.warn(`⚠️ Status inválido: "${usuario.IsActive}"`);
        return res.status(401).json({
          success: false,
          error: 'Status do usuário inválido. Entre em contato com o administrador.'
        });
      }

      logger.debug('✅ Status OK - Usuário ativo');

      // VERIFICAR SENHA
      const senhaBanco = usuario.Password ? usuario.Password.trim() : '';
      
      if (!senhaBanco) {
        logger.warn(`❌ Senha vazia no banco para usuário: ${usuario.ID}`);
        return res.status(401).json({
          success: false,
          error: 'Credenciais inválidas'
        });
      }

      const senhaValida = comparePasswords(password, senhaBanco);
      
      if (!senhaValida) {
        logger.warn(`❌ Senha inválida para usuário: ${usuario.ID}`);
        return res.status(401).json({
          success: false,
          error: 'Credenciais inválidas'
        });
      }

      logger.debug('✅ Senha validada com sucesso');

      // ATUALIZAR ÚLTIMO LOGIN
      try {
        await query(
          `UPDATE LoginUsers SET LastLogin = GETDATE() WHERE ID = @id`,
          { id: usuario.ID }
        );
        logger.debug(`📅 Último login atualizado para usuário: ${usuario.ID}`);
      } catch (error) {
        logger.warn(`⚠️ Não foi possível atualizar último login: ${error.message}`);
      }

      // GERAR TOKEN JWT
      const tokenPayload = {
        userId: usuario.ID,
        cpf: usuario.UserID,
        nome: usuario.UserName,
        ativo: usuario.IsActive === 'X'
      };
      
      const token = jwt.sign(
        tokenPayload,
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
      );
      
      logger.debug(`🔑 Token gerado para: ${usuario.UserName}`);

      // CALCULAR TEMPO DE EXECUÇÃO
      const executionTime = Date.now() - startTime;
      
      // RESPOSTA DE SUCESSO
      const response = {
        success: true,
        message: 'Login realizado com sucesso!',
        usuario: {
          id: usuario.ID,
          cpf: usuario.UserID,
          nome: usuario.UserName,
          ativo: usuario.IsActive === 'X',
          ultimoLogin: usuario.LastLogin
        },
        token: token,
        expiresIn: process.env.JWT_EXPIRES_IN || '24h',
        timestamp: new Date().toISOString(),
        performance: `${executionTime}ms`
      };

      logger.info(`✅ Login realizado com sucesso para: ${usuario.UserName} - Tempo: ${executionTime}ms`);
      
      res.json(response);

    } catch (error) {
      const executionTime = Date.now() - startTime;
      logger.error('🔥 Erro crítico no login', {
        mensagem: error.message,
        stack: error.stack,
        ip: clientIP,
        tempo: `${executionTime}ms`
      });
      
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * VERIFICA SE UM TOKEN JWT É VÁLIDO
   * Rota usada pelo frontend para validar token periodicamente
   */
  async verificarToken(req, res) {
    try {
      logger.info(`🔒 Token verificado para: ${req.user?.nome || 'usuário desconhecido'}`);
      
      res.json({
        success: true,
        message: 'Token válido',
        usuario: {
          id: req.userId,
          cpf: req.userCpf,
          ...req.user
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('❌ Erro ao verificar token:', error.message);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * OBTÉM PERFIL COMPLETO DO USUÁRIO AUTENTICADO
   */
    async getProfile(req, res) {
    try {
      logger.info(`👤 Perfil solicitado por: ${req.user?.nome || 'usuário desconhecido'}`);
      
      const result = await query(`
        SELECT 
          ID,
          UserID,
          UserName,
          IsActive,
          LastLogin,
          CreatedOn
        FROM LoginUsers 
        WHERE ID = @userId
      `, { userId: req.userId });

      if (result.recordset.length === 0) {
        logger.warn(`❌ Usuário não encontrado no banco: ${req.userId}`);
        return res.status(404).json({
          success: false,
          error: 'Usuário não encontrado'
        });
      }

      const usuario = result.recordset[0];
      
      logger.info(`✅ Dados do perfil retornados para: ${usuario.UserName}`);

      res.json({
        success: true,
        usuario: {
          id: usuario.ID,
          cpf: usuario.UserID,
          nome: usuario.UserName,
          ativo: usuario.IsActive === 'X',
          ultimoLogin: usuario.LastLogin,
          dataCadastro: usuario.CreatedOn
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('❌ Erro ao obter perfil:', error.message);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * REALIZA LOGOUT (APENAS SIMBÓLICO - TOKEN É STATELESS)
   * Em sistemas JWT, o logout é feito no frontend removendo o token
   * Esta rota apenas registra a ação no servidor
   */
  async logout(req, res) {
    try {
      logger.info(`🚪 Logout realizado por: ${req.user?.nome || 'usuário desconhecido'}`);
      
      res.json({
        success: true,
        message: 'Logout realizado com sucesso',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('❌ Erro no logout:', error.message);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * VERIFICA SAÚDE DA API E CONEXÃO COM BANCO
   * Rota usada por sistemas de monitoramento (ex: Kubernetes, Docker Healthcheck)
   */
  async healthCheck(req, res) {
    try {
      const result = await query('SELECT 1 as teste, DB_NAME() as banco');
      
      logger.debug('🏥 Health check realizado - Sistema saudável');
      
      res.json({
        success: true,
        status: 'online',
        banco: result.recordset[0].banco,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('🚨 Erro no health check:', error.message);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

    /**
   * DEBUG: VER ESTRUTURA DE TABELA
   * ⚠️ APENAS PARA DESENVOLVIMENTO ⚠️
   */
  async debugTabela(req, res) {
    try {
      const { tabela } = req.params;
      
      logger.debug(`🔍 Debug tabela: ${tabela}`);

      // 1. Buscar estrutura das colunas
      const estrutura = await query(`
        SELECT 
          c.name AS Coluna,
          t.name AS Tipo,
          c.max_length AS Tamanho,
          c.is_nullable AS PermiteNulo,
          CASE 
            WHEN ic.column_id IS NOT NULL THEN 'PK'
            ELSE ''
          END AS ChavePrimaria,
          dc.definition AS ValorPadrao
        FROM sys.columns c
        JOIN sys.types t ON c.user_type_id = t.user_type_id
        LEFT JOIN sys.index_columns ic ON c.object_id = ic.object_id 
          AND c.column_id = ic.column_id
          AND ic.index_id = 1 -- Índice clusterizado (PK)
        LEFT JOIN sys.default_constraints dc ON c.default_object_id = dc.object_id
        WHERE c.object_id = OBJECT_ID(@tabela)
        ORDER BY c.column_id
      `, { tabela });

      // 2. Buscar algumas linhas de exemplo
      const exemplo = await query(`
        SELECT TOP 3 * 
        FROM ${tabela}
      `);

      // 3. Buscar constraints e relações
      const relacoes = await query(`
        SELECT 
          fk.name AS NomeFK,
          tp.name AS TabelaPai,
          cp.name AS ColunaPai,
          tr.name AS TabelaReferencia,
          cr.name AS ColunaReferencia
        FROM sys.foreign_keys fk
        JOIN sys.tables tp ON fk.parent_object_id = tp.object_id
        JOIN sys.tables tr ON fk.referenced_object_id = tr.object_id
        JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
        JOIN sys.columns cp ON fkc.parent_object_id = cp.object_id 
          AND fkc.parent_column_id = cp.column_id
        JOIN sys.columns cr ON fkc.referenced_object_id = cr.object_id 
          AND fkc.referenced_column_id = cr.column_id
        WHERE tp.name = @tabela OR tr.name = @tabela
      `, { tabela });

      res.json({
        success: true,
        tabela: tabela,
        estrutura: estrutura.recordset,
        exemplo: exemplo.recordset,
        relacoes: relacoes.recordset,
        totalColunas: estrutura.recordset.length
      });

    } catch (error) {
      logger.error('❌ Erro no debug tabela:', error.message);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * BUSCA INFORMAÇÕES DE UM USUÁRIO POR CPF
   * ⚠️ APENAS PARA DESENVOLVIMENTO E DEBUG ⚠️
   * Não usar em produção sem autenticação adequada
   */
  async buscarUsuario(req, res) {
    try {
      const { cpf } = req.params;
      const cpfNumeros = cpf.replace(/\D/g, '');
      const cpfFormatado = formatarCPF(cpfNumeros);

      logger.debug(`🔍 Busca de usuário solicitada - CPF: ${cpfFormatado}`);

      const result = await query(`
        SELECT 
          ID,
          UserID,
          UserName,
          IsActive
        FROM LoginUsers 
        WHERE UserID = @cpfFormatado
          OR REPLACE(REPLACE(REPLACE(UserID, '.', ''), '-', ''), '/', '') = @cpfNumeros
      `, { cpfFormatado, cpfNumeros });

      if (result.recordset.length > 0) {
        const usuario = result.recordset[0];
        
        logger.info(`✅ Usuário encontrado: ${usuario.UserName}`);
        
        res.json({
          success: true,
          encontrado: true,
          usuario: {
            id: usuario.ID,
            cpf: usuario.UserID,
            nome: usuario.UserName,
            ativo: usuario.IsActive === 'X'
          }
        });
      } else {
        logger.info(`ℹ️ Usuário não encontrado: ${cpfFormatado}`);
        res.json({
          success: true,
          encontrado: false,
          mensagem: 'Usuário não encontrado'
        });
      }
    } catch (error) {
      logger.error('❌ Erro ao buscar usuário:', error.message);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
}

module.exports = new AuthController();