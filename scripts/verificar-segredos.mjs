// Verificador de segredos: impede que chaves, .env reais, dados reais e o caminho secreto
// do painel entrem em um commit (o repositório é público).
//
// Uso:
//   node scripts/verificar-segredos.mjs          -> confere o que está em stage (hook pre-commit)
//   node scripts/verificar-segredos.mjs --tudo   -> confere todos os arquivos versionados
//
// Além das regras fixas, bloqueia qualquer valor dos seus arquivos locais (que nunca vão
// para o git): .env, .env.local, .env.production, supabase/functions/.env e .segredos-locais
// (uma linha por dado real: telefone, e-mail, CNPJ, domínio...).

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { motivoArquivoProibido, procurarSegredos, valoresDoEnv } from './segredos/regras.js';

const ARQUIVOS_LOCAIS = [
  '.env',
  '.env.local',
  '.env.production',
  '.env.production.local',
  'supabase/functions/.env',
  '.segredos-locais',
];

const git = (args, opcoes = {}) =>
  execFileSync('git', args, { maxBuffer: 64 * 1024 * 1024, ...opcoes });

function valoresLocais() {
  const valores = new Set();
  for (const arquivo of ARQUIVOS_LOCAIS) {
    if (!existsSync(arquivo)) continue;
    for (const v of valoresDoEnv(readFileSync(arquivo, 'utf8'))) valores.add(v);
  }
  return valores;
}

const tudo = process.argv.includes('--tudo');
const arquivos = (
  tudo
    ? git(['ls-files', '-z'])
    : git(['diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z'])
)
  .toString('utf8')
  .split('\0')
  .filter(Boolean);

// Em stage, lê o conteúdo que realmente vai para o commit (não o da pasta de trabalho).
function conteudo(caminho) {
  if (tudo) return existsSync(caminho) ? readFileSync(caminho) : null;
  return git(['show', `:${caminho}`]);
}

const valores = valoresLocais();
const problemas = [];

for (const caminho of arquivos) {
  const motivo = motivoArquivoProibido(caminho);
  if (motivo) {
    problemas.push(`${caminho}: ${motivo} — este arquivo não pode ser versionado`);
    continue;
  }
  const bytes = conteudo(caminho);
  if (!bytes || bytes.includes(0)) continue; // apagado ou binário (imagem, fonte...)
  for (const { linha, regra, trecho } of procurarSegredos(bytes.toString('utf8'), {
    valoresLocais: valores,
  })) {
    problemas.push(`${caminho}:${linha}: ${regra} [${trecho}]`);
  }
}

if (problemas.length) {
  console.error('\n✖ Commit bloqueado: possível vazamento de dados sensíveis.\n');
  for (const p of problemas) console.error(`  - ${p}`);
  console.error(
    '\nRemova o dado do arquivo (use variáveis de ambiente / o painel admin) e tente de novo.\n' +
      'Para tirar um arquivo do stage: git restore --staged <arquivo>\n',
  );
  process.exit(1);
}

console.log(
  `✔ Verificação de segredos: ${arquivos.length} arquivo(s) conferido(s), nada sensível encontrado.`,
);
