# Changelog

Todas as mudanças relevantes deste projeto são documentadas aqui.
O formato segue o [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).

## [Não lançado]

### Pedido e cadastro

- CEP preenche rua, bairro, cidade e UF ao ser digitado (finalizar pedido da loja e ficha de
  clientes do painel), via ViaCEP direto do navegador (`cepService`, `useEnderecoPorCep`). Falha ou
  CEP inexistente só mostra um aviso; dados lembrados e fichas existentes não são sobrescritos.
  `connect-src` do CSP libera `https://viacep.com.br`; Política de Privacidade cita o ViaCEP.
- Android: "Pedido pronto!" deixa escolher entre WhatsApp e WhatsApp Business (intent com volta ao
  `wa.me` se o app não estiver instalado) e sempre oferece o link comum ("Não abriu?"). iPhone,
  computador e navegadores dentro de apps (Instagram, Facebook, WebView) seguem com um botão só.

### Favicon

- Loja e painel usam `marca-local/favicon.png` (pasta fora do Git, bloqueada também pelo
  verificador de segredos) como ícone da aba e `apple-touch-icon` (`vite.favicon.js`). Sem o arquivo,
  o build segue sem favicon.

### Marca

- Painel: a logo da empresa (enviada em Configurações) aparece no topo, ao lado de "Painel
  administrativo" (menu e barra do celular), e troca na hora após um novo envio (`MarcaEmpresaContext`).
- Crédito "Desenvolvido por CantarelliTech" (link para www.cantarellitech.com.br, nova aba) no
  rodapé da loja e no pé do menu do painel (`CreditoDesenvolvedor`).

### Segurança

- Repositório público: o caminho de exemplo do painel passou a ser `/painel-exemplo/` (o anterior
  ficou exposto no primeiro commit). O build de produção recusa caminhos de exemplo/curtos
  (`exigirCaminhoSecreto`); `npm run verificar` usa o modo `verificacao` com `.env.verificacao` (fictício).
- Verificador de segredos (`scripts/verificar-segredos.mjs`) rodando no hook `.githooks/pre-commit`
  (instalado pelo `prepare` do npm) e em `npm run segredos`: bloqueia `.env` reais, chaves/tokens,
  URL real do Supabase, e-mails pessoais e qualquer valor dos `.env` locais e de `.segredos-locais`.
- `.gitignore` reforçado (`.env.*`, `supabase/functions/.env.*`, `.segredos-locais`, chaves).

### Adicionado

