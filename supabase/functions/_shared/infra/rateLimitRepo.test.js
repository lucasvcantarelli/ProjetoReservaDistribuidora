import { describe, expect, it } from 'vitest';
import {
  marcarSucesso,
  registrarTentativa,
  removerTentativa,
  verificarLimite,
} from './rateLimitRepo.js';

const MINUTO = 60 * 1000;
const AGORA = new Date('2026-11-19T12:00:00.000Z');
const haMinutos = (min) => ({ criado_em: new Date(AGORA.getTime() - min * MINUTO).toISOString() });

// Resultado do insert(...).select('id').single().
function cadeiaInsert(consulta, erro) {
  return {
    select(...args) {
      consulta.chamadas.push(['select', ...args]);
      return { single: () => Promise.resolve({ data: { id: 42 }, error: erro }) };
    },
  };
}

// db falso: registra a cadeia de chamadas e devolve as respostas na ordem das consultas.
function criarDbFalso({
  respostas = [],
  erroInsert = null,
  erroUpdate = null,
  erroDelete = null,
} = {}) {
  const consultas = [];
  return {
    consultas,
    from(tabela) {
      const consulta = { tabela, chamadas: [] };
      consultas.push(consulta);
      const resposta = respostas[consultas.length - 1] ?? { data: [], error: null };
      const cadeia = {
        then: (resolve, rejeitar) => Promise.resolve(resposta).then(resolve, rejeitar),
      };
      for (const metodo of [
        'select',
        'eq',
        'gte',
        'order',
        'limit',
        'insert',
        'update',
        'delete',
      ]) {
        cadeia[metodo] = (...args) => {
          consulta.chamadas.push([metodo, ...args]);
          if (metodo === 'insert') return cadeiaInsert(consulta, erroInsert);
          if (metodo === 'update' && erroUpdate) {
            return { eq: () => Promise.resolve({ error: erroUpdate }) };
          }
          if (metodo === 'delete' && erroDelete) {
            return { eq: () => Promise.resolve({ error: erroDelete }) };
          }
          return cadeia;
        };
      }
      return cadeia;
    },
  };
}

describe('verificarLimite', () => {
  it('login: consulta falhas por e-mail e por IP com filtros do query builder', async () => {
    const db = criarDbFalso();
    const r = await verificarLimite(
      db,
      { ip: '1.2.3.4', email: ' Ana@Ex.com ', acao: 'login' },
      AGORA,
    );
    expect(r).toEqual({ bloqueado: false });
    expect(db.consultas).toHaveLength(2);
    const desde = new Date(AGORA.getTime() - 15 * MINUTO).toISOString();
    expect(db.consultas[0]).toEqual({
      tabela: 'tentativas_login',
      chamadas: [
        ['select', 'criado_em'],
        ['eq', 'acao', 'login'],
        ['gte', 'criado_em', desde],
        ['eq', 'sucesso', false],
        ['eq', 'email', 'ana@ex.com'],
        ['order', 'criado_em', { ascending: false }],
        ['limit', 5],
      ],
    });
    expect(db.consultas[1].chamadas).toContainEqual(['eq', 'ip', '1.2.3.4']);
  });

  it('login: bloqueia quando o IP tem 5 falhas, mesmo com e-mail limpo', async () => {
    const db = criarDbFalso({
      respostas: [
        { data: [], error: null },
        { data: [1, 2, 3, 4, 5].map(haMinutos), error: null },
      ],
    });
    const r = await verificarLimite(db, { ip: '1.2.3.4', email: 'a@b.com', acao: 'login' }, AGORA);
    expect(r.bloqueado).toBe(true);
    expect(r.liberaEm).toEqual(new Date(AGORA.getTime() + 14 * MINUTO));
  });

  it('login: devolve a liberação mais tardia quando e-mail e IP bloqueiam', async () => {
    const db = criarDbFalso({
      respostas: [
        { data: [5, 6, 7, 8, 9].map(haMinutos), error: null },
        { data: [1, 2, 3, 4, 5].map(haMinutos), error: null },
      ],
    });
    const r = await verificarLimite(db, { ip: 'i', email: 'a@b.com', acao: 'login' }, AGORA);
    expect(r.liberaEm).toEqual(new Date(AGORA.getTime() + 14 * MINUTO));
  });

  it('pedido: conta todas as tentativas só por IP (sem filtro de sucesso)', async () => {
    const db = criarDbFalso({
      respostas: [{ data: Array.from({ length: 20 }, (_, i) => haMinutos(i + 1)), error: null }],
    });
    const r = await verificarLimite(db, { ip: '9.9.9.9', email: 'a@b.com', acao: 'pedido' }, AGORA);
    expect(r.bloqueado).toBe(true);
    expect(db.consultas).toHaveLength(1);
    const metodos = db.consultas[0].chamadas.map(([m, c]) => `${m}:${c}`);
    expect(metodos).toContain('eq:ip');
    expect(metodos).not.toContain('eq:sucesso');
    expect(metodos).not.toContain('eq:email');
  });

  it('recuperar: bloqueia com 3 tentativas por e-mail', async () => {
    const db = criarDbFalso({ respostas: [{ data: [1, 2, 3].map(haMinutos), error: null }] });
    const r = await verificarLimite(db, { ip: 'i', email: 'a@b.com', acao: 'recuperar' }, AGORA);
    expect(r.bloqueado).toBe(true);
  });

  it('recuperar: bloqueia com 10 tentativas por IP, mesmo com e-mail limpo', async () => {
    const db = criarDbFalso({
      respostas: [
        { data: [1, 2].map(haMinutos), error: null },
        { data: Array.from({ length: 10 }, (_, i) => haMinutos(i + 1)), error: null },
      ],
    });
    const r = await verificarLimite(db, { ip: 'i', email: 'a@b.com', acao: 'recuperar' }, AGORA);
    expect(r.bloqueado).toBe(true);
    expect(db.consultas[1].chamadas).toContainEqual(['limit', 10]);
  });

  it('pula a chave ausente (pedido sem IP não consulta)', async () => {
    const db = criarDbFalso();
    const r = await verificarLimite(db, { ip: null, acao: 'pedido' }, AGORA);
    expect(r).toEqual({ bloqueado: false });
    expect(db.consultas).toHaveLength(0);
  });

  it('login sem IP (null): consulta só por e-mail, sem balde compartilhado', async () => {
    const db = criarDbFalso();
    const r = await verificarLimite(db, { ip: null, email: 'a@b.com', acao: 'login' }, AGORA);
    expect(r).toEqual({ bloqueado: false });
    expect(db.consultas).toHaveLength(1);
    const colunas = db.consultas[0].chamadas.filter(([m]) => m === 'eq').map(([, c]) => c);
    expect(colunas).toContain('email');
    expect(colunas).not.toContain('ip');
  });

  it('propaga erro do banco', async () => {
    const db = criarDbFalso({ respostas: [{ data: null, error: { message: 'falhou' } }] });
    await expect(
      verificarLimite(db, { ip: 'i', email: 'a@b.com', acao: 'recuperar' }, AGORA),
    ).rejects.toThrow('falhou');
  });
});

