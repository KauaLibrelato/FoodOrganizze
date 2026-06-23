# Casa Fratoni - Contexto Completo do Projeto

## Resumo

Casa Fratoni e um sistema web interno para uma confeitaria artesanal. O projeto nasceu como FoodOrganizze, mas a marca atual do produto e Casa Fratoni.

A proposta nao e ser um CRUD generico. O produto deve ser uma ferramenta simples, bonita e inteligente para organizar o dia a dia de producao, custos, receitas, pedidos e clientes.

## Publico inicial

Uma confeitaria artesanal usando principalmente celular e notebook, com necessidade de:

- saber quais pedidos estao em aberto
- organizar clientes e encomendas
- entender quanto custa cada receita
- saber quanto cobrar
- controlar insumos e compras
- estimar lucro
- acompanhar faturamento, despesas e lucro por periodo
- configurar distribuicao de lucro
- acompanhar pedidos por status e periodo
- manter usuarios internos com acesso controlado

## Tom da aplicacao

Interface em portugues do Brasil, com tom:

- pratico
- afetuoso
- profissional
- direto
- sem termos tecnicos desnecessarios

Microcopy desejada:

- "Novo pedido"
- "Registrar compra"
- "Criar receita"
- "Custo medio"
- "Estoque atual"
- "Pedidos em aberto"
- "Producao"
- "Preco sugerido"
- "Lucro estimado"
- "Salvar nova senha"

## Identidade visual

Marca:

- Nome: Casa Fratoni
- Logo: `public/brand/casa-fratoni.svg`
- Componente: `components/brand/brand-logo.tsx`

Cores principais:

- `#b02243`: acao, marca, botoes principais e destaques
- `#fcf6e2`: fundo/base
- branco quente: cards
- marrom escuro: texto principal
- cinzas/marrons quentes: texto secundario
- rosados e creme: badges, hover, bordas e detalhes

Sensacao desejada:

- confeitaria artesanal
- organizacao
- cuidado
- profissionalismo
- carinho
- controle financeiro sem complicacao
- gestao financeira visual, mas sem excesso de graficos

Evitar:

- dashboard frio
- template administrativo generico
- excesso de graficos
- infantilizacao visual
- landing page de marketing como tela principal
- textos longos explicando funcionalidades dentro do app

## Stack

- Next.js App Router
- TypeScript
- TailwindCSS
- componentes locais no estilo shadcn/ui
- Supabase Auth e Database

## Estrutura principal

```txt
app/
  (auth)/
    login
    redefinir-senha
  auth/callback
  (dashboard)/
    dashboard
    clientes
    ingredientes
    receitas
    pedidos
    producao
    gestao
    financeiro
    calculadoras
components/
  brand/
  ui/
  layout/
  dashboard/
  forms/
  cards/
  calculators/
lib/
  calculations/
  supabase/
  auth-context.ts
  brand.ts
  data.ts
  env.ts
types/
database/
  schema.sql
docs/
```

## Autenticacao e acesso

O app e interno:

- nao existe cadastro publico
- usuarios sao criados manualmente no Supabase Auth
- login e feito com e-mail/senha
- reset de senha existe no login
- reset de senha so envia e-mail para e-mails existentes em `auth.users`
- a funcao SQL `public.email_has_auth_user(target_email text)` valida existencia do e-mail
- o link de reset passa por `/auth/callback`
- a nova senha e salva em `/redefinir-senha`

Middleware:

- protege rotas autenticadas
- permite `/login`, `/auth/callback` e `/redefinir-senha`
- redireciona usuario logado de `/login` para `/dashboard`

## Modelo single-company

O app usa uma unica empresa.

Decisao atual:

- todos os usuarios autenticados acessam a mesma empresa
- a empresa usada e a primeira linha de `public.businesses` por `created_at`
- se nao houver empresa, o app cria uma empresa inicial
- todas as tabelas de negocio continuam usando `business_id`

Motivo:

- a Casa Fratoni tera varios usuarios internos trabalhando na mesma base
- nao faz sentido cada usuario ter seu proprio business

RLS:

- habilitado nas tabelas principais
- `public.user_can_access_business(target_business_id uuid)` valida empresa existente e usuario autenticado
- policies operacionais usam `public.user_can_access_business(business_id)`

## Entidades

