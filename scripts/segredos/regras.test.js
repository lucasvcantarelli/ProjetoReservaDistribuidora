import { describe, it, expect } from 'vitest';
import { motivoArquivoProibido, procurarSegredos, valoresDoEnv } from './regras.js';

// Os exemplos são montados por partes para que este arquivo não dispare o próprio verificador.
const jwt = ['eyJ', 'hbGciOiJIUzI1NiJ9', '.eyJ', 'yb2xlIjoic2VydmljZSJ9', '.abcdefghijklmnop'].join(
  '',
);
const urlProjeto = `https://${'abcdefghij'.repeat(2)}.supa${'base.co'}`;
const emailReal = `fulano@${'gmail'}.com`;

const regras = (texto, opcoes) => procurarSegredos(texto, opcoes).map((a) => a.regra);

describe('motivoArquivoProibido', () => {
  it('bloqueia .env reais e chaves', () => {
    expect(motivoArquivoProibido('.env')).toMatch(/\.env/);
    expect(motivoArquivoProibido('.env.production')).toMatch(/\.env/);
    expect(motivoArquivoProibido('supabase/functions/.env')).toMatch(/\.env/);
    expect(motivoArquivoProibido('certs/site.pem')).toMatch(/chave/);
    expect(motivoArquivoProibido('.segredos-locais')).toMatch(/dados reais/);
    expect(motivoArquivoProibido('supabase/.temp/project-ref')).toMatch(/Supabase CLI/);
    expect(motivoArquivoProibido('marca-local/favicon.png')).toMatch(/marca do cliente/);
  });

  it('permite os modelos com valores fictícios', () => {
    expect(motivoArquivoProibido('.env.example')).toBeNull();
    expect(motivoArquivoProibido('.env.production.example')).toBeNull();
    expect(motivoArquivoProibido('supabase/functions/.env.example')).toBeNull();
    expect(motivoArquivoProibido('.env.verificacao')).toBeNull();
    expect(motivoArquivoProibido('src/App.jsx')).toBeNull();
  });
});

describe('procurarSegredos', () => {
  it('encontra chaves, URL real do Supabase e e-mail pessoal', () => {
    expect(regras(`const k = '${jwt}';`)).toContain(
      'token JWT (chave anon/service_role ou sessão)',
    );
    expect(regras(`url: ${urlProjeto}`)).toContain('URL de projeto real do Supabase');
    expect(regras(`contato: ${emailReal}`)).toContain('e-mail pessoal/real');
    expect(regras(`SMTP_PASS=${'minha'}SenhaForte9`)).toContain(
      'senha/chave atribuída diretamente',
    );
  });

  it('informa a linha e não reexibe o segredo inteiro', () => {
    const [achado] = procurarSegredos(`ok\nconst k = '${jwt}';`);
    expect(achado.linha).toBe(2);
    expect(achado.trecho).not.toContain(jwt);
  });

  it('ignora exemplos fictícios do projeto', () => {
    const texto = [
      'VITE_FUNCTIONS_URL=https://<projeto>.supabase.co/functions/v1',
      'secret = "env(SUPABASE_AUTH_EXTERNAL_APPLE_SECRET)"',
      'email: admin@x.com, joao@exemplo.com, contato@seudominio.com.br',
      'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
    ].join('\n');
    expect(procurarSegredos(texto)).toEqual([]);
  });

  it('bloqueia valores dos arquivos locais (.env / .segredos-locais)', () => {
    const valoresLocais = valoresDoEnv(
      'VITE_ADMIN_BASE=/adm-q8z3m1v7k2/\n# comentário\n(81) 98765-1234\nALLOWED_ORIGINS=http://localhost:5173',
    );
    expect(regras('basename: "adm-q8z3m1v7k2"', { valoresLocais })).toHaveLength(1);
    expect(regras('fone: (81) 98765-1234', { valoresLocais })).toHaveLength(1);
    expect(regras('http://localhost:5173', { valoresLocais })).toEqual([]);
  });
});
