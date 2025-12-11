import React, { createContext, useState, useContext, useEffect } from 'react';
import { authService } from '../services/api';

/**
 * CONTEXTO DE AUTENTICAÇÃO
 * Gerencia estado global de autenticação em toda a aplicação
 */
const AuthContext = createContext({});

/**
 * PROVEDOR DO CONTEXTO DE AUTENTICAÇÃO
 * Deve envolver toda a aplicação no App.js
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Carrega usuário do localStorage ao iniciar
  useEffect(() => {
    const loadStoredUser = () => {
      try {
        const storedUser = authService.getCurrentUser();
        const token = authService.getToken();
        
        if (storedUser && token) {
          setUser(storedUser);
          console.log('👤 [AUTH CONTEXT] Usuário carregado do storage:', storedUser.nome);
        }
      } catch (err) {
        console.error('❌ [AUTH CONTEXT] Erro ao carregar usuário:', err);
        logout(); // Limpa dados corrompidos
      } finally {
        setLoading(false);
      }
    };

    loadStoredUser();
  }, []);

  /**
   * REALIZA LOGIN DO USUÁRIO
   */
  const login = async (cpfCnpj, password) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔐 [AUTH CONTEXT] Iniciando login...');
      
      const data = await authService.login(cpfCnpj, password);
      setUser(data.usuario);
      
      console.log('✅ [AUTH CONTEXT] Login realizado:', data.usuario.nome);
      return { success: true, data };
      
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Erro ao fazer login';
      setError(errorMessage);
      console.error('❌ [AUTH CONTEXT] Erro no login:', errorMessage);
      return { success: false, error: errorMessage };
      
    } finally {
      setLoading(false);
    }
  };

  /**
   * REALIZA LOGOUT DO USUÁRIO
   */
  const logout = async () => {
    try {
      await authService.logout();
    } catch (err) {
      console.warn('⚠️ [AUTH CONTEXT] Erro no logout (ignorado):', err.message);
    } finally {
      setUser(null);
      setError(null);
      console.log('🚪 [AUTH CONTEXT] Usuário deslogado');
    }
  };

  /**
   * ATUALIZA DADOS DO USUÁRIO
   */
  const updateUser = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    console.log('🔄 [AUTH CONTEXT] Usuário atualizado:', userData.nome);
  };

  /**
   * VERIFICA TOKEN PERIODICAMENTE
   */
  const verifyToken = async () => {
    try {
      await authService.verifyToken();
      return true;
    } catch (err) {
      console.warn('⚠️ [AUTH CONTEXT] Token inválido, fazendo logout...');
      logout();
      return false;
    }
  };

  // Valores disponíveis no contexto
  const contextValue = {
    user,
    loading,
    error,
    login,
    logout,
    updateUser,
    verifyToken,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * HOOK PERSONALIZADO PARA USAR O CONTEXTO DE AUTENTICAÇÃO
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  
  return context;
};

export default AuthContext;