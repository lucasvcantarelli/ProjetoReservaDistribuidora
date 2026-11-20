import { useMarcaEmpresa } from '../../hooks/useMarcaEmpresa.js';
import estilos from './MarcaPainel.module.css';

// Topo do painel: logo da empresa (enviada em Configurações) + "Painel administrativo".
export default function MarcaPainel({ className = '' }) {
  const { nome, logoUrl } = useMarcaEmpresa();

  return (
    <span className={`${estilos.marca} ${className}`}>
      {logoUrl && (
        <img
          src={logoUrl}
          alt={nome ? `Logo ${nome}` : 'Logo da empresa'}
          className={estilos.logo}
        />
      )}
      <span className={estilos.texto}>Painel administrativo</span>
    </span>
  );
}
