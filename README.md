# Reserva Distribuidora

Catálogo online (loja) e painel administrativo da Reserva Distribuidora, em React (JavaScript puro)
com back-end em Supabase Edge Functions. O navegador só conversa com as funções via `fetch`; nunca
usa `supabase-js` nem chave anon.

São dois aplicativos independentes, com builds separados:

- **Loja** (`loja.html`, código em `src/loja`) — saída em `dist/loja`.
- **Admin** (`admin.html`, código em `src/admin`) — saída em `dist/admin`, publicado em um caminho
  configurável (`VITE_ADMIN_BASE`). O código do admin nunca entra no bundle da loja.

Código usado pelos dois fica em `src/shared`.

## Pré-requisitos

- Node.js 20 ou superior (testado com Node 24 e npm 11)
- npm

## Instalação

```bash
npm install
cp .env.example .env.local   # ajuste as variáveis se necessário
```

Variáveis de ambiente (veja `.env.example`):

- `VITE_FUNCTIONS_URL` — URL base das Edge Functions.
- `VITE_ADMIN_BASE` — caminho do painel admin (ex.: `/painel-exemplo/`).

## Desenvolvimento

```bash
npm run dev:loja    # http://localhost:5173/
npm run dev:admin   # http://localhost:5174/admin.html (respeita VITE_ADMIN_BASE)
```

## Testes

```bash
npm test            # executa uma vez
npm run test:watch  # modo observação
```

Os testes ficam ao lado do código (`*.test.js` / `*.test.jsx`).

## Lint e formatação

```bash
npm run lint
npm run format
```

## Build

```bash
npm run build:loja    # gera dist/loja
npm run build:admin   # gera dist/admin
npm run build         # os dois
npm run verificar     # segredos + lint + testes + os dois builds (com valores fictícios de .env.verificacao)
```

Cada config do Vite (`vite.loja.config.js`, `vite.admin.config.js`) usa seu HTML de entrada
(`loja.html` / `admin.html`) e o plugin `vite.html-como-index.js` o grava como `index.html` na
pasta de saída, pronto para publicar como site independente.

## Banco de dados local

Requer Docker Desktop em execução. A CLI do Supabase roda via `npx supabase` (não precisa instalar).

```bash
npx supabase start        # sobe o Supabase local (Postgres, Auth, Storage, Studio)
npx supabase db reset     # recria o banco: aplica as migrations e o seed
npx supabase stop         # derruba os containers
```

O esquema está em `supabase/migrations/20261119000000_schema.sql`. Todas as tabelas têm RLS ligado
e nenhuma policy (a API REST pública não enxerga nada); só as Edge Functions acessam os dados, com
a chave `service_role`. O bucket de Storage `produtos` é público para leitura e não tem policies
de escrita. O seed (`supabase/seed.sql`) cria apenas a linha vazia de `config_empresa`.

### Teste de RLS

O teste `supabase/tests/rls.test.js` só roda com `SUPABASE_LOCAL=1` e precisa do Supabase local
ativo. Ele lê `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` do ambiente. Para
obter os valores: `npx supabase status -o env` (use `API_URL`, `ANON_KEY` e `SERVICE_ROLE_KEY`).

```bash
# bash
SUPABASE_LOCAL=1 SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_ANON_KEY=<ANON_KEY> \
SUPABASE_SERVICE_ROLE_KEY=<SERVICE_ROLE_KEY> npx vitest run supabase/tests
```

Sem `SUPABASE_LOCAL=1` o teste é ignorado, então `npm test` continua funcionando sem Docker.

### Criar um administrador

