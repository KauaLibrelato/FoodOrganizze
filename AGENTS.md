# Contexto Para IAs e Agentes

Este projeto e o sistema interno da **Casa Fratoni**, uma confeitaria artesanal. Sempre leia este arquivo antes de alterar o codigo e, se precisar de mais contexto, leia tambem `docs/HANDOFF.md` e `docs/PROJECT_CONTEXT.md`.

## Produto

O projeto nasceu como FoodOrganizze, mas a marca atual da aplicacao e **Casa Fratoni**.

Objetivo do sistema:

- organizar pedidos
- cadastrar clientes
- controlar ingredientes e compras/lotes
- calcular custo medio ponderado
- calcular custo de receitas
- sugerir preco de venda
- salvar snapshots de custo/lucro em pedidos
- acompanhar pedidos de producao por status e periodo
- apoiar a rotina da confeitaria sem parecer dashboard SaaS generico

## Stack obrigatoria

- Next.js App Router
- TypeScript
- TailwindCSS
- componentes locais no estilo shadcn/ui
- Supabase Auth e Database

## Modelo de negocio e acesso

- O app e single-company: todos os usuarios trabalham na mesma empresa.
- Usuarios sao cadastrados manualmente no Supabase Auth.
- Nao existe cadastro publico pela tela de login.
- Login tem fluxo de reset de senha para e-mails ja existentes no Auth.
- A empresa usada pelo app e a primeira linha de `public.businesses` por `created_at`.
- Todas as tabelas de negocio continuam usando `business_id`.
- RLS foi ajustado para usuarios autenticados acessarem a empresa unica.

Funcoes SQL importantes para o modelo atual:

- `public.user_can_access_business(target_business_id uuid)`
- `public.email_has_auth_user(target_email text)`

Se o banco ja estiver populado, nao rode o schema inteiro sem revisar. Para ajustes pontuais de RLS/reset, rode apenas os trechos necessarios em `database/schema.sql`.

## Marca e UI

- Marca: Casa Fratoni
- Logo: `public/brand/casa-fratoni.svg`
- Cor primaria: `#b02243`
- Fundo/base: `#fcf6e2`
- Cards: branco quente/creme claro
- Textos principais: marrom escuro
- Detalhes: tons rosados, creme e neutros quentes

Evite:

- aparencia fria de admin template
- excesso de graficos
- linguagem tecnica na interface
- componentes visuais genericos sem personalidade
- landing page de marketing dentro do app

## Arquivos importantes

- `database/schema.sql`: schema Supabase, RLS, triggers, policies e funcoes RPC
- `types/index.ts`: tipos principais do dominio
- `lib/calculations`: regras de calculo e formatacao
- `lib/data.ts`: camada de leitura de dados, com Supabase real e demo fallback
- `lib/auth-context.ts`: contexto autenticado, empresa unica e cache por request
- `lib/brand.ts`: nome e logo da marca
- `app/actions.ts`: server actions de auth e escrita
- `middleware.ts`: protecao de rotas com Supabase
- `app/(auth)`: login e redefinicao de senha
- `app/(dashboard)`: telas autenticadas
- `app/(dashboard)/gestao`: painel financeiro visual de leitura
- `app/(dashboard)/financeiro`: configuracoes financeiras, despesas e distribuicao
- `database/gestao-financeira.sql`: ajuste pontual para criar tabelas financeiras em banco ja populado
- `components/ui`: componentes base
- `components/brand/brand-logo.tsx`: logo reutilizavel

## Regras de dominio importantes

- Ingredientes sao cadastrados como ingredientes base.
- Uma compra/lote registra quantidade informada, unidade, quantidade convertida, valor total, fornecedor opcional e data.
- Ao registrar compra, o banco atualiza `current_stock` e `average_cost`.
- Receitas usam o custo medio atual dos ingredientes.
- Receitas podem ter passo a passo em `recipes.notes`.
- Ingredientes de receitas podem ser adicionados, editados e removidos.
- Produtos sao o que entra no pedido e podem ficar vinculados a uma receita.
- Pedidos salvam snapshot de custo/lucro para nao mudar historico quando o ingrediente mudar depois.
- Producao hoje e uma lista paginada e filtravel de pedidos por status e periodo; nao mostra ingredientes consolidados.
- Gestao financeira usa dados reais dos pedidos e despesas cadastradas, sem mock na implementacao final.
- Em relatorios financeiros, pedidos cancelados nao entram. Atualmente pedidos nao cancelados entram nos numeros para evitar tela zerada enquanto o fluxo de pagamento ainda nao estiver maduro.
- Custos de pedidos devem vir dos snapshots salvos no pedido/item; despesas da empresa ficam em `business_expenses`.
- Distribuicao de lucro fica em `profit_distribution_settings` e a soma das porcentagens deve ser exatamente 100%.
- Se o lucro liquido do periodo for menor ou igual a zero, nao deve haver distribuicao de lucro.
- Valores monetarios devem ser exibidos e recebidos em padrao brasileiro, com `R$` quando fizer sentido.
- Medidas devem usar unidades claras: `g`, `kg`, `ml`, `l`, `un`.

## Padroes de implementacao

- Preferir Server Components para leitura.
- Preferir Server Actions para mutacoes simples.
- Manter textos de UI em portugues do Brasil.
- Validar entradas basicas no servidor.
- Nao expor chaves do `.env` em logs ou respostas.
- Usar `React.cache` apenas para cache seguro por request/autenticacao.
- Evitar cache global persistente para dados autenticados sem tags e invalidacao clara.
- Ao mexer em Supabase/actions/auth, testar com `npm run build`.
- Depois de `npm run build`, reiniciar dev server limpo se for testar localmente.

## Estado atual

O app ja tem:

- marca Casa Fratoni com logo SVG na cor primaria
- logo reutilizavel sem box/borda na sidebar e em telas de auth
- login e redefinicao de senha compactos, sem aparencia de landing page
- login Supabase sem cadastro publico
- reset de senha apenas para e-mails existentes no Auth
- middleware de protecao
- modelo single-company
- schema SQL com RLS, triggers e RPCs
- CRUD inicial/edicao/exclusao de clientes
- CRUD inicial de ingredientes e registro de compras/lotes
- receitas e produtos com edicao/exclusao
- cadastro e edicao de ingredientes da receita
- pedidos com snapshots financeiros
- producao como lista paginada e filtravel de pedidos
- gestao financeira com filtros por periodo, cards, graficos simples e leitura dos pedidos/despesas
- aba financeiro para cadastrar/editar/excluir despesas e salvar porcentagens da distribuicao de lucro
- calculadoras de preco e rendimento
- dashboard com dados reais/demo
- skeleton loading cru, sem textos falsos durante carregamento
- estados de erro
- toasts e modais de confirmacao em partes criticas

Veja tambem `docs/HANDOFF.md`.
