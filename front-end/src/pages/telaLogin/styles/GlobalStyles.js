// src/pages/telalogin/styles/GlobalStyles.js
import { keyframes } from 'styled-components';

// Cores oficiais OABMS + tons para gradientes
export const colors = {
  red: 'rgb(166, 3, 14)',
  darkBlue: 'rgb(13, 35, 87)',
  lightBlue: 'rgb(124, 176, 235)',
  white: '#ffffff',
  gray: '#f5f5f5',
  darkGray: '#333333',
  lightGray: '#e1e5e9',
  
  // Tons adicionais para gradientes
  blueDark: '#0d2257',
  blueMedium: '#1a3a8f',
  blueLight: '#2a4ba8',
  redDark: '#a6030e',
  redLight: '#c40512',
  backgroundLight: '#f8fafc',
  
  // Novas cores para o design
  subtleGray: '#f8fafc',
  borderLight: '#e2e8f0',
  textMuted: '#64748b'
};

// Animações para slide horizontal
export const slideOutToLeft = keyframes`
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(-100%);
    opacity: 0;
  }
`;

export const slideInFromRight = keyframes`
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
`;

export const slideOutToRight = keyframes`
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(100%);
    opacity: 0;
  }
`;

export const slideInFromLeft = keyframes`
  from {
    transform: translateX(-100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
`;

// Nova animação para fade in
export const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

// Media queries para responsividade
export const breakpoints = {
  mobile: '768px',
  tablet: '1024px',
  desktop: '1200px'
};