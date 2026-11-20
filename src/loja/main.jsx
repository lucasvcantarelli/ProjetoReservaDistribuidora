import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../shared/styles/global.css';
import App from './App.jsx';
import { dadosClienteService } from './services/dadosClienteService.js';

dadosClienteService.limparLegado();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
