import { useNavigate } from 'react-router-dom';
import Botao from '../../../shared/components/Botao';
import { useTituloDaPagina } from '../../hooks/useTituloDaPagina.js';
import estilos from './NaoEncontrado.module.css';

export default function NaoEncontrado() {
  useTituloDaPagina('Página não encontrada');
  const navigate = useNavigate();
  return (
    <main className={estilos.pagina}>
      <h1 className={estilos.titulo}>Página não encontrada.</h1>
      <p className={estilos.texto}>O endereço pode estar errado ou ter mudado.</p>
      <Botao onClick={() => navigate('/categorias')}>Ir para o painel</Botao>
    </main>
  );
}
