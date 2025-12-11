import React, { useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import styled from 'styled-components';

const DashboardContainer = styled.div`
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
`;

const WelcomeMessage = styled.h1`
  color: #0d2357;
  margin-bottom: 2rem;
`;

const UserInfoCard = styled.div`
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
`;

const LogoutButton = styled.button`
  background: #dc3545;
  color: white;
  border: none;
  padding: 0.8rem 1.5rem;
  border-radius: 8px;
  cursor: pointer;
  margin-top: 2rem;
  
  &:hover {
    background: #c82333;
  }
`;

const Home = () => {
  const { user, logout, verifyToken } = useAuth();

  // Verifica token periodicamente
  useEffect(() => {
    const interval = setInterval(() => {
      verifyToken();
    }, 300000); // 5 minutos

    return () => clearInterval(interval);
  }, [verifyToken]);

  if (!user) {
    return (
      <DashboardContainer>
        <p>Carregando...</p>
      </DashboardContainer>
    );
  }

  return (
    <DashboardContainer>
      <WelcomeMessage>
        Bem-vindo, {user.nome}!
      </WelcomeMessage>
      
      <UserInfoCard>
        <h2>Seus Dados</h2>
        <p><strong>CPF:</strong> {user.cpf}</p>
        <p><strong>Status:</strong> {user.ativo ? 'Ativo' : 'Inativo'}</p>
        <p><strong>Último login:</strong> {user.ultimoLogin ? new Date(user.ultimoLogin).toLocaleString() : 'Primeiro acesso'}</p>
      </UserInfoCard>
      
      <LogoutButton onClick={logout}>
        Sair do Sistema
      </LogoutButton>
    </DashboardContainer>
  );
};

export default Home;