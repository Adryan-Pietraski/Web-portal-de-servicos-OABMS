import axios from 'axios';

/**
 * SERVIÇO DE API PARA COMUNICAÇÃO COM BACKEND
 * Centraliza todas as chamadas HTTP e tratamento de erros
 */

// Configuração base do axios
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3000/api',
  timeout: 30000, // 30 segundos timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adicionar token automaticamente
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para tratamento global de erros
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Tratamento de erros específicos
    if (error.response) {
      switch (error.response.status) {
        case 401:
          // Token expirado ou inválido
          if (window.location.pathname !== '/login') {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
          }
          break;
        case 429:
          // Rate limit excedido
          console.warn('Rate limit excedido. Tente novamente em alguns minutos.');
          break;
        case 500:
          console.error('Erro interno do servidor. Tente novamente mais tarde.');
          break;
        default:
          console.error('Erro na requisição:', error.response.data);
      }
    } else if (error.request) {
      console.error('Não foi possível conectar ao servidor. Verifique sua conexão.');
    } else {
      console.error('Erro na configuração da requisição:', error.message);
    }
    
    return Promise.reject(error);
  }
);

/**
 * SERVIÇO DE AUTENTICAÇÃO
 */
export const authService = {
  /**
   * REALIZA LOGIN DO USUÁRIO
   * @param {string} cpfCnpj - CPF ou CNPJ do usuário
   * @param {string} password - Senha do usuário
   * @returns {Promise} Dados do usuário e token
   */
  async login(cpfCnpj, password) {
    try {
      console.log('🔐 [AUTH SERVICE] Iniciando login...');
      
      const response = await api.post('/login', {
        cpfCnpj,
        password
      });
      
      if (response.data.success) {
        // Salva token e dados do usuário
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.usuario));
        
        console.log('✅ [AUTH SERVICE] Login realizado com sucesso');
        return response.data;
      } else {
        throw new Error(response.data.error || 'Erro no login');
      }
    } catch (error) {
      console.error('❌ [AUTH SERVICE] Erro no login:', error.message);
      throw error;
    }
  },

  /**
   * VERIFICA SE O TOKEN É VÁLIDO
   * @returns {Promise} Dados do token validado
   */
  async verifyToken() {
    try {
      const response = await api.get('/verify');
      return response.data;
    } catch (error) {
      console.error('❌ [AUTH SERVICE] Token inválido:', error.message);
      throw error;
    }
  },

  /**
   * OBTÉM PERFIL DO USUÁRIO AUTENTICADO
   * @returns {Promise} Dados do perfil do usuário
   */
  async getProfile() {
    try {
      const response = await api.get('/profile');
      return response.data;
    } catch (error) {
      console.error('❌ [AUTH SERVICE] Erro ao obter perfil:', error.message);
      throw error;
    }
  },

  /**
   * REALIZA LOGOUT
   * @returns {Promise} Confirmação de logout
   */
  async logout() {
    try {
      const response = await api.post('/logout');
      
      // Remove dados locais
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      console.log('🚪 [AUTH SERVICE] Logout realizado com sucesso');
      return response.data;
    } catch (error) {
      // Mesmo em caso de erro, remove dados locais
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      console.error('❌ [AUTH SERVICE] Erro no logout:', error.message);
      throw error;
    }
  },

  /**
   * VERIFICA SAÚDE DA API
   * @returns {Promise} Status da API
   */
  async healthCheck() {
    try {
      const response = await api.get('/health');
      return response.data;
    } catch (error) {
      console.error('❌ [AUTH SERVICE] Erro no health check:', error.message);
      throw error;
    }
  },

  /**
   * BUSCA USUÁRIO POR CPF (APENAS DESENVOLVIMENTO)
   * @param {string} cpf - CPF do usuário a ser buscado
   * @returns {Promise} Dados do usuário encontrado
   */
  async buscarUsuario(cpf) {
    try {
      const response = await api.get(`/usuario/${cpf}`);
      return response.data;
    } catch (error) {
      console.error('❌ [AUTH SERVICE] Erro ao buscar usuário:', error.message);
      throw error;
    }
  },

  /**
   * VERIFICA SE USUÁRIO ESTÁ AUTENTICADO
   * @returns {boolean} true se usuário estiver autenticado
   */
  isAuthenticated() {
    const token = localStorage.getItem('token');
    return !!token;
  },

  /**
   * OBTÉM DADOS DO USUÁRIO LOGADO
   * @returns {Object|null} Dados do usuário ou null
   */
  getCurrentUser() {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch (error) {
        console.error('❌ [AUTH SERVICE] Erro ao parsear usuário:', error);
        return null;
      }
    }
    return null;
  },

  /**
   * OBTÉM TOKEN DO USUÁRIO LOGADO
   * @returns {string|null} Token JWT ou null
   */
  getToken() {
    return localStorage.getItem('token');
  }
};

export default api;