- Estrutura inicial do projeto com React, Vite e dois builds independentes (loja e admin).
- Telas provisórias "Reserva Distribuidora" (loja) e "Painel administrativo" (admin).
- Tokens de design (azul bebê e branco) em `src/shared/styles/tokens.css`.
- Testes com Vitest, jsdom e Testing Library; teste de fumaça dos dois aplicativos.
- ESLint (configuração flat), Prettier e EditorConfig.
- `.env.example` com `VITE_FUNCTIONS_URL` e `VITE_ADMIN_BASE`.
- README com instruções de instalação, execução, testes, lint e build.
- Banco de dados Supabase: migration com as tabelas (categorias, produtos, fotos, variações, clientes, admins, config_empresa, tentativas_login), RLS ligado sem policies, privilégios de `anon`/`authenticated` revogados, gatilho de `atualizado_em` e bucket público `produtos` sem policies de escrita.
- `supabase/seed.sql` com a linha vazia de `config_empresa`.
- Teste de RLS (`supabase/tests/rls.test.js`), executado apenas com `SUPABASE_LOCAL=1`.
- README: seção "Banco de dados local" (subir, resetar, testar RLS, criar administrador).
- `.env.*.local` no `.gitignore`.
- Módulos puros de domínio em `supabase/functions/_shared/domain/`: `documento.js` (`somenteDigitos`, `cpfValido`, `cnpjValido`, `formatarCnpj`) e `cadastro.js` (`validarCadastro`, completo ou parcial, com bloqueio de alteração de documento/tipo de pessoa), com testes.
- `.gitattributes` com `* text=auto eol=lf` para evitar diferenças de quebra de linha no Windows.
- Limite de tentativas: `domain/rateLimit.js` (`avaliarBloqueio`, `ipDaRequisicao`, limites por ação: login 5 falhas/15 min por e-mail ou IP, cadastro 5/hora por IP, recuperar 3/hora por e-mail) e `infra/rateLimitRepo.js` (`verificarLimite`, `registrarTentativa`) com testes.
- Migration `20261119000100_tentativas_acao.sql`: coluna `acao` e índice em `tentativas_login`.
- Módulos puros `domain/dinheiro.js` (`formatarReais`, `formatarInteiro`, sem depender de Intl) e `domain/pedido.js` (`validarItensCarrinho`, `revisarItens` com preços do banco e divergências, `montarMensagem` PF sem documento / PJ com CNPJ e razão social, `linkWhatsapp` com prefixo 55), com testes.
- Infra HTTP das Edge Functions em `_shared/infra/`: `http.js` (`servir`, `ErroHttp`, `falhar`, `responder`; só POST/OPTIONS, CORS por `ALLOWED_ORIGINS`, corpo JSON até 100 KB, erro 500 genérico sem vazar detalhes, cabeçalhos de segurança), `db.js` (cliente service role memoizado e URL pública do Storage) e `auth.js` (`usuarioDaRequisicao`, `exigirCliente`, `exigirAdmin`), com testes de `http.js`.
- `domain/texto.js` (`escaparLike`) com testes.
- Edge Function `catalogo` (`categorias`, `produtos` com filtro por categoria, busca e paginação de 24, `produto`) e `config-publica`, ambas públicas (`verify_jwt = false`).
- `scripts/testar-funcoes.mjs`: testes de integração das funções com dados próprios e limpeza ao final.
- `supabase/functions/.env.example` (o `.env` fica no `.gitignore`) e seção "Funções (Edge Functions)" no README.
- Edge Functions de autenticação: `auth-cadastro`, `auth-login` (painéis `loja`/`admin`, limite de tentativas com falha fechada), `auth-refresh`, `auth-logout`, `auth-recuperar-senha` (resposta sempre igual) e `auth-nova-senha`, todas públicas (`verify_jwt = false`).
- `infra/db.js`: `clienteDescartavel()` (cliente anon novo por chamada para login/refresh, sem tocar no cliente service role); `infra/sessaoUsuario.js`; `validarSenha` exportada de `domain/cadastro.js`.
- Variável `SITE_URL` em `supabase/functions/.env.example`.
- `scripts/testar-funcoes.mjs`: casos de autenticação (cadastro, login, limite, refresh, logout, recuperação e nova senha) com limpeza de usuários e tentativas.
- Autenticação (revisão): compensação do cadastro com nova tentativa e log de usuário órfão; logout e descarte de sessão com escopo `local`; `auth-nova-senha` encerra as outras sessões; tentativa de login registrada antes de autenticar e confirmada com `marcarSucesso` (evita corrida no limite); recuperação de senha limitada também por IP (10/hora) e sem envio se `SITE_URL` faltar.
- `config.toml`: `enable_signup = false`, `site_url` e `additional_redirect_urls` para `/nova-senha`.
- Funções do cliente (exigem login): `cliente-perfil` (`obter` com CPF/CNPJ formatado e `documento_editavel: false`; `editar` sem documento, tipo de pessoa nem e-mail, PJ não pode esvaziar a razão social, PF descarta razão social), `pedido-revisar` e `pedido-whatsapp` (pedido não é salvo: devolve só o link `wa.me` com a mensagem; divergências → 409 com `dados`; observação até 500 caracteres; WhatsApp da empresa vazio → 503).
- `infra/pedidoRepo.js` (`revisarCarrinho`: valida e confere o carrinho com uma única consulta); `ErroHttp`/`falhar` aceitam `dados` opcional na resposta de erro; `formatarCpf` e `formatarDocumento` em `domain/documento.js`; `textoBemFormado` em `domain/pedido.js`.
- `scripts/testar-funcoes.mjs`: casos de perfil e pedido (inclui restauração do WhatsApp da empresa).
- Domínio do pedido (revisão): soma de linhas repetidas acima de 99.999 é rejeitada; subtotal/total fora do inteiro seguro tornam o item indisponível; surrogates UTF-16 soltos em textos livres viram U+FFFD (o link nunca lança `URIError`).
- Edge Functions de administração (só para quem está na tabela `admins`; `exigirAdmin` é a primeira coisa de cada handler): `admin-categorias` (`listar`, `criar` com slug gerado e único, `editar`, `excluir` com 409 se houver produtos, `reordenar`), `admin-produtos` (`listar` com inativos, busca e paginação, `obter`, `criar`, `editar` com sincronização transacional das variações, `excluir` removendo os arquivos do Storage) e `admin-fotos` (`enviar` multipart, `remover`, `reordenar`; máximo de 10 fotos por produto).
- `domain/produto.js` (`validarProduto`, `menorPreco`), `domain/imagem.js` (`validarImagem`: jpg/png/webp pela assinatura dos bytes, até 5 MB) e, em `domain/texto.js`, `gerarSlug`, `slugUnico`, `ehUuid` e `prepararBusca`, com testes.
- `servir` aceita opções por função (`aceitarMultipart`, `limiteBytes`); o padrão continua JSON até 100 KB. O limite em bytes vale também para multipart (leitura em stream) e o corpo só é lido quando o handler pede, depois da autenticação.
- `infra/paginacao.js` (24 por página) e `infra/fotosStorage.js` (envio/remoção no bucket `produtos`).
- Migration `20261119000200_bucket_limites.sql`: bucket `produtos` limitado a 5 MB e MIME jpeg/png/webp.
- Migration `20261119000300_admin_salvar_produto.sql`: função `admin_salvar_produto` (produto + variações numa transação; `security invoker`, `search_path` vazio, execução só para `service_role`).
- Casos de integração do admin em `scripts/testar-funcoes.mjs` (401, 403, 409, upload inválido, fluxo completo com PNG real e conferência no Storage).

