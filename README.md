# Casa Fratoni

Sistema web interno para gestao de pedidos, clientes, receitas, ingredientes, compras, precificacao e producao da confeitaria artesanal Casa Fratoni.

O projeto nasceu com o nome FoodOrganizze, mas a marca atual da interface e Casa Fratoni.

## Visao rapida

O sistema ajuda a confeitaria a organizar:

- pedidos e status de entrega
- clientes
- ingredientes base
- compras/lotes de ingredientes
- custo medio ponderado
- receitas, ingredientes e passo a passo
- custo por rendimento
- produtos vendaveis
- snapshots de custo/lucro em pedidos
- producao por pedidos, status e periodo
- gestao financeira por periodo
- cadastro de despesas da empresa
- configuracao de distribuicao de lucro
- calculadoras de preco de venda e rendimento

## Stack

- Next.js App Router
- TypeScript
- TailwindCSS
- componentes locais no estilo shadcn/ui
- Supabase Auth + Database
- Interface em portugues do Brasil

## Comandos

```bash
npm install
npm run dev
npm run build
npm run lint
```

App local:

```txt
http://localhost:3000
```

O script de desenvolvimento sobe em:

```txt
http://127.0.0.1:3000
```

## Ambiente

Crie `.env` baseado em `.env.example`:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=Casa Fratoni
NEXT_PUBLIC_BUSINESS_NAME=Casa Fratoni
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=SUA_ANON_KEY
```

Importante:

- `NEXT_PUBLIC_SUPABASE_URL` deve ser a URL base do projeto, sem `/rest/v1`.
- `NEXT_PUBLIC_APP_URL` precisa bater com a URL permitida no Supabase Auth para reset de senha.
- Para desenvolvimento local, adicione `http://localhost:3000/auth/callback` nas URLs de redirect do Supabase.

## Acesso

O sistema nao tem cadastro publico.

Fluxo atual:

1. Usuarios sao criados manualmente no Supabase Auth.
2. Login aceita apenas usuarios existentes.
3. Reset de senha so envia e-mail se o e-mail existir em `auth.users`.
4. O link de reset passa por `/auth/callback` e leva para `/redefinir-senha`.

## Modelo de empresa unica

O app e single-company:

- todos os usuarios autenticados trabalham na mesma empresa
- a empresa usada pelo app e a primeira linha de `public.businesses` por `created_at`
- as tabelas de negocio continuam usando `business_id`
- RLS permite acesso aos dados da empresa unica para usuarios autenticados

Se o banco ja estiver populado, nao rode `database/schema.sql` inteiro sem revisar. Para mudancas pontuais de RLS/funcoes, rode somente o trecho necessario.

## Banco

O schema principal fica em:

```txt
database/schema.sql
```

Ele contem:

- enums
- tabelas
- indices
- triggers de `updated_at`
- trigger de custo medio ponderado ao inserir compra
- RLS e policies
- RPCs usadas pela aplicacao

Funcoes importantes:

- `public.user_can_access_business(target_business_id uuid)`
- `public.email_has_auth_user(target_email text)`

### Ajuste financeiro pontual

Para bancos ja populados, use o arquivo pontual abaixo para criar as tabelas financeiras sem rodar o schema inteiro:

```txt
database/gestao-financeira.sql
```

Ele cria/ajusta `business_expenses` e `profit_distribution_settings`, com indices, triggers, RLS e policies.

## Marca

- Nome: Casa Fratoni
- Logo: `public/brand/casa-fratoni.svg`
- Cor primaria: `#b02243`
- Fundo/base: `#fcf6e2`

O nome e a logo sao centralizados em:

```txt
lib/brand.ts
components/brand/brand-logo.tsx
```

## Rotas principais

- `/dashboard`: balcao e resumo do dia a dia
- `/pedidos`: pedidos
- `/producao`: acompanhamento de producao
- `/gestao`: painel financeiro visual por periodo
- `/financeiro`: despesas e distribuicao de lucro
- `/clientes`: clientes
- `/ingredientes`: ingredientes e compras
- `/receitas`: receitas e produtos
- `/calculadoras`: calculadoras de preco e rendimento
- `/redefinir-senha`: troca de senha apos callback do Supabase

## Documentacao de contexto

- `AGENTS.md`: instrucoes curtas para qualquer IA/agente.
- `docs/PROJECT_CONTEXT.md`: contexto completo de produto, arquitetura, dominio e visual.
- `docs/HANDOFF.md`: estado atual, comandos, banco, pendencias e proximos passos.
- `docs/technical-summary.md`: resumo tecnico compacto.
