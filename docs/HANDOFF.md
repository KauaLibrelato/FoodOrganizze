# Casa Fratoni - Handoff Para Proximas IAs/Conversas

## Estado atual

O projeto esta funcional em localhost.

Servidor:

```bash
npm run dev
```

URL:

```txt
http://localhost:3000
http://127.0.0.1:3000
```

Validacao recente:

```bash
npm run build
```

O build passou. Pode aparecer warning conhecido da Supabase/Edge Runtime dependendo do import trace; quando aparecer, nao significa necessariamente quebra.

Repositorio Git:

```txt
https://github.com/KauaLibrelato/FoodOrganizze.git
```

Branch principal:

```txt
main
```

Primeiro commit publicado:

```txt
6bd91af feat: initialize Casa Fratoni management app
```

Antes de continuar um novo ciclo de mudancas, rode:

```bash
git status --short
```

Nao commitar `.env`, `.next`, `node_modules` ou `*.tsbuildinfo`; ja estao cobertos por `.gitignore`.

## Marca

O projeto nasceu como FoodOrganizze, mas a marca atual e **Casa Fratoni**.

Arquivos:

- `lib/brand.ts`
- `components/brand/brand-logo.tsx`
- `public/brand/casa-fratoni.svg`

Cor primaria da marca: `#b02243`.

Estado visual recente:

- a logo SVG foi ajustada para a cor primaria e viewBox menor
- a sidebar mostra apenas a logo, centralizada, sem box/borda em volta
- telas de login e reset usam logo menor, slogan curto e layout compacto
- carregamentos usam skeleton cru, sem textos falsos como "carregando" dentro dos blocos

## Acesso e autenticacao

Fluxo atual:

- Nao existe cadastro publico na tela de login.
- Usuarios sao criados manualmente no Supabase Auth.
- Login e feito com e-mail/senha.
- Existe reset de senha na tela de login.
- Reset so envia e-mail se o e-mail existir em `auth.users`.
- Link de reset passa por `/auth/callback?next=/redefinir-senha`.
- A tela `/redefinir-senha` salva a nova senha via Supabase client.

Arquivos relevantes:

- `app/(auth)/login/page.tsx`
- `app/(auth)/redefinir-senha/page.tsx`
- `app/auth/callback/route.ts`
- `components/forms/reset-password-form.tsx`
- `app/actions.ts`
- `middleware.ts`

Configuracao necessaria no Supabase Auth:

- adicionar `http://localhost:3000/auth/callback` nas redirect URLs locais
- em producao, adicionar a URL equivalente
- manter `NEXT_PUBLIC_APP_URL` alinhado com a URL do app

## Modelo single-company

O sistema atualmente e de uma unica empresa:

- todos os usuarios autenticados acessam a mesma empresa
- a empresa usada e a primeira linha de `public.businesses` por `created_at`
- se nao houver empresa, o app cria uma empresa inicial com o usuario logado como `owner_id`
- as tabelas de negocio seguem com `business_id`

Arquivos:

- `lib/auth-context.ts`
- `lib/data.ts`
- `app/actions.ts`
- `database/schema.sql`

RLS atual:

- `public.user_can_access_business(target_business_id uuid)` retorna true para qualquer usuario autenticado se a empresa existir
- as policies usam `public.user_can_access_business(business_id)`
- a policy de `businesses` permite usuarios autenticados

## Banco populado: cuidado

Se o banco ja estiver populado, nao rode o `database/schema.sql` inteiro sem revisar.

Muita coisa e idempotente, mas o arquivo tambem recria policies, triggers e funcoes. Para mudancas pontuais, rode apenas os trechos necessarios.

Trechos recentes importantes:

```sql
create or replace function public.user_can_access_business(target_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.businesses
    where businesses.id = target_business_id
      and auth.uid() is not null
  );
$$;

drop policy if exists "Users can manage own businesses" on public.businesses;

create policy "Users can manage own businesses" on public.businesses
for all
using (auth.uid() is not null)
with check (auth.uid() is not null);
```

Para validar reset apenas de e-mails existentes:

```sql
create or replace function public.email_has_auth_user(target_email text)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from auth.users
    where lower(users.email) = lower(trim(target_email))
  );
$$;
```

## Banco financeiro novo

A gestao financeira adicionou tabelas novas. Se o Supabase real ainda nao tiver essas tabelas, rode o arquivo pontual:

```txt
database/gestao-financeira.sql
```

Esse arquivo cria/ajusta:

- `public.business_expenses`
- `public.profit_distribution_settings`
- indices
- triggers de `updated_at`
- RLS e policies usando `public.user_can_access_business(business_id)`

O app tem fallback para nao quebrar a leitura antes da migracao, mas cadastro/edicao de despesas e salvamento da distribuicao precisam dessas tabelas no banco.

