// src/pages/telalogin/login.js
import React, { useState } from 'react';
import styled, { css } from 'styled-components';
import { colors, slideOutToLeft, slideInFromRight, slideOutToRight, slideInFromLeft, breakpoints } from './styles/GlobalStyles';
import LoginForm from './loginForm';
import RegisterForm from './RegisterForm';
import LOGO from '../../imagens/LOGO-OABMS.png';

// Container principal responsivo - FUNDO BRANCO MELHORADO
const LoginContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  font-family: 'Arial', sans-serif;
  overflow: hidden;
  box-sizing: border-box;
  position: relative;

  /* Padrão sutil de fundo */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-image: 
      radial-gradient(circle at 15% 50%, rgba(124, 176, 235, 0.03) 0%, transparent 50%),
      radial-gradient(circle at 85% 30%, rgba(166, 3, 14, 0.02) 0%, transparent 50%);
    pointer-events: none;
  }

  @media (max-width: ${breakpoints.mobile}) {
    padding: 10px;
    align-items: flex-start;
    background: #f8fafc;
    
    &::before {
      display: none;
    }
  }
`;

// Layout principal - MELHORADO
const MainCard = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  max-width: 1000px;
  width: 100%;
  background: white;
  border-radius: 24px;
  box-shadow: 
    0 20px 40px rgba(0, 0, 0, 0.1),
    0 0 0 1px rgba(0, 0, 0, 0.05);
  overflow: hidden;
  min-height: 650px;
  position: relative;
  box-sizing: border-box;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  border: 1px solid rgba(255, 255, 255, 0.8);

  &:hover {
    box-shadow: 
      0 25px 50px rgba(0, 0, 0, 0.15),
      0 0 0 1px rgba(0, 0, 0, 0.08);
    transform: translateY(-5px);
  }

  @media (max-width: ${breakpoints.mobile}) {
    grid-template-columns: 1fr;
    min-height: auto;
    margin: 10px 0;
    border-radius: 20px;
    
    &:hover {
      transform: none;
    }
  }
`;

// Container para animação das seções - ADICIONE ESTE COMPONENTE
const SectionContainer = styled.div`
  position: relative;
  overflow: hidden;
  box-sizing: border-box;
`;

// Lado esquerdo - Informações (ANIMADO) - MELHORADO
const InfoSide = styled.div`
  background: linear-gradient(145deg, ${colors.darkBlue} 0%, ${colors.blueMedium} 100%);
  padding: 3rem;
  color: white;
  display: flex;
  flex-direction: column;
  justify-content: center;
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  box-sizing: border-box;
  
  /* Efeito de brilho sutil */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(45deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%);
    pointer-events: none;
  }
  
  /* Animação baseada na prop */
  ${props => {
    switch(props.animation) {
      case 'slideOutToLeft':
        return css`animation: ${slideOutToLeft} 0.6s ease-in-out forwards;`;
      case 'slideOutToRight':
        return css`animation: ${slideOutToRight} 0.6s ease-in-out forwards;`;
      case 'slideInFromLeft':
        return css`animation: ${slideInFromLeft} 0.6s ease-in-out forwards;`;
      case 'slideInFromRight':
        return css`animation: ${slideInFromRight} 0.6s ease-in-out forwards;`;
      default:
        return css`
          transform: translateX(0);
          opacity: 1;
        `;
    }
  }}

  @media (max-width: ${breakpoints.mobile}) {
    padding: 2.5rem 1.5rem;
    text-align: center;
    position: relative;
    animation: none !important;
    min-height: 350px;
    height: auto;
  }
`;

// Lado direito - Formulário (ANIMADO) - MELHORADO
const FormSide = styled.div`
  padding: ${props => props.isLogin ? '3rem' : '2.5rem'};
  display: flex;
  flex-direction: column;
  ${props => props.isLogin ? 'justify-content: center;' : 'justify-content: flex-start;'}
  background: ${colors.white};
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  box-sizing: border-box;
  
  ${props => !props.isLogin && `
    overflow-y: auto;
    padding-top: 2rem;
  `}
  
  /* Animação baseada na prop - INVERTIDA em relação ao InfoSide */
  ${props => {
    switch(props.animation) {
      case 'slideOutToLeft':
        return css`animation: ${slideOutToRight} 0.6s ease-in-out forwards;`;
      case 'slideOutToRight':
        return css`animation: ${slideOutToLeft} 0.6s ease-in-out forwards;`;
      case 'slideInFromLeft':
        return css`animation: ${slideInFromRight} 0.6s ease-in-out forwards;`;
      case 'slideInFromRight':
        return css`animation: ${slideInFromLeft} 0.6s ease-in-out forwards;`;
      default:
        return css`
          transform: translateX(0);
          opacity: 1;
        `;
    }
  }}

  @media (max-width: ${breakpoints.mobile}) {
    padding: 2.5rem 1.5rem;
    position: relative;
    animation: none !important;
    ${props => !props.isLogin && `
      max-height: none;
      overflow-y: visible;
    `}
    min-height: ${props => props.isLogin ? '450px' : 'auto'};
    height: auto;
  }

  /* Custom scrollbar melhorado */
  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 10px;
  }

  &::-webkit-scrollbar-thumb {
    background: ${colors.lightBlue};
    border-radius: 10px;
    transition: all 0.3s ease;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: ${colors.darkBlue};
  }
`;

