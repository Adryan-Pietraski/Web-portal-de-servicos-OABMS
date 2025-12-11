import React, { useState } from 'react';
import styled, { css } from 'styled-components';
import {
  FaFileSignature,   // Ícone para "Solicitação de Inscrições"
  FaFileContract,    // Ícone para "Emissão de Certidões"
  FaHeadset          // Ícone para "Atendimento Online"
} from 'react-icons/fa';
import { colors, slideOutToLeft, slideInFromRight, slideOutToRight, slideInFromLeft, breakpoints } from './styles/GlobalStyles';
import LoginForm from './loginForm';
import RegisterForm from './RegisterForm';
import LOGO from '../../imagens/LOGO-OABMS.png';

// =============================================
// COMPONENTES STYLED
// =============================================

// Container principal da página de login
// Responsável pelo fundo gradiente e centralização do conteúdo
const LoginContainer = styled.div`
  min-height: 100vh; /* Garante que o container ocupe pelo menos toda a altura da tela */
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); /* Gradiente de fundo suave */
  display: flex; /* Usa flexbox para centralização */
  align-items: center; /* Centraliza verticalmente */
  justify-content: center; /* Centraliza horizontalmente */
  padding: 20px; /* Padding interno */
  font-family: 'Arial', sans-serif; /* Fonte padrão */
  overflow: hidden; /* Previne qualquer overflow indesejado */
  box-sizing: border-box; /* Inclui padding e border no cálculo do tamanho */
  position: relative; /* Necessário para o pseudo-elemento ::before */

  /* Efeito visual de fundo com gradientes radiais para profundidade */
  &::before {
    content: ''; /* Necessário para pseudo-elementos */
    position: absolute; /* Posiciona sobre o fundo */
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    /* Dois gradientes radiais para criar pontos de luz no fundo */
    background-image: 
      radial-gradient(circle at 15% 50%, rgba(124, 176, 235, 0.03) 0%, transparent 50%),
      radial-gradient(circle at 85% 30%, rgba(166, 3, 14, 0.02) 0%, transparent 50%);
    pointer-events: none; /* Permite interação com elementos abaixo */
  }

  /* Estilos responsivos para dispositivos móveis */
  @media (max-width: ${breakpoints.mobile}) {
    padding: 10px; /* Padding menor em mobile */
    align-items: flex-start; /* Alinha ao topo em vez de centralizar */
    background: #f8fafc; /* Fundo sólido para melhor performance em mobile */
    
    &::before {
      display: none; /* Remove efeitos visuais complexos no mobile */
    }
  }
`;

// Card principal que contém os dois lados (informações e formulário)
const MainCard = styled.div`
  display: grid; /* Usa CSS Grid para layout de duas colunas */
  grid-template-columns: 1fr 1fr; /* Duas colunas de tamanho igual */
  max-width: 1000px; /* Largura máxima do card */
  width: 100%; /* Ocupa 100% do espaço disponível */
  background: white; /* Fundo branco */
  border-radius: 24px; /* Bordas arredondadas */
  box-shadow: 
    0 20px 40px rgba(0, 0, 0, 0.1), /* Sombra externa para profundidade */
    0 0 0 1px rgba(0, 0, 0, 0.05); /* Borda sutil simulada com sombra */
  overflow: hidden; /* Esconde qualquer conteúdo que ultrapasse as bordas */
  min-height: 650px; /* Altura mínima do card */
  position: relative; /* Necessário para posicionamento absoluto dos filhos */
  box-sizing: border-box; /* Padding e border incluídos no tamanho */
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); /* Transição suave para hover */

  /* Efeito de hover no card principal */
  &:hover {
    box-shadow: 
      0 25px 50px rgba(0, 0, 0, 0.15), /* Sombra mais intensa no hover */
      0 0 0 1px rgba(0, 0, 0, 0.08); /* Borda mais definida */
    transform: translateY(-5px); /* Levanta o card 5px no hover */
  }

  /* Responsividade para mobile */
  @media (max-width: ${breakpoints.mobile}) {
    grid-template-columns: 1fr; /* Uma coluna apenas no mobile */
    min-height: auto; /* Altura automática no mobile */
    margin: 10px 0; /* Margem vertical */
    border-radius: 20px; /* Bordas ligeiramente menores */
    
    &:hover {
      transform: none; /* Remove efeito de levantamento no mobile */
    }
  }
`;

