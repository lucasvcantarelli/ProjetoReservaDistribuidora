import { describe, expect, it, vi } from 'vitest';
import { apiAdmin } from './apiAdmin.js';
import { clientesService } from './clientesService.js';

const espiar = () => vi.spyOn(apiAdmin, 'chamar').mockResolvedValue({});

describe('clientesService', () => {
  it('listar omite a busca vazia; obter, criar, editar e excluir mandam id e dados', async () => {
    const chamar = espiar();
    await clientesService.listar({ busca: '', pagina: 2 });
    await clientesService.obter('c1');
    await clientesService.criar({ tipo_pessoa: 'PF', nome: 'N' });
    await clientesService.editar('c1', { nome: 'N' });
    await clientesService.excluir('c1');
    expect(chamar.mock.calls.map(([, corpo]) => corpo)).toEqual([
      { acao: 'listar', busca: undefined, pagina: 2 },
      { acao: 'obter', id: 'c1' },
      { acao: 'criar', dados: { tipo_pessoa: 'PF', nome: 'N' } },
      { acao: 'editar', id: 'c1', dados: { nome: 'N' } },
      { acao: 'excluir', id: 'c1' },
    ]);
  });
});