- Funções de administração de clientes e configurações: `admin-clientes` (`listar` com busca por nome/e-mail ou por dígitos do documento e 24 por página, `obter`, `editar` com troca de documento/tipo, conferência documento x tipo, razão social obrigatória em PJ, e-mail não editável e 409 para documento repetido) e `admin-config` (`obter`, `editar` com WhatsApp normalizado com 55 e CNPJ válido, `enviar_logo` multipart em `config/logo-<uuid>.<ext>` removendo o logo anterior), ambas com `verify_jwt = false` e `exigirAdmin` primeiro.
- Domínio puro: `domain/clienteAdmin.js`, `domain/configEmpresa.js` e `domain/erroBanco.js` (tradução de 23514 e 22P02 em 400 PT-BR e detecção de 23505 por nome da constraint), com testes; `infra/erroBanco.js` (`lancar`) usado por todas as funções admin; `infra/fotosStorage.js` ganhou `enviarObjeto`.
- `scripts/testar-funcoes.mjs`: casos de clientes e configurações (busca, 409, PF/PJ, WhatsApp, round-trip, logo acessível e em `config-publica`) com restauração da configuração e limpeza do Storage.
- Base compartilhada do front em `src/shared`: serviços `storage`, `sessao` (com propagação entre abas) e `api` (ErroApi, renovação única e compartilhada da sessão em 401, repetição da chamada), utilitários de formatação (reexporta reais e documentos do domínio das funções; adiciona `reaisParaCentavos`, `formatarTelefone`, `formatarCep`).
- Componentes acessíveis `Botao`, `Campo`, `Modal` (foco preso, Esc, fundo inerte, devolve o foco), `Toast`, `Carregando` e `Paginacao`; contextos/hooks `useConfirm`, `useToast` e `useAsync`.
- Novos tokens de design (borda, foco, espaçamentos) e classe global `sr-only`.
- Setup de testes passa a limpar o DOM a cada teste.
- Loja (Task 12): catálogo com chips de categoria, busca com atraso de 300 ms e paginação, todos dirigidos pela URL (`/`, `/categoria/:slug`, `?busca=`, `?pagina=`); página de produto com galeria de fotos, seletor de tamanho e de forma de venda (Unidade/Fardo, só as formas vendidas), preço da forma escolhida e quantidade de 1 a 99.999; carrinho (`carrinhoService` em `reserva.carrinho`, descarte de itens inválidos, soma de itens repetidos, sincronização entre abas), selo no cabeçalho e rota de página não encontrada. Preços visíveis sem login.
- Loja: `EmpresaContext` carrega a configuração pública uma vez (logo ou nome como marca); `CarrinhoContext`/`useCarrinho`; `src/test/renderizarLoja.jsx` para testes de página.
- `vite.spa-dev.js`: no servidor de desenvolvimento da loja, rotas como `/produto/123` devolvem o HTML de entrada (README atualizado: a loja abre em `http://localhost:5173/`).
- `formatarInteiro` reexportado por `src/shared/utils/formatar.js`; novos tokens de design (`--cor-azul-bebe-claro`, `--raio-grande`, `--sombra-card`, `--largura-maxima`).
- Loja (Task 13): telas `/entrar`, `/cadastro` (PF/PJ com razão social só em PJ, máscaras de CPF/CNPJ, telefone e CEP, validação imediata com as regras de `domain/cadastro.js`, erros da API embaixo de cada campo e foco no primeiro inválido), `/esqueci-senha` (mensagem neutra do servidor), `/nova-senha` (lê o `access_token` do hash e o apaga do endereço na hora), `/minha-conta` (documento e e-mail somente leitura) e `/finalizar`.
- Loja: `SessaoClienteContext`/`useSessaoCliente` (sessão do cliente; "Sair" limpa a sessão mesmo se a API falhar), `MenuConta` no cabeçalho ("Entrar" ou menu com "Minha conta" e "Sair") e `RotaCliente` (deslogado vai para `/entrar?voltar=<rota>`; `voltar` só aceita caminho relativo do app, contra open redirect).
- Loja: `/finalizar` revisa o carrinho no servidor (`pedido-revisar`), lista divergências de preço/indisponibilidade com "Atualizar carrinho e continuar" (aplica preços e remove itens), observação de até 500 caracteres, preparação do envio (`pedido-whatsapp`; 409 mostra as novas divergências), modal "Seu pedido foi enviado pelo WhatsApp?" e, com sessão vencida que a renovação não resolve, volta ao login e depois à finalização com o carrinho preservado.
- `mascararDocumento` em `src/shared/utils/formatar.js`; `carrinhoService.atualizarPrecos`.

