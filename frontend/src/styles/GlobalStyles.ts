import { createGlobalStyle } from 'styled-components';

const GlobalStyles = createGlobalStyle`
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap');

  :root {
    --primary-light-blue: #ADD8E6;
    --primary-dark-blue: #00008B;
    --secondary-blue: #87CEEB;
    --accent-blue: #4169E1;
    --white: #FFFFFF;
    --light-blue-bg: #E0F6FF;
    --text-dark: #000080;
    --text-medium: #4682B4;
    --shadow-light: rgba(0, 0, 139, 0.1);
    --shadow-medium: rgba(0, 0, 139, 0.2);
    --shadow-heavy: rgba(0, 0, 139, 0.3);
  }

  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  html {
    scroll-behavior: smooth;
  }

  body {
    font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
      'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
      sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    background: var(--white);
    color: var(--primary-dark-blue);
    line-height: 1.6;
    overflow-x: hidden;
  }

  #root {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  .App {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  main {
    flex: 1;
  }

  h1, h2, h3, h4, h5, h6 {
    font-family: 'Poppins', sans-serif;
    font-weight: 700;
    color: var(--primary-dark-blue);
    text-shadow: 1px 1px 2px rgba(255, 255, 255, 0.3);
  }

  h1 {
    font-size: 3.5rem;
    font-weight: 800;
    
    @media (max-width: 768px) {
      font-size: 2.5rem;
    }
    
    @media (max-width: 480px) {
      font-size: 2rem;
    }
  }

  h2 {
    font-size: 2.5rem;
    
    @media (max-width: 768px) {
      font-size: 2rem;
    }
  }

  h3 {
    font-size: 1.5rem;
    
    @media (max-width: 768px) {
      font-size: 1.25rem;
    }
  }

  p {
    font-family: 'Poppins', sans-serif;
    font-weight: 400;
    line-height: 1.6;
    color: var(--text-dark);
  }

  a {
    color: var(--primary-dark-blue);
    text-decoration: none;
    transition: all 0.3s ease;
    
    &:focus {
      outline: 2px solid var(--primary-light-blue);
      outline-offset: 2px;
      border-radius: 4px;
    }
  }

  button {
    font-family: 'Poppins', sans-serif;
    cursor: pointer;
    transition: all 0.3s ease;
    
    &:focus {
      outline: 2px solid var(--primary-light-blue);
      outline-offset: 2px;
    }
    
    &:disabled {
      cursor: not-allowed;
      opacity: 0.6;
    }
  }

  input, textarea {
    font-family: 'Poppins', sans-serif;
    
    &:focus {
      outline: 2px solid var(--primary-dark-blue);
      outline-offset: 2px;
    }
  }

  /* Utility classes for consistent styling */
  .text-shadow-light {
    text-shadow: 1px 1px 2px rgba(255, 255, 255, 0.5);
  }

  .text-shadow-medium {
    text-shadow: 2px 2px 4px rgba(255, 255, 255, 0.3);
  }

  .box-shadow-light {
    box-shadow: 0 4px 15px var(--shadow-light);
  }

  .box-shadow-medium {
    box-shadow: 0 8px 25px var(--shadow-medium);
  }

  .gradient-blue {
    background: linear-gradient(135deg, var(--primary-light-blue) 0%, var(--secondary-blue) 100%);
  }

  .gradient-dark-blue {
    background: linear-gradient(135deg, var(--primary-dark-blue) 0%, var(--accent-blue) 100%);
  }

  /* Scrollbar styling */
  ::-webkit-scrollbar {
    width: 8px;
  }

  ::-webkit-scrollbar-track {
    background: var(--light-blue-bg);
  }

  ::-webkit-scrollbar-thumb {
    background: var(--primary-light-blue);
    border-radius: 4px;
    
    &:hover {
      background: var(--secondary-blue);
    }
  }

  /* Focus indicator for keyboard navigation */
  .sr-only {
    position: absolute !important;
    width: 1px !important;
    height: 1px !important;
    padding: 0 !important;
    margin: -1px !important;
    overflow: hidden !important;
    clip: rect(0, 0, 0, 0) !important;
    white-space: nowrap !important;
    border: 0 !important;
  }

  /* High contrast mode support */
  @media (prefers-contrast: high) {
    :root {
      --primary-dark-blue: #000000;
      --text-dark: #000000;
    }
  }

  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }

  /* Print styles */
  @media print {
    * {
      background: white !important;
      color: black !important;
      box-shadow: none !important;
    }
    
    a {
      text-decoration: underline;
    }
    
    .no-print {
      display: none !important;
    }
  }

  /* Dark mode support (for future implementation) */
  @media (prefers-color-scheme: dark) {
    /* Dark mode styles can be added here if needed */
  }
`;

export default GlobalStyles;