// Container para as seções com animação
// Usado para envolver cada lado do card e controlar overflow
const SectionContainer = styled.div`
  position: relative; /* Contexto de posicionamento para filhos absolutos */
  overflow: hidden; /* Esconde conteúdo durante animações */
  box-sizing: border-box; /* Modelo de caixa consistente */
`;

// Lado esquerdo - Seção de informações com gradiente azul
const InfoSide = styled.div`
  background: linear-gradient(145deg, ${colors.darkBlue} 0%, ${colors.blueMedium} 100%); /* Gradiente azul */
  padding: 3rem; /* Espaçamento interno */
  color: white; /* Texto branco para contraste */
  display: flex;
  flex-direction: column; /* Organiza filhos em coluna */
  justify-content: center; /* Centraliza verticalmente */
  position: absolute; /* Posicionamento absoluto para animações */
  width: 100%; /* Ocupa toda a largura do container */
  height: 100%; /* Ocupa toda a altura do container */
  top: 0;
  left: 0;
  box-sizing: border-box;
  
  /* Efeito de brilho sutil sobre o gradiente */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    /* Gradiente diagonal para efeito de brilho */
    background: linear-gradient(45deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%);
    pointer-events: none; /* Não interfere com interações */
  }
  
  /* Lógica de animação baseada na prop 'animation' */
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
          transform: translateX(0); /* Posição padrão */
          opacity: 1; /* Totalmente visível */
        `;
    }
  }}

  /* Responsividade para mobile */
  @media (max-width: ${breakpoints.mobile}) {
    padding: 2.5rem 1.5rem; /* Padding reduzido */
    text-align: center; /* Centraliza texto no mobile */
    position: relative; /* Posicionamento normal no mobile */
    animation: none !important; /* Desabilita animações no mobile */
    min-height: 350px; /* Altura mínima */
    height: auto; /* Altura automática */
  }
`;

// Lado direito - Seção do formulário (login ou registro)
const FormSide = styled.div`
  padding: ${props => props.isLogin ? '3rem' : '2.5rem'}; /* Padding maior para login */
  display: flex;
  flex-direction: column; /* Organiza em coluna */
  ${props => props.isLogin ? 'justify-content: center;' : 'justify-content: flex-start;'} /* Centraliza login, alinha ao topo registro */
  background: ${colors.white}; /* Fundo branco */
  position: absolute; /* Para animações */
  width: 100%; /* Largura total */
  height: 100%; /* Altura total */
  top: 0;
  left: 0;
  box-sizing: border-box;
  
  /* Configurações específicas para o formulário de registro */
  ${props => !props.isLogin && `
    overflow-y: auto; /* Scroll vertical se necessário */
    padding-top: 2rem; /* Padding top adicional */
  `}
  
  /* Lógica de animação invertida em relação ao InfoSide */
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

  /* Responsividade para mobile */
  @media (max-width: ${breakpoints.mobile}) {
    padding: 2.5rem 1.5rem; /* Padding reduzido */
    position: relative; /* Posicionamento normal */
    animation: none !important; /* Sem animações no mobile */
    ${props => !props.isLogin && `
      max-height: none; /* Altura livre */
      overflow-y: visible; /* Sem scroll */
    `}
    min-height: ${props => props.isLogin ? '450px' : 'auto'}; /* Altura mínima condicional */
    height: auto; /* Altura automática */
  }

  /* Estilização personalizada da barra de scroll (apenas WebKit) */
  &::-webkit-scrollbar {
    width: 6px; /* Largura da barra de scroll */
  }

  &::-webkit-scrollbar-track {
    background: #f1f5f9; /* Cor do fundo da track */
    border-radius: 10px; /* Bordas arredondadas */
  }

  &::-webkit-scrollbar-thumb {
    background: ${colors.lightBlue}; /* Cor do "polegar" da scrollbar */
    border-radius: 10px; /* Bordas arredondadas */
    transition: all 0.3s ease; /* Transição suave para hover */
  }

  &::-webkit-scrollbar-thumb:hover {
    background: ${colors.darkBlue}; /* Cor mais escura no hover */
  }