- Loja (revisão da Task 13): o WhatsApp não abre mais sozinho após a chamada assíncrona (pop-up bloqueado em celulares descarregaria a página e perderia a confirmação). A tela mostra "Pedido pronto!" com o botão-link "Abrir WhatsApp" (`Botao` aceita `href`); ao tocar, o lembrete é guardado em `sessionStorage` e o modal "Seu pedido foi enviado pelo WhatsApp?" aparece (também ao reabrir /finalizar ou voltar à aba). Mudar o carrinho ou a observação descarta o link. "Sim" limpa o carrinho e avisa "Pedido enviado. Obrigado!".
- Loja (revisão da Task 13): telefone colado com DDI (+55) perde o 55; sessão expirada em "Minha conta" leva a `/entrar?voltar=/minha-conta` (`useSessaoExpirada`); `destinoSeguro` rejeita barra invertida e caracteres de controle; `MenuConta` usa `aria-controls` (sem `aria-haspopup`); `ListaDivergencias` não repete o tamanho já presente no nome do produto.

### Alterado

- `catalogo` passou a reutilizar `menorPreco`, `ehUuid`, a paginação compartilhada e `prepararBusca` (a busca descarta `*`, que o PostgREST trataria como curinga).

### Corrigido

- `admin-categorias`: com nome de 59 caracteres ou mais o slug repetia `-2` e acabava em erro 500; a busca de slugs existentes agora usa o prefixo truncado (`prefixoSlug`).
- Violação de check (23514) e texto inválido (22P02) do Postgres agora respondem 400 em PT-BR nas funções de administração, em vez de 500.
- Migration `20261119000400_admin_salvar_produto_atualizado_em.sql`: `admin_salvar_produto` grava `atualizado_em = now()` ao editar (`security invoker`, `search_path` vazio e grants só para `service_role` mantidos).

### Adicionado (Task 14 — painel administrativo)

- Login do painel (e-mail e senha, painel `admin`; 401 genérico e 429 exibido), sessão própria (`reserva.admin.sessao`), `RotaAdmin` com redirecionamento para `entrar?voltar=` protegido contra open redirect e roteador com `basename` do `VITE_ADMIN_BASE`.
- Layout com menu lateral (gaveta com foco e Esc no celular) e páginas provisórias "Em breve" para produtos, clientes e configurações.
- Página Categorias: lista com `TabelaDados` reutilizável (vira cartões no celular), criar/editar em modal, excluir com confirmação (mensagem 409 do servidor) e reordenar com setas.
- `admin.html` com `noindex, nofollow`; `vite.spa-dev.js` respeita o `base` no `dev:admin`.

### Alterado (Task 14)

- Movidos para `src/shared`: `Aviso`, `PaginaFormulario`, `useFormulario`, `useFocoNoPrimeiroErro`, `useTituloDaPagina`, `useSessaoExpirada` e `utils/redirecionamento`.
- Título do `Modal` com contraste mínimo de 4,5:1 (teste incluído).
- Loja: "Abrir WhatsApp" só aparece se o link começar com `https://wa.me/`; `formatarTelefone` só descarta o 55 inicial em colagens (`{ colado: true }`), então digitar um 12º dígito num número de DDD 55 não o embaralha.

### Adicionado (Task 15 — produtos, tamanhos e fotos no painel)

- Página Produtos: lista com miniatura da capa, nome, categoria, preço "a partir de", número de tamanhos e status; busca com atraso (`?busca=`), filtro por categoria (`?categoria=`), paginação (`?pagina=`), "Novo produto", Editar e Excluir (confirmação "As fotos também serão apagadas.").
- Formulário de produto (`/produtos/novo` e `/produtos/:id`) em três seções: Informações (nome, categoria, descrição com contador, ativo), Tamanhos e preços e Fotos, com barra de ações fixa no celular. Validação imediata com as regras de `domain/produto.js` (mensagens em português; o servidor continua sendo a autoridade), foco no primeiro campo inválido e aviso ao sair com alterações não salvas (`useBlocker` + `beforeunload`).
- `EditorVariacoes`/`CartaoVariacao`: cada tamanho é um cartão com "Vende por unidade" (preço da unidade) e "Vende por fardo" (quantidade e preço do fardo), mostra "R$ 0,085 por unidade no fardo" e avisa, sem bloquear, quando o fardo não sai mais barato que a unidade; reordenar, remover (com confirmação se já existe) e adicionar.
- `CampoPreco`: digita-se em reais ("10", "10,5", "1.234,56"), formata ao sair e entrega centavos inteiros.
- `GaleriaFotos` + `useGaleriaFotos`: até 10 fotos por produto, seleção múltipla e arrastar e soltar, estados "Comprimindo…", "Enviando…" e "Erro" por foto (tentar de novo/descartar), primeira foto como "Capa", reordenar e remover com confirmação.
- `comprimirImagem` (`createImageBitmap` + canvas): reduz o lado maior a 1200 px e gera WebP com qualidade 0,8 (JPEG 0,85 se o navegador não codificar WebP) antes do envio; recusa arquivos que não são imagem e resultados acima de 5 MB. `calcularDimensoes` pura e testada.
- Serviços `produtosService` e `fotosService` (envio multipart) e hooks `useProdutos`, `useFiltrosDeProdutos`, `useProdutoPorId`, `useProdutoForm`, `useGaleriaFotos`; `useAvisoSaidaSemSalvar` em `src/shared/hooks`.
- `admin-produtos` `listar` passou a devolver `total_variacoes` (usado na coluna "Tamanhos").