1. Abra o Studio (http://127.0.0.1:54323) → Authentication → Users → Add user, e copie o UUID.
2. No SQL Editor do Studio, execute: `insert into admins (user_id) values ('<uuid>');`

## Funções (Edge Functions)

O navegador só fala com as Edge Functions em `supabase/functions/` (JavaScript, Deno). Contrato:
sempre `POST` JSON `{ acao, ...dados }`; sucesso `200 { ok: true, dados }`; erro
`{ ok: false, erro, campos? }`. Funções atuais: `catalogo` (`categorias`, `produtos`, `produto`), `config-publica`, as de
autenticação (só do administrador), as do pedido (públicas, sem conta de cliente) e as de
administração (abaixo).

Variáveis locais ficam em `supabase/functions/.env` (ignorado pelo git; modelo em
`supabase/functions/.env.example`): `ALLOWED_ORIGINS` (origens CORS, separadas por vírgula) e
`PUBLIC_SUPABASE_URL` (URL do Supabase acessível pelo navegador, usada nas URLs públicas de fotos) e
`ADMIN_URL` (endereço do painel, sem barra no final; o link de recuperação de senha aponta para `ADMIN_URL/nova-senha`; local: `http://localhost:5174/painel-exemplo`).
O gateway local (Kong) devolve `Access-Control-Allow-Origin: *` por conta própria; a regra real de
CORS da função é testada em `supabase/functions/_shared/infra/http.test.js`.

### Autenticação (só do administrador)

A loja **não tem contas de cliente**: login, renovação de sessão e recuperação de senha existem só
para o administrador (tabela `admins`).

| Função                 | Entrada                                                 | Resultado                                                                                                                                                     |
| ---------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `auth-login`           | `{ email, senha, painel: 'admin' }`                     | `{ sessao, usuario }`; qualquer outro `painel` → 400 "Painel inválido."; falha ou usuário que não é admin → 401 "E-mail ou senha inválidos."; bloqueado → 429 |
| `auth-refresh`         | `{ refresh_token }`                                     | nova `sessao`; inválido → 401                                                                                                                                 |
| `auth-logout`          | header `Authorization: Bearer <access_token>`           | encerra a sessão (200 mesmo com token já inválido)                                                                                                            |
| `auth-recuperar-senha` | `{ email }`                                             | sempre 200 com a mesma mensagem; só envia o e-mail se for de um administrador e estiver dentro do limite (local: Mailpit em http://127.0.0.1:54324)           |
| `auth-nova-senha`      | `{ access_token, senha }` (token vem do link do e-mail) | troca a senha; token que não é de recuperação ou de quem não é admin → 401                                                                                    |

`sessao` = `{ access_token, refresh_token, expires_at }`; `usuario` = `{ id, email, nome, papel }`
(nome `Administrador`, papel `admin`). Limites (falha fechada: se o controle de tentativas estiver
fora do ar, o login responde 503): login 5 falhas/15 min por e-mail ou IP, recuperação 3/hora por
e-mail e 10/hora por IP.

### Pedido (público, sem conta)

Funções públicas, sem `Authorization`. O pedido e os dados do cliente **não são salvos**: ficam só na
mensagem do WhatsApp. A pessoa física **nunca informa CPF**; a pessoa jurídica informa razão social e
CNPJ.

| Função            | Entrada                                         | Resultado                                                                                                                                                                                                                                                                                                                     |
| ----------------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pedido-revisar`  | `{ itens, precos_vistos }`                      | `{ itens, divergencias, total_centavos }` com os preços do banco                                                                                                                                                                                                                                                              |
| `pedido-whatsapp` | `{ itens, precos_vistos, observacao, cliente }` | `{ link }` (`https://wa.me/55...`); `cliente` inválido → 400 com `campos` (`nome`, `telefone`, `cep`, `rua`, `numero`, `bairro`, `cidade`, `uf`; PJ também `razao_social` e `cpf_cnpj`); divergências → 409 com `dados`; observação > 500 caracteres → 400; sem WhatsApp → 503; mais de 20 pedidos por hora do mesmo IP → 429 |

O limite de 20 pedidos/hora por IP guarda só o IP e o instante (tabela `tentativas_login`, ação
`pedido`), nunca dados do cliente; se o controle de limite estiver fora do ar, o pedido responde 503.

Em produção, defina `ADMIN_URL` nas variáveis das funções (sem ela o e-mail de recuperação não é
enviado) e, no painel do Supabase (Authentication → URL Configuration), ajuste a Site URL e inclua
`<ADMIN_URL>/nova-senha` em Redirect URLs; desative também "Allow new users to sign up" (localmente
`enable_signup = false` em `config.toml`): ninguém se cadastra, o único usuário é o administrador.

### Administração: categorias, produtos e fotos

Exigem `Authorization: Bearer <access_token>` de um administrador (sem token → 401; usuário que não é admin → 403).
As listagens incluem itens inativos. Preços sempre em **centavos inteiros**.

| Função             | Entrada                                                                     | Resultado                                                                                                                                      |
| ------------------ | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `admin-categorias` | `listar`, `criar { nome }`, `editar { id, nome?, ativo?, ordem? }`          | slug gerado a partir do nome (sem acentos; conflito vira `-2`, `-3`...) e mantido ao renomear                                                  |
| `admin-categorias` | `excluir { id }`, `reordenar { ids[] }`                                     | excluir com produtos → 409 "Esta categoria tem produtos. Mova ou exclua os produtos antes."; `reordenar` grava `ordem` = posição               |
| `admin-produtos`   | `listar { busca?, categoria_id?, pagina? }`, `obter { id }`                 | 24 por página; `listar` inclui `total_variacoes`; `obter` traz fotos (com `id` e `url`) e variações                                            |
| `admin-produtos`   | `criar { produto, variacoes[] }`, `editar { id, produto, variacoes[] }`     | variações sem `id` são criadas, com `id` atualizadas e ausentes removidas, tudo numa transação (RPC `admin_salvar_produto`); erros em `campos` |
| `admin-produtos`   | `excluir { id }`                                                            | remove o produto, variações, fotos e os arquivos do Storage                                                                                    |
| `admin-fotos`      | `multipart/form-data` com `produto_id` e `arquivo` (enviar)                 | tipo detectado pelos bytes (jpg/png/webp), até 5 MB, no máximo 10 fotos por produto; devolve `{ id, produto_id, ordem, url }`                  |
| `admin-fotos`      | JSON `{ acao: 'remover', id }` e `{ acao: 'reordenar', produto_id, ids[] }` | `reordenar` exige todas as fotos do produto, na nova ordem                                                                                     |

Limites do produto: nome 120, descrição 2000, tamanho da variação 40 caracteres; até 30 variações.

### Administração: clientes e configurações

Mesma autenticação das funções acima (administrador; sem token → 401, usuário que não é admin → 403).

`clientes` é o **cadastro interno** do administrador (sem vínculo com contas; nada vem da loja). A
ficha tem: tipo de pessoa, nome do cliente/responsável, razão social (PJ), nome fantasia, CPF/CNPJ
(opcional), e-mail, telefone, endereço e observações (até 1000 caracteres).

| Função           | Entrada                                                                                  | Resultado                                                                                                                                                                                                                                                                                                |
| ---------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `admin-clientes` | `listar { busca?, pagina? }`                                                             | 24 por página, `{ itens, total }` (id, tipo, nome, razão social, nome fantasia, documento e telefone formatados, e-mail, cidade, UF); `total` sem busca = todos os cadastrados; busca só com números/pontuação procura em documento e telefone (dígitos), senão em nome, razão social, fantasia e e-mail |
| `admin-clientes` | `obter { id }`                                                                           | ficha completa (inclui `observacoes`) com `cpf_cnpj` formatado; inexistente → 404                                                                                                                                                                                                                        |
| `admin-clientes` | `criar { dados }`                                                                        | só tipo e nome são obrigatórios; PJ exige razão social (PF a descarta); documento vazio vira `null`, preenchido precisa ser CPF (PF) ou CNPJ (PJ); documento repetido → 409 em `campos.cpf_cnpj`; erros em `campos`                                                                                      |
| `admin-clientes` | `editar { id, dados }`                                                                   | edição parcial, conferida com o tipo guardado (documento CPF↔PF e CNPJ↔PJ; PJ nunca sem razão social); trocar para PF limpa razão social e nome fantasia; documento repetido → 409                                                                                                                       |
| `admin-clientes` | `excluir { id }`                                                                         | apaga a ficha (404 se não existir); não afeta nada da loja                                                                                                                                                                                                                                               |
| `admin-config`   | `obter`, `editar { nome, cnpj, whatsapp, endereco, rodape_mensagem, email_privacidade }` | WhatsApp vira só dígitos com `55` (12–13 dígitos; vazio limpa); CNPJ opcional e válido, guardado em dígitos; `email_privacidade` (contato LGPD) é um e-mail válido ou vazio (`null`); `obter`/`editar` devolvem também `logo_url`                                                                        |
| `admin-config`   | `multipart/form-data` com `arquivo` (e `acao=enviar_logo`, opcional)                     | mesmas regras de imagem das fotos (jpg/png/webp pelos bytes, até 5 MB); grava `config/logo-<uuid>.<ext>` no bucket `produtos` e remove o logo anterior                                                                                                                                                   |

`config-publica` também devolve `cnpj` (só dígitos) e `email_privacidade`, usados na Política de Privacidade.

A busca de clientes por texto faz uma consulta por coluna (nome, razão social, fantasia e e-mail), une os
resultados e pagina em memória, considerando no máximo 500 resultados por consulta; a busca por
dígitos faz o mesmo em `cpf_cnpj` e `telefone`.

### Servir e testar localmente

```bash
npx supabase start               # banco local
npx supabase functions serve     # terminal 1: serve as funções (lê supabase/functions/.env)

# terminal 2 (bash): carrega API_URL, SERVICE_ROLE_KEY etc. e roda os testes de integração
eval "$(npx supabase status -o env | sed 's/^/export /')"
node scripts/testar-funcoes.mjs
```

O script cria os próprios dados (categoria e produtos de teste) via service role, imprime
`PASS`/`FAIL` por caso, apaga os dados ao final e sai com código diferente de zero se algo falhar.
Para novos casos, acrescente `{ nome, executar }` à lista `casos` do script.

## Privacidade (LGPD)

A loja e o painel têm uma **Política de Privacidade e Cookies** e um aviso na primeira visita.

- **Política**: `/privacidade` na loja e no painel (no painel abre sem login). O texto fica em
  `src/shared/components/PoliticaPrivacidade/` (a data "Última atualização" é a constante
  `ULTIMA_ATUALIZACAO` em `constantes.js`; atualize-a sempre que mudar o texto). Há link no rodapé da
  loja, ao lado de "Lembrar meus dados neste aparelho", na tela de login e no menu do painel.
- **Aviso**: faixa fixa no rodapé da tela, que não bloqueia a página. "Entendi" grava
  `reserva.aviso-privacidade`; se o navegador bloquear o armazenamento, o aviso só some na sessão.
- **O que a política afirma** (confira se continua verdadeiro ao mudar o site): nenhum cookie, nem de
  rastreamento nem de publicidade; só `localStorage`/`sessionStorage` (`reserva.carrinho`,
  `reserva.dados-cliente`, `reserva.confirmacaoPedido`, `reserva.aviso-privacidade` e, no painel,
  `reserva.admin.sessao`); os dados digitados no pedido não são salvos no servidor; o cadastro de
  clientes é interno e manual; Supabase é o operador dos dados; as tentativas de login e de recuperação de senha do painel e o limite de
  pedidos guardam IP (e e-mail, no painel) por até 2 dias (a limpeza diária apaga o que tem mais de 1 dia). Se criar outra chave de armazenamento, inclua-a
  na tabela (`ITENS_ARMAZENAMENTO`); um teste confere a lista com as chaves reais.
- **Contato do titular**: defina o e-mail em **Configurações → E-mail para assuntos de privacidade
  (LGPD)**. Sem ele, a política indica o WhatsApp da empresa; sem os dois, "os canais de atendimento da
  empresa". Informe também o CNPJ e o endereço em Configurações para aparecerem em "Quem somos".

> Este texto é um modelo e não substitui orientação jurídica. **Revise-o com um advogado** antes de
> divulgar o site e ajuste-o à realidade da empresa (por exemplo, prazos de guarda e base legal).

## Segurança do repositório (ele é público)

Nada real fica no código: chaves e URLs do Supabase ficam em `.env.production` e nos secrets das
funções; telefone, e-mail, endereço, CNPJ e logo da empresa são cadastrados **no painel admin** e
ficam no banco. Os arquivos versionados só têm valores fictícios.

Para não vazar nada por engano, todo `git commit` passa pelo hook `.githooks/pre-commit`
(instalado automaticamente pelo `npm install`; ou rode `git config core.hooksPath .githooks`), que
roda `scripts/verificar-segredos.mjs` e **bloqueia o commit** se encontrar:

- arquivos `.env` reais (`.env`, `.env.production`, `supabase/functions/.env`…), chaves `.pem`/`.key`;
- tokens JWT (chaves anon/service_role), chaves `sb_secret_`/`sb_publishable_`, URL real de projeto
  Supabase, chaves de GitHub/AWS/Google/Stripe/OpenAI, strings de conexão com senha;
- e-mails pessoais (gmail, hotmail, outlook, uol…);
- **qualquer valor** dos seus arquivos locais `.env*`, `supabase/functions/.env` e `.segredos-locais` —
  inclusive o caminho secreto do painel.

`.segredos-locais` (ignorado pelo git) é uma lista sua, uma linha por dado real que nunca pode ir
para o GitHub: telefone, e-mail, CNPJ, domínio. Para conferir o repositório inteiro: `npm run segredos`.

> Dica: no GitHub, ative também **Settings → Code security → Secret scanning / Push protection**
> (grátis em repositórios públicos).

## Colocar no ar

Guia passo a passo para publicar o site. A hospedagem é a **Locaweb compartilhada** (só arquivos
estáticos, enviados por FTP) e o "cérebro" do site fica no **Supabase** (banco, login, fotos e
funções). Troque `seudominio.com.br` pelo seu domínio e `<ref>` pelo código do seu projeto Supabase.
Os comandos devem ser digitados no terminal, dentro da pasta do projeto.

### 1. Criar o projeto no Supabase

1. Crie uma conta em https://supabase.com e clique em **New project** (o plano gratuito serve).
2. Escolha um nome, uma senha forte para o banco (guarde-a) e a região mais próxima (ex.: São Paulo).
3. Quando o projeto ficar pronto, anote:
   - a **URL**: `https://<ref>.supabase.co`;
   - o **Reference ID** (`<ref>`), em Project Settings → General.

### 2. Conectar o projeto e criar o banco

```bash
npx supabase login
npx supabase link --project-ref <ref>
npx supabase db push --remote --include-seed
```

O primeiro comando abre o navegador para você entrar. O último cria todas as tabelas na nuvem.
Na CLI 3.x, sem `--remote` o `db push` vai para o banco **local** (Docker) e não faz nada na nuvem;
`--include-seed` cria a linha de configuração da empresa (`supabase/seed.sql`), sem a qual o site não
carrega. Para simular antes, acrescente `--dry-run`.

### 3. Configurar os segredos das funções

```bash
npx supabase secrets set ALLOWED_ORIGINS=https://seudominio.com.br ADMIN_URL=https://seudominio.com.br/<seu-caminho-secreto> PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
```

- `ALLOWED_ORIGINS`: de onde o site pode falar com as funções (se usar também `www`, separe por
  vírgula: `https://seudominio.com.br,https://www.seudominio.com.br`).
- `ADMIN_URL`: endereço do painel, igual ao `VITE_ADMIN_BASE` (sem barra no final). O link de "esqueci
  minha senha" aponta para `ADMIN_URL/nova-senha`; sem esta variável o e-mail de recuperação não é enviado.
- `PUBLIC_SUPABASE_URL`: usado nos endereços das fotos. Precisa ser exatamente `https://<ref>.supabase.co`
  (sem barra no final), a mesma origem do `VITE_FUNCTIONS_URL`; senão as fotos são bloqueadas pelo navegador.

### 4. Publicar as funções

```bash
npx supabase functions deploy
```

Isso envia todas as funções de uma vez. As regras de `supabase/config.toml` (como `verify_jwt = false`,
que deixa a loja chamar as funções públicas) são aplicadas automaticamente.

### 5. Ajustes de login no painel do Supabase

Em **Authentication** no painel do Supabase:

1. Na configuração de login por e-mail (Sign In / Providers → Email): desative **Allow new users to
   sign up** (não existe cadastro de clientes; só o administrador tem conta) e desative **Confirm
   email**.
2. Em **URL Configuration**: em **Site URL** coloque `https://seudominio.com.br` e, em **Redirect
   URLs**, adicione `https://seudominio.com.br/<seu-caminho-secreto>/nova-senha` (troque pelo seu `VITE_ADMIN_BASE`). Se o
   seu domínio usa `www`, adicione também `https://www.seudominio.com.br/<seu-caminho-secreto>/nova-senha` (a
   lista precisa ter cada endereço exato). O caminho escondido do painel aparece aí e no e-mail de
   recuperação; isso é aceitável, pois só o administrador recebe esse e-mail.
3. Em **Authentication → Rate Limits**, aumente os limites de **sign-in/sign-ups** e de **token
   refresh** se quiser folga. O navegador não fala direto com o Supabase Auth; quem fala são as
   nossas funções, então logins e renovações de sessão do painel chegam ao Supabase vindos dos mesmos
   endereços (os das funções) e dividem o mesmo limite. Como só o administrador entra, o padrão
   costuma bastar. (Se aparecer "Serviço indisponível", o painel mostra essa mensagem e **não**
   conta como senha errada.)

### 6. Criar o usuário administrador

1. Em **Authentication → Users → Add user**, crie o usuário com o seu e-mail e uma senha forte
   (marque "Auto Confirm User"). Copie o **UUID** que aparece na lista.
2. Em **SQL Editor**, rode (trocando o UUID):

```sql
insert into admins (user_id) values ('<uuid>');
```

### 7. E-mail próprio (SMTP da Locaweb) — pode ser feito depois, mas **antes de divulgar o site**

Sem isso, os e-mails de "esqueci minha senha" só chegam para a equipe do projeto no Supabase (o
envio padrão dele é limitado a esses endereços). Antes de abrir o site para clientes:

1. No painel da Locaweb, crie (ou use) uma conta de e-mail, ex.: `contato@seudominio.com.br`, e anote
   servidor (host), porta, usuário e senha do envio (SMTP).
2. No Supabase: **Authentication → SMTP Settings → Enable Custom SMTP** e preencha host, porta,
   usuário, senha, e-mail do remetente e um nome (ex.: Reserva Distribuidora).

### 8. Gerar os arquivos do site

1. Copie `.env.production.example` para `.env.production` e preencha:

```
VITE_FUNCTIONS_URL=https://<ref>.supabase.co/functions/v1
VITE_ADMIN_BASE=/<seu-caminho-secreto>/
```

`VITE_ADMIN_BASE` é a pasta secreta do painel: escolha um nome difícil de adivinhar, com `/` no início
e no fim (não pode ser só `/`), com pelo menos 12 caracteres (ex.: `/adm-` + letras e números aleatórios).
O build de produção **recusa** os caminhos de exemplo que aparecem neste repositório (ex.: `/painel-exemplo/`),
porque o repositório é público. Nunca escreva o caminho real em arquivos versionados. Guarde esse endereço: ele não aparece em lugar nenhum do site (só nas configurações do Supabase e
no e-mail de recuperação de senha do administrador).

2. Gere os dois sites:

```bash
npm install
npm run build:loja
npm run build:admin
```

O build para com uma mensagem clara se faltar `VITE_FUNCTIONS_URL` ou se ela não começar com
`https://`. Também é gerado um arquivo `.htaccess` em cada pasta, já com o endereço do seu Supabase.

### 9. Enviar por FTP

Use o programa de FTP de sua preferência (ex.: FileZilla) com os dados da Locaweb. **Ative a exibição
de arquivos ocultos** no programa: o `.htaccess` começa com ponto e precisa ser enviado.

- Conteúdo de `dist/loja` (o que está dentro dela, não a pasta) → raiz do site (`public_html`).
- Conteúdo de `dist/admin` → uma pasta dentro do `public_html` com o nome do `VITE_ADMIN_BASE`
  (ex.: `public_html/<seu-caminho-secreto>/`).

Confirme que `.htaccess` e `index.html` aparecem nas duas pastas e que a pasta `assets` foi enviada inteira.

### 10. Primeiro acesso

1. Abra `https://seudominio.com.br/<seu-caminho-secreto>/` e entre com o e-mail e a senha do passo 6.
2. Em **Configurações**: informe o WhatsApp que receberá os pedidos e envie a logo.
3. Cadastre as **categorias** e depois os **produtos** (com fotos e variações).

### 11. Checklist final

- [ ] Abrir o site no celular e navegar pelos produtos.
- [ ] Montar um carrinho, preencher os dados (sem criar conta) e finalizar: o WhatsApp deve abrir com o pedido.
- [ ] Testar "esqueci minha senha" no painel (`/<seu-caminho-secreto>/esqueci-senha`): o e-mail do administrador deve chegar, o link abrir a tela de nova senha do painel, e a nova senha funcionar no login.
- [ ] Preencher o **e-mail de privacidade** em Configurações (contato LGPD).
- [ ] Abrir um endereço direto, como `https://seudominio.com.br/carrinho`, e conferir que a página abre.
- [ ] Conferir o cadeado (HTTPS) e que `http://` redireciona para `https://`.
- [ ] Conferir o CORS restrito em produção (troque `<ref>` e o domínio):

  ```bash
  curl -i -X OPTIONS -H "Origin: https://evil.example" https://<ref>.supabase.co/functions/v1/catalogo
  curl -i -X OPTIONS -H "Origin: https://seudominio.com.br" https://<ref>.supabase.co/functions/v1/catalogo
  ```

  A primeira resposta **não** pode ter o cabeçalho `Access-Control-Allow-Origin`; a segunda **tem**
  que trazê-lo com o seu domínio. Se for diferente, revise `ALLOWED_ORIGINS` (passo 3) e publique
  as funções de novo.

- [ ] Conferir qual cabeçalho traz o IP real do cliente (os limites de tentativas de login e de pedidos por hora dependem disso):
  1. Em `supabase/functions/auth-login/index.js`, dentro de `servir(async (req, corpo) => {`, acrescente
     temporariamente `console.log([...req.headers].filter(([n]) => /forwarded|cf-|ip/i.test(n)));`
     e rode `npx supabase functions deploy auth-login`.
  2. Chame a função forjando um cabeçalho (o corpo pode ser inválido, o log sai igual):

     ```bash
     curl -s -X POST -H "X-Forwarded-For: 1.2.3.4" -H "Content-Type: application/json"        -d '{"email":"teste@example.com","senha":"x","painel":"admin"}'        https://<ref>.supabase.co/functions/v1/auth-login
     ```

  3. No painel do Supabase, em **Edge Functions → auth-login → Logs**, veja os cabeçalhos. Esperado:
     `cf-connecting-ip` com o **seu** IP real e `x-forwarded-for` terminando no seu IP (o `1.2.3.4`
     forjado só pode aparecer no começo da lista, nunca no final).
  4. **Remova o `console.log`** e publique `auth-login` de novo.
  5. Se o `1.2.3.4` aparecer como IP "real" (em `cf-connecting-ip` ou no último item do
     `x-forwarded-for`), ou se nenhum dos dois trouxer o seu IP, a regra de `ipDaRequisicao`
     (`supabase/functions/_shared/domain/rateLimit.js`) não bate com a infraestrutura: ajuste-a para
     ler o cabeçalho que de fato traz o IP real (e o teste ao lado) antes de abrir o site. Sem IP
     identificável, o limite por IP não é aplicado (só o limite por e-mail continua valendo).

### Riscos conhecidos

- **Loja e painel compartilham a mesma origem** (mesmo domínio), portanto o mesmo `localStorage`.
  Hoje isso é mitigado pelo CSP restritivo (sem scripts inline), que dificulta XSS. Opção futura:
  colocar o painel em um subdomínio próprio (ex.: `admin.seudominio.com.br`), isolando a sessão do
  administrador da loja.

### Atualizar o site depois

- **Mudou só o visual/telas:** rode `npm run build:loja` e/ou `npm run build:admin` e envie de novo
  o conteúdo de `dist/loja` / `dist/admin` por cima dos arquivos antigos.
- **Mudou alguma função (pasta `supabase/functions`):** `npx supabase functions deploy`.
- **Mudou o banco (nova migration):** `npx supabase db push`.
- Antes de publicar, `npm run verificar` roda a verificação de segredos, lint, testes e os dois builds.

### Problemas comuns

- **Erro de CORS no navegador / "Não foi possível conectar":** o endereço do site não está em
  `ALLOWED_ORIGINS`. Rode de novo o passo 3 com o endereço exato (com `https://`, sem barra no final;
  inclua o `www` se usar) e depois `npx supabase functions deploy`.
- **Página em branco ou "Not Found" ao abrir um endereço direto (ex.: `/carrinho`):** o `.htaccess` não
  foi enviado (arquivo oculto) ou a hospedagem não tem `mod_rewrite` ativo. Reenvie o `.htaccess`.
- **Erro 500 ao abrir o site:** a hospedagem pode não aceitar alguma regra do `.htaccess`; peça ao
  suporte da Locaweb para liberar `AllowOverride` (Options, FileInfo e Headers).
- **E-mail de "esqueci minha senha" não chega:** configure o SMTP próprio (passo 7) e confira o spam.
- **Fotos não aparecem:** confira se `PUBLIC_SUPABASE_URL` é exatamente `https://<ref>.supabase.co` (sem barra no final, passo 3) e se `VITE_FUNCTIONS_URL` aponta
  para o mesmo projeto Supabase.
- **O build para com "VITE_FUNCTIONS_URL não definido":** crie o `.env.production` (passo 8).
