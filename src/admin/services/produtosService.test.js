import { describe, expect, it, vi } from 'vitest';
import { apiAdmin } from './apiAdmin.js';
import { produtosService } from './produtosService.js';

function espiar() {
  return vi.spyOn(apiAdmin, 'chamar').mockResolvedValue({});
}

describe('produtosService', () => {
  it('listar traduz os filtros e omite os vazios', async () => {
    const chamar = espiar();
    await produtosService.listar({ busca: '', categoriaId: 'c1', pagina: 2 });
    expect(chamar).toHaveBeenCalledWith(
      'admin-produtos',
      { acao: 'listar', busca: undefined, categoria_id: 'c1', pagina: 2 },
      { autenticado: true },
    );
  });

  it('criar, editar, obter e excluir mandam os dados da ação', async () => {
    const chamar = espiar();
    const dados = { produto: { nome: 'A' }, variacoes: [] };
    await produtosService.criar(dados);
    await produtosService.editar('p1', dados);
    await produtosService.obter('p1');
    await produtosService.excluir('p1');
    expect(chamar.mock.calls.map(([, corpo]) => corpo)).toEqual([
      { acao: 'criar', ...dados },
      { acao: 'editar', id: 'p1', ...dados },
      { acao: 'obter', id: 'p1' },
      { acao: 'excluir', id: 'p1' },
    ]);
  });
});
