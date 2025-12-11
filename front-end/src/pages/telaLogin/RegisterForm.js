import React, { useState } from 'react';
import styled from 'styled-components';
import { LuEye, LuEyeClosed } from "react-icons/lu";
import { FaUserPlus, FaArrowLeft } from "react-icons/fa"; // Adicionado FaArrowLeft
import { colors, breakpoints } from './styles/GlobalStyles';

// Container do formulário
const FormContainer = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
`;

// Botão voltar
const BackButton = styled.button`
  background: none;
  border: none;
  color: ${colors.darkBlue};
  cursor: pointer;
  font-size: 0.9rem;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  align-self: flex-start;
  padding: 0.5rem 0.8rem;
  border-radius: 6px;
  transition: all 0.2s ease;
  font-weight: 500;
  
  &:hover {
    background: rgba(13, 35, 87, 0.05);
  }

  @media (max-width: ${breakpoints.mobile}) {
    font-size: 0.85rem;
  }
`;

// Título do formulário
const FormTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${colors.darkBlue};
  margin-bottom: 0.5rem;
  text-align: center;

  @media (max-width: ${breakpoints.mobile}) {
    font-size: 1.3rem;
  }
`;

const FormSubtitle = styled.p`
  color: #666;
  text-align: center;
  margin-bottom: 2rem;
  font-size: 0.9rem;

  @media (max-width: ${breakpoints.mobile}) {
    font-size: 0.85rem;
    margin-bottom: 1.5rem;
  }
`;

// Inputs
const InputGroup = styled.div`
  margin-bottom: 1rem;
  box-sizing: border-box;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  color: ${colors.darkBlue};
  font-weight: 600;
  font-size: 0.9rem;

  @media (max-width: ${breakpoints.mobile}) {
    font-size: 0.85rem;
  }
`;

const Input = styled.input`
  width: 100%;
  padding: 0.9rem;
  border: 2px solid #e8ecef;
  border-radius: 8px;
  font-size: 0.95rem;
  transition: all 0.3s ease;
  box-sizing: border-box;
  background: ${colors.backgroundLight};
  
  &:focus {
    outline: none;
    border-color: ${colors.lightBlue};
    background: white;
  }

  @media (max-width: ${breakpoints.mobile}) {
    padding: 0.8rem;
    font-size: 0.9rem;
  }
`;

// Container de senha com olhinho
const PasswordContainer = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const PasswordInput = styled(Input)`
  padding-right: 3rem;
`;

const TogglePasswordButton = styled.button`
  position: absolute;
  right: 0.8rem;
  background: none;
  border: none;
  color: #666;
  cursor: pointer;
  padding: 0.2rem;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    color: ${colors.darkBlue};
  }
`;

// Botão principal com ícone
const PrimaryButton = styled.button`
  width: 100%;
  padding: 1rem;
  background: ${colors.darkBlue};
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-bottom: 1.5rem;
  margin-top: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  box-sizing: border-box;
  
  &:hover {
    background: #0a1a45;
    transform: translateY(-2px);
  }

  @media (max-width: ${breakpoints.mobile}) {
    padding: 0.9rem;
    font-size: 0.95rem;
  }
`;

// Link de alternância
const ToggleLink = styled.div`
  text-align: center;
  color: #666;
  font-size: 0.9rem;
  margin-top: 1rem;
  
  button {
    color: ${colors.darkBlue};
    background: none;
    border: none;
    font-weight: 600;
    cursor: pointer;
    font-size: 0.9rem;
    padding: 0.2rem 0.4rem;
    transition: all 0.2s ease;
    
    &:hover {
      text-decoration: underline;
    }
  }

  @media (max-width: ${breakpoints.mobile}) {
    font-size: 0.85rem;
    
    button {
      font-size: 0.85rem;
    }
  }
`;

const RegisterForm = ({ onToggleForm, onSubmit }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(e);
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  return (
    <FormContainer>
      <BackButton type="button" onClick={onToggleForm}>
        <FaArrowLeft />
        Voltar para o login
      </BackButton>
      
      <FormTitle>Criar Nova Conta</FormTitle>
      <FormSubtitle>Preencha seus dados para cadastro</FormSubtitle>
      
      <form onSubmit={handleSubmit}>
        <InputGroup>
          <Label htmlFor="fullName">Nome Completo</Label>
          <Input 
            type="text" 
            id="fullName"
            placeholder="Digite seu nome completo"
            required
          />
        </InputGroup>

        <InputGroup>
          <Label htmlFor="email">E-mail</Label>
          <Input 
            type="email" 
            id="email"
            placeholder="seu@email.com"
            required
          />
        </InputGroup>

        <InputGroup>
          <Label htmlFor="cpf">CPF</Label>
          <Input 
            type="text" 
            id="cpf"
            placeholder="000.000.000-00"
            required
          />
        </InputGroup>

        <InputGroup>
          <Label htmlFor="phone">Telefone</Label>
          <Input 
            type="tel" 
            id="phone"
            placeholder="(67) 99999-9999"
            required
          />
        </InputGroup>

        <InputGroup>
          <Label htmlFor="registerPassword">Senha</Label>
          <PasswordContainer>
            <PasswordInput 
              type={showPassword ? "text" : "password"}
              id="registerPassword"
              placeholder="Crie uma senha segura"
              required
            />
            <TogglePasswordButton 
              type="button" 
              onClick={togglePasswordVisibility}
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            >
              {showPassword ? <LuEye size={18} /> : <LuEyeClosed size={18} />}
            </TogglePasswordButton>
          </PasswordContainer>
        </InputGroup>

        <InputGroup>
          <Label htmlFor="confirmPassword">Confirmar Senha</Label>
          <PasswordContainer>
            <PasswordInput 
              type={showConfirmPassword ? "text" : "password"}
              id="confirmPassword"
              placeholder="Digite a senha novamente"
              required
            />
            <TogglePasswordButton 
              type="button" 
              onClick={toggleConfirmPasswordVisibility}
              aria-label={showConfirmPassword ? "Ocultar senha" : "Mostrar senha"}
            >
              {showConfirmPassword ? <LuEye size={18} /> : <LuEyeClosed size={18} />}
            </TogglePasswordButton>
          </PasswordContainer>
        </InputGroup>
        
        <PrimaryButton type="submit">
          <FaUserPlus />
          Criar Conta
        </PrimaryButton>
      </form>

      <ToggleLink>
        Já tem uma conta? <button type="button" onClick={onToggleForm}>Faça login</button>
      </ToggleLink>
    </FormContainer>
  );
};

export default RegisterForm;