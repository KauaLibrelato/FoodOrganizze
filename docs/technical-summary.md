# Casa Fratoni - Resumo Tecnico

Casa Fratoni e um sistema web interno para gestao de pedidos, clientes, receitas, ingredientes, compras, precificacao e producao de uma confeitaria artesanal.

O projeto nasceu como FoodOrganizze, mas a marca atual da interface e Casa Fratoni.

## Stack

- Next.js App Router
- TypeScript
- TailwindCSS
- componentes locais no estilo shadcn/ui
- Supabase Auth e Database
- interface em portugues do Brasil

## Identidade visual

- Nome: Casa Fratoni
- Logo: `public/brand/casa-fratoni.svg`
- Primaria: `#b02243`
- Fundo/base: `#fcf6e2`
- Cards em creme claro
- Textos em tons quentes de marrom e cinza
- Badges discretas para estados de pedido e pagamento

## Auth e empresa

- Nao ha cadastro publico.
- Usuarios sao criados manualmente no Supabase Auth.
- Login usa e-mail/senha.
- Reset de senha so envia e-mail se o e-mail existir em `auth.users`.
- `public.email_has_auth_user(target_email text)` faz a validacao de e-mail.
- O app e single-company: todos os usuarios autenticados acessam a mesma empresa.
- A empresa usada e a primeira linha de `public.businesses` por `created_at`.
- `public.user_can_access_business(target_business_id uuid)` sustenta as policies de RLS.

## Modelagem

As tabelas operacionais usam `business_id`. Mesmo com modelo single-company no app, o campo segue existindo para consistencia, RLS e evolucao futura.

Pedidos e itens salvam snapshots de custo e lucro para preservar historico quando precos de ingredientes mudarem.

## Regras implementadas

- Ingredientes base tem estoque atual, unidade base, estoque minimo e custo medio.
- Compras de ingredientes guardam quantidade original, unidade, quantidade convertida, preco total e preco unitario.
- Um trigger atualiza estoque e custo medio ponderado apos nova compra.
- Receitas usam ingredientes com quantidade convertida para a unidade base.
- Receitas podem guardar passo a passo em `recipes.notes`.
- Produtos podem se vincular a receitas.
- Pedidos possuem status operacional, status de pagamento e snapshots financeiros.
- Producao lista pedidos paginados e filtraveis por status/data; nao consolida ingredientes na UI atual.
- Gestao financeira usa pedidos nao cancelados, custos salvos em snapshots e despesas cadastradas.
- `business_expenses` guarda despesas por categoria/data.
- `profit_distribution_settings` guarda porcentagens de distribuicao de lucro, que devem somar 100%.

## Gestao e financeiro

- `/gestao` e o painel visual: filtros por periodo, cards de metricas, graficos simples e preview da distribuicao.
- `/financeiro` concentra edicoes: cadastro/edicao/exclusao de despesas e configuracao das porcentagens.
- Filtros de periodo fixo atualizam datas automaticamente; periodo personalizado libera os inputs.
- Se o lucro liquido for menor ou igual a zero, nao existe distribuicao de lucro.
- Para banco ja populado, aplicar `database/gestao-financeira.sql` no Supabase antes de usar mutacoes financeiras.

## Estado atual

O app ja tem:

- login Supabase sem cadastro publico
- reset de senha
- middleware de protecao
- cache por request com `React.cache`
- CRUD/edicao/exclusao de clientes
- cadastro de ingredientes e compras
- receitas/produtos com edicao e exclusao
- edicao/remocao de ingredientes em receitas
- pedidos simples com snapshots
- dashboard de balcao
- producao por pedidos com filtros e paginacao
- gestao financeira
- financeiro/despesas/distribuicao
- calculadoras de preco/rendimento
- skeleton loading cru, estados de erro, toasts e confirmacoes

## Arquivos-chave

- `app/actions.ts`
- `app/(auth)/login/page.tsx`
- `app/(auth)/redefinir-senha/page.tsx`
- `app/auth/callback/route.ts`
- `middleware.ts`
- `lib/auth-context.ts`
- `lib/brand.ts`
- `lib/data.ts`
- `lib/calculations`
- `database/schema.sql`
- `database/gestao-financeira.sql`
- `types/index.ts`