### Alterado (Task 15)

- `useCategorias` aceita a rota de retorno após login forçado (usado também pelas telas de produtos).

### Adicionado (Task 16 — clientes e configurações no painel)

- Página Clientes: lista com nome (e razão social das empresas), selo PF/PJ, documento e telefone formatados, cidade/UF e e-mail; busca com atraso (`?busca=`, "Busque por nome, e-mail, CPF ou CNPJ"), paginação e "Editar". Estado vazio "Nenhum cliente cadastrado ainda.".
- Formulário de cliente (`/clientes/:id`): seção "Tipo e documento" (alternador PF/PJ, CPF/CNPJ com máscara e razão social para PJ), marcada como "Somente o administrador pode alterar estes dados.", e seção "Contato e endereço" (mesmos campos e máscaras da loja; e-mail somente leitura com a nota do servidor). Trocar o tipo ou o documento pede confirmação ("Alterar o documento de <nome>?"); o 409 "Este documento já está cadastrado." aparece sob o campo; aviso ao sair com alterações não salvas e toast "Cliente atualizado.". O formulário valida com `validarEdicaoAdmin`, a mesma regra do servidor.
- Página Configurações: "WhatsApp dos pedidos" (máscara de telefone, prévia grande e ao vivo "Os pedidos chegarão em: +55 (81) 99999-0000", aviso de "ainda não salvo", link "Testar número" para `https://wa.me/<dígitos>` em outra aba e alerta "Sem WhatsApp configurado, os clientes não conseguem enviar pedidos." quando vazio), "Dados da empresa" (nome, CNPJ opcional com máscara, endereço e texto de rodapé da mensagem com contador) e "Logo" (prévia ou "Sem logo"; envio reduzido no navegador para no máximo 600 px e trocado na hora). Toast "Configurações salvas.".
- Serviços `clientesService` e `configService` (envio multipart da logo) e hooks `useClientes`, `useClientePorId`, `useClienteForm`, `useConfiguracoes`, `useFormularioConfiguracoes` e `useLogoEmpresa`; utilitários `clienteForm`, `configForm` e `whatsapp`.
- Componentes do painel reutilizáveis: `SecaoFormulario`, `BarraAcoes` (barra fixa de ações), `FalhaDeCarga`, `FormularioCliente`, `FormularioConfiguracoes`, `PreviaWhatsapp` e `LogoEmpresa`; `Selo` ganhou o tipo `info` e `Aviso` o tipo `alerta`.

### Alterado (Task 16)

- `admin-clientes` `listar` passou a devolver `razao_social` (exibida na lista); `MSG_EMAIL` exportada de `domain/clienteAdmin.js` para o painel mostrar a mesma nota.
- Movidos para `src/shared/components`: `CamposCliente` (ganhou `semRazaoSocial`) e `SeletorVariacao`, agora usados também pelo painel.
- `useFiltrosDeProdutos` virou `useFiltrosDeLista` (serve a produtos e clientes); `FormularioProduto` e as páginas de produto usam `SecaoFormulario`, `BarraAcoes` e `FalhaDeCarga`.
- Removidas as páginas provisórias "Em breve" (`EmBreve`).

### Adicionado (Task 17 — preparação para hospedagem)

- `public-loja/.htaccess` e `public-admin/.htaccess`: redirecionamento para HTTPS, fallback de SPA para `index.html` (o do painel limitado à sua pasta), `Options -Indexes`, bloqueio de arquivos com ponto, CSP restritivo (sem `unsafe-inline`: o build não gera estilos nem scripts inline), `nosniff`, `Referrer-Policy`, `Permissions-Policy`, HSTS, cache de 1 ano (`immutable`) em `/assets/` e `no-cache` no `index.html`; o do painel também envia `X-Robots-Tag: noindex, nofollow`.
- `vite.htaccess.js`: plugin que preenche a origem do Supabase (de `VITE_FUNCTIONS_URL`) e a pasta do site no `.htaccess` da saída; o build falha com mensagem clara se `VITE_FUNCTIONS_URL` faltar ou não for https em produção. Funções puras `normalizarAdminBase` e `origemSupabase`, com testes (`vite.htaccess.test.js`).
- `VITE_ADMIN_BASE` agora é normalizado (barra no início e no fim) e recusado se for `/`, vazio, com `..`, espaços ou barras duplas; o build do painel exige o valor.
- `public-loja/robots.txt` (permite tudo, sem citar o painel) e `.env.production.example`; `.env.production` no `.gitignore`.
- Scripts `npm run verificar` (lint + testes + builds) e README "Colocar no ar" (passo a passo em PT-BR, atualização do site e problemas comuns).

### Corrigido (revisão final do projeto)

