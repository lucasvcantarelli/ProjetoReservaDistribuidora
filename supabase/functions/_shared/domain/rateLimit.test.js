import { describe, expect, it } from 'vitest';
import {
  LIMITES,
  avaliarBloqueio,
  ipDaRequisicao,
  janelaDaAcao,
  normalizarEmail,
} from './rateLimit.js';

const MINUTO = 60 * 1000;
const AGORA = new Date('2026-11-19T12:00:00.000Z');
const haMinutos = (min) => ({ criado_em: new Date(AGORA.getTime() - min * MINUTO).toISOString() });

describe('avaliarBloqueio', () => {
  it('não bloqueia com 4 falhas em 15 min', () => {
    const falhas = [1, 2, 3, 4].map(haMinutos);
    expect(avaliarBloqueio(falhas, AGORA)).toEqual({ bloqueado: false });
  });

  it('bloqueia com 5 falhas e libera 15 min após a última', () => {
    const falhas = [1, 2, 3, 4, 5].map(haMinutos);
    const resultado = avaliarBloqueio(falhas, AGORA);
    expect(resultado.bloqueado).toBe(true);
    expect(resultado.liberaEm).toEqual(new Date(AGORA.getTime() - 1 * MINUTO + 15 * MINUTO));
  });

  it('não bloqueia com 5 falhas há 16 min', () => {
    const falhas = [16, 17, 18, 19, 20].map(haMinutos);
    expect(avaliarBloqueio(falhas, AGORA)).toEqual({ bloqueado: false });
  });

  it('ignora falhas fora da janela ao contar', () => {
    const falhas = [1, 2, 3, 4, 20].map(haMinutos);
    expect(avaliarBloqueio(falhas, AGORA).bloqueado).toBe(false);
  });

  it('usa a falha mais recente mesmo com lista fora de ordem', () => {
    const falhas = [5, 2, 4, 3, 6].map(haMinutos);
    expect(avaliarBloqueio(falhas, AGORA).liberaEm).toEqual(
      new Date(AGORA.getTime() + 13 * MINUTO),
    );
  });

  it('respeita opções personalizadas', () => {
    const tentativas = [1, 2, 3].map(haMinutos);
    const resultado = avaliarBloqueio(tentativas, AGORA, {
      maxFalhas: 3,
      janelaMin: 60,
      bloqueioMin: 60,
    });
    expect(resultado.bloqueado).toBe(true);
    expect(resultado.liberaEm).toEqual(new Date(AGORA.getTime() + 59 * MINUTO));
  });

  it('não bloqueia quando a última falha tem exatamente 15 min (limite da janela)', () => {
    const falhas = [15, 15, 15, 15, 15].map(haMinutos);
    expect(avaliarBloqueio(falhas, AGORA)).toEqual({ bloqueado: false });
  });

  it('lista vazia não bloqueia', () => {
    expect(avaliarBloqueio([], AGORA)).toEqual({ bloqueado: false });
  });
});

describe('ipDaRequisicao', () => {
  const requisicao = (cabecalhos) => ({
    headers: { get: (nome) => cabecalhos[nome] ?? null },
  });
  const comXff = (valor) => requisicao({ 'x-forwarded-for': valor });

  it('prefere cf-connecting-ip (sem espaços) ao x-forwarded-for', () => {
    const req = requisicao({ 'cf-connecting-ip': ' 203.0.113.7 ', 'x-forwarded-for': '9.9.9.9' });
    expect(ipDaRequisicao(req)).toBe('203.0.113.7');
  });

  it('aceita IPv6 em cf-connecting-ip', () => {
    expect(ipDaRequisicao(requisicao({ 'cf-connecting-ip': '2001:db8::1' }))).toBe('2001:db8::1');
  });

  it('ignora cf-connecting-ip com formato inválido e cai no x-forwarded-for', () => {
    const req = requisicao({ 'cf-connecting-ip': 'abc; drop', 'x-forwarded-for': '1.1.1.1' });
    expect(ipDaRequisicao(req)).toBe('1.1.1.1');
  });

  it('usa o ÚLTIMO item de x-forwarded-for (o primeiro pode ser forjado pelo cliente)', () => {
    expect(ipDaRequisicao(comXff('6.6.6.6, 5.5.5.5, 203.0.113.7'))).toBe('203.0.113.7');
  });

  it('remove espaços e aceita item único', () => {
    expect(ipDaRequisicao(comXff('  1.2.3.4  '))).toBe('1.2.3.4');
  });

  it('devolve null sem cabeçalho, vazio ou com último item inválido', () => {
    expect(ipDaRequisicao(requisicao({}))).toBeNull();
    expect(ipDaRequisicao(comXff(''))).toBeNull();
    expect(ipDaRequisicao(comXff('1.1.1.1, '))).toBeNull();
    expect(ipDaRequisicao(comXff('1.1.1.1, lixo'))).toBeNull();
    expect(ipDaRequisicao(comXff('999.1.1.1'))).toBeNull();
  });
});

describe('janelaDaAcao', () => {
  it('login: falhas por e-mail e IP em 15 min', () => {
    const janela = janelaDaAcao('login', AGORA);
    expect(janela).toMatchObject({
      apenasFalhas: true,
      chaves: ['email', 'ip'],
      maxFalhas: 5,
      janelaMin: 15,
    });
    expect(janela.desde).toBe(new Date(AGORA.getTime() - 15 * MINUTO).toISOString());
  });

  it('recuperar: todas as tentativas, máximo 3 por e-mail e 10 por IP em 60 min', () => {
    expect(janelaDaAcao('recuperar', AGORA)).toMatchObject({
      apenasFalhas: false,
      chaves: ['email', 'ip'],
      maxFalhas: 3,
      maxPorChave: { ip: 10 },
      janelaMin: 60,
    });
  });

  it('pedido: todas as tentativas, máximo 20 por IP em 60 min', () => {
    expect(janelaDaAcao('pedido', AGORA)).toMatchObject({
      apenasFalhas: false,
      chaves: ['ip'],
      maxPorChave: { ip: 20 },
      janelaMin: 60,
    });
  });

  it('pedido bloqueia na 21ª tentativa da hora', () => {
    const limite = janelaDaAcao('pedido', AGORA);
    const opcoes = { ...limite, maxFalhas: limite.maxPorChave.ip };
    const tentativa = { criado_em: new Date(AGORA.getTime() - 5 * MINUTO).toISOString() };
    expect(avaliarBloqueio(Array(19).fill(tentativa), AGORA, opcoes).bloqueado).toBe(false);
    expect(avaliarBloqueio(Array(20).fill(tentativa), AGORA, opcoes).bloqueado).toBe(true);
  });

  it('rejeita ação desconhecida', () => {
    expect(() => janelaDaAcao('xpto', AGORA)).toThrow();
    expect(Object.keys(LIMITES)).toEqual(['login', 'recuperar', 'pedido']);
  });
});

describe('normalizarEmail', () => {
  it('minúsculo e sem espaços; vazio vira null', () => {
    expect(normalizarEmail('  Ana@Ex.COM ')).toBe('ana@ex.com');
    expect(normalizarEmail('')).toBeNull();
    expect(normalizarEmail(undefined)).toBeNull();
  });
});
