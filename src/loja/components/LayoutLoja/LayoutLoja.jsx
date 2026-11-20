import { Outlet, ScrollRestoration } from 'react-router-dom';
import AvisoPrivacidade from '../../../shared/components/AvisoPrivacidade';
import Cabecalho from '../Cabecalho';
import Rodape from '../Rodape';
import estilos from './LayoutLoja.module.css';

export default function LayoutLoja() {
  return (
    <div className={estilos.pagina}>
      <Cabecalho />
      <main className={estilos.principal}>
        <Outlet />
      </main>
      <Rodape />
      <AvisoPrivacidade />
      <ScrollRestoration />
    </div>
  );
}