`;

// Container para a logo e título do sistema
const LogoContainer = styled.div`
  text-align: center; /* Centraliza conteúdo */
  margin-bottom: 2rem; /* Espaço abaixo */

  @media (max-width: ${breakpoints.mobile}) {
    margin-bottom: 1.5rem; /* Espaço menor no mobile */
  }
`;

// Componente da logo importada como imagem
const LogoImage = styled.img`
  max-width: 180px; /* Largura máxima */
  height: auto; /* Altura proporcional */
  margin-bottom: 1rem; /* Espaço abaixo */
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1)); /* Sombra sutil */

  @media (max-width: ${breakpoints.mobile}) {
    max-width: 120px; /* Logo menor no mobile */
    margin-bottom: 0.8rem; /* Espaço reduzido */
  }
`;

// Título principal do sistema
const SystemTitle = styled.h1`
  font-size: 1.8rem; /* Tamanho da fonte */
  font-weight: 700; /* Negrito */
  margin-bottom: 1rem; /* Espaço abaixo */
  color: ${colors.white}; /* Cor branca */
  text-align: center; /* Centralizado */
  line-height: 1.3; /* Altura da linha */
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); /* Sombra no texto para legibilidade */

  @media (max-width: ${breakpoints.mobile}) {
    font-size: 1.5rem; /* Fonte menor no mobile */
    margin-bottom: 0.8rem; /* Espaço reduzido */
  }
`;

// Subtítulo/descrição do sistema
const SystemSubtitle = styled.p`
  font-size: 1rem; /* Tamanho da fonte */
  margin-bottom: 2rem; /* Espaço abaixo */
  opacity: 0.95; /* Leve transparência */
  line-height: 1.5; /* Altura da linha confortável */
  text-align: center; /* Centralizado */
  font-weight: 300; /* Peso fino */

  @media (max-width: ${breakpoints.mobile}) {
    font-size: 0.9rem; /* Fonte menor no mobile */
    margin-bottom: 1.5rem; /* Espaço reduzido */
  }
`;

// Container para os ícones dos benefícios
const IconContainer = styled.span`
  display: flex;
  align-items: center; /* Centraliza verticalmente */
  justify-content: center; /* Centraliza horizontalmente */
  background: rgba(255, 255, 255, 0.3); /* Fundo branco com 30% de opacidade */
  border-radius: 30%; /* Formato oval/retângulo arredondado */
  width: 30px; /* Largura fixa */
  height: 30px; /* Altura fixa */
  margin-right: 0.8rem; /* Espaço à direita para o texto */
  flex-shrink: 0; /* Impede que o ícone encolha */
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15); /* Sombra sutil */
  transition: all 0.3s ease; /* Transição suave para todos os estilos */
  
  /* Estilização do ícone SVG dentro do container */
  svg {
    color: ${colors.white}; /* Ícone branco */
    font-size: 0.9rem; /* Tamanho do ícone */
    transition: transform 0.3s ease; /* Transição suave para transformações */
  }

  /* Efeitos de hover no container do ícone */
  &:hover {
    transform: scale(1.1); /* Aumenta 10% no hover */
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2); /* Sombra mais intensa */
    background: rgba(255, 255, 255, 0.4); /* Fundo mais opaco no hover */
    
    /* Efeito no ícone dentro do container */
    svg {
      transform: scale(1.1); /* Ícone também aumenta */
    }
  }

  /* Responsividade para mobile */
  @media (max-width: ${breakpoints.mobile}) {
    width: 22px; /* Menor no mobile */
    height: 22px; /* Menor no mobile */
    margin-right: 0.6rem; /* Espaço menor */
    
    svg {
      font-size: 0.8rem; /* Ícone menor */
    }
    
    &:hover {
      transform: none; /* Remove efeitos de hover no mobile */
    }
  }
