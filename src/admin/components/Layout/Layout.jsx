import { useId } from 'react';
import { Outlet } from 'react-router-dom';
import { useMenuMovel } from '../../hooks/useMenuMovel.js';
import { useSessaoAdmin } from '../../hooks/useSessaoAdmin.js';
import { IconeMenu } from '../Icones';
import MarcaPainel from '../MarcaPainel';
import MenuLateral from '../MenuLateral';
import estilos from './Layout.module.css';

// Estrutura do painel: menu lateral (gaveta no celular, com barra superior) e a área de conteúdo.
export default function Layout() {
  const idMenu = useId();
  const { sair } = useSessaoAdmin();
  const { aberto, alternar, fechar, botaoRef, menuRef } = useMenuMovel();

  return (
    <div className={estilos.painel}>
      <header className={estilos.barra}>
        <button
          type="button"
          ref={botaoRef}
          className={estilos.botaoMenu}
          onClick={alternar}
          aria-label={aberto ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={aberto}
          aria-controls={idMenu}
        >
          <IconeMenu />
        </button>
        <MarcaPainel className={estilos.titulo} />
      </header>
      {aberto && <div className={estilos.fundo} onClick={fechar} aria-hidden="true" />}
      <MenuLateral id={idMenu} aberto={aberto} menuRef={menuRef} onSair={sair} />
      <main className={estilos.conteudo} inert={aberto}>
        <Outlet />
      </main>
    </div>
  );
}