## Banco de pedidos com unidades

A tela de pedidos agora permite multiplos produtos/receitas no mesmo pedido e unidade de quantidade por linha. Para o Supabase real aceitar essa gravacao, aplique o arquivo pontual:

```txt
database/pedidos-multiplos-itens.sql
```

Ele adiciona `public.order_items.quantity_unit` com default `un`. O codigo tem fallback de leitura para pedidos antigos, mas criar/editar pedidos com a nova UI precisa dessa coluna no banco.

## Funcionalidades atuais

### Dashboard / Balcao

- mostra pedidos em aberto
- pedidos do mes
- faturamento do mes
- lucro do mes
- lista de pedidos abertos

### Gestao

- rota: `/gestao`
- fica no grupo "Financeiro" da sidebar
- e uma tela visual de leitura, nao de configuracao pesada
- usa dados reais de pedidos e despesas
- filtros: hoje, esta semana, este mes, mes anterior e periodo personalizado
- ao trocar periodo fixo, as datas sao atualizadas via query string sem refresh completo do app
- periodo personalizado libera os inputs de data e usa botao "Filtrar"
- mostra faturamento, quantidade de pedidos, ticket medio, custos, despesas, lucro bruto e lucro liquido
- mostra graficos simples/barras para faturamento, lucro, custos/despesas e distribuicao
- mostra apenas preview da distribuicao com base na configuracao salva em `/financeiro`

Regra atual de pedidos financeiros:

- pedidos com `status === "cancelado"` ou `paymentStatus === "cancelado"` ficam fora
- pedidos nao cancelados entram nos numeros, mesmo que o fluxo de pagamento ainda nao esteja maduro
- custo vem dos snapshots financeiros salvos em pedidos/itens quando disponiveis

### Financeiro

- rota: `/financeiro`
- fica no grupo "Financeiro" da sidebar
- concentra configuracoes financeiras e despesas
- permite cadastrar, editar e excluir despesas da empresa
- permite cadastrar dados de pagamento da empresa para aparecerem no orcamento, como Pix, favorecido, banco, link e instrucoes
- categorias sugeridas: Ingredientes, Embalagens, Entregas, Marketing, Energia, Agua, Aluguel, Equipamentos, Manutencao, Pro-labore e Outros
- permite salvar distribuicao de lucro por porcentagem
- distribuicao atual: Socios, Reinvestimento e Reserva de caixa
- a soma das porcentagens precisa ser exatamente 100%
- o formulario mostra feedback visual em tempo real e exemplo em dinheiro baseado em R$ 1.000,00
- toast de salvamento deve aparecer imediatamente, sem depender de refresh

### Clientes

- cadastro
- edicao
- exclusao
- modal de confirmacao para exclusao
- confirmacao ao cancelar edicao com campos alterados

### Insumos

- a UI usa "Insumos", mas o banco ainda usa `ingredients`
- cadastro de insumo base
- registro de primeira compra/lote
- registro de novas compras
- categoria e estoque minimo foram removidos da UI principal
- valores usam entrada monetaria com `R$`
- cards com altura controlada e area scrollavel

### Calculadoras

- calculadora de preco de venda
- calculadora de custo por rendimento
- campos aceitam valores quebrados com virgula ou ponto
- unidades e reais padronizados
- calculadora de redimensionamento de receita usa receitas reais e recalcula os insumos por fator de rendimento

### Receitas e produtos

- receitas com edicao e exclusao
- produtos com edicao e exclusao
- passo a passo fica em `recipes.notes`
- insumos da receita podem ser adicionados, editados e removidos
- status/ativo foi removido da UI de produtos/receitas
- selecao por query param usa `scroll={false}` para evitar voltar ao topo
- receitas ficam em uma faixa horizontal de selecao no topo
- o formulario de receita fica abaixo, com dados da receita e insumos no mesmo bloco
- ao criar uma receita, a area de insumos fica visivel como bloqueada ate salvar a base

### Pedidos

- criacao de pedido com multiplos produtos/receitas
- edicao de pedido
- exclusao de pedido com confirmacao
- visualizacao de orcamento em pagina propria
- acoes no orcamento para compartilhar via WhatsApp, imprimir, baixar PNG e gerar PDF
- resumo do pedido com linhas, totais, custo e lucro
- quantidade por linha com unidade `un`, `g`, `kg`, `ml` ou `l`
- desconto em valor ou porcentagem
- custo estimado recalculado a partir da receita/insumos quando o snapshot enviado vem zerado
- numero visual do pedido no formato `Pedido 1`, `Pedido 2`, sem `#FO`
- status operacional
- status de pagamento
- snapshots de custo/lucro
- valores monetarios padronizados com `R$`

### Producao