- Limite por IP: `ipDaRequisicao` agora usa `cf-connecting-ip` (formato IPv4/IPv6 validado) e, sem ele, o **último** item de `x-forwarded-for` (o primeiro pode ser forjado pelo cliente); sem IP devolve `null` e a chave de IP não é aplicada (sem balde compartilhado "desconhecido"). O cadastro (só por IP) deixa passar e registra `console.warn` quando não há IP. `IP_DESCONHECIDO` removido.
- `auth-nova-senha` só aceita token de sessão aberta por link de recuperação (`amr` com `method` `otp`, que é o que o GoTrue grava no link de recuperação, confirmado no Supabase local; `recovery` também é aceito; checado em `domain/recuperacaoSenha.js`); token de login comum responde 401 com a mensagem de link inválido. As demais sessões continuam sendo encerradas após a troca.
- Limites do GoTrue: 429/5xx/sem resposta (`domain/erroAuth.js`) em login, cadastro e refresh agora respondem 503 "Serviço indisponível. Tente novamente em instantes."; no login a tentativa pré-registrada é apagada (`removerTentativa`) e não conta como falha de credencial.
- `admin-produtos` `excluir`: apaga a linha do produto primeiro e remove os arquivos do Storage depois (melhor esforço, com `console.error` em caso de falha).
- `.htaccess` da loja e do painel: HSTS enviado sempre (o redirecionamento para HTTPS já vem antes), sem `env=HTTPS`.

### Adicionado (revisão final do projeto)

- Migration `20261119000500_limpeza_tentativas.sql`: job diário do `pg_cron` que apaga `tentativas_login` com mais de 1 dia.
- README: passo 5 com `/nova-senha` também para `www` e aumento dos limites de Authentication → Rate Limits (sign-in/sign-ups e token refresh); checklist com teste de CORS estrito e verificação do cabeçalho do IP real após o deploy; seção "Riscos conhecidos" (loja e painel na mesma origem).
- `scripts/testar-funcoes.mjs`: IPs de teste enviados por `cf-connecting-ip`; o caso de `auth-nova-senha` usa um token de recuperação real e confere que token de login comum é recusado.

### Resumo da versão 0.1.0 (não lançado)

Loja e painel administrativo em React, com back-end em Supabase (Postgres, Auth, Storage e Edge Functions), pedidos enviados por WhatsApp e publicação como arquivos estáticos em hospedagem compartilhada.

### Alterado: pedido sem conta

- Migration `20261119000600_clientes_cadastro_interno.sql`: `clientes` deixa de ter vínculo com `auth.users` (`id` com `gen_random_uuid()`), vira cadastro interno do admin com `cpf_cnpj` opcional (NULL; único quando preenchido; só 11 ou 14 dígitos), `nome_fantasia` e `observacoes`; `config_empresa.email_privacidade`; `tentativas_login.acao` aceita `'pedido'`. RLS continua ligado, sem policies e com os revokes.
- A migration APAGA de `auth.users` todas as contas que não estão em `admins` (contas de cliente deixam de existir). Em produção sem clientes cadastrados não remove nada; em bases locais/dev apaga as contas de teste, mantendo as fichas já existentes em `clientes`.
- `domain/clientePedido.js`: `validarClientePedido` (identificação digitada no pedido; PF nunca guarda CPF; PJ exige razão social e CNPJ; campos de linha única sem quebras de linha).
- `domain/clienteAdmin.js`: `validarClienteAdmin` (ficha do cliente: nome e tipo obrigatórios, documento opcional e vazio vira null, e-mail e observações validados).
- `domain/rateLimit.js`: ação `pedido` (20 por hora por IP, todas as tentativas contam).
- `domain/cadastro.js`: validadores exportados para reuso e texto de linha única (espaços e quebras de linha colapsados); `montarMensagem` também colapsa quebras de linha dos dados do cliente.
- `supabase/tests/rls.test.js`: ficha sem documento (NULL) coexiste, documento preenchido continua único, anon não lê `clientes`, ação `pedido`.
- Edge Functions: `pedido-revisar` e `pedido-whatsapp` passam a ser **públicas** (sem token). `pedido-whatsapp` recebe `cliente` (validado por `validarClientePedido`; erro 400 com `campos` de chaves simples), aplica o limite de 20 pedidos/hora por IP (429 "Muitos pedidos em pouco tempo. Tente novamente mais tarde."; falha fechada 503) e registra só IP e instante; nada do cliente ou do pedido é salvo.
- `auth-login` aceita só `painel: 'admin'` (`'loja'` ou outro → 400 "Painel inválido."); `auth-recuperar-senha` só envia e-mail para administradores (resposta 200 sempre igual) e `auth-nova-senha` recusa (401) quem não é admin. `infra/auth.js`: `ehAdmin` e `emailEhDeAdmin`.
- `admin-clientes` vira o CRUD do cadastro interno: `listar` (com `total`, busca em nome, razão social, fantasia, e-mail, documento e telefone), `obter` (ficha com `observacoes`), `criar`, `editar` (conferida com o tipo guardado; PF limpa razão social e fantasia) e `excluir`; documento repetido → 409. `domain/clienteAdmin.js`: `validarEdicaoFicha`; `interpretarBusca` aceita telefone com máscara; `domain/documento.js`: `formatarTelefone`.
- `config-publica` e `admin-config` passam a tratar `email_privacidade` (e-mail válido ou vazio vira `null`; `validarConfig` atualizado).
- Funções `auth-cadastro` e `cliente-perfil` **removidas** (pastas e entradas em `config.toml`); `exigirCliente` removido de `infra/auth.js`.
- `scripts/testar-funcoes.mjs`: removidos os casos de cadastro, perfil e login de cliente; novos casos de pedido público (PF sem CPF, PJ com CNPJ, cliente inválido, limite de 20/hora por IP, nada salvo), `painel: loja` → 400, recuperação de senha só para admin, CRUD de clientes (documento opcional, duplicado, total, excluir), `email_privacidade` e funções removidas → 404.
- README: seções de funções (autenticação só do admin, pedido público, clientes) e "Colocar no ar" sem contas de cliente. Ficam para as próximas tarefas: `validarCadastro`, `validarEdicaoAdmin` e `MSG_EMAIL` ainda são importados pelo front (`src/`).

