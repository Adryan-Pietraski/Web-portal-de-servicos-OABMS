// src/pages/telalogin/LoginForm.js
import React, { useState } from 'react';
import styled from 'styled-components';
import { LuEye, LuEyeClosed } from "react-icons/lu";
import { colors, breakpoints } from './styles/GlobalStyles';

// Container do formulário
const FormContainer = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  animation: fadeIn 0.6s ease-out;
`;

// Título do formulário
const FormTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${colors.darkBlue};
  margin-bottom: 0.5rem;
  text-align: center;
  line-height: 1.3;

  @media (max-width: ${breakpoints.mobile}) {
    font-size: 1.3rem;
  }
`;

const FormSubtitle = styled.p`
  color: #666;
  text-align: center;
  margin-bottom: 2rem;
  font-size: 0.9rem;
  line-height: 1.5;

  @media (max-width: ${breakpoints.mobile}) {
    font-size: 0.85rem;
    margin-bottom: 1.5rem;
  }
`;

// Inputs
const InputGroup = styled.div`
  margin-bottom: 1.2rem;
  box-sizing: border-box;
  position: relative;
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
    box-shadow: 0 0 0 3px rgba(124, 176, 235, 0.15);
    background: white;
  }
  
  &::placeholder {
    color: #a0a0a0;
    font-size: 0.9rem;
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
  border-radius: 4px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  
  &:hover {
    color: ${colors.darkBlue};
    background: rgba(0, 0, 0, 0.05);
  }
`;

// Botão principal
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
  margin-top: 0.5rem;
  box-sizing: border-box;
  
  &:hover {
    background: #0a1a45;
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(13, 35, 87, 0.3);
  }
  
  &:active {
    transform: translateY(0);
  }

  @media (max-width: ${breakpoints.mobile}) {
    padding: 0.9rem;
    font-size: 0.95rem;
    margin-top: 0.5rem;
  }
`;

// Link de alternância entre login e cadastro
const ToggleLink = styled.div`
  text-align: center;
  color: #666;
  font-size: 0.9rem;
  margin-top: 1rem;
  box-sizing: border-box;
  
  button {
    color: ${colors.darkBlue};
    background: none;
    border: none;
    text-decoration: none;
    font-weight: 600;
    cursor: pointer;
    font-size: 0.9rem;
    padding: 0.2rem 0.4rem;
    border-radius: 4px;
    transition: all 0.2s ease;
    
    &:hover {
      text-decoration: underline;
      background: rgba(13, 35, 87, 0.05);
    }
  }

  @media (max-width: ${breakpoints.mobile}) {
    font-size: 0.85rem;
    
    button {
      font-size: 0.85rem;
    }
  }
`;

const LoginForm = ({ onToggleForm, onSubmit }) => {
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(e);
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <FormContainer>
      <FormTitle>Acesso ao Sistema</FormTitle>
      <FormSubtitle>Entre com suas credenciais</FormSubtitle>
      
      <form onSubmit={handleSubmit}>
        <InputGroup>
          <Label htmlFor="cpfCnpj">CPF / CNPJ</Label>
          <Input 
            type="text" 
            id="cpfCnpj"
            placeholder="Digite seu CPF ou CNPJ"
            required
          />
        </InputGroup>
        
        <InputGroup>
          <Label htmlFor="password">Senha</Label>
          <PasswordContainer>
            <PasswordInput 
              type={showPassword ? "text" : "password"}
              id="password"
              placeholder="Digite sua senha"
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
        
        <PrimaryButton type="submit">
          Entrar →
        </PrimaryButton>
      </form>

      <ToggleLink>
        Não tem uma conta? <button type="button" onClick={onToggleForm}>Cadastre-se agora</button>
      </ToggleLink>
    </FormContainer>
  );
};

export default LoginForm;