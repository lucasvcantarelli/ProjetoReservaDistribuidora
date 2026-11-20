import { render } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import Provedores from '../admin/contexts/Provedores.jsx';
import { rotas } from '../admin/routes.jsx';
import { vi } from 'vitest';
import { sessaoAdmin } from '../admin/services/apiAdmin.js';
import { empresaPublicaService } from '../admin/services/empresaPublicaService.js';

export const ADMIN_TESTE = { id: 'a1', email: 'admin@x.com', nome: 'Admin', papel: 'admin' };
export const SESSAO_TESTE = { access_token: 'a', refresh_token: 'r', expires_at: 9999999999 };

export function logarComoAdmin() {
  sessaoAdmin.salvar(SESSAO_TESTE, ADMIN_TESTE);
}

// Renderiza o painel inteiro (provedores + rotas) numa URL; `basename` simula o VITE_ADMIN_BASE.
export function renderizarAdmin(url = '/', { basename } = {}) {
  // Topo do painel lê a configuração pública; sem mock próprio do teste, responde "sem logo".
  if (!vi.isMockFunction(empresaPublicaService.obter)) {
    vi.spyOn(empresaPublicaService, 'obter').mockResolvedValue({ nome: 'Reserva', logo_url: null });
  }
  const roteador = createMemoryRouter(rotas, { initialEntries: [url], basename });
  render(
    <Provedores>
      <RouterProvider router={roteador} />
    </Provedores>,
  );
  return roteador;
}