### Alterado: loja sem conta (Task C)

- `/finalizar` é público: o cliente informa tipo (pessoa física ou empresa), nome, telefone, endereço e, para empresa, razão social e CNPJ. Pessoa física não informa CPF. Os dados vão só para a mensagem do WhatsApp; nada é salvo no servidor.
- Novo `FormularioIdentificacao` (reaproveita `CamposCliente`), com conferência imediata no aparelho via `validarClientePedido`; erros do servidor (`campos`) aparecem sob os campos e o primeiro inválido recebe o foco. Mensagens 429 (limite de pedidos) e 503 aparecem num aviso junto ao botão "Preparar pedido".
- "Lembrar meus dados neste aparelho" (desmarcado por padrão) e "Esquecer meus dados": `dadosClienteService` guarda em `reserva.dados-cliente` só depois de preparar o pedido com sucesso; dados de formato inválido, corrompidos ou de versão antiga são ignorados e apagados.
- Na inicialização da loja, a chave antiga `reserva.sessao.cliente` é removida do navegador.
- `pedidoService.enviar` passa a mandar `cliente`; `apiLoja` não usa mais sessão e `criarApi` aceita `sessao` opcional (sem ela, nenhuma chamada leva token).
- Cabeçalho sem "Entrar" nem menu de conta; permanece o carrinho.

### Removido: contas de cliente na loja (Task C)

- Páginas Entrar, Cadastro, Esqueci a senha, Nova senha e Minha conta (e suas rotas, que agora caem em "Página não encontrada"); `MenuConta`, `RotaCliente`, `SessaoClienteContext`, hooks de sessão, cadastro, edição de conta e recuperação, `authService`, `perfilService`, `utils/cadastro.js` e `utils/hashRecuperacao.js`, com seus testes.
- `validarCadastro` continua em `domain/cadastro.js` porque `validarEdicaoAdmin` (Task D) ainda o usa.
- Testes de `api.test.js` passam a usar exemplos neutros (sem `auth-cadastro` nem `cliente-perfil`).

### Alterado: Clientes no painel viram a ficha de cadastro interno (Task D)

- A tela Clientes passa a ser o cadastro interno dos clientes da empresa, com cadastrar, consultar, atualizar e excluir. Não cria acesso ao site nem tem ligação com pedidos.
- Lista: colunas Empresa/Cliente (razão social ou nome fantasia; pessoa física pelo nome), Responsável, CPF/CNPJ, Telefone e Cidade/UF; contador discreto ("N clientes cadastrados" ou "N resultados" na busca); busca por empresa, responsável, documento, telefone ou e-mail; botões "Novo cliente", "Ver ficha" e "Excluir" (com confirmação "Excluir <nome>? Essa ação não pode ser desfeita."); estado vazio com "Cadastrar primeiro cliente".
- Ficha (`/clientes/novo` e `/clientes/:id`) com o subtítulo "Cadastro interno da empresa — não cria acesso ao site." e as seções Empresa (tipo, razão social, nome fantasia), Responsável, Documento (CNPJ/CPF opcional), Contato, Endereço (opcional) e Observações (com contador). Conferência imediata no aparelho com `validarClienteAdmin`; documento duplicado (409) aparece sob o campo; aviso de alterações não salvas mantido; "Excluir cliente" na própria ficha.
- Configurações: novo campo opcional "E-mail para assuntos de privacidade (LGPD)" em "Dados da empresa", validado, com a dica de que aparece na Política de Privacidade.
- `PaginaAdmin` aceita `subtitulo`; `TabelaDados` aceita uma `acao` no estado vazio.
- Campos focáveis ganham `scroll-margin-top`/`bottom` (tokens `--margem-rolagem-topo` e `--margem-rolagem-base`) para o foco no primeiro erro não ficar sob o cabeçalho ou a barra de ações fixos (loja e painel).
- Teste da loja confirma que o pedido de pessoa física não envia `cpf`, `cpf_cnpj`, `email` nem `razao_social`.