`;

// Item individual da lista de benefícios
const BenefitItem = styled.li`
  display: flex; /* Layout flex para ícone e texto lado a lado */
  align-items: center; /* Alinha ícone e texto verticalmente */
  margin-bottom: 1rem; /* Espaço entre itens */
  font-size: 1rem; /* Tamanho da fonte */
  font-weight: 400; /* Peso normal */
  transition: transform 0.3s ease; /* Transição suave para transformações */
  
  /* Efeito de hover no item completo */
  &:hover {
    transform: translateX(5px); /* Move 5px para a direita no hover */
  }
  
  /* Responsividade para mobile */
  @media (max-width: ${breakpoints.mobile}) {
    font-size: 0.9rem; /* Fonte menor */
    justify-content: ${props => props.$centerOnMobile ? 'center' : 'flex-start'}; /* Centraliza ou alinha à esquerda */
    margin-bottom: 0.8rem; /* Espaço menor */
    text-align: left; /* Alinha texto à esquerda */
    
    &:hover {
      transform: none; /* Remove efeito de hover no mobile */
    }
  }
`;

// Lista de benefícios (ul)
const BenefitsList = styled.ul`
  list-style: none; /* Remove marcadores padrão da lista */
  padding: 0; /* Remove padding padrão */
  margin: 2rem 0; /* Margem vertical */

  @media (max-width: ${breakpoints.mobile}) {
    margin: 1.5rem 0; /* Margem menor no mobile */
  }
`;

// Botão de alternância entre login/registro (apenas visível no mobile)
const MobileToggle = styled.div`
  display: none; /* Escondido por padrão (visível apenas no mobile) */
  
  @media (max-width: ${breakpoints.mobile}) {
    display: flex; /* Visível no mobile */
    justify-content: center; /* Centraliza horizontalmente */
    margin-top: 1.5rem; /* Espaço acima */
    
    /* Estilização do botão */
    button {
      background: rgba(255, 255, 255, 0.2); /* Fundo branco semi-transparente */
      color: white; /* Texto branco */
      border: 2px solid rgba(255, 255, 255, 0.3); /* Borda branca semi-transparente */
      padding: 0.7rem 1.5rem; /* Padding interno */
      border-radius: 25px; /* Bordas completamente arredondadas */
      cursor: pointer; /* Cursor de ponteiro */
      font-size: 0.9rem; /* Tamanho da fonte */
      font-weight: 500; /* Peso médio */
      transition: all 0.3s ease; /* Transição suave */
      backdrop-filter: blur(10px); /* Efeito de desfoque no fundo */
      
      /* Efeitos de hover no botão */
      &:hover {
        background: rgba(255, 255, 255, 0.3); /* Fundo mais opaco */
        border-color: rgba(255, 255, 255, 0.5); /* Borda mais visível */
        transform: translateY(-2px); /* Levanta 2px no hover */
      }
    }
  }
