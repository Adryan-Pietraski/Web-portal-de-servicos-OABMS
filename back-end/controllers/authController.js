const { query, comparePasswords } = require('../config/database');
const jwt = require('jsonwebtoken');

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
  /**
   * REALIZA LOGIN DE USUÁRIO
   * @param {Object} req - Request do Express
   * @param {Object} res - Response do Express
   */
  async login(req, res) {
    const startTime = Date.now();
    const clientIP = req.ip || req.connection.remoteAddress;
    
    console.log(`🔍 [LOGIN INICIADO] IP: ${clientIP} - ${new Date().toISOString()}`);
    
    try {
      const { cpfCnpj, password } = req.body;
      
      console.log('📋 [LOGIN DADOS]', {
        cpf: cpfCnpj ? cpfCnpj.replace(/\d(?=\d{4})/g, '*') : 'vazio', // Mascara parte do CPF
        passwordPresent: !!password,
        passwordLength: password ? password.length : 0
      });

      // VALIDAÇÃO DOS DADOS DE ENTRADA
      if (!cpfCnpj || !password) {
        console.log('❌ [LOGIN ERRO] Dados incompletos');
        return res.status(400).json({
          success: false,
          error: 'CPF e senha são obrigatórios'
        });
      }

      // LIMPAR E VALIDAR CPF
      const cpfNumeros = cpfCnpj.replace(/\D/g, '');
      
      if (!validarCPF(cpfNumeros)) {
        console.log(`❌ [LOGIN ERRO] CPF inválido: ${cpfCnpj}`);
        return res.status(400).json({
          success: false,
          error: 'CPF inválido'
        });
      }

      const cpfFormatado = formatarCPF(cpfNumeros);
      console.log(`🔍 [LOGIN BUSCA] Buscando usuário: ${cpfFormatado}`);

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

      console.log(`📊 [LOGIN RESULTADO] Usuários encontrados: ${result.recordset.length}`);

      if (result.recordset.length === 0) {
        console.log(`❌ [LOGIN ERRO] Usuário não encontrado: ${cpfFormatado}`);
        return res.status(401).json({
          success: false,
          error: 'Credenciais inválidas'
        });
      }

      const usuario = result.recordset[0];
      console.log('👤 [LOGIN USUÁRIO]', {
        id: usuario.ID,
        nome: usuario.UserName,
        status: usuario.IsActive,
        ultimoLogin: usuario.LastLogin
      });

      // VERIFICAR STATUS DO USUÁRIO
      // Sistema legado: 'X' = ativo, '.' = inativo
      console.log(`🔍 [LOGIN STATUS] Verificando status: ${usuario.IsActive}`);
      
      if (usuario.IsActive === '.') {
        console.log(`❌ [LOGIN ERRO] Usuário inativo: ${usuario.UserName}`);
        return res.status(401).json({
          success: false,
          error: 'Usuário inativo. Entre em contato com o administrador.'
        });
      }

      if (usuario.IsActive !== 'X') {
        console.log(`⚠️ [LOGIN ERRO] Status inválido: "${usuario.IsActive}"`);
        return res.status(401).json({
          success: false,
          error: 'Status do usuário inválido. Entre em contato com o administrador.'
        });
      }

      console.log('✅ [LOGIN STATUS] Usuário ativo');

      // VERIFICAR SENHA
      const senhaBanco = usuario.Password ? usuario.Password.trim() : '';
      
      if (!senhaBanco) {
        console.log(`❌ [LOGIN ERRO] Senha vazia no banco para usuário: ${usuario.ID}`);
        return res.status(401).json({
          success: false,
          error: 'Credenciais inválidas'
        });
      }

      const senhaValida = comparePasswords(password, senhaBanco);
      
      if (!senhaValida) {
        console.log(`❌ [LOGIN ERRO] Senha inválida para usuário: ${usuario.ID}`);
        return res.status(401).json({
          success: false,
          error: 'Credenciais inválidas'
        });
      }

      console.log('✅ [LOGIN SENHA] Senha validada com sucesso');

      // ATUALIZAR ÚLTIMO LOGIN (não bloqueante)
      try {
        await query(
          `UPDATE LoginUsers SET LastLogin = GETDATE() WHERE ID = @id`,
          { id: usuario.ID }
        );
        console.log(`📅 [LOGIN] Último login atualizado para usuário: ${usuario.ID}`);
      } catch (error) {
        console.warn(`⚠️ [LOGIN AVISO] Não foi possível atualizar último login: ${error.message}`);
        // Não falha o login se não conseguir atualizar
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
      
      console.log(`🔑 [LOGIN TOKEN] Token gerado para: ${usuario.UserName}`);

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

      console.log(`✅ [LOGIN CONCLUÍDO] Sucesso em ${executionTime}ms para: ${usuario.UserName}`);
      
      res.json(response);

    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error('🔥 [LOGIN ERRO CRÍTICO]', {
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
      console.log(`🔒 [TOKEN VERIFY] Token verificado para: ${req.user.nome}`);
      
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
      console.error('❌ [TOKEN ERRO]', error.message);
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
      console.log(`👤 [PROFILE] Solicitado por: ${req.user.nome}`);
      
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
        console.log(`❌ [PROFILE ERRO] Usuário não encontrado: ${req.userId}`);
        return res.status(404).json({
          success: false,
          error: 'Usuário não encontrado'
        });
      }

      const usuario = result.recordset[0];
      
      console.log(`✅ [PROFILE] Dados retornados para: ${usuario.UserName}`);

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
      console.error('❌ [PROFILE ERRO]', error.message);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * REALIZA LOGOUT (APENAS SIMBÓLICO - TOKEN É STATELESS)
   * Em sistemas JWT, o logout é feito no frontend removendo o token
   */
  async logout(req, res) {
    try {
      console.log(`🚪 [LOGOUT] Usuário deslogado: ${req.user.nome}`);
      
      res.json({
        success: true,
        message: 'Logout realizado com sucesso',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ [LOGOUT ERRO]', error.message);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * VERIFICA SAÚDE DA API E CONEXÃO COM BANCO
   * Rota usada por sistemas de monitoramento
   */
  async healthCheck(req, res) {
    try {
      const result = await query('SELECT 1 as teste, DB_NAME() as banco');
      
      console.log('🏥 [HEALTH CHECK] Sistema saudável');
      
      res.json({
        success: true,
        status: 'online',
        banco: result.recordset[0].banco,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('🚨 [HEALTH CHECK ERRO]', error.message);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * BUSCA INFORMAÇÕES DE UM USUÁRIO POR CPF
   * APENAS PARA DESENVOLVIMENTO E DEBUG
   * @warning Não usar em produção sem autenticação adequada
   */
  async buscarUsuario(req, res) {
    try {
      const { cpf } = req.params;
      const cpfNumeros = cpf.replace(/\D/g, '');
      const cpfFormatado = formatarCPF(cpfNumeros);

      console.log(`🔍 [BUSCA USUÁRIO] CPF solicitado: ${cpfFormatado}`);

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
        
        console.log(`✅ [BUSCA USUÁRIO] Usuário encontrado: ${usuario.UserName}`);
        
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
        console.log(`ℹ️ [BUSCA USUÁRIO] Usuário não encontrado: ${cpfFormatado}`);
        res.json({
          success: true,
          encontrado: false,
          mensagem: 'Usuário não encontrado'
        });
      }
    } catch (error) {
      console.error('❌ [BUSCA USUÁRIO ERRO]', error.message);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
}

module.exports = new AuthController();