### Removido: restos da edição antiga de clientes (Task D)

- `validarEdicaoAdmin` e `MSG_EMAIL` (e o texto "O e-mail é alterado pelo próprio cliente na recuperação de conta.") em `domain/clienteAdmin.js`.
- `validarCadastro` e seus internos (`validarDocumento`, validadores de cadastro completo/parcial, bloqueio de alteração de documento e tipo) em `domain/cadastro.js`; ficam `validarSenha` (recuperação de senha do admin) e os validadores de campo usados por `validarClientePedido` e `validarClienteAdmin`. Testes atualizados.
- Aviso "Somente o administrador pode alterar estes dados.", confirmação de troca de documento e e-mail somente leitura da edição antiga.

### Adicionado: Política de Privacidade e Cookies (LGPD) (Task E)

- Componente `PoliticaPrivacidade` (`src/shared/components/PoliticaPrivacidade/`): texto em português simples com sumário e âncoras, em 9 seções (quem somos, dados tratados, finalidades e base legal, cookies e armazenamento, compartilhamento, retenção, direitos do art. 18, segurança, alterações) e a data "Última atualização" (constante `ULTIMA_ATUALIZACAO`). Declara que o site não usa cookies de rastreamento nem de publicidade e lista, em tabela, as chaves reais do `localStorage`/`sessionStorage`.
- Contato de privacidade: `email_privacidade`; se vazio, "pelo WhatsApp da empresa" com o número formatado; se também vazio, "pelos canais de atendimento da empresa".
- Banner `AvisoPrivacidade` e `avisoPrivacidadeService` (chave `reserva.aviso-privacidade`): fixo no rodapé, sem bloquear a tela nem roubar o foco, com link para a política e botão "Entendi". Se o armazenamento falhar, só esconde o aviso na sessão. Reserva espaço no fim da página (variável `--altura-aviso-privacidade`) para não cobrir botões.
- Loja: rota `/privacidade` (título "Política de Privacidade — <nome>"), link no rodapé, aviso em todas as páginas e o link "Saiba como guardamos seus dados" ao lado de "Lembrar meus dados neste aparelho".
- Painel: rota `/privacidade` aberta sem login, link na tela de login e no rodapé do menu lateral, aviso em todas as telas; lê os dados públicos da empresa por `config-publica` (`empresaPublicaService`).
- `config-publica` passou a devolver também `cnpj` (só dígitos).
- `CHAVE_CONFIRMACAO` do pedido passou a ser exportada para o teste conferir a tabela de armazenamento.
- README: seção "Privacidade (LGPD)". Testes do aviso, da política (contatos, chaves) e das rotas e links da loja e do painel.

### Adicionado: recuperação de senha do administrador no painel (correção da revisão final)

- Painel: rotas públicas `/esqueci-senha` e `/nova-senha` (páginas `EsqueciSenha` e `NovaSenha`), link "Esqueci minha senha" na tela de login e componente `TelaPublica`. A nova senha lê o `access_token` do fragmento do link, remove o fragmento da URL na hora (o token fica só na memória do componente), valida a senha com `validarSenha` do domínio e, ao concluir, mostra "Senha alterada. Entre com a nova senha." e volta ao login; link ausente ou inválido leva ao pedido de novo link.
- `adminAuthService.recuperarSenha` e `definirNovaSenha`; util `lerTokenDeRecuperacao`.
- Variável `ADMIN_URL` (ex.: `https://seudominio.com.br/painel-exemplo`) em `supabase/functions/.env.example`; README: segredos, Redirect URLs do Supabase (`/painel-exemplo/nova-senha`, com e sem `www`) e item no checklist final.

### Alterado: recuperação de senha (correção da revisão final)

- `auth-recuperar-senha` envia o link para `ADMIN_URL/nova-senha` (antes `SITE_URL/nova-senha`, tela que não existe mais na loja); sem `ADMIN_URL` registra o erro, não envia e continua respondendo 200 neutro. `SITE_URL` deixou de ser usada pelas funções e saiu do `.env.example` e do README.
- O envio do e-mail não é mais aguardado (`EdgeRuntime.waitUntil`, ou em segundo plano com erro registrado em log), para que e-mail de admin e de não-admin respondam em tempos parecidos.
- `supabase/config.toml`: `additional_redirect_urls` aponta para `/painel-exemplo/nova-senha` do painel local.
- Política de Privacidade: pontuação do item de oposição na lista de direitos.

### Removido (correção da revisão final)

- Limite `cadastro` em `domain/rateLimit.js` (sem uso desde a remoção das contas de cliente) e seus testes; JSDoc de `rateLimitRepo.js` lista `'login' | 'recuperar' | 'pedido'`. A constraint do banco foi mantida.