describe('registrarTentativa', () => {
  it('insere com e-mail normalizado e ação (padrão login)', async () => {
    const db = criarDbFalso();
    await registrarTentativa(db, { ip: '1.2.3.4', email: ' Ana@Ex.com ', sucesso: false });
    expect(db.consultas[0]).toEqual({
      tabela: 'tentativas_login',
      chamadas: [
        ['insert', { ip: '1.2.3.4', email: 'ana@ex.com', sucesso: false, acao: 'login' }],
        ['select', 'id'],
      ],
    });
  });

  it('devolve o id da tentativa registrada', async () => {
    const id = await registrarTentativa(criarDbFalso(), { ip: 'i', sucesso: false });
    expect(id).toBe(42);
  });

  it('usa a ação informada e e-mail nulo quando ausente', async () => {
    const db = criarDbFalso();
    await registrarTentativa(db, { ip: 'i', sucesso: true, acao: 'recuperar' });
    expect(db.consultas[0].chamadas[0][1]).toEqual({
      ip: 'i',
      email: null,
      sucesso: true,
      acao: 'recuperar',
    });
  });

  it('grava ip nulo quando o IP é desconhecido', async () => {
    const db = criarDbFalso();
    await registrarTentativa(db, { ip: null, email: 'a@b.com', sucesso: false });
    expect(db.consultas[0].chamadas[0][1]).toMatchObject({ ip: null, email: 'a@b.com' });
  });

  it('propaga erro do banco', async () => {
    const db = criarDbFalso({ erroInsert: { message: 'sem acesso' } });
    await expect(
      registrarTentativa(db, { ip: 'i', email: 'a@b.com', sucesso: true }),
    ).rejects.toThrow('sem acesso');
  });
});

describe('marcarSucesso', () => {
  it('atualiza sucesso=true da tentativa pelo id', async () => {
    const db = criarDbFalso();
    await marcarSucesso(db, 42);
    expect(db.consultas[0].chamadas).toEqual([
      ['update', { sucesso: true }],
      ['eq', 'id', 42],
    ]);
  });

  it('propaga erro do banco', async () => {
    const db = criarDbFalso({ erroUpdate: { message: 'sem update' } });
    await expect(marcarSucesso(db, 1)).rejects.toThrow('sem update');
  });
});

describe('removerTentativa', () => {
  it('apaga a tentativa pelo id', async () => {
    const db = criarDbFalso();
    await removerTentativa(db, 42);
    expect(db.consultas[0]).toEqual({
      tabela: 'tentativas_login',
      chamadas: [['delete'], ['eq', 'id', 42]],
    });
  });

  it('propaga erro do banco', async () => {
    const db = criarDbFalso({ erroDelete: { message: 'sem delete' } });
    await expect(removerTentativa(db, 1)).rejects.toThrow('sem delete');
  });
});