`;

// =============================================
// COMPONENTES REACT
// =============================================

// Componente para cada item de benefício
// Recebe um ícone (Icon) e o texto (children)
const Benefit = ({ icon: Icon, children }) => (
  <BenefitItem $centerOnMobile> {/* Prop para centralização no mobile */}
    <IconContainer> {/* Container do ícone com fundo branco opaco */}
      <Icon /> {/* Renderiza o ícone passado como prop */}
    </IconContainer>
    <span>{children}</span> {/* Texto do benefício */}
  </BenefitItem>
);

// =============================================
// DADOS/CONFIGURAÇÕES
// =============================================

// Configuração dos benefícios/serviços mostrados no lado esquerdo
const benefitConfig = [
  {
    text: "Solicitação de Inscrições", // Texto do benefício
    icon: FaFileSignature, // Ícone correspondente
  },
  {
    text: "Emissão de Certidões",
    icon: FaFileContract,
  },
  {
    text: "Atendimento Online",
    icon: FaHeadset,
  }
];

// =============================================
// COMPONENTE PRINCIPAL
// =============================================

const Login = () => {
  // Estados para controlar qual formulário está visível
  const [isLogin, setIsLogin] = useState(true); // true = login, false = registro
  
  // Estados para controlar as animações de transição
  const [infoAnimation, setInfoAnimation] = useState(''); // Animação do lado esquerdo
  const [formAnimation, setFormAnimation] = useState(''); // Animação do lado direito

  // Handler para submit do formulário de login
  const handleLoginSubmit = (e) => {
    e.preventDefault(); // Previne comportamento padrão do form
    console.log('Login submitted'); // Log temporário - substituir por lógica real
  };

  // Handler para submit do formulário de registro
  const handleRegisterSubmit = (e) => {
    e.preventDefault(); // Previne comportamento padrão do form
    console.log('Register submitted'); // Log temporário - substituir por lógica real
  };

  // Função para alternar entre login e registro com animações
  const toggleForm = () => {
    // Inicia animações de saída baseado no estado atual
    if (isLogin) {
      setInfoAnimation('slideOutToLeft'); // Lado esquerdo sai para esquerda
      setFormAnimation('slideOutToLeft'); // Lado direito sai para esquerda
    } else {
      setInfoAnimation('slideOutToRight'); // Lado esquerdo sai para direita
      setFormAnimation('slideOutToRight'); // Lado direito sai para direita
    }

    // Após 300ms (duração da animação), muda o estado e inicia animações de entrada
    setTimeout(() => {
      setIsLogin(!isLogin); // Alterna entre login e registro

      if (isLogin) {
        // Se estava em login, agora entra registro
        setInfoAnimation('slideInFromRight'); // Lado esquerdo entra da direita
        setFormAnimation('slideInFromRight'); // Lado direito entra da direita
      } else {
        // Se estava em registro, agora entra login
        setInfoAnimation('slideInFromLeft'); // Lado esquerdo entra da esquerda
        setFormAnimation('slideInFromLeft'); // Lado direito entra da esquerda
      }
    }, 300); // Delay correspondente à duração da animação
  };

  return (
    <LoginContainer>
      <MainCard>
        {/* ============================================= */}
        {/* LADO ESQUERDO - INFORMAÇÕES E BENEFÍCIOS */}
        {/* ============================================= */}
        <SectionContainer>
          <InfoSide animation={infoAnimation}>
            {/* Logo e título */}
            <LogoContainer>
              <LogoImage src={LOGO} alt="Logo OABMS" />
              <SystemTitle>Portal de Requerimentos</SystemTitle>
            </LogoContainer>
            
            {/* Descrição do sistema */}
            <SystemSubtitle>
              Acesse os serviços internos da OAB Mato Grosso do Sul.
              Solicite inscrições, certidões e outros documentos de forma rápida e segura.
            </SystemSubtitle>

            {/* Lista de benefícios/serviços disponíveis */}
            <BenefitsList>
              {benefitConfig.map((benefit, index) => (
                <Benefit key={index} icon={benefit.icon}>
                  {benefit.text}
                </Benefit>
              ))}
            </BenefitsList>

            {/* Botão de alternância (visível apenas no mobile) */}
            <MobileToggle>
              <button onClick={toggleForm}>
                {isLogin ? 'Criar uma conta' : 'Já tenho uma conta'}
              </button>
            </MobileToggle>
          </InfoSide>
        </SectionContainer>

        {/* ============================================= */}
        {/* LADO DIREITO - FORMULÁRIOS */}
        {/* ============================================= */}
        <SectionContainer>
          <FormSide isLogin={isLogin} animation={formAnimation}>
            {/* Renderiza formulário de login ou registro baseado no estado */}
            {isLogin ? (
              <LoginForm
                onToggleForm={toggleForm} // Passa função para alternar formulários
                onSubmit={handleLoginSubmit} // Passa handler de submit
              />
            ) : (
              <RegisterForm
                onToggleForm={toggleForm} // Passa função para alternar formulários
                onSubmit={handleRegisterSubmit} // Passa handler de submit
              />
            )}
          </FormSide>
        </SectionContainer>
      </MainCard>
    </LoginContainer>
  );
};

export default Login;