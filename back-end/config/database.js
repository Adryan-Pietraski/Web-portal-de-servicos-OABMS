const sql = require('mssql');
const logger = require('./logger');

/**
 * CONFIGURAÇÃO DO BANCO DE DADOS SQL SERVER
 * Todas as configurações são carregadas do arquivo .env
 * Para segurança, NUNCA coloque credenciais diretamente no código
 */
const dbConfig = {
  server: process.env.DB_SERVER,           // Endereço do servidor SQL Server
  database: process.env.DB_DATABASE,       // Nome do banco de dados
  user: process.env.DB_USER,               // Usuário do banco
  password: process.env.DB_PASSWORD,       // Senha do banco
  port: parseInt(process.env.DB_PORT || 1433), // Porta padrão 1433
  
  // Configuração do pool de conexões
  pool: {
    max: 10,                               // Máximo de conexões simultâneas
    min: 0,                                // Mínimo de conexões
    idleTimeoutMillis: 30000               // Tempo de inatividade antes de fechar conexão
  },
  
  // Opções de conexão
  options: {
    encrypt: true,                         // ✅ SEMPRE usar encrypt=true para segurança
    trustServerCertificate: process.env.NODE_ENV !== 'production', // Apenas em desenvolvimento
    enableArithAbort: true,                // Habilita abort em erros aritméticos
    connectTimeout: 30000,                 // Timeout de conexão (30 segundos)
    requestTimeout: 30000                  // Timeout de requisição (30 segundos)
  }
};

let pool; // Pool de conexões (singleton)

/**
 * OBTÉM UMA CONEXÃO COM O BANCO DE DADOS
 * Implementa padrão singleton para reutilizar a conexão
 * @returns {Promise<sql.ConnectionPool>} Pool de conexão
 */
async function getConnection() {
  try {
    if (!pool) {
      logger.info(`🔌 Conectando ao banco: ${dbConfig.database}...`);
      pool = await sql.connect(dbConfig);
      logger.info(`✅ Conectado ao banco: ${dbConfig.database}`);
    }
    return pool;
  } catch (error) {
    logger.error('❌ Erro ao conectar ao banco:', error.message);
    throw error;
  }
}

async function query(sqlQuery, params = {}) {
  const connection = await getConnection();
  const request = connection.request();
  
  Object.entries(params).forEach(([key, value]) => {
    request.input(key, value);
  });
  
  try {
    const result = await request.query(sqlQuery);
    return result;
  } catch (error) {
    logger.error('❌ Erro na query:', {
      mensagem: error.message,
      query: sqlQuery.substring(0, 200),
      parametros: Object.keys(params)
    });
    throw error;
  }
}

/**
 * ALGORITMO CRC32 PARA CÁLCULO DE CHECKSUM
 * Usado para compatibilidade com sistema legado
 * @param {string} str - String para calcular CRC32
 * @returns {number} Valor CRC32 em decimal
 */
function crc32(str) {
  const buffer = Buffer.from(str, 'utf8');
  let crc = 0xFFFFFFFF; // Valor inicial do CRC32
  
  for (let i = 0; i < buffer.length; i++) {
    crc ^= buffer[i]; // XOR com cada byte
    for (let j = 0; j < 8; j++) {
      // Deslocamento com polinômio gerador 0xEDB88320
      crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
    }
  }
  
  return (crc ^ 0xFFFFFFFF) >>> 0; // Inverte bits e garante número positivo
}

/**
 * COMPARA SENHAS USANDO ALGORITMO CRC32
 * Sistema legado armazena senhas como hash CRC32 em hexadecimal
 * @param {string} input - Senha fornecida pelo usuário
 * @param {string} stored - Hash CRC32 armazenado no banco
 * @returns {boolean} true se as senhas coincidem
 */
function comparePasswords(input, stored) {
  logger.debug('🔐 Comparação de senhas iniciada');
  
  // Validações básicas
  if (!stored || !input) {
    logger.warn('⚠️ Senha vazia fornecida ou armazenada');
    return false;
  }
  
  const storedTrimmed = stored.trim();
  if (storedTrimmed === '') {
    logger.warn('⚠️ Hash de senha vazio no banco');
    return false;
  }
  
  // Calcula CRC32 da senha fornecida
  const inputCRC32 = crc32(input).toString(16).toUpperCase();
  const match = inputCRC32 === storedTrimmed;
  
  logger.debug(`🔐 Resultado comparação: ${match ? '✅' : '❌'}`, {
    inputLength: input.length,
    storedLength: storedTrimmed.length,
    inputCRC32: inputCRC32,
    storedCRC32: storedTrimmed,
    corresponde: match
  });
  
  return match;
}

/**
 * FECHA A CONEXÃO COM O BANCO DE DADOS
 * Importante para shutdown graceful
 */
async function closeConnection() {
  try {
    if (pool) {
      await pool.close();
      logger.info('🔒 Conexão com o banco fechada');
      pool = null;
    }
  } catch (error) {
    logger.error('❌ Erro ao fechar conexão:', error.message);
  }
}


// Exporta funções públicas
module.exports = { 
  query, 
  comparePasswords,
  crc32,
  closeConnection 
};