### profiles

Perfil do usuario autenticado.

### businesses

Representa a confeitaria. Apesar da tabela suportar mais de uma linha, o app atual usa uma empresa unica.

### customers

Clientes da confeitaria, com telefone, endereco e observacoes. A UI atual permite criar, editar e excluir.

### ingredients

Tabela de insumos base. A UI usa "Insumos" porque pode incluir ingredientes, embalagens, caixas e outros itens de custo; o nome da tabela segue `ingredients`.

Campos importantes:

- `base_unit`
- `current_stock`
- `average_cost`
- `minimum_stock`

Na UI principal, categoria e aviso de estoque minimo foram removidos por decisao de produto.

### ingredient_purchases

Compras/lotes de insumos. Ao inserir uma compra, trigger atualiza estoque e custo medio ponderado do insumo.

### recipes

Receitas padrao com rendimento, unidade, tempo de preparo e passo a passo em `notes`.

### recipe_ingredients

Insumos usados em cada receita. Guarda quantidade informada e quantidade convertida para unidade base. A UI permite adicionar, editar e remover insumos da receita.

### products

Produtos vendaveis, opcionalmente vinculados a uma receita. Status/ativo existe no banco, mas nao aparece como controle principal na UI atual.

### orders

Pedidos, status, pagamento, totais e snapshots financeiros.

### order_items

Itens de pedido. Guarda snapshots de custo/lucro do item e unidade da quantidade em `quantity_unit`.

### pricing_settings

Configuracoes padrao para precificacao.

### business_expenses

Despesas da empresa usadas nos relatorios financeiros. Campos principais:

- `description`
- `category`
- `amount`
- `expense_date`
- `notes`
- `business_id`

Categorias usadas na UI:

- Ingredientes
- Embalagens
- Entregas
- Marketing
- Energia
- Agua
- Aluguel
- Equipamentos
- Manutencao
- Pro-labore
- Outros

### profit_distribution_settings

Configuracao das porcentagens de distribuicao do lucro liquido.

Estado atual da UI:

- Socios
- Reinvestimento
- Reserva de caixa

A soma deve fechar exatamente 100%. O formulario de configuracao fica em `/financeiro`; `/gestao` mostra apenas o efeito sobre o periodo selecionado.

## Regras de calculo

Arquivos em `lib/calculations`.

Funcoes importantes:

- `convertUnit`
- `calculateWeightedAverageCost`
- `calculateRecipeCost`
- `calculateRecipeCostPerYield`
- `calculateSalePrice`
- `calculateProfit`
- `formatCurrency`
- `formatUnit`

Unidades suportadas:

- `g`
- `kg`
- `ml`
- `l`
- `un`

Conversoes:

- 1 kg = 1000 g
- 1 l = 1000 ml
- `un` nao converte para peso ou volume

Padrao visual:

- valores monetarios em reais (`R$`)
- numeros decimais aceitam virgula ou ponto nos formularios preparados para isso
- quantidades devem exibir unidade quando aplicavel

## Gestao financeira

Ha duas rotas separadas:

- `/gestao`: painel visual de leitura
- `/financeiro`: cadastro/configuracao financeira

`/gestao` deve responder a pergunta "como esta o periodo selecionado?" sem virar uma tela pesada de edicao.

Filtros de periodo:

- Hoje
- Esta semana
- Este mes
- Mes anterior
- Periodo personalizado

Comportamento do filtro:

- periodos fixos atualizam as datas automaticamente
- inputs de data ficam desativados fora do periodo personalizado
- periodo personalizado permite escolher data inicial e final e aplicar filtro
- a troca deve usar navegacao leve via query string, sem refresh visual do app inteiro

Metricas:

- Faturamento = soma do valor final dos pedidos validos
- Quantidade de pedidos = total de pedidos validos
- Ticket medio = faturamento / quantidade de pedidos
- Custos = snapshots de custo dos pedidos/itens, quando disponiveis
- Despesas = soma de `business_expenses` no periodo
- Lucro bruto = faturamento - custos
- Lucro liquido = faturamento - custos - despesas

Pedidos financeiros validos:

- pedidos cancelados nao entram
- status/pagamento cancelado tambem nao entra
- enquanto o fluxo de pagamento nao estiver totalmente maduro, pedidos nao cancelados entram para evitar relatorio zerado

