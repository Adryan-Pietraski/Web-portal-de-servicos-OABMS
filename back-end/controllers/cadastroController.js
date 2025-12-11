const { query, crc32 } = require('../config/database');
const logger = require('../config/logger');

/**
 * CONTROLLER PARA CADASTRO DE NOVOS USUÁRIOS
 * Baseado na estrutura real das tabelas Pessoa e LoginUsers
 */
class CadastroController {
  /**
   * DEBUG: VERIFICAR ESTRUTURA DA TABELA
   */
  async debugTabela(req, res) {
    try {
      const { tabela } = req.params;
      logger.debug(`🔍 Debug tabela: ${tabela}`);

      // Verificar estrutura da tabela
      const estrutura = await query(`
        SELECT 
          COLUMN_NAME,
          DATA_TYPE,
          IS_NULLABLE,
          COLUMN_DEFAULT,
          CHARACTER_MAXIMUM_LENGTH
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = @tabela
        ORDER BY ORDINAL_POSITION
      `, { tabela });

      // Verificar constraints
      const constraints = await query(`
        SELECT 
          tc.CONSTRAINT_NAME,
          tc.CONSTRAINT_TYPE,
          kcu.COLUMN_NAME,
          kcu.ORDINAL_POSITION
        FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
        JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
          ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
        WHERE tc.TABLE_NAME = @tabela
        ORDER BY tc.CONSTRAINT_TYPE, kcu.ORDINAL_POSITION
      `, { tabela });

      // Verificar chaves estrangeiras
      const foreignKeys = await query(`
        SELECT 
          fk.name as FK_NAME,
          tp.name as PARENT_TABLE,
          cp.name as PARENT_COLUMN,
          tr.name as REFERENCED_TABLE,
          cr.name as REFERENCED_COLUMN
        FROM sys.foreign_keys fk
        INNER JOIN sys.foreign_key_columns fkc ON fkc.constraint_object_id = fk.object_id
        INNER JOIN sys.tables tp ON fkc.parent_object_id = tp.object_id
        INNER JOIN sys.columns cp ON fkc.parent_object_id = cp.object_id AND fkc.parent_column_id = cp.column_id
        INNER JOIN sys.tables tr ON fkc.referenced_object_id = tr.object_id
        INNER JOIN sys.columns cr ON fkc.referenced_object_id = cr.object_id AND fkc.referenced_column_id = cr.column_id
        WHERE tp.name = @tabela OR tr.name = @tabela
      `, { tabela });

      res.json({
        success: true,
        tabela: tabela,
        estrutura: estrutura.recordset,
        constraints: constraints.recordset,
        foreignKeys: foreignKeys.recordset
      });

    } catch (error) {
      logger.error(`❌ Erro ao debug tabela: ${error.message}`);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * BUSCA DADOS DE CEP (corrigida para estrutura real)
   */
  async buscarCEP(req, res) {
    try {
      const { cep } = req.params;
      logger.debug(`📮 Buscando CEP: ${cep}`);

      // Remover hífen e espaços
      const cepNumeros = cep.replace(/\D/g, '');

      // Buscar na tabela CEP - usar a coluna CEPP (sem hífen) ou CEP (com hífen)
      const result = await query(`
        SELECT TOP 1 
          ID,
          CEP,
          CEPP,
          Logradouro,
          Bairro,
          Cidade as Municipio,
          Estado,
          Pais,
          MunicipioLookup,
          EstadoLookup
        FROM CEP 
        WHERE CEPP = @cepNumeros 
           OR REPLACE(CEP, '-', '') = @cepNumeros
           OR CEP = @cepNumeros
      `, { cepNumeros });

      if (result.recordset.length === 0) {
        logger.info(`ℹ️ CEP não encontrado: ${cep}`);
        return res.json({
          success: true,
          encontrado: false,
          message: 'CEP não encontrado'
        });
      }

      const dadosCEP = result.recordset[0];
      logger.debug(`✅ CEP encontrado: ${dadosCEP.Logradouro}, ${dadosCEP.Cidade}`);

      // Buscar nome do município pelo ID se tiver MunicipioLookup
      let nomeMunicipio = dadosCEP.Municipio;
      if (dadosCEP.MunicipioLookup) {
        try {
          const municipioResult = await query(`
      SELECT Descricao FROM Municipio WHERE ID = @municipioId
    `, { municipioId: dadosCEP.MunicipioLookup });

          if (municipioResult.recordset.length > 0) {
            nomeMunicipio = municipioResult.recordset[0].Descricao; // <-- Aqui é Descricao, não Nome
          }
        } catch (error) {
          logger.debug(`ℹ️ Não foi possível buscar nome do município: ${error.message}`);
        }
      }

      res.json({
        success: true,
        encontrado: true,
        endereco: {
          id: dadosCEP.ID,
          cep: dadosCEP.CEP || dadosCEP.CEPP,
          cepFormatado: dadosCEP.CEP,
          cepNumerico: dadosCEP.CEPP,
          logradouro: dadosCEP.Logradouro,
          bairro: dadosCEP.Bairro,
          municipio: nomeMunicipio,
          municipioId: dadosCEP.MunicipioLookup,
          estado: dadosCEP.Estado,
          estadoId: dadosCEP.EstadoLookup,
          paisId: dadosCEP.Pais,
          pais: 'Brasil' // Assumindo Brasil
        }
      });

    } catch (error) {
      logger.error(`❌ Erro ao buscar CEP: ${error.message}`);
      res.status(500).json({
        success: false,
        error: 'Erro ao buscar CEP',
        detalhes: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * LISTA MUNICÍPIOS (versão corrigida com logs)
   */
  async listarMunicipios(req, res) {
    try {
      const { estado } = req.query;
      logger.debug(`🏙️ Buscando municípios para estado: ${estado || 'todos'}`);

      // Verificar se temos parâmetro estado
      if (estado) {
        logger.debug(`🔍 Filtrando por estado: ${estado}`);

        // Primeiro, verificar se é sigla (ex: "MS") ou ID
        let estadoId = null;
        let estadoSigla = null;

        if (estado.length === 2) {
          // Provavelmente é uma sigla
          estadoSigla = estado.toUpperCase();
          logger.debug(`🔍 Buscando ID do estado com sigla: ${estadoSigla}`);

          try {
            const estadoResult = await query(`
              SELECT TOP 1 ID, Sigla, Descricao 
              FROM Estado 
              WHERE Sigla = @sigla
            `, { sigla: estadoSigla });

            if (estadoResult.recordset.length > 0) {
              estadoId = estadoResult.recordset[0].ID;
              logger.debug(`✅ Estado encontrado: ${estadoResult.recordset[0].Descricao} (ID: ${estadoId})`);
            } else {
              logger.warn(`⚠️ Estado não encontrado com sigla: ${estadoSigla}`);
              return res.json({
                success: true,
                municipios: [],
                total: 0,
                mensagem: `Estado ${estadoSigla} não encontrado`
              });
            }
          } catch (error) {
            logger.error(`❌ Erro ao buscar estado: ${error.message}`);
            // Continuar sem filtro
          }
        } else if (!isNaN(estado)) {
          // É um ID numérico
          estadoId = parseInt(estado);
          logger.debug(`🔍 Usando ID do estado: ${estadoId}`);
        }

        if (estadoId) {
          // Buscar municípios com filtro por ID do estado
          const result = await query(`
            SELECT 
              M.ID,
              M.Descricao as Nome,
              M.Estado as EstadoId,
              M.CodigoIBGE,
              E.Sigla as EstadoSigla,
              E.Descricao as EstadoNome
            FROM Municipio M
            LEFT JOIN Estado E ON M.Estado = E.ID
            WHERE M.Estado = @estadoId
            ORDER BY M.Descricao
          `, { estadoId });

          const municipios = result.recordset.map(mun => ({
            id: mun.ID,
            nome: mun.Nome,
            estadoId: mun.EstadoId,
            estado: mun.EstadoSigla,
            estadoNome: mun.EstadoNome,
            codigoIBGE: mun.CodigoIBGE
          }));

          logger.info(`✅ Encontrados ${municipios.length} municípios para estado ID: ${estadoId}`);

          return res.json({
            success: true,
            municipios: municipios,
            total: municipios.length,
            filtro: {
              tipo: 'estado',
              valor: estado,
              estadoId: estadoId
            }
          });
        }
      }

      // Se não tem filtro ou filtro falhou, listar todos
      logger.debug('📋 Listando todos os municípios');

      const result = await query(`
        SELECT 
          M.ID,
          M.Descricao as Nome,
          M.Estado as EstadoId,
          M.CodigoIBGE,
          E.Sigla as EstadoSigla,
          E.Descricao as EstadoNome
        FROM Municipio M
        LEFT JOIN Estado E ON M.Estado = E.ID
        ORDER BY E.Descricao, M.Descricao
      `);

      const municipios = result.recordset.map(mun => ({
        id: mun.ID,
        nome: mun.Nome,
        estadoId: mun.EstadoId,
        estado: mun.EstadoSigla,
        estadoNome: mun.EstadoNome,
        codigoIBGE: mun.CodigoIBGE
      }));

      logger.info(`✅ Encontrados ${municipios.length} municípios no total`);

      // Agrupar por estado para estatísticas
      const porEstado = {};
      municipios.forEach(mun => {
        if (mun.estado) {
          if (!porEstado[mun.estado]) {
            porEstado[mun.estado] = {
              nome: mun.estadoNome,
              quantidade: 0
            };
          }
          porEstado[mun.estado].quantidade++;
        }
      });

      res.json({
        success: true,
        municipios: municipios,
        total: municipios.length,
        estatisticas: {
          porEstado: porEstado,
          totalEstados: Object.keys(porEstado).length
        }
      });

    } catch (error) {
      logger.error(`❌ Erro ao listar municípios: ${error.message}`, {
        stack: error.stack,
        query: req.query
      });

      res.status(500).json({
        success: false,
        error: `Erro ao listar municípios: ${error.message}`
      });
    }
  }

  /**
   * VERIFICA SE CPF JÁ EXISTE
   */
  async verificarCPF(req, res) {
    try {
      const { cpf } = req.params;
      logger.debug(`🔍 Verificando CPF: ${cpf}`);

      const cpfNumeros = cpf.replace(/\D/g, '');

      const result = await query(`
        SELECT TOP 1 ID, Nome 
        FROM Pessoa 
        WHERE CPFCNPJ = @cpfNumeros
      `, { cpfNumeros });

      const existe = result.recordset.length > 0;

      if (existe) {
        const pessoa = result.recordset[0];
        logger.warn(`⚠️ CPF já cadastrado: ${cpfNumeros} - Nome: ${pessoa.Nome}`);
      }

      res.json({
        success: true,
        cpf: cpf,
        existe: existe,
        pessoa: existe ? {
          id: result.recordset[0].ID,
          nome: result.recordset[0].Nome
        } : null
      });

    } catch (error) {
      logger.error(`❌ Erro ao verificar CPF: ${error.message}`);
      res.status(500).json({
        success: false,
        error: 'Erro ao verificar CPF'
      });
    }
  }

  /**
   * VERIFICA SE USERNAME JÁ EXISTE
   */
  async verificarUsername(req, res) {
    try {
      const { username } = req.params;
      logger.debug(`👤 Verificando username: ${username}`);

      const result = await query(`
        SELECT TOP 1 ID, UserName 
        FROM LoginUsers 
        WHERE UserName = @username
      `, { username });

      const existe = result.recordset.length > 0;

      if (existe) {
        logger.warn(`⚠️ Username já existe: ${username}`);
      }

      res.json({
        success: true,
        username: username,
        existe: existe
      });

    } catch (error) {
      logger.error(`❌ Erro ao verificar username: ${error.message}`);
      res.status(500).json({
        success: false,
        error: 'Erro ao verificar username'
      });
    }
  }

  /**
   * CADASTRO COMPLETO (Pessoa + Usuário)
   * Baseado na estrutura real das tabelas
   */
  async cadastroCompleto(req, res) {
    const startTime = Date.now();

    try {
      const dados = req.body;
      const criadoPor = req.userId || 1; // Se não tiver usuário autenticado, usa 1 (admin)

      logger.info('🎯 Iniciando cadastro completo');

      logger.debug('📋 Dados recebidos:', {
        nome: dados.nome,
        cpf: dados.cpf ? dados.cpf.replace(/\d(?=\d{4})/g, '*') : 'não informado',
        username: dados.username,
        email: dados.emailResidencial
      });

      // VALIDAÇÕES BÁSICAS
      const camposObrigatorios = ['nome', 'cpf', 'username', 'password'];
      const camposFaltando = camposObrigatorios.filter(campo => !dados[campo]);

      if (camposFaltando.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Campos obrigatórios faltando: ${camposFaltando.join(', ')}`
        });
      }

      // VALIDAR CPF
      const cpfNumeros = dados.cpf.replace(/\D/g, '');
      if (cpfNumeros.length !== 11) {
        return res.status(400).json({
          success: false,
          error: 'CPF inválido. Deve conter 11 dígitos.'
        });
      }

      // VERIFICAR SE CPF JÁ EXISTE
      const cpfExiste = await query(`
        SELECT TOP 1 ID FROM Pessoa WHERE CPFCNPJ = @cpfNumeros
      `, { cpfNumeros });

      if (cpfExiste.recordset.length > 0) {
        return res.status(409).json({
          success: false,
          error: `CPF ${cpfNumeros} já está cadastrado no sistema.`
        });
      }

      // VERIFICAR SE USERNAME JÁ EXISTE
      const usernameExiste = await query(`
        SELECT TOP 1 ID FROM LoginUsers WHERE UserName = @username
      `, { username: dados.username });

      if (usernameExiste.recordset.length > 0) {
        return res.status(409).json({
          success: false,
          error: `Username "${dados.username}" já está em uso. Escolha outro.`
        });
      }

      // 1. CADASTRAR PESSOA
      logger.debug('👤 Inserindo pessoa na tabela Pessoa...');

      const queryPessoa = `
        INSERT INTO Pessoa (
          Nome,
          TipoPessoa,
          NomeSocial,
          CPFCNPJ,
          Sexo,
          EstadoCivil,
          DataNascimentoFundacao,
          NomeMae,
          NomePai,
          Municipio,
          
          -- Endereço Residencial
          CEPResidencial,
          PaisResidencial,
          EstadoResidencial,
          MunicipioResidencial,
          BairroResidencial,
          NumeroResidencial,
          LogradouroResidencial,
          ComplementoResidencial,
          EmailResidencial,
          TelefoneCelular,
          TelefoneResidencial,
          CorrespondenciaResidencial,
          
          -- Endereço Comercial (opcional)
          CEPComercial,
          PaisComercial,
          EstadoComercial,
          MunicipioComercial,
          BairroComercial,
          NumeroComercial,
          LogradouroComercial,
          ComplementoComercial,
          EmailComercial,
          Telefone2Comercial,
          TelefoneComercial,
          CorrespondenciaComercial,
          
          -- Dados do sistema
          CreatedBy,
          CreatedOn,
          Ativo
        ) VALUES (
          @nome,
          @tipoPessoa,
          @nomeSocial,
          @cpfCnpj,
          @sexo,
          @estadoCivil,
          @dataNascimento,
          @nomeMae,
          @nomePai,
          @municipio,
          
          @cepResidencial,
          @paisResidencial,
          @estadoResidencial,
          @municipioResidencial,
          @bairroResidencial,
          @numeroResidencial,
          @logradouroResidencial,
          @complementoResidencial,
          @emailResidencial,
          @telefoneCelular,
          @telefoneResidencial,
          @correspondenciaResidencial,
          
          @cepComercial,
          @paisComercial,
          @estadoComercial,
          @municipioComercial,
          @bairroComercial,
          @numeroComercial,
          @logradouroComercial,
          @complementoComercial,
          @emailComercial,
          @telefone2Comercial,
          @telefoneComercial,
          @correspondenciaComercial,
          
          @criadoPor,
          GETDATE(),
          'S'
        );
        
        SELECT SCOPE_IDENTITY() as novaPessoaId;
      `;

      // Preparar parâmetros para Pessoa
      const pessoaParams = {
        nome: dados.nome,
        tipoPessoa: dados.tipoPessoa || 'F',
        nomeSocial: dados.nomeSocial || null,
        cpfCnpj: cpfNumeros,
        sexo: dados.sexo || 'N',
        estadoCivil: dados.estadoCivil || 8,
        dataNascimento: dados.dataNascimento || null,
        nomeMae: dados.nomeMae || null,
        nomePai: dados.nomePai || null,
        municipio: dados.municipio || null,

        // Endereço Residencial
        cepResidencial: dados.cepResidencial ? parseInt(dados.cepResidencial.replace(/\D/g, '')) : null,
        paisResidencial: dados.paisResidencial || 1, // 1 = Brasil (assumindo)
        estadoResidencial: dados.estadoResidencial || null,
        municipioResidencial: dados.municipioResidencial || null,
        bairroResidencial: dados.bairroResidencial || null,
        numeroResidencial: dados.numeroResidencial || null,
        logradouroResidencial: dados.logradouroResidencial || null,
        complementoResidencial: dados.complementoResidencial || null,
        emailResidencial: dados.emailResidencial || null,
        telefoneCelular: dados.telefoneCelular ? dados.telefoneCelular.replace(/\D/g, '') : null,
        telefoneResidencial: dados.telefoneResidencial ? dados.telefoneResidencial.replace(/\D/g, '') : null,
        correspondenciaResidencial: dados.correspondenciaResidencial || 'S',

        // Endereço Comercial
        cepComercial: dados.cepComercial ? parseInt(dados.cepComercial.replace(/\D/g, '')) : null,
        paisComercial: dados.paisComercial || 1,
        estadoComercial: dados.estadoComercial || null,
        municipioComercial: dados.municipioComercial || null,
        bairroComercial: dados.bairroComercial || null,
        numeroComercial: dados.numeroComercial || null,
        logradouroComercial: dados.logradouroComercial || null,
        complementoComercial: dados.complementoComercial || null,
        emailComercial: dados.emailComercial || null,
        telefone2Comercial: dados.telefone2Comercial ? dados.telefone2Comercial.replace(/\D/g, '') : null,
        telefoneComercial: dados.telefoneComercial ? dados.telefoneComercial.replace(/\D/g, '') : null,
        correspondenciaComercial: dados.correspondenciaComercial || 'N',

        criadoPor: criadoPor
      };

      const resultPessoa = await query(queryPessoa, pessoaParams);
      const pessoaId = resultPessoa.recordset[0].novaPessoaId;

      logger.info(`✅ Pessoa cadastrada com sucesso! ID: ${pessoaId}`);

      // 2. CADASTRAR USUÁRIO (LoginUsers)
      logger.debug('👤 Inserindo usuário na tabela LoginUsers...');

      // Calcular hash da senha usando CRC32 (mesmo algoritmo do login)
      const senhaHash = crc32(dados.password).toString(16).toUpperCase();

      // Formatar CPF para o padrão XXX.XXX.XXX-XX
      const cpfFormatado = cpfNumeros.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');

      const queryUsuario = `
        INSERT INTO LoginUsers (
          UserName,
          UserID,
          Password,
          IsActive,
          PassNeverExpires,
          CreatedBy,
          CreatedOn,
          PasswordUpdatedOn,
          Pessoa
        ) VALUES (
          @userName,
          @userID,
          @password,
          @isActive,
          @passNeverExpires,
          @createdBy,
          GETDATE(),
          GETDATE(),
          @pessoa
        );
        
        SELECT SCOPE_IDENTITY() as novoUsuarioId;
      `;

      const usuarioParams = {
        userName: dados.username,
        userID: cpfFormatado,
        password: senhaHash,
        isActive: 'X', // Usuário ativo
        passNeverExpires: 1, // Senha nunca expira
        createdBy: criadoPor,
        pessoa: pessoaId
      };

      const resultUsuario = await query(queryUsuario, usuarioParams);
      const usuarioId = resultUsuario.recordset[0].novoUsuarioId;

      // 3. ATUALIZAR PESSOA COM O ID DO USUÁRIO
      await query(`
        UPDATE Pessoa SET LoginUsers = @usuarioId WHERE ID = @pessoaId
      `, { usuarioId, pessoaId });

      const executionTime = Date.now() - startTime;

      logger.info(`✅ Usuário cadastrado com sucesso! ID: ${usuarioId}`);
      logger.info(`✅ Cadastro completo realizado em ${executionTime}ms`);

      res.json({
        success: true,
        message: 'Cadastro completo realizado com sucesso!',
        dados: {
          pessoaId: pessoaId,
          usuarioId: usuarioId,
          cpf: cpfFormatado,
          username: dados.username,
          nome: dados.nome
        },
        tempoExecucao: `${executionTime}ms`,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('❌ Erro no cadastro completo:', {
        mensagem: error.message,
        stack: error.stack,
        dados: req.body
      });

      // Se for erro de constraint (CPF duplicado, etc)
      if (error.message.includes('violation') || error.message.includes('constraint')) {
        return res.status(409).json({
          success: false,
          error: 'Dados duplicados ou inválidos. Verifique se o CPF ou username já estão cadastrados.'
        });
      }

      res.status(500).json({
        success: false,
        error: 'Erro interno ao realizar cadastro.',
        detalhes: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
 * CADASTRO SIMPLIFICADO - VERSÃO COM CORREÇÃO DE CONTEXTO
 */
  async cadastroSimples(req, res) {
    const startTime = Date.now();

    try {
      const dados = req.body;
      logger.info('🎯 Iniciando cadastro simplificado');

      // VALIDAÇÕES BÁSICAS
      if (!dados.nome || !dados.cpf || !dados.username || !dados.password) {
        return res.status(400).json({
          success: false,
          error: 'Nome, CPF, username e senha são obrigatórios'
        });
      }

      const cpfNumeros = dados.cpf.replace(/\D/g, '');
      const cpfFormatado = cpfNumeros.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
      const senhaHash = crc32(dados.password).toString(16).toUpperCase();

      // VERIFICAÇÕES DE DUPLICIDADE
      const cpfExiste = await query(`
      SELECT TOP 1 ID FROM Pessoa WHERE CPFCNPJ = @cpfNumeros
    `, { cpfNumeros });

      if (cpfExiste.recordset.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'CPF já cadastrado no sistema'
        });
      }

      const usernameExiste = await query(`
      SELECT TOP 1 UserID FROM LoginUsers WHERE UserName = @username
    `, { username: dados.username });

      if (usernameExiste.recordset.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'Username já está em uso. Escolha outro.'
        });
      }

      // 1. BUSCAR PRÓXIMOS IDs DISPONÍVEIS - USANDO FUNÇÃO SEPARADA
      const buscarId = async (tabela) => {
        try {
          // PRIMEIRO: Buscar o ID do último registro criado (pela data CreatedOn)
          const ultimoPorDataResult = await query(`
          SELECT TOP 1 ID, CreatedOn
          FROM ${tabela}
          WHERE TRY_CAST(ID AS INT) IS NOT NULL
            AND CreatedOn IS NOT NULL
          ORDER BY CreatedOn DESC
        `);

          let proximoId;

          // SE ENCONTRAR O ÚLTIMO PELA DATA
          if (ultimoPorDataResult.recordset.length > 0) {
            const ultimoIdPorData = parseInt(ultimoPorDataResult.recordset[0].ID) || 0;
            const ultimaData = ultimoPorDataResult.recordset[0].CreatedOn;

            // Calcular próximo ID baseado no último pela data
            proximoId = (ultimoIdPorData + 1).toString();

            logger.info(`📅 ${tabela}: Último cadastro por data - ID: ${ultimoIdPorData}, Data: ${ultimaData}`);
            logger.info(`🔢 ${tabela}: Próximo ID baseado no último cadastro = ${proximoId}`);

            // VERIFICAR se esse ID já existe
            const idExisteResult = await query(`
            SELECT 1 FROM ${tabela} WHERE ID = @proximoId
          `, { proximoId });

            // Se o ID já existir, buscar o maior ID
            if (idExisteResult.recordset.length > 0) {
              logger.warn(`⚠️ ${tabela}: ID ${proximoId} já existe! Buscando maior ID...`);

              const maiorIdResult = await query(`
              SELECT MAX(TRY_CAST(ID AS INT)) as maiorId
              FROM ${tabela}
              WHERE TRY_CAST(ID AS INT) IS NOT NULL
            `);

              const maiorId = maiorIdResult.recordset[0].maiorId || ultimoIdPorData;
              proximoId = (maiorId + 1).toString();

              logger.info(`🔄 ${tabela}: Corrigido - Maior ID = ${maiorId}, Novo próximo ID = ${proximoId}`);
            }
          }
          // SE NÃO ENCONTRAR PELA DATA, BUSCAR O MAIOR ID
          else {
            logger.info(`ℹ️ ${tabela}: Nenhum registro com data encontrado, usando método tradicional...`);

            const maiorIdResult = await query(`
            SELECT MAX(TRY_CAST(ID AS INT)) as maiorId
            FROM ${tabela}
            WHERE TRY_CAST(ID AS INT) IS NOT NULL
          `);

            const maiorId = maiorIdResult.recordset[0].maiorId || 0;
            proximoId = (maiorId + 1).toString();

            logger.info(`🔢 ${tabela}: Maior ID = ${maiorId}, Próximo ID = ${proximoId}`);
          }

          // VERIFICAÇÃO FINAL: Garantir que não estamos usando ID 1 se ele já existir
          if (proximoId === "1") {
            const id1Existe = await query(`
            SELECT 1 FROM ${tabela} WHERE ID = '1'
          `);

            if (id1Existe.recordset.length > 0) {
              logger.warn(`⚠️ ${tabela}: ID 1 já existe! Ajustando...`);

              const maiorIdResult = await query(`
              SELECT MAX(TRY_CAST(ID AS INT)) as maiorId
              FROM ${tabela}
              WHERE ID != '1' AND TRY_CAST(ID AS INT) IS NOT NULL
            `);

              const maiorId = maiorIdResult.recordset[0].maiorId || 1;
              proximoId = (maiorId + 1).toString();

              logger.info(`🔄 ${tabela}: Ajustado - Novo próximo ID = ${proximoId}`);
            }
          }

          logger.info(`✅ ${tabela}: Próximo ID final = ${proximoId}`);
          return proximoId;

        } catch (error) {
          logger.error(`❌ Erro ao buscar próximo ID para ${tabela}: ${error.message}`);
          return "1"; // Fallback
        }
      };

      // Buscar IDs para ambas as tabelas
      const [loginId, pessoaId] = await Promise.all([
        buscarId('LoginUsers'),
        buscarId('Pessoa')
      ]);

      logger.info(`🆔 IDs calculados: Pessoa=${pessoaId}, LoginUsers=${loginId}`);

      // 2. CRIAR LOGINUSERS
      await query(`
      INSERT INTO LoginUsers (
        ID,
        UserID,
        UserName,
        Password,
        IsActive,
        PassNeverExpires,
        CreatedBy,
        CreatedOn,
        PasswordUpdatedOn
      ) VALUES (
        @id,
        @userID,
        @userName,
        @password,
        'X',
        1,
        '1',
        GETDATE(),
        GETDATE()
      )
    `, {
        id: loginId,
        userID: cpfFormatado,
        userName: dados.username,
        password: senhaHash
      });

      logger.info(`✅ LoginUsers criado: ID=${loginId}`);

      // 3. CRIAR PESSOA
      await query(`
      INSERT INTO Pessoa (
        ID,
        Nome,
        TipoPessoa,
        CPFCNPJ,
        Sexo,
        CreatedBy,
        CreatedOn,
        Ativo,
        LoginUsers
      ) VALUES (
        @id,
        @nome,
        'F',
        @cpf,
        @sexo,
        @createdBy,
        GETDATE(),
        'S',
        @loginUsers
      )
    `, {
        id: pessoaId,
        nome: dados.nome,
        cpf: cpfNumeros,
        sexo: dados.sexo || 'N',
        createdBy: loginId,
        loginUsers: loginId
      });

      logger.info(`✅ Pessoa criada: ID=${pessoaId}`);

      const executionTime = Date.now() - startTime;

      logger.info(`🎉 Cadastro concluído em ${executionTime}ms`);

      res.json({
        success: true,
        message: 'Cadastro realizado com sucesso!',
        dados: {
          pessoaId: pessoaId,
          loginUsersId: loginId,
          userID: cpfFormatado,
          username: dados.username,
          nome: dados.nome
        },
        tempoExecucao: `${executionTime}ms`,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      const executionTime = Date.now() - startTime;

      logger.error('❌ Erro no cadastro simplificado:', {
        mensagem: error.message,
        stack: error.stack,
        tempo: `${executionTime}ms`
      });

      res.status(500).json({
        success: false,
        error: 'Erro ao realizar cadastro',
        detalhes: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
 * CADASTRO COM ID MANUAL - VERSÃO SIMPLIFICADA (SEM COLUNA PESSOA)
 */
  async cadastroComIdManual(req, res) {
    const startTime = Date.now();

    try {
      const dados = req.body;

      // VALIDAÇÕES
      if (!dados.nome || !dados.cpf || !dados.username || !dados.password) {
        return res.status(400).json({
          success: false,
          error: 'Nome, CPF, username e senha são obrigatórios'
        });
      }

      // IDs MANUAIS
      const pessoaIdManual = dados.pessoaId;
      const loginIdManual = dados.loginId;

      const cpfNumeros = dados.cpf.replace(/\D/g, '');
      const cpfFormatado = cpfNumeros.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
      const senhaHash = crc32(dados.password).toString(16).toUpperCase();

      // VERIFICAÇÕES DE DUPLICIDADE
      const cpfExiste = await query(`
      SELECT TOP 1 ID FROM Pessoa WHERE CPFCNPJ = @cpfNumeros
    `, { cpfNumeros });

      if (cpfExiste.recordset.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'CPF já cadastrado no sistema'
        });
      }

      const usernameExiste = await query(`
      SELECT TOP 1 UserID FROM LoginUsers WHERE UserName = @username
    `, { username: dados.username });

      if (usernameExiste.recordset.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'Username já está em uso. Escolha outro.'
        });
      }

      // VERIFICAR SE IDs JÁ EXISTEM
      let loginId = loginIdManual;
      if (loginIdManual) {
        const idExiste = await query(`
        SELECT 1 FROM LoginUsers WHERE ID = @id
      `, { id: loginIdManual });

        if (idExiste.recordset.length > 0) {
          return res.status(409).json({
            success: false,
            error: `ID ${loginIdManual} já existe na tabela LoginUsers`
          });
        }
      } else {
        loginId = await this.buscarProximoIdNumericoCorreto('LoginUsers');
      }

      let pessoaId = pessoaIdManual;
      if (pessoaIdManual) {
        const idExiste = await query(`
        SELECT 1 FROM Pessoa WHERE ID = @id
      `, { id: pessoaIdManual });

        if (idExiste.recordset.length > 0) {
          return res.status(409).json({
            success: false,
            error: `ID ${pessoaIdManual} já existe na tabela Pessoa`
          });
        }
      } else {
        pessoaId = await this.buscarProximoIdNumericoCorreto('Pessoa');
      }

      logger.info(`🆔 IDs definidos: Pessoa=${pessoaId}, LoginUsers=${loginId}`);

      // 1. CRIAR LOGINUSERS (SEM coluna Pessoa)
      await query(`
      INSERT INTO LoginUsers (
        ID,
        UserID,
        UserName,
        Password,
        IsActive,
        PassNeverExpires,
        CreatedBy,
        CreatedOn,
        PasswordUpdatedOn
      ) VALUES (
        @id,
        @userID,
        @userName,
        @password,
        'X',
        1,
        '1',
        GETDATE(),
        GETDATE()
      )
    `, {
        id: loginId,
        userID: cpfFormatado,
        userName: dados.username,
        password: senhaHash
      });

      logger.info(`✅ LoginUsers criado: ID=${loginId}`);

      // 2. CRIAR PESSOA
      await query(`
      INSERT INTO Pessoa (
        ID,
        Nome,
        TipoPessoa,
        CPFCNPJ,
        Sexo,
        CreatedBy,
        CreatedOn,
        Ativo,
        LoginUsers
      ) VALUES (
        @id,
        @nome,
        'F',
        @cpf,
        @sexo,
        @createdBy,
        GETDATE(),
        'S',
        @loginUsers
      )
    `, {
        id: pessoaId,
        nome: dados.nome,
        cpf: cpfNumeros,
        sexo: dados.sexo || 'N',
        createdBy: loginId,
        loginUsers: loginId
      });

      logger.info(`✅ Pessoa criada: ID=${pessoaId}`);

      const executionTime = Date.now() - startTime;

      res.json({
        success: true,
        message: 'Cadastro realizado com sucesso!',
        dados: {
          pessoaId: pessoaId,
          loginUsersId: loginId,
          cpf: cpfFormatado,
          username: dados.username,
          nome: dados.nome
        },
        tempoExecucao: `${executionTime}ms`,
        ids: {
          pessoa: pessoaId,
          loginUsers: loginId,
          origem: pessoaIdManual ? 'manual' : 'auto',
          origemLogin: loginIdManual ? 'manual' : 'auto'
        }
      });

    } catch (error) {
      logger.error('❌ Erro no cadastro com ID manual:', error.message);

      res.status(500).json({
        success: false,
        error: 'Erro ao realizar cadastro',
        detalhes: error.message
      });
    }
  }
  /**
   * MÉTODOS AUXILIARES
   */

  /**
 * BUSCAR PRÓXIMO ID NUMÉRICO CORRETO - COM VERIFICAÇÃO DO ÚLTIMO CADASTRO (CreatedOn)
 * @param {string} tabela - Nome da tabela
 * @param {string} coluna - Nome da coluna ID (padrão: 'ID')
 * @returns {string} - Próximo ID como string
 */
  async buscarProximoIdNumericoCorreto(tabela, coluna = 'ID') {
    try {
      // PRIMEIRO: Buscar o ID do último registro criado (pela data CreatedOn)
      const ultimoPorDataResult = await query(`
      SELECT TOP 1 ${coluna}, CreatedOn
      FROM ${tabela}
      WHERE TRY_CAST(${coluna} AS INT) IS NOT NULL
        AND CreatedOn IS NOT NULL
      ORDER BY CreatedOn DESC
    `);

      let proximoId;

      // SE ENCONTRAR O ÚLTIMO PELA DATA
      if (ultimoPorDataResult.recordset.length > 0) {
        const ultimoIdPorData = parseInt(ultimoPorDataResult.recordset[0][coluna]) || 0;
        const ultimaData = ultimoPorDataResult.recordset[0].CreatedOn;

        // Calcular próximo ID baseado no último pela data
        proximoId = (ultimoIdPorData + 1).toString();

        logger.info(`📅 ${tabela}: Último cadastro por data - ID: ${ultimoIdPorData}, Data: ${ultimaData}`);
        logger.info(`🔢 ${tabela}: Próximo ID baseado no último cadastro = ${proximoId}`);

        // VERIFICAR se esse ID já existe (caso houver registros com IDs maiores mas datas mais antigas)
        const idExisteResult = await query(`
        SELECT 1 FROM ${tabela} WHERE ${coluna} = @proximoId
      `, { proximoId });

        // Se o ID já existir, buscar o maior ID
        if (idExisteResult.recordset.length > 0) {
          logger.warn(`⚠️ ${tabela}: ID ${proximoId} já existe! Buscando maior ID...`);

          const maiorIdResult = await query(`
          SELECT MAX(TRY_CAST(${coluna} AS INT)) as maiorId
          FROM ${tabela}
          WHERE TRY_CAST(${coluna} AS INT) IS NOT NULL
        `);

          const maiorId = maiorIdResult.recordset[0].maiorId || ultimoIdPorData;
          proximoId = (maiorId + 1).toString();

          logger.info(`🔄 ${tabela}: Corrigido - Maior ID = ${maiorId}, Novo próximo ID = ${proximoId}`);
        }
      }
      // SE NÃO ENCONTRAR PELA DATA, BUSCAR O MAIOR ID (método antigo)
      else {
        logger.info(`ℹ️ ${tabela}: Nenhum registro com data encontrado, usando método tradicional...`);

        const maiorIdResult = await query(`
        SELECT MAX(TRY_CAST(${coluna} AS INT)) as maiorId
        FROM ${tabela}
        WHERE TRY_CAST(${coluna} AS INT) IS NOT NULL
      `);

        const maiorId = maiorIdResult.recordset[0].maiorId || 0;
        proximoId = (maiorId + 1).toString();

        logger.info(`🔢 ${tabela}: Maior ID = ${maiorId}, Próximo ID = ${proximoId}`);
      }

      // VERIFICAÇÃO FINAL: Garantir que não estamos usando ID 1 se ele já existir
      if (proximoId === "1") {
        const id1Existe = await query(`
        SELECT 1 FROM ${tabela} WHERE ${coluna} = '1'
      `);

        if (id1Existe.recordset.length > 0) {
          logger.warn(`⚠️ ${tabela}: ID 1 já existe! Ajustando...`);

          const maiorIdResult = await query(`
          SELECT MAX(TRY_CAST(${coluna} AS INT)) as maiorId
          FROM ${tabela}
          WHERE ${coluna} != '1' AND TRY_CAST(${coluna} AS INT) IS NOT NULL
        `);

          const maiorId = maiorIdResult.recordset[0].maiorId || 1;
          proximoId = (maiorId + 1).toString();

          logger.info(`🔄 ${tabela}: Ajustado - Novo próximo ID = ${proximoId}`);
        }
      }

      logger.info(`✅ ${tabela}: Próximo ID final = ${proximoId}`);
      return proximoId;

    } catch (error) {
      logger.error(`❌ Erro em buscarProximoIdNumericoCorreto para ${tabela}: ${error.message}`);

      // Fallback super simples
      try {
        // Tentar método alternativo
        const fallback = await query(`
        SELECT TOP 1 ${coluna}
        FROM ${tabela}
        WHERE TRY_CAST(${coluna} AS INT) IS NOT NULL
        ORDER BY TRY_CAST(${coluna} AS INT) DESC
      `);

        if (fallback.recordset.length === 0) {
          return "1";
        }

        const ultimoId = parseInt(fallback.recordset[0][coluna]) || 0;
        return (ultimoId + 1).toString();

      } catch (fallbackError) {
        logger.error(`❌ Fallback falhou: ${fallbackError.message}`);
        return "1";
      }
    }
  }

  /**
   * BUSCAR PRÓXIMO ID NUMÉRICO (mantido para compatibilidade)
   * @param {string} tabela - Nome da tabela
   * @param {string} coluna - Nome da coluna ID (padrão: 'ID')
   * @returns {string} - Próximo ID como string
   */
  async buscarProximoIdNumerico(tabela, coluna = 'ID') {
    // Chama a versão corrigida
    return await this.buscarProximoIdNumericoCorreto(tabela, coluna);
  }

  // Garantir que existe um usuário sistema para referências
  async garantirUsuarioSistema() {
    try {
      const existe = await query(`
        SELECT TOP 1 ID FROM LoginUsers WHERE ID = '1'
      `);

      if (existe.recordset.length === 0) {
        await query(`
          INSERT INTO LoginUsers (
            ID,
            UserID,
            UserName,
            Password,
            IsActive,
            PassNeverExpires,
            CreatedBy,
            CreatedOn,
            PasswordUpdatedOn
          ) VALUES (
            '1',
            'SISTEMA',
            'sistema',
            '00000000',
            'X',
            1,
            '1',
            GETDATE(),
            GETDATE()
          )
        `);
        logger.debug('✅ Usuário sistema criado (ID: 1)');
      }
    } catch (error) {
      logger.warn(`⚠️ Usuário sistema: ${error.message}`);
    }
  }

  // Criar registro em LoginUsers - VERSÃO CORRIGIDA
  async criarLoginUsers(dados) {
    const { cpfFormatado, username, senhaHash } = dados;

    // Usar o método utilitário para buscar próximo ID
    let loginId = await this.buscarProximoIdNumericoCorreto('LoginUsers', 'ID');

    // Garantir que não seja "1"
    if (loginId === "1") {
      // Verificar se já existe ID 1
      const existeId1 = await query(`
        SELECT 1 FROM LoginUsers WHERE ID = '1'
      `);
      if (existeId1.recordset.length > 0) {
        // Buscar próximo após o 1
        const maxAfter1 = await query(`
          SELECT MAX(TRY_CAST(ID AS INT)) as maxId 
          FROM LoginUsers 
          WHERE ID != '1' AND TRY_CAST(ID AS INT) IS NOT NULL
        `);
        const maxId = maxAfter1.recordset[0].maxId || 1;
        loginId = (maxId + 1).toString();
      }
    }

    // Debug
    logger.debug(`ID calculado para LoginUsers: ${loginId} (tipo: ${typeof loginId})`);

    // Inserir LoginUsers
    await query(`
      INSERT INTO LoginUsers (
        ID,
        UserID,
        UserName,
        Password,
        IsActive,
        PassNeverExpires,
        CreatedBy,
        CreatedOn,
        PasswordUpdatedOn
      ) VALUES (
        @id,
        @userID,
        @userName,
        @password,
        'X',
        1,
        '1',          -- CreatedBy como string (ID 1 é sistema)
        GETDATE(),
        GETDATE()
      )
    `, {
      id: loginId,           // Já é string
      userID: cpfFormatado,
      userName: username,
      password: senhaHash
    });

    logger.info(`✅ LoginUsers criado: ID=${loginId}, UserID=${cpfFormatado}`);
    return loginId;
  }

  // Criar registro em Pessoa - VERSÃO CORRIGIDA
  async criarPessoa(dados) {
    const { nome, cpfNumeros, sexo, loginId } = dados;

    // Usar o método utilitário
    const pessoaId = await this.buscarProximoIdNumericoCorreto('Pessoa', 'ID');

    // Inserir Pessoa - garantir que todos os IDs sejam strings
    await query(`
      INSERT INTO Pessoa (
        ID,
        Nome,
        TipoPessoa,
        CPFCNPJ,
        Sexo,
        CreatedBy,
        CreatedOn,
        Ativo,
        LoginUsers
      ) VALUES (
        @id,
        @nome,
        'F',
        @cpf,
        @sexo,
        @createdBy,    // Já é string
        GETDATE(),
        'S',
        @loginUsers    // Já é string
      )
    `, {
      id: pessoaId,
      nome: nome,
      cpf: cpfNumeros,
      sexo: sexo,
      createdBy: loginId.toString(),    // Converter para string
      loginUsers: loginId.toString()    // Converter para string
    });

    logger.info(`✅ Pessoa criada: ID=${pessoaId}, Nome=${nome}`);
    return pessoaId;
  }

  // Atualizar referência inversa (se existir coluna)
  async atualizarReferenciaLoginUsers(loginId, pessoaId) {
    const colunasTeste = ['EntitiID', 'Pessoa', 'PersonID', 'PessoaID'];

    for (const coluna of colunasTeste) {
      try {
        await query(`
          UPDATE LoginUsers 
          SET ${coluna} = @pessoaId 
          WHERE ID = @loginId
        `, { pessoaId, loginId });

        logger.debug(`✅ LoginUsers.${coluna} atualizado com Pessoa ID`);
        return true;
      } catch (error) {
        // Coluna não existe, continuar
        continue;
      }
    }

    logger.debug('ℹ️ Nenhuma coluna de referência à Pessoa encontrada em LoginUsers');
    return false;
  }

  /**
   * DEBUG: INVESTIGAR CONSTRAINT ESPECÍFICA
   */
  async debugConstraint(req, res) {
    try {
      const { constraint } = req.params;
      logger.debug(`🔍 Debug constraint: ${constraint}`);

      // Buscar detalhes da constraint específica
      const constraintInfo = await query(`
        SELECT 
          fk.name as CONSTRAINT_NAME,
          OBJECT_NAME(fk.parent_object_id) as TABELA_ORIGEM,
          COL_NAME(fkc.parent_object_id, fkc.parent_column_id) as COLUNA_ORIGEM,
          OBJECT_NAME(fk.referenced_object_id) as TABELA_DESTINO,
          COL_NAME(fkc.referenced_object_id, fkc.referenced_column_id) as COLUNA_DESTINO,
          fk.delete_referential_action_desc as ACAO_DELETE,
          fk.update_referential_action_desc as ACAO_UPDATE
        FROM sys.foreign_keys fk
        INNER JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
        WHERE fk.name = @constraint
      `, { constraint });

      // Verificar se constraint existe
      if (constraintInfo.recordset.length === 0) {
        return res.json({
          success: false,
          message: `Constraint ${constraint} não encontrada`
        });
      }

      const info = constraintInfo.recordset[0];

      res.json({
        success: true,
        constraint: constraint,
        origem: `${info.TABELA_ORIGEM}.${info.COLUNA_ORIGEM}`,
        destino: `${info.TABELA_DESTINO}.${info.COLUNA_DESTINO}`,
        acoes: {
          delete: info.ACAO_DELETE,
          update: info.ACAO_UPDATE
        }
      });

    } catch (error) {
      logger.error(`❌ Erro ao debug constraint: ${error.message}`);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * DEBUG: VERIFICAR SEQUÊNCIA DE IDs
   */
  async debugIds(req, res) {
    try {
      // LoginUsers
      const loginUsers = await query(`
        SELECT TOP 10 ID, UserName, UserID, CreatedOn,
          CASE WHEN ISNUMERIC(ID) = 1 THEN 'Numérico' ELSE 'Não numérico' END as Tipo,
          LEN(ID) as Tamanho
        FROM LoginUsers 
        ORDER BY 
          CASE WHEN ISNUMERIC(ID) = 1 THEN CAST(ID AS INT) ELSE 999999999 END DESC,
          ID DESC
      `);

      // Pessoa
      const pessoa = await query(`
        SELECT TOP 10 ID, Nome, CreatedOn,
          CASE WHEN ISNUMERIC(ID) = 1 THEN 'Numérico' ELSE 'Não numérico' END as Tipo,
          LEN(ID) as Tamanho
        FROM Pessoa 
        ORDER BY 
          CASE WHEN ISNUMERIC(ID) = 1 THEN CAST(ID AS INT) ELSE 999999999 END DESC,
          ID DESC
      `);

      res.json({
        success: true,
        loginUsers: loginUsers.recordset,
        pessoa: pessoa.recordset,
        mensagem: 'Debug de IDs - Verificando tipos e valores'
      });

    } catch (error) {
      logger.error(`Erro no debug IDs: ${error.message}`);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * TESTAR CÁLCULO DE ID - NOVA VERSÃO
   */
  async testarCalculoId(req, res) {
    try {
      // Função para testar a nova lógica
      const testarBuscaId = async (tabela) => {
        try {
          // 1. Buscar último por data
          const ultimoPorDataResult = await query(`
          SELECT TOP 1 ID, CreatedOn
          FROM ${tabela}
          WHERE TRY_CAST(ID AS INT) IS NOT NULL
            AND CreatedOn IS NOT NULL
          ORDER BY CreatedOn DESC
        `);

          // 2. Buscar maior ID
          const maiorIdResult = await query(`
          SELECT MAX(TRY_CAST(ID AS INT)) as maiorId
          FROM ${tabela}
          WHERE TRY_CAST(ID AS INT) IS NOT NULL
        `);

          const maiorId = maiorIdResult.recordset[0].maiorId || 0;
          let proximoIdBaseadoEmData = null;
          let dataUltimo = null;

          if (ultimoPorDataResult.recordset.length > 0) {
            const ultimoIdPorData = parseInt(ultimoPorDataResult.recordset[0].ID) || 0;
            dataUltimo = ultimoPorDataResult.recordset[0].CreatedOn;
            proximoIdBaseadoEmData = (ultimoIdPorData + 1).toString();
          }

          return {
            tabela: tabela,
            ultimoPorData: ultimoPorDataResult.recordset[0] || null,
            maiorId: maiorId,
            proximoIdTradicional: (maiorId + 1).toString(),
            proximoIdPorData: proximoIdBaseadoEmData,
            recomendado: proximoIdBaseadoEmData || (maiorId + 1).toString()
          };
        } catch (error) {
          logger.error(`❌ Erro ao testar ${tabela}: ${error.message}`);
          return { tabela: tabela, error: error.message };
        }
      };

      const [resultadoLoginUsers, resultadoPessoa] = await Promise.all([
        testarBuscaId('LoginUsers'),
        testarBuscaId('Pessoa')
      ]);

      res.json({
        success: true,
        resultados: {
          loginUsers: resultadoLoginUsers,
          pessoa: resultadoPessoa
        },
        mensagem: 'Teste da nova lógica de cálculo de IDs (com verificação de CreatedOn)',
        algoritmo: {
          descricao: '1. Busca último registro por CreatedOn → 2. Pega ID desse registro → 3. Calcula próximo ID (ID + 1)',
          vantagem: 'Garante que IDs seguem a ordem de criação, não apenas o maior número'
        }
      });

    } catch (error) {
      logger.error(`❌ Erro no teste de cálculo: ${error.message}`);
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = new CadastroController();