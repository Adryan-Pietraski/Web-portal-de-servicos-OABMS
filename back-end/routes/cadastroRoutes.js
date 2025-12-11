const express = require('express');
const router = express.Router();
const cadastroController = require('../controllers/cadastroController'); // Importado como cadastroController (c minúsculo)
const { authMiddleware } = require('../middlewares/auth');
const logger = require('../config/logger');

// ROTA DE TESTE
router.get('/teste', (req, res) => {
  logger.debug('🧪 Teste da rota de cadastro');
  res.json({
    success: true,
    message: 'Sistema de cadastro OAB-MS funcionando! ✅',
    timestamp: new Date().toISOString(),
    rotasDisponiveis: {
      cep: 'GET /api/cadastro/cep/:cep',
      municipios: 'GET /api/cadastro/municipios?estado=SIGLA',
      verificarCpf: 'GET /api/cadastro/verificar/cpf/:cpf',
      verificarUsername: 'GET /api/cadastro/verificar/username/:username',
      cadastroCompleto: 'POST /api/cadastro/completo (JWT required)',
      cadastroSimples: 'POST /api/cadastro/simples',
      cadastroComIdManual: 'POST /api/cadastro/com-id-manual', // <-- ADICIONAR AQUI
      estadoCivil: 'GET /api/cadastro/estado-civil',
      sexo: 'GET /api/cadastro/sexo',
      tipoPessoa: 'GET /api/cadastro/tipo-pessoa'
    }
  });
});


// TESTAR CÁLCULO DE ID (nova rota)
router.get('/testar-calculo-id', cadastroController.testarCalculoId);

// CADASTRO COM ID MANUAL
router.post('/com-id-manual', cadastroController.cadastroComIdManual); // <-- USAR cadastroController (c minúsculo)

// REMOVA ESTA LINHA DUPLICADA:
// router.post('/simples', CadastroController.cadastroSimples);

router.get('/debug/constraint/:constraint', cadastroController.debugConstraint);

// Adicione esta linha nas rotas
router.get('/debug/tabela/:tabela', cadastroController.debugTabela);

// BUSCAR CEP
router.get('/cep/:cep', cadastroController.buscarCEP);

// LISTAR MUNICÍPIOS
router.get('/municipios', cadastroController.listarMunicipios);

// VERIFICAR CPF
router.get('/verificar/cpf/:cpf', cadastroController.verificarCPF);

// VERIFICAR USERNAME
router.get('/verificar/username/:username', cadastroController.verificarUsername);

// CADASTRO COMPLETO (PROTEGIDO - requer autenticação)
router.post('/completo', authMiddleware, cadastroController.cadastroCompleto);

// CADASTRO SIMPLIFICADO (para testes - sem autenticação)
router.post('/simples', cadastroController.cadastroSimples); // <-- JÁ EXISTE AQUI (linha 58)

// OPÇÕES DE ESTADO CIVIL
router.get('/estado-civil', (req, res) => {
  res.json({
    success: true,
    opcoes: [
      { valor: 1, label: 'Casado(a)' },
      { valor: 2, label: 'Divorciado' },
      { valor: 3, label: 'Solteiro(a)' },
      { valor: 4, label: 'Viúvo(a)' },
      { valor: 5, label: 'União Estável' },
      { valor: 6, label: 'Outros' },
      { valor: 7, label: 'Separado Judicialmente' },
      { valor: 8, label: 'Não Informado' }
    ]
  });
});

// OPÇÕES DE SEXO
router.get('/sexo', (req, res) => {
  res.json({
    success: true,
    opcoes: [
      { valor: 'M', label: 'Masculino' },
      { valor: 'F', label: 'Feminino' },
      { valor: 'N', label: 'Não Informado' }
    ]
  });
});

// OPÇÕES DE TIPO PESSOA
router.get('/tipo-pessoa', (req, res) => {
  res.json({
    success: true,
    opcoes: [
      { valor: 'F', label: 'Pessoa Física' },
      { valor: 'J', label: 'Pessoa Jurídica' }
    ]
  });
});

module.exports = router;