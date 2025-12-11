import React, { useState } from 'react';
import styled from 'styled-components';
import { LuEye, LuEyeClosed } from "react-icons/lu";
import { FaArrowRight } from "react-icons/fa"; // Ícone de seta adicionado
import { colors, breakpoints } from './styles/GlobalStyles';
import { useAuth } from '../../contexts/AuthContext';

// Mensagem de erro (simplificada)
const ErrorMessage = styled.div`
  background: #fee;
  border: 1px solid #f5c6cb;
  color: #721c24;
  padding: 0.8rem 1rem;
  border-radius: 8px;
  margin-bottom: 1.2rem;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  &::before {
    content: '⚠️';
    font-size: 1rem;
  }

  @media (max-width: ${breakpoints.mobile}) {
    font-size: 0.85rem;
    padding: 0.7rem 0.9rem;
  }
`;

// Mensagem de sucesso (simplificada)
const SuccessMessage = styled.div`
  background: #e8f7ef;
  border: 1px solid #c3e6cb;
  color: #155724;
  padding: 0.8rem 1rem;
  border-radius: 8px;
  margin-bottom: 1.2rem;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  &::before {
    content: '✅';
    font-size: 1rem;
  }

  @media (max-width: ${breakpoints.mobile}) {
    font-size: 0.85rem;
    padding: 0.7rem 0.9rem;
  }
`;

// Container do formulário
const FormContainer = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
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
  margin-bottom: 1.2rem;
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

// Input
const Input = styled.input`
  width: 100%;
  padding: 0.9rem;
  border: 2px solid ${props => props.hasError ? '#f5c6cb' : '#e8ecef'};
  border-radius: 8px;
  font-size: 0.95rem;
  transition: all 0.3s ease;
  box-sizing: border-box;
  background: ${colors.backgroundLight};
  
  &:focus {
    outline: none;
    border-color: ${props => props.hasError ? '#e74c3c' : colors.lightBlue};
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

// Botão com ícone de seta
const PrimaryButton = styled.button`
  width: 100%;
  padding: 1rem;
  background: ${props => props.disabled ? '#cccccc' : colors.darkBlue};
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  transition: all 0.3s ease;
  margin-bottom: 1.5rem;
  margin-top: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  box-sizing: border-box;
  
  &:hover:not(:disabled) {
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
    text-decoration: none;
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

const LoginForm = ({ onToggleForm, onSubmit }) => {
  const { login, loading, error } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    cpfCnpj: '',
    password: ''
  });
  const [localError, setLocalError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [id]: value
    }));
    
    // Limpa erros quando usuário começa a digitar
    if (localError) setLocalError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validação básica
    if (!formData.cpfCnpj.trim() || !formData.password.trim()) {
      setLocalError('Por favor, preencha todos os campos');
      return;
    }

    // Limpa mensagens anteriores
    setLocalError('');
    setSuccessMessage('');

    try {
      // Chama a função de login do contexto
      const result = await login(formData.cpfCnpj, formData.password);
      
      if (result.success) {
        setSuccessMessage('Login realizado com sucesso!');
        
        // Se quiser fazer algo após login bem-sucedido
        if (onSubmit) {
          onSubmit(e);
        }
        
        // Redireciona após 1 segundo
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 1000);
        
      } else {
        setLocalError(result.error || 'Erro ao fazer login');
      }
      
    } catch (err) {
      setLocalError('Erro ao conectar com o servidor. Tente novamente.');
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Função para formatar CPF enquanto digita
  const formatCPF = (value) => {
    const numbers = value.replace(/\D/g, '');
    
    if (numbers.length <= 11) {
      // Formatação de CPF
      if (numbers.length <= 3) return numbers;
      if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
      if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
      return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`;
    } else {
      // Formatação de CNPJ
      if (numbers.length <= 12) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8, 12)}`;
      return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8, 12)}-${numbers.slice(12, 14)}`;
    }
  };

  const handleCpfChange = (e) => {
    const formattedValue = formatCPF(e.target.value);
    setFormData(prev => ({
      ...prev,
      cpfCnpj: formattedValue
    }));
  };

  return (
    <FormContainer>
      <FormTitle>Acesso ao Sistema</FormTitle>
      <FormSubtitle>Entre com suas credenciais</FormSubtitle>
      
      {/* Mensagem de sucesso */}
      {successMessage && (
        <SuccessMessage>
          {successMessage}
        </SuccessMessage>
      )}
      
      {/* Mensagem de erro do contexto */}
      {error && !localError && (
        <ErrorMessage>
          {error}
        </ErrorMessage>
      )}
      
      {/* Mensagem de erro local */}
      {localError && (
        <ErrorMessage>
          {localError}
        </ErrorMessage>
      )}
      
      <form onSubmit={handleSubmit}>
        <InputGroup>
          <Label htmlFor="cpfCnpj">CPF / CNPJ</Label>
          <Input 
            type="text" 
            id="cpfCnpj"
            placeholder="Digite seu CPF ou CNPJ"
            value={formData.cpfCnpj}
            onChange={handleCpfChange}
            hasError={!!localError}
            required
            disabled={loading}
          />
        </InputGroup>
        
        <InputGroup>
          <Label htmlFor="password">Senha</Label>
          <PasswordContainer>
            <PasswordInput 
              type={showPassword ? "text" : "password"}
              id="password"
              placeholder="Digite sua senha"
              value={formData.password}
              onChange={handleChange}
              hasError={!!localError}
              required
              disabled={loading}
            />
            <TogglePasswordButton 
              type="button" 
              onClick={togglePasswordVisibility}
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              disabled={loading}
            >
              {showPassword ? <LuEye size={18} /> : <LuEyeClosed size={18} />}
            </TogglePasswordButton>
          </PasswordContainer>
        </InputGroup>
        
        <PrimaryButton type="submit" disabled={loading}>
          {loading ? 'Autenticando...' : (
            <>
              Entrar
              <FaArrowRight />
            </>
          )}
        </PrimaryButton>
      </form>

      <ToggleLink>
        Não tem uma conta?{' '}
        <button 
          type="button" 
          onClick={onToggleForm}
          disabled={loading}
        >
          Cadastre-se agora
        </button>
      </ToggleLink>
    </FormContainer>
  );
};

export default LoginForm;