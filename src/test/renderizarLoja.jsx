import { render } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import Provedores from '../loja/contexts/Provedores.jsx';
import { rotas } from '../loja/routes.jsx';
import { empresaService } from '../loja/services/empresaService.js';

export const EMPRESA_TESTE = {
  nome: 'Reserva Distribuidora',
  logo_url: null,
  whatsapp: null,
  endereco: null,
};

// Renderiza a loja inteira (provedores + rotas) numa URL; os serviços de rede ficam por conta do teste.
export function renderizarLoja(url = '/', { empresa = {} } = {}) {
  vi.spyOn(empresaService, 'obter').mockResolvedValue({ ...EMPRESA_TESTE, ...empresa });
  const roteador = createMemoryRouter(rotas, { initialEntries: [url] });
  render(
    <Provedores>
      <RouterProvider router={roteador} />
    </Provedores>,
  );
  return roteador;
}

export const VARIACAO_UNIDADE_E_FARDO = {
  id: 'v-m',
  nome_tamanho: 'M',
  vende_unidade: true,
  preco_unidade_centavos: 150,
  vende_fardo: true,
  qtd_por_fardo: 1000,
  preco_fardo_centavos: 120000,
};

export const VARIACAO_SO_UNIDADE = {
  id: 'v-p',
  nome_tamanho: 'P',
  vende_unidade: true,
  preco_unidade_centavos: 100,
  vende_fardo: false,
  qtd_por_fardo: null,
  preco_fardo_centavos: null,
};

export const PRODUTO_TESTE = {
  id: 'p-1',
  nome: 'Copo descartável',
  descricao: 'Copo resistente.',
  categoria: { id: 'c-1', nome: 'Copos', slug: 'copos' },
  fotos: ['http://x/a.webp', 'http://x/b.webp'],
  variacoes: [VARIACAO_SO_UNIDADE, VARIACAO_UNIDADE_E_FARDO],
};
