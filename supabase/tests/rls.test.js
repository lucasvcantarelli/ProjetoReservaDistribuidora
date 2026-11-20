// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const URL_BASE = process.env.SUPABASE_URL;
const ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const TABELAS = [
  'categorias',
  'produtos',
  'produto_fotos',
  'produto_variacoes',
  'clientes',
  'admins',
  'config_empresa',
  'tentativas_login',
];
const SLUG_TESTE = 'teste-rls-categoria';

async function lerComoVazio(resposta) {
  if (resposta.status === 200) return resposta.json();
  expect([401, 403]).toContain(resposta.status);
  return [];
}

function rest(caminho, { chave, metodo = 'GET', corpo } = {}) {
  return fetch(`${URL_BASE}/rest/v1/${caminho}`, {
    method: metodo,
    headers: {
      apikey: chave,
      Authorization: `Bearer ${chave}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
}

describe.skipIf(process.env.SUPABASE_LOCAL !== '1')(
  'RLS: tabelas inacessíveis pela API pública',
  () => {
    afterAll(async () => {
      await rest(`categorias?slug=eq.${SLUG_TESTE}`, { chave: SERVICE_KEY, metodo: 'DELETE' });
    });

    it('anon lê array vazio mesmo após inserir via service role', async () => {
      const inserida = await rest('categorias', {
        chave: SERVICE_KEY,
        metodo: 'POST',
        corpo: { nome: 'Teste RLS', slug: SLUG_TESTE },
      });
      expect(inserida.status).toBe(201);

      const resposta = await rest('categorias', { chave: ANON_KEY });
      expect(await lerComoVazio(resposta)).toEqual([]);
    });

    it('service role enxerga a linha inserida', async () => {
      const resposta = await rest(`categorias?slug=eq.${SLUG_TESTE}`, { chave: SERVICE_KEY });
      expect(await resposta.json()).toHaveLength(1);
    });

    it('anon não consegue inserir (401/403)', async () => {
      const resposta = await rest('categorias', {
        chave: ANON_KEY,
        metodo: 'POST',
        corpo: { nome: 'Invasora', slug: 'invasora' },
      });
      expect([401, 403]).toContain(resposta.status);
    });

    it.each(TABELAS)('anon não lê nada de %s', async (tabela) => {
      const resposta = await rest(tabela, { chave: ANON_KEY });
      expect(await lerComoVazio(resposta)).toEqual([]);
    });

    it('bucket produtos existe e é público; anon não escreve nele', async () => {
      const bucket = await fetch(`${URL_BASE}/storage/v1/bucket/produtos`, {
        headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
      });
      expect((await bucket.json()).public).toBe(true);

      const envio = await fetch(`${URL_BASE}/storage/v1/object/produtos/invasor.txt`, {
        method: 'POST',
        headers: {
          apikey: ANON_KEY,
          Authorization: `Bearer ${ANON_KEY}`,
          'Content-Type': 'text/plain',
        },
        body: 'x',
      });
      expect(envio.ok).toBe(false);
    });

    describe('constraints (via service role)', () => {
      let produtoId;
      const clientesCriados = [];

      async function inserirCliente(extra) {
        const resposta = await rest('clientes', {
          chave: SERVICE_KEY,
          metodo: 'POST',
          corpo: { nome: 'Cliente Teste', tipo_pessoa: 'PF', ...extra },
        });
        if (resposta.status === 201) clientesCriados.push((await resposta.clone().json())[0].id);
        return resposta;
      }

      const inserirVariacao = (extra) =>
        rest('produto_variacoes', {
          chave: SERVICE_KEY,
          metodo: 'POST',
          corpo: { produto_id: produtoId, nome_tamanho: '350ml', ...extra },
        });

      beforeAll(async () => {
        const resposta = await rest('produtos', {
          chave: SERVICE_KEY,
          metodo: 'POST',
          corpo: { nome: 'Produto Teste RLS' },
        });
        produtoId = (await resposta.json())[0].id;
      });

      afterAll(async () => {
        await rest(`produtos?id=eq.${produtoId}`, { chave: SERVICE_KEY, metodo: 'DELETE' });
        for (const id of clientesCriados) {
          await rest(`clientes?id=eq.${id}`, { chave: SERVICE_KEY, metodo: 'DELETE' });
        }
      });

      it('rejeita variação que vende unidade sem preço', async () => {
        expect((await inserirVariacao({ vende_unidade: true })).status).toBe(400);
      });

      it('rejeita fardo com qtd_por_fardo 1', async () => {
        const resposta = await inserirVariacao({
          vende_fardo: true,
          preco_fardo_centavos: 1000,
          qtd_por_fardo: 1,
        });
        expect(resposta.status).toBe(400);
      });

      it('rejeita variação sem nenhuma forma de venda', async () => {
        expect((await inserirVariacao({})).status).toBe(400);
      });

      it('aceita variação válida por unidade', async () => {
        const resposta = await inserirVariacao({
          vende_unidade: true,
          preco_unidade_centavos: 250,
        });
        expect(resposta.status).toBe(201);
      });

      it('rejeita PJ sem razão social (NULL)', async () => {
        expect((await inserirCliente({ tipo_pessoa: 'PJ' })).status).toBe(400);
      });

      it('aceita PF sem razão social', async () => {
        expect((await inserirCliente({ tipo_pessoa: 'PF' })).status).toBe(201);
      });

      it('dois clientes sem CPF/CNPJ (NULL) coexistem, sem conta no Auth', async () => {
        const primeira = await inserirCliente({ cpf_cnpj: null });
        const segunda = await inserirCliente({ cpf_cnpj: null });
        expect(primeira.status).toBe(201);
        expect(segunda.status).toBe(201);
      });

      it('CPF/CNPJ preenchido continua único', async () => {
        const documento = '52998224725';
        expect((await inserirCliente({ cpf_cnpj: documento })).status).toBe(201);
        expect((await inserirCliente({ cpf_cnpj: documento })).status).toBe(409);
      });

      it('rejeita documento vazio ou fora de 11/14 dígitos', async () => {
        expect((await inserirCliente({ cpf_cnpj: '' })).status).toBe(400);
        expect((await inserirCliente({ cpf_cnpj: '123' })).status).toBe(400);
      });

      it('ficha guarda nome fantasia e observações (padrão vazio)', async () => {
        const resposta = await inserirCliente({ nome_fantasia: 'Loja X' });
        const [cliente] = await resposta.json();
        expect(cliente).toMatchObject({ nome_fantasia: 'Loja X', observacoes: '' });
      });

      it('anon não lê clientes mesmo havendo fichas', async () => {
        expect((await inserirCliente({})).status).toBe(201);
        expect(await lerComoVazio(await rest('clientes', { chave: ANON_KEY }))).toEqual([]);
      });

      it('tentativas_login aceita a ação pedido', async () => {
        const resposta = await rest('tentativas_login', {
          chave: SERVICE_KEY,
          metodo: 'POST',
          corpo: { ip: '203.0.113.9', sucesso: true, acao: 'pedido' },
        });
        expect(resposta.status).toBe(201);
        await rest('tentativas_login?ip=eq.203.0.113.9', { chave: SERVICE_KEY, metodo: 'DELETE' });
      });
    });
  },
);