Distribuicao de lucro:

- configurada em `/financeiro`
- visualizada em `/gestao`
- nao existe se lucro liquido do periodo for menor ou igual a zero
- valores exibidos sao calculados sobre o lucro liquido do periodo

Importante: nao usar mock na implementacao final de Gestao/Financeiro. O app pode ter fallback defensivo se uma tabela nova ainda nao existir, mas dados financeiros reais devem vir do Supabase.

## Pedidos

Pedidos aceitam multiplos itens no mesmo formulario. Cada linha pode usar produto e/ou receita, quantidade, unidade, preco unitario, custo unitario e observacao.

Regras atuais:

- o pedido mostra resumo antes de salvar
- desconto pode ser informado em valor ou porcentagem
- o servidor recalcula custo estimado por receita/insumos quando o custo enviado vem zerado
- pedidos salvam snapshots financeiros para preservar historico
- exibicao visual usa `Pedido 1`, `Pedido 2`, etc., sem `#FO`
- datas e horarios exibem `DD/MM/YYYY HH:MM`

## Receitas e produtos

Receitas e produtos ficam na rota `/receitas`.

Estado atual da UI:

- receitas aparecem como uma faixa horizontal de selecao no topo
- o formulario de receita fica abaixo
- dados da receita e insumos da receita ficam no mesmo bloco de trabalho
- na criacao, a area de insumos fica visivel como bloqueada ate salvar a receita base
- produtos continuam na mesma pagina, com edicao/exclusao e vinculo opcional com receita

## Supabase

Variaveis:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=Casa Fratoni
NEXT_PUBLIC_BUSINESS_NAME=Casa Fratoni
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=SUA_ANON_KEY
```

`NEXT_PUBLIC_SUPABASE_URL` deve ser a URL base, sem `/rest/v1`.

Para reset de senha:

- `NEXT_PUBLIC_APP_URL` precisa bater com a URL do app
- adicionar `/auth/callback` nas redirect URLs do Supabase

## Git e deploy

Repositorio:

```txt
https://github.com/KauaLibrelato/FoodOrganizze.git
```

Branch principal:

```txt
main
```

Deploy planejado: Vercel importando o repositorio GitHub.

Na Vercel:

- Framework: Next.js
- Build command: `npm run build`
- Output directory: default/vazio
- configurar as variaveis `NEXT_PUBLIC_*`

No Supabase Auth em producao:

- Site URL deve ser a URL final da Vercel ou dominio proprio
- Redirect URLs devem incluir `/auth/callback` e `/redefinir-senha`

## Estado funcional atual

Ja existe:

- app visual responsivo
- marca Casa Fratoni com logo SVG
- login Supabase sem cadastro publico
- reset de senha com validacao de e-mail existente
- protecao de rotas
- modelo single-company
- criacao automatica de profile
- criacao automatica de empresa inicial se ainda nao existir
- cache por request com `React.cache`
- dashboard de balcao
- clientes com criar/editar/excluir
- insumos com cadastro e compras
- atualizacao de custo medio via trigger SQL
- receitas com criar/editar/excluir
- insumos da receita com adicionar/editar/remover
- produtos com criar/editar/excluir
- pedidos com multiplos itens, desconto, edicao/exclusao e snapshots
- producao por pedidos com filtros e paginacao
- gestao financeira com cards, filtros, graficos simples e distribuicao de lucro
- financeiro para despesas e configuracao de porcentagens
- calculadoras de preco, rendimento e redimensionamento de receita
- skeleton loading cru, sem textos falsos nos blocos
- estados de erro
- toasts
- modais de confirmacao em partes criticas

## Pontos que ainda precisam evoluir

- confirmar/aplicar `database/gestao-financeira.sql` no Supabase real
- confirmar/aplicar `database/pedidos-multiplos-itens.sql` no Supabase real
- fazer deploy na Vercel e configurar redirects do Supabase Auth
- revisar Gestao/Financeiro com dados reais apos aplicar a migracao
- historico detalhado do cliente
- detalhe de insumo com historico de compras
- relatorio/exportacao da tela de producao
- testes unitarios para `lib/calculations`
- padronizar toasts/confirmacoes em todos os formularios restantes
- cache persistente com tags por empresa se a base crescer
