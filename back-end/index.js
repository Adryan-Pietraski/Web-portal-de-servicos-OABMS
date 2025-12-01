const express = require('express');
const cors = require('cors');
const sql = require('mssql');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Configuração do banco
const dbConfig = {
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT),
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

// ================= ROTAS DE TESTE =================

// Rota principal
app.get('/', (req, res) => {
  res.json({ 
    message: 'API Portal OAB-MS 🚀',
    status: 'online',
    timestamp: new Date().toISOString(),
    banco_conectado: 'HBConselhoshml',
    endpoints: {
      teste_api: '/teste',
      teste_banco: '/teste-banco',
      status: '/status'
    }
  });
});

// Teste simples da API
app.get('/teste', (req, res) => {
  res.json({ 
    status: 'ok',
    mensagem: 'API respondendo normalmente',
    timestamp: new Date().toISOString()
  });
});

// Teste de conexão com o banco
app.get('/teste-banco', async (req, res) => {
  try {
    console.log('🔍 Testando conexão com:', dbConfig.user);
    
    const pool = await sql.connect(dbConfig);
    const result = await pool.request().query('SELECT 1 as teste, DB_NAME() as banco, SYSTEM_USER as usuario');
    await pool.close();
    
    res.json({
      success: true,
      message: '✅ Conexão estabelecida com sucesso!',
      data: result.recordset[0],
      config: {
        servidor: dbConfig.server,
        banco: dbConfig.database,
        usuario: dbConfig.user
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    
    res.status(500).json({
      success: false,
      message: '❌ Falha na conexão',
      error: error.message,
      usuario: dbConfig.user,
      troubleshooting: [
        '1. Verifique se o usuário existe no SQL Server',
        '2. Confirme a senha do usuário',
        '3. Teste a conexão no SQL Server Management Studio'
      ],
      timestamp: new Date().toISOString()
    });
  }
});

// Status completo
app.get('/status', async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    const resultado = await pool.request().query(`
      SELECT 
        @@VERSION as versao_sql,
        DB_NAME() as banco_atual,
        SYSTEM_USER as usuario_atual,
        GETDATE() as data_servidor
    `);
    await pool.close();
    
    res.json({
      status: 'conectado',
      banco: resultado.recordset[0],
      api: {
        node: process.version,
        plataforma: process.platform,
        porta: PORT,
        memoria: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.json({
      status: 'desconectado',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ================= ROTA LOGIN =================
app.post('/login', async (req, res) => {
  try {
    const { cpf, senha } = req.body;

    if (!cpf || !senha) {
      return res.status(400).json({ 
        success: false,
        error: 'CPF e senha são obrigatórios' 
      });
    }

    console.log(`🔐 Tentativa de login: ${cpf}`);
    
    // Conecta ao banco
    const pool = await sql.connect(dbConfig);
    
    // EXEMPLO: Buscar usuário no banco (adaptar para sua tabela real)
    const result = await pool.request()
      .input('cpf', sql.VarChar(11), cpf)
      .input('senha', sql.VarChar(100), senha)
      .query(`
        SELECT * FROM usuarios 
        WHERE cpf = @cpf AND senha = @senha
      `);
    
    await pool.close();

    if (result.recordset.length > 0) {
      res.json({ 
        success: true, 
        message: 'Login realizado com sucesso!',
        usuario: {
          cpf: cpf,
          // Não retornar a senha!
        }
      });
    } else {
      res.status(401).json({ 
        success: false,
        error: 'CPF ou senha inválidos' 
      });
    }

  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erro interno do servidor',
      detalhes: error.message 
    });
  }
});

// ================= INICIALIZAÇÃO =================
async function iniciarServidor() {
  try {
    // Testa conexão ao iniciar
    console.log('🚀 Iniciando API Portal OAB-MS...');
    
    const pool = await sql.connect(dbConfig);
    const teste = await pool.request().query('SELECT DB_NAME() as banco');
    await pool.close();
    
    console.log(`✅ Conectado ao banco: ${teste.recordset[0].banco}`);
    console.log(`👤 Usuário: ${dbConfig.user}`);

    // Inicia servidor
    app.listen(PORT, () => {
      console.log(`\n🎉 Servidor rodando na porta ${PORT}`);
      console.log(`🔗 Local: http://localhost:${PORT}`);
      console.log(`🌐 Teste: http://localhost:${PORT}/teste-banco\n`);
    });

  } catch (error) {
    console.error('❌ Erro ao conectar no banco:', error.message);
    console.log('⚠️  Servidor iniciando sem conexão ao banco...');
    
    // Inicia mesmo sem conexão (para debug)
    app.listen(PORT, () => {
      console.log(`\n⚠️  Servidor rodando SEM banco na porta ${PORT}`);
      console.log(`🔗 Acesse: http://localhost:${PORT}\n`);
    });
  }
}

// Inicia tudo
iniciarServidor();