// Container do logo 
const LogoContainer = styled.div`
  text-align: center;
  margin-bottom: 2rem;

  @media (max-width: ${breakpoints.mobile}) {
    margin-bottom: 1.5rem;
  }
`;

// Componente da logo importada
const LogoImage = styled.img`
  max-width: 180px;
  height: auto;
  margin-bottom: 1rem;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1));

  @media (max-width: ${breakpoints.mobile}) {
    max-width: 120px;
    margin-bottom: 0.8rem;
  }
`;

const SystemTitle = styled.h1`
  font-size: 1.8rem;
  font-weight: 700;
  margin-bottom: 1rem;
  color: ${colors.white};
  text-align: center;
  line-height: 1.3;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

  @media (max-width: ${breakpoints.mobile}) {
    font-size: 1.5rem;
    margin-bottom: 0.8rem;
  }
`;

const SystemSubtitle = styled.p`
  font-size: 1rem;
  margin-bottom: 2rem;
  opacity: 0.95;
  line-height: 1.5;
  text-align: center;
  font-weight: 300;

  @media (max-width: ${breakpoints.mobile}) {
    font-size: 0.9rem;
    margin-bottom: 1.5rem;
  }
`;

// Lista de benefícios
const BenefitsList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 2rem 0;

  @media (max-width: ${breakpoints.mobile}) {
    margin: 1.5rem 0;
  }

  li {
    margin-bottom: 0.8rem;
    display: flex;
    align-items: center;
    font-size: 1rem;
    font-weight: 400;
    
    @media (max-width: ${breakpoints.mobile}) {
      font-size: 0.9rem;
      justify-content: center;
      margin-bottom: 0.6rem;
    }
    
    &:before {
      content: '✓';
      color: ${colors.white};
      font-weight: bold;
      margin-right: 0.8rem;
      background: ${colors.red};
      border-radius: 50%;
      width: 22px;
      height: 22px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.8rem;
      flex-shrink: 0;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

      @media (max-width: ${breakpoints.mobile}) {
        width: 20px;
        height: 20px;
        font-size: 0.7rem;
        margin-right: 0.6rem;
      }
    }
  }
`;

// Versão mobile - alternância simples
const MobileToggle = styled.div`
  display: none;
  
  @media (max-width: ${breakpoints.mobile}) {
    display: flex;
    justify-content: center;
    margin-top: 1.5rem;
    
    button {
      background: rgba(255, 255, 255, 0.2);
      color: white;
      border: 2px solid rgba(255, 255, 255, 0.3);
      padding: 0.7rem 1.5rem;
      border-radius: 25px;
      cursor: pointer;
      font-size: 0.9rem;
      font-weight: 500;
      transition: all 0.3s ease;
      backdrop-filter: blur(10px);
      
      &:hover {
        background: rgba(255, 255, 255, 0.3);
        border-color: rgba(255, 255, 255, 0.5);
        transform: translateY(-2px);
      }
    }
  }
`;

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [infoAnimation, setInfoAnimation] = useState('');
  const [formAnimation, setFormAnimation] = useState('');

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    console.log('Login submitted');
  };

  const handleRegisterSubmit = (e) => {
    e.preventDefault();
    console.log('Register submitted');
  };

  const toggleForm = () => {
    if (isLogin) {
      setInfoAnimation('slideOutToLeft');
      setFormAnimation('slideOutToLeft');
    } else {
      setInfoAnimation('slideOutToRight');
      setFormAnimation('slideOutToRight');
    }
    
    setTimeout(() => {
      setIsLogin(!isLogin);
      
      if (isLogin) {
        setInfoAnimation('slideInFromRight');
        setFormAnimation('slideInFromRight');
      } else {
        setInfoAnimation('slideInFromLeft');
        setFormAnimation('slideInFromLeft');
      }
    }, 300);
  };

  return (
    <LoginContainer>
      <MainCard>
        {/* Lado esquerdo - Informações (ANIMADO) */}
        <SectionContainer>
          <InfoSide animation={infoAnimation}>
            <LogoContainer>
              <LogoImage src={LOGO} alt="Logo OABMS" />
              <SystemTitle>Sistema de Requerimentos</SystemTitle>
            </LogoContainer>
            
            <SystemSubtitle>
              Acesse os serviços internos da OAB Mato Grosso do Sul. 
              Solicite inscrições, certidões e outros documentos de forma rápida e segura.
            </SystemSubtitle>
            
            <BenefitsList>
              <li>Solicitação de Inscrições</li>
              <li>Emissão de Certidões</li>
              <li>Processos Digitais</li>
              <li>Atendimento Online</li>
            </BenefitsList>

            <MobileToggle>
              <button onClick={toggleForm}>
                {isLogin ? 'Criar uma conta' : 'Já tenho uma conta'}
              </button>
            </MobileToggle>
          </InfoSide>
        </SectionContainer>

        {/* Lado direito - Formulário (ANIMADO) */}
        <SectionContainer>
          <FormSide isLogin={isLogin} animation={formAnimation}>
            {isLogin ? (
              <LoginForm 
                onToggleForm={toggleForm} 
                onSubmit={handleLoginSubmit} 
              />
            ) : (
              <RegisterForm 
                onToggleForm={toggleForm} 
                onSubmit={handleRegisterSubmit} 
              />
            )}
          </FormSide>
        </SectionContainer>
      </MainCard>
    </LoginContainer>
  );
};

export default Login;