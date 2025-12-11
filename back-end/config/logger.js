const winston = require('winston');
const path = require('path');
const fs = require('fs');

/**
 * SISTEMA DE LOGGING PROFISSIONAL
 * Usa a biblioteca Winston para gerenciar logs em múltiplos níveis
 * Logs detalhados vão para arquivos, logs essenciais vão para console
 */

// Cria a pasta de logs na raiz do projeto
const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
  // Apenas na primeira execução mostra no console
  console.log(`📁 Pasta de logs criada: ${logDir}`);
}

/**
 * DEFINIÇÃO DOS NÍVEIS DE LOG:
 * - error: 0 - Erros críticos que afetam funcionalidade
 * - warn: 1 - Avisos (problemas não críticos)
 * - info: 2 - Informações importantes do sistema
 * - http: 3 - Logs de requisições HTTP
 * - debug: 4 - Informações detalhadas para desenvolvimento
 */
const logger = winston.createLogger({
  level: 'debug', // Em desenvolvimento, captura todos os níveis
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(
      (info) => `${info.timestamp} ${info.level}: ${info.message}`
    )
  ),
  transports: [
    /**
     * TRANSPORTE PARA CONSOLE
     * Apenas mostra info, warn e error no terminal
     * Mantém o terminal limpo durante desenvolvimento
     */
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize({ all: true }), // Cores para melhor legibilidade
        winston.format.printf(
          (info) => `${info.timestamp} ${info.level}: ${info.message}`
        )
      ),
      level: 'info' // Apenas nível info e acima no console
    }),
    
    /**
     * TRANSPORTE PARA ARQUIVO COMPLETO
     * Salva TODOS os logs (incluindo debug) para análise posterior
     */
    new winston.transports.File({
      filename: path.join(logDir, 'all.log'),
      level: 'debug' // Todos os níveis vão para este arquivo
    }),
    
    /**
     * TRANSPORTE PARA ARQUIVO DE ERROS
     * Logs separados apenas para erros (fácil monitoramento)
     */
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error' // Apenas erros
    })
  ]
});

/**
 * STREAM PARA MORGAN (LOGS HTTP)
 * Morgan é um middleware do Express para logging de requisições HTTP
 * Aqui integramos Morgan com Winston
 */
logger.stream = {
  write: (message) => logger.http(message.trim())
};

module.exports = logger;