- nao mostra ingredientes usados/consolidados
- mostra pedidos de todo o tempo por padrao
- filtros por status, data inicial e data final
- paginacao de 10 pedidos por pagina
- cards de resumo com pedidos filtrados, pedidos em aberto e valor no filtro

### Loading, erro e feedback

- `components/ui/skeleton.tsx`
- `components/dashboard/page-loading.tsx`
- `components/dashboard/error-state.tsx`
- `app/loading.tsx`
- `app/(dashboard)/loading.tsx`
- `app/(dashboard)/error.tsx`
- `app/(auth)/loading.tsx`
- `app/(auth)/error.tsx`
- `components/ui/toaster.tsx`
- `components/forms/confirm-action-button.tsx`

## Performance/cache

Foi adicionado cache seguro por request com `React.cache`:

- `lib/auth-context.ts`
- leituras principais em `lib/data.ts`

Evitar cache global persistente para dados autenticados sem uma estrategia clara de tags e invalidacao.

## UI e formularios recentes

- Foram adicionados placeholders nos principais formularios que estavam secos demais: pedidos, receitas/produtos, ingredientes, financeiro/despesas, distribuicao de lucro, calculadora e redefinicao de senha.
- A tela de login nao deve virar pagina scrollavel em uso normal; manter layout compacto.
- Evitar excesso de informacao em Gestao. Configuracao e cadastro ficam em Financeiro.
- Evitar textos dentro de skeletons; usar blocos neutros.
- Datas e horarios devem aparecer como `DD/MM/YYYY HH:MM`.
- Acoes criticas usam confirmacao; salvamentos e exclusoes devem disparar toast/feedback visual.

## Deploy na Vercel

O deploy planejado e pela Vercel importando o repositorio GitHub.

Passos:

1. Criar projeto na Vercel a partir de `KauaLibrelato/FoodOrganizze`.
2. Framework: Next.js.
3. Build command: `npm run build`.
4. Output directory: deixar default/vazio.
5. Configurar variaveis de ambiente.

Variaveis:

```env
NEXT_PUBLIC_APP_URL=https://SEU-DOMINIO.vercel.app
NEXT_PUBLIC_APP_NAME=Casa Fratoni
NEXT_PUBLIC_BUSINESS_NAME=Casa Fratoni
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=SUA_ANON_KEY
```

Supabase Auth em producao:

- Site URL: `https://SEU-DOMINIO.vercel.app`
- Redirect URLs:
  - `https://SEU-DOMINIO.vercel.app/auth/callback`
  - `https://SEU-DOMINIO.vercel.app/redefinir-senha`

Se usar dominio proprio, repetir as URLs com o dominio final.

## Arquivos que mais importam

- `AGENTS.md`
- `README.md`
- `docs/PROJECT_CONTEXT.md`
- `docs/HANDOFF.md`
- `docs/technical-summary.md`
- `database/schema.sql`
- `app/actions.ts`
- `lib/auth-context.ts`
- `lib/data.ts`
- `lib/env.ts`
- `lib/brand.ts`
- `lib/calculations`
- `types/index.ts`

## Como testar rapidamente

1. Subir servidor:

```bash
npm run dev
```

2. Abrir:

```txt
http://localhost:3000/login
```

3. Entrar com usuario ja criado no Supabase Auth.

4. Testar rotas:

```txt
/dashboard
/clientes
/ingredientes
/receitas
/pedidos
/producao
/calculadoras
/gestao
/financeiro
/redefinir-senha
```

5. Ao mexer em Supabase/auth/actions:

```bash
npm run build
```

Depois do build, reiniciar o dev server limpo antes de testar localmente.

## Pendencias e proximos passos recomendados

1. Confirmar no Supabase de producao se `database/gestao-financeira.sql` ja foi rodado.
2. Confirmar no Supabase de producao se `database/pedidos-multiplos-itens.sql` ja foi rodado.
3. Ajustar fino o PNG do orcamento; a exportacao melhorou, mas ainda nao deve ser tratada como final.
4. Melhorar o PDF do orcamento; ele ainda nao esta 100% pronto e precisa ficar consistente/bonito para envio a cliente.
5. Realizar bateria de testes de performance, seguranca, regressao, responsividade, exportacao de arquivos e fluxos criticos.
6. Fazer deploy na Vercel e configurar redirects do Supabase Auth.
7. Revisar Gestao/Financeiro com dados reais depois da migracao para calibrar os numeros.
8. Criar historico detalhado por cliente.
9. Criar detalhe de insumo com historico de compras.
10. Criar relatorio/exportacao da tela de producao.
11. Adicionar testes unitarios para `lib/calculations`.
12. Revisar todos os formularios restantes para toasts/confirmacoes padronizados.
13. Se precisar de cache persistente, usar tags por empresa e invalidacao em Server Actions.
