import { describe, expect, it, vi } from 'vitest';
import { apiAdmin } from './apiAdmin.js';
import { fotosService } from './fotosService.js';

describe('fotosService', () => {
  it('enviar manda multipart com os campos produto_id e arquivo, autenticado', async () => {
    const chamar = vi.spyOn(apiAdmin, 'chamar').mockResolvedValue({ id: 'f1' });
    const blob = new Blob(['w'], { type: 'image/webp' });
    await fotosService.enviar('p1', blob);
    const [funcao, corpo, opcoes] = chamar.mock.calls[0];
    expect(funcao).toBe('admin-fotos');
    expect(corpo).toBeUndefined();
    expect(opcoes.autenticado).toBe(true);
    expect(opcoes.formData.get('produto_id')).toBe('p1');
    expect(opcoes.formData.get('arquivo')).toBeInstanceOf(Blob);
  });

  it('remover e reordenar usam as ações JSON do servidor', async () => {
    const chamar = vi.spyOn(apiAdmin, 'chamar').mockResolvedValue({});
    await fotosService.remover('f1');
    await fotosService.reordenar('p1', ['f2', 'f1']);
    expect(chamar).toHaveBeenNthCalledWith(
      1,
      'admin-fotos',
      { acao: 'remover', id: 'f1' },
      { autenticado: true },
    );
    expect(chamar).toHaveBeenNthCalledWith(
      2,
      'admin-fotos',
      { acao: 'reordenar', produto_id: 'p1', ids: ['f2', 'f1'] },
      { autenticado: true },
    );
  });
});
