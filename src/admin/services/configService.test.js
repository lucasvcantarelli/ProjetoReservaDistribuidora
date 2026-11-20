import { describe, expect, it, vi } from 'vitest';
import { apiAdmin } from './apiAdmin.js';
import { configService } from './configService.js';

const espiar = () => vi.spyOn(apiAdmin, 'chamar').mockResolvedValue({});

describe('configService', () => {
  it('obter e editar usam admin-config com a ação', async () => {
    const chamar = espiar();
    await configService.obter();
    await configService.editar({ whatsapp: '5581999990000' });
    expect(chamar.mock.calls[0]).toEqual([
      'admin-config',
      { acao: 'obter' },
      { autenticado: true },
    ]);
    expect(chamar.mock.calls[1]).toEqual([
      'admin-config',
      { acao: 'editar', whatsapp: '5581999990000' },
      { autenticado: true },
    ]);
  });

  it('enviarLogo manda multipart com o campo "arquivo"', async () => {
    const chamar = espiar();
    await configService.enviarLogo(new Blob(['x'], { type: 'image/webp' }));
    const [funcao, corpo, opcoes] = chamar.mock.calls[0];
    expect(funcao).toBe('admin-config');
    expect(corpo).toBeUndefined();
    expect(opcoes.autenticado).toBe(true);
    expect(opcoes.formData.get('arquivo')).toBeInstanceOf(Blob);
    expect(opcoes.formData.get('acao')).toBe('enviar_logo');
  });
});
