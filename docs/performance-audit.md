# Auditoria de Performance - Casa Fratoni

Data da auditoria: 24/06/2026  
Escopo: análise local do repositório, build de produção, artefatos `.next`, rotas públicas locais e inspeção estática. Não houve alteração de código de aplicação, banco de dados ou teste de carga.

## 1. Resumo executivo

O projeto usa Next.js App Router com boa base de Server Components e poucos assets estáticos. O build de produção passou e a maioria das rotas fica entre 102 kB e 122 kB de First Load JS. O principal outlier confirmado é a tela de orçamento, com **288 kB de First Load JS** e bundle server de **900 KB**, causado principalmente por exportação client-side com `html2canvas` e `jspdf`.

Os gargalos mais importantes estão na camada de dados: muitas leituras usam `select("*")`, não têm paginação/limite e puxam coleções inteiras para filtrar/agregar em memória. Isso está aceitável para uso inicial pequeno, mas vira gargalo rapidamente conforme pedidos, itens, clientes, receitas e despesas crescem.

Risco geral de performance antes de produção: **médio** para operação pequena; **alto** se o app crescer sem paginação, agregações no banco e otimização da exportação de orçamento.

## 2. Arquitetura identificada

- Framework: Next.js App Router. Build local reportou Next.js `15.5.19`.
- React: 19.
- TypeScript: 5.
- Banco/Auth: Supabase Auth e Database via `@supabase/ssr`.
- Rotas públicas: `/login`, `/redefinir-senha`, `/auth/callback`.
- Rotas privadas: dashboard, clientes, ingredientes, receitas, pedidos, produção, gestão, financeiro, calculadoras, orçamento e PDF.
- Server Actions: `app/actions.ts`, concentrando autenticação e mutações.
- Middleware: `middleware.ts`, chama Supabase para validar usuário em toda rota não estática.
- Server Components: páginas de dashboard e telas principais.
- Client Components identificados: 15 arquivos com `"use client"`, incluindo forms, sidebar, toaster, calculadora e botões de orçamento.
- API Routes: `/api/seed-sample` e `/pedidos/[orderId]/pdf`.
- Storage: não foi encontrado uso de Supabase Storage.
- Serviços externos: Supabase e link externo `wa.me`.

## 3. Fluxos críticos

- Login: `/login` renderiza formulário server-side e chama `signInAction`.
- Reset: `/login` chama `requestPasswordResetAction`; `/redefinir-senha` usa Supabase client no navegador.
- Dashboard: `getDashboardData()` carrega clientes, insumos, receitas, ingredientes de receita, produtos, pedidos e itens.
- Pedidos: `/pedidos` carrega pedidos, itens, clientes, produtos, receitas e ingredientes de receita; renderiza formulários de criação e edição.
- Orçamento: `/pedidos/[orderId]/orcamento` carrega todos os pedidos, itens, clientes e dados de pagamento; exporta PNG/PDF no cliente.
- PDF: `/pedidos/[orderId]/pdf` carrega dados no servidor e gera PDF com código Node.
- Gestão: `/gestao` carrega todos os pedidos, despesas e distribuição; filtra e agrega em memória.
- Produção: `/producao` busca todos os pedidos e itens, filtra/pagina em memória.
- Insumos/receitas/calculadoras: carregam listas completas e fazem cálculos no servidor ou no client component de calculadora.

## 4. Métricas coletadas

Build:

- `npm run build`: passou.
- Tempo medido por `/usr/bin/time -l npm run build`: build concluiu; `time` retornou exit 1 porque o sandbox bloqueou `sysctl kern.clockrate`, mas o Next finalizou com sucesso.
- Tempo real reportado antes do erro do `time`: **7.54 s**.
- Compilação: **1354 ms**.
- Rotas geradas: **17**.
- `.next`: **332 MB** total, incluindo cache/traces.
- `.next/static`: **2.0 MB**.
- `.next/server`: **5.2 MB**.

Bundle por rota, conforme `next build`:

- First Load JS compartilhado: **102 kB**.
- `/pedidos/[orderId]/orcamento`: **175 kB route size**, **288 kB First Load JS**.
- `/redefinir-senha`: **67.5 kB route size**, **177 kB First Load JS**.
- `/pedidos`: **5.36 kB route size**, **122 kB First Load JS**.
- `/financeiro`: **3.39 kB route size**, **120 kB First Load JS**.
- `/clientes`: **2.51 kB route size**, **119 kB First Load JS**.
- `/gestao`: **3.17 kB route size**, **116 kB First Load JS**.
- Demais rotas principais: aproximadamente **102 kB a 116 kB** First Load JS.
- Middleware: **89.6 kB**.

Maiores chunks JS em `.next/static/chunks`:

- `164f4fb6-e3f9b43943fe6b3e.js`: **324 KB**.
- `ad2866b8-635304a38afc0b68.js`: **196 KB**.
- `framework-f52ebcb9f26a1e11.js`: **188 KB**.
- `877-d7963a2d1e35a130.js`: **184 KB**.
- chunks shared `4bd...` e `255...`: **172 KB** cada no disco.

Maiores bundles server app:

- `.next/server/app/(dashboard)/pedidos/[orderId]/orcamento/page.js`: **900 KB**.
- `.next/server/app/(auth)/redefinir-senha/page.js`: **236 KB**.
- `.next/server/app/(dashboard)/pedidos/page.js`: **48 KB**.

Assets:

- `public/brand/casa-fratoni.svg`: **16 KB**.

Medição local de rotas públicas em `next start`:

- Servidor pronto em **253 ms**.
- `GET /login`: 200, **0.031208 s**, 24,740 bytes.
- `GET /login` warm: 200, **0.016603 s**, 24,740 bytes.
- `GET /redefinir-senha`: 200, **0.011258 s**, 20,866 bytes.
- `GET /dashboard` sem sessão: 307, **0.036793 s** frio; warm **0.003319 s**.

Dependências locais relevantes:

- `node_modules/jspdf`: **29 MB**.
- `node_modules/html2canvas`: **4.4 MB**.
- `node_modules/lucide-react`: **36 MB** no pacote instalado.
- `node_modules/@supabase`: **8.8 MB**.

## 5. Limitações da análise

- Não foram medidos tempos de rotas autenticadas reais porque não usei credenciais nem interagi com Supabase remoto.
- Não rodei Lighthouse em navegador porque o escopo principal foi local/estático e as rotas críticas exigem sessão.
- Não foram coletados `EXPLAIN ANALYZE`, estatísticas reais de índices ou latência Supabase.
- Não houve teste de carga.
- Métricas de bundle são de build local; tamanhos transferidos reais dependem de compressão/CDN.
- Timings HTTP locais cobrem rotas públicas e redirects, não telas com dados reais.

## 6. Gargalos confirmados

### PERF-001 - Página de orçamento carrega bibliotecas pesadas antes do clique

- Categoria: frontend, bundle, hydration
- Severidade: alta
- Confiança: alta
- Arquivo e linha aproximada: `lib/client/quote-export.ts:1-4`, `components/orders/quote-image-button.tsx:1-7`, `components/orders/quote-pdf-button.tsx:1-7`, `app/(dashboard)/pedidos/[orderId]/orcamento/page.tsx:5-7`
- Evidência: `next build` reportou `/pedidos/[orderId]/orcamento` com **288 kB First Load JS** e **175 kB** próprios. `rg -l "html2canvas|jsPDF|jspdf" .next/static .next/server` apontou chunks estáticos e o page bundle. O código importa `html2canvas` e `jsPDF` no topo do módulo client.
- Comportamento atual: abrir orçamento baixa JS de exportação PNG/PDF mesmo que o usuário só queira visualizar ou compartilhar por WhatsApp.
- Causa raiz: imports estáticos em módulo client compartilhado pelos botões.
- Impacto para o usuário: carregamento e hidratação mais pesados na tela de orçamento, especialmente em celular.
- Impacto em infraestrutura: mais tráfego de CDN e mais tempo de CPU no cliente.
- Recomendação: carregar `html2canvas` e `jspdf` com `import()` dentro do handler de clique, ou priorizar o PDF server-side já existente.
- Exemplo de otimização:

```ts
async function downloadQuotePdf() {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);
  // gerar somente após clique
}
```

- Esforço: pequeno
- Risco de regressão: médio, exportação PNG/PDF precisa QA visual
- Forma de medir antes/depois: comparar `next build` na rota `/pedidos/[orderId]/orcamento` e chunks estáticos.
- Teste necessário: abrir orçamento, baixar PNG, baixar PDF, imprimir e compartilhar WhatsApp.

### PERF-002 - Leituras usam `select("*")` e retornam mais colunas que o necessário

- Categoria: backend, banco, rede
- Severidade: média
- Confiança: alta
- Arquivo e linha aproximada: `lib/data.ts:397-570`
- Evidência: `getCustomers`, `getIngredients`, `getIngredientPurchases`, `getRecipes`, `getRecipeIngredients`, `getProducts`, `getOrders`, `getOrderItems`, `getBusinessExpenses`, `getBusinessPaymentSettings` e `getProfitDistributionSettings` usam `.select("*")`.
- Comportamento atual: cada tela recebe todas as colunas das entidades, mesmo quando só precisa de subconjunto.
- Causa raiz: camada de dados genérica e mapeadores completos.
- Impacto para o usuário: mais latência nas rotas autenticadas conforme tabelas crescem.
- Impacto em infraestrutura: mais egress Supabase, serialização e memória no serverless.
- Recomendação: criar funções de leitura específicas por tela ou selecionar colunas estritamente necessárias.
- Exemplo de otimização:

```ts
.from("orders")
.select("id,business_id,customer_id,order_number,delivery_date,delivery_time,status,payment_status,total_price,total_cost_snapshot,estimated_profit_snapshot")
.eq("business_id", businessId)
```

- Esforço: médio
- Risco de regressão: médio
- Forma de medir antes/depois: tamanho de payload Supabase, tempo de render server-side e tamanho do RSC.
- Teste necessário: validar todas as telas que usam cada getter.

### PERF-003 - Listas principais não têm paginação no banco

- Categoria: backend, banco, escalabilidade
- Severidade: alta
- Confiança: alta
- Arquivo e linha aproximada: `lib/data.ts:397-533`, `app/(dashboard)/pedidos/page.tsx:15-23`, `app/(dashboard)/producao/page.tsx:51-63`
- Evidência: getters de pedidos, itens, clientes, insumos, compras e despesas não usam `.limit()` ou `.range()`. Produção pagina em memória após carregar todos os pedidos e itens.
- Comportamento atual: telas carregam coleções completas por empresa.
- Causa raiz: simplicidade inicial da camada de dados.
- Impacto para o usuário: tempo de resposta cresce com histórico; página de pedidos pode ficar pesada.
- Impacto em infraestrutura: maior consumo de memória/CPU em serverless e mais leituras Supabase.
- Recomendação: paginação no banco, filtros por período/status no banco e endpoints/getters dedicados.
- Exemplo de otimização:

```ts
.from("orders")
.select("id,order_number,delivery_date,status,total_price", { count: "exact" })
.eq("business_id", businessId)
.order("delivery_date", { ascending: false })
.range(offset, offset + pageSize - 1)
```

- Esforço: médio/grande
- Risco de regressão: alto em UX de listas e filtros
- Forma de medir antes/depois: linhas retornadas por request, tempo Supabase e memória do processo.
- Teste necessário: paginação, filtros, edição e exclusão em páginas diferentes.

### PERF-004 - Gestão agrega dados em memória após buscar todo o histórico

- Categoria: backend, banco, custos
- Severidade: alta
- Confiança: alta
- Arquivo e linha aproximada: `lib/data.ts:711-754`, `lib/data.ts:681-708`, `app/(dashboard)/gestao/page.tsx:81-148`
- Evidência: `getManagementData()` chama `getOrders()` e `getBusinessExpenses()` sem filtro de período no banco; depois filtra por data e reduz arrays em Node.
- Comportamento atual: filtro "este mês" ainda pode carregar anos de pedidos/despesas.
- Causa raiz: agregação feita no servidor de aplicação.
- Impacto para o usuário: gestão fica mais lenta com histórico grande.
- Impacto em infraestrutura: leituras desnecessárias, CPU serverless e custo Supabase.
- Recomendação: filtrar por `delivery_date`/`expense_date` no banco e calcular agregados via SQL/RPC/view materializada conforme necessidade.
- Exemplo de otimização:

```ts
.from("orders")
.select("total_price,total_cost_snapshot,delivery_date,status,payment_status")
.eq("business_id", businessId)
.gte("delivery_date", startDate)
.lte("delivery_date", endDate)
```

- Índice sugerido:
  - Tabela: `orders`
  - Colunas: `(business_id, delivery_date)`
  - Tipo: btree composto
  - Query beneficiada: filtros por empresa e período em gestão/produção
  - Impacto esperado: menos scan e ordenação por período
  - Custo de escrita: pequeno aumento em inserts/updates de `delivery_date`
  - SQL:

```sql
create index if not exists orders_business_delivery_date_idx
on public.orders (business_id, delivery_date);
```

- Esforço: médio
- Risco de regressão: médio
- Forma de medir antes/depois: `EXPLAIN ANALYZE`, tempo da rota `/gestao`, bytes retornados Supabase.
- Teste necessário: períodos fixos e personalizado.

### PERF-005 - Produção pagina depois de carregar todos os pedidos e itens

- Categoria: backend, banco, escalabilidade
- Severidade: alta
- Confiança: alta
- Arquivo e linha aproximada: `lib/data.ts:841-875`, `app/(dashboard)/producao/page.tsx:51-63`
- Evidência: `getProductionData()` chama `getOrders()` e `getOrderItems()`, filtra, ordena, calcula `totalPages` e só então faz `slice`.
- Comportamento atual: a UI mostra 10 pedidos, mas o servidor lê todos.
- Causa raiz: paginação em memória.
- Impacto para o usuário: a rota piora proporcionalmente ao histórico total.
- Impacto em infraestrutura: custo de leitura de itens/pedidos cresce sem necessidade.
- Recomendação: aplicar filtros, ordenação e range no Supabase; buscar itens apenas dos pedidos da página.
- Exemplo de otimização:

```ts
const { data: pageOrders, count } = await supabase
  .from("orders")
  .select("id,customer_id,order_number,delivery_date,delivery_time,status,payment_status,total_price,total_cost_snapshot,estimated_profit_snapshot,notes", { count: "exact" })
  .eq("business_id", businessId)
  .gte("delivery_date", startDate)
  .lte("delivery_date", endDate)
  .order("delivery_date", { ascending: false })
  .range(offset, offset + pageSize - 1);
```

- Índice sugerido:
  - Tabela: `orders`
  - Colunas: `(business_id, status, delivery_date)`
  - Tipo: btree composto
  - Query beneficiada: produção por empresa/status/período
  - Impacto esperado: acelera filtros por status; útil se status seletivo
  - Custo de escrita: pequeno aumento em updates de status/data
  - SQL:

```sql
create index if not exists orders_business_status_delivery_date_idx
on public.orders (business_id, status, delivery_date);
```

- Esforço: médio
- Risco de regressão: médio
- Forma de medir antes/depois: linhas lidas, tempo Supabase, tempo total `/producao`.
- Teste necessário: filtros, paginação e contagem total.

### PERF-006 - Página de pedidos renderiza todos os pedidos e forms de edição

- Categoria: frontend, server render, hydration
- Severidade: média
- Confiança: alta
- Arquivo e linha aproximada: `app/(dashboard)/pedidos/page.tsx:15-39`, `app/(dashboard)/pedidos/page.tsx:68-180`, `app/(dashboard)/pedidos/page.tsx:158-174`
- Evidência: a página faz `orders.map`, para cada pedido filtra `orderItems`, renderiza `<details>` e instancia `OrderForm` de edição com `customers`, `products`, `recipes` e `recipeCosts`.
- Comportamento atual: mesmo edições fechadas no `<details>` têm HTML/Client Component no payload inicial.
- Causa raiz: edição inline completa para todos os pedidos.
- Impacto para o usuário: HTML/RSC maiores, hidratação e render inicial mais pesados.
- Impacto em infraestrutura: maior render server-side e serialização de props.
- Recomendação: paginar pedidos, mover edição para rota/modal lazy ou renderizar `OrderForm` apenas quando selecionado.
- Exemplo de otimização:

```tsx
<Link href={`/pedidos/${order.id}/editar`}>Editar pedido</Link>
```

ou lazy client modal após clique.

- Esforço: médio/grande
- Risco de regressão: alto em UX de edição
- Forma de medir antes/depois: tamanho HTML/RSC de `/pedidos`, First Load JS e tempo de render.
- Teste necessário: criar, editar e excluir pedidos.

### PERF-007 - Cálculos de custo usam filtros aninhados O(R * RI)

- Categoria: backend, CPU
- Severidade: média
- Confiança: alta
- Arquivo e linha aproximada: `app/(dashboard)/pedidos/page.tsx:24-39`, `lib/data.ts:813-822`
- Evidência: para cada receita, o código executa `recipeIngredients.filter(...)`. O mesmo padrão aparece em dashboard e pedidos.
- Comportamento atual: custo de receitas cresce multiplicando quantidade de receitas por ingredientes de receita.
- Causa raiz: arrays não indexados em memória.
- Impacto para o usuário: rotas com muitas receitas/ingredientes ficam mais lentas.
- Impacto em infraestrutura: CPU server-side desnecessária.
- Recomendação: agrupar `recipeIngredients` por `recipeId` uma vez usando `Map`.
- Exemplo de otimização:

```ts
const ingredientsByRecipe = new Map<string, RecipeIngredient[]>();
for (const item of recipeIngredients) {
  const list = ingredientsByRecipe.get(item.recipeId) ?? [];
  list.push(item);
  ingredientsByRecipe.set(item.recipeId, list);
}
```

- Esforço: pequeno
- Risco de regressão: baixo
- Forma de medir antes/depois: benchmark local com arrays grandes e tempo de render `/pedidos`.
- Teste necessário: custos de receitas iguais antes/depois.

### PERF-008 - Número do pedido faz scan completo dos pedidos

- Categoria: backend, banco, concorrência
- Severidade: média
- Confiança: alta
- Arquivo e linha aproximada: `app/actions.ts:84-100`, `app/actions.ts:1168`
- Evidência: `getNextOrderNumber()` faz `.select("order_number").eq("business_id", businessId)` sem limite e reduz em Node.
- Comportamento atual: cada novo pedido lê todos os números antigos.
- Causa raiz: geração sequencial fora do banco.
- Impacto para o usuário: criação de pedido fica mais lenta com histórico.
- Impacto em infraestrutura: leitura crescente e risco de colisão em concorrência.
- Recomendação: usar sequence/tabela contador/RPC transacional por empresa.
- Exemplo de otimização:

```sql
create sequence if not exists public.order_number_seq;
```

ou RPC com `select ... for update` em tabela `business_order_counters`.

- Esforço: médio
- Risco de regressão: médio
- Forma de medir antes/depois: tempo de criação com 1k/10k pedidos e teste concorrente.
- Teste necessário: duas criações simultâneas não duplicam número.

### PERF-009 - Atualização de pedido apaga e reinsere todos os itens

- Categoria: backend, banco, escrita
- Severidade: média
- Confiança: alta
- Arquivo e linha aproximada: `app/actions.ts:1208-1278`
- Evidência: `updateOrderAction()` atualiza pedido, deleta todos os `order_items` do pedido e insere todos novamente.
- Comportamento atual: editar uma observação ou status regrava todos os itens.
- Causa raiz: falta de diff/upsert por item.
- Impacto para o usuário: edições de pedidos grandes ficam mais lentas.
- Impacto em infraestrutura: mais writes, triggers/índices e WAL no banco.
- Recomendação: separar edição de status/campos do pedido da edição de itens; aplicar diff para itens alterados.
- Exemplo de otimização:

```ts
// atualizar order quando itens não mudaram
// upsert itens alterados e deletar somente removidos
```

- Esforço: médio/grande
- Risco de regressão: alto
- Forma de medir antes/depois: quantidade de queries/writes por atualização.
- Teste necessário: alterar só status; alterar quantidade; remover/adicionar item.

### PERF-010 - Middleware faz chamada Auth em todas as rotas dinâmicas

- Categoria: backend, auth, edge/serverless
- Severidade: média
- Confiança: alta
- Arquivo e linha aproximada: `middleware.ts:12-57`, `lib/auth-context.ts:16-30`
- Evidência: middleware cria client Supabase e chama `supabase.auth.getUser()`; páginas autenticadas também chamam `getAccountContext()` que chama `getUser()`, faz upsert de profile e busca business.
- Comportamento atual: request autenticado tende a ter validação no middleware e novamente no render.
- Causa raiz: proteção em middleware mais contexto autenticado por tela.
- Impacto para o usuário: latência extra por request autenticado.
- Impacto em infraestrutura: mais chamadas Supabase Auth/Database.
- Recomendação: medir em produção; reduzir upsert de profile por request; considerar `getClaims()` quando aplicável e manter `getUser()` onde segurança exigir.
- Exemplo de otimização:

```ts
// fazer upsert de profile apenas em callback/login ou quando profile não existir
```

- Esforço: médio
- Risco de regressão: alto em auth
- Forma de medir antes/depois: tracing por request com número de chamadas Supabase.
- Teste necessário: login, sessão expirada, refresh de token, rotas privadas.

### PERF-011 - PDF server-side carrega coleções completas para achar um pedido

- Categoria: backend, serverless, PDF
- Severidade: média
- Confiança: alta
- Arquivo e linha aproximada: `app/(dashboard)/pedidos/[orderId]/pdf/route.ts:26-36`
- Evidência: rota chama `getOrders()`, `getOrderItems()`, `getCustomers()` e depois usa `.find()`/`.filter()` para um `orderId`.
- Comportamento atual: gerar um PDF de um pedido lê todos os pedidos, itens e clientes.
- Causa raiz: reuso de getters genéricos.
- Impacto para o usuário: PDF pode ficar lento com histórico grande.
- Impacto em infraestrutura: alto custo de leitura para um documento.
- Recomendação: buscar diretamente o pedido por `id` e `business_id`, itens por `order_id`, cliente por `customer_id`.
- Exemplo de otimização:

```ts
const order = await getOrderById(orderId);
const items = await getOrderItemsByOrderId(orderId);
```

- Índice sugerido:
  - Tabela: `order_items`
  - Colunas: `(business_id, order_id)`
  - Tipo: btree composto
  - Query beneficiada: itens de um pedido em PDF/orçamento/edição
  - Impacto esperado: leitura direta dos itens do pedido
  - Custo de escrita: pequeno
  - SQL:

```sql
create index if not exists order_items_business_order_id_idx
on public.order_items (business_id, order_id);
```

- Esforço: pequeno/médio
- Risco de regressão: médio
- Forma de medir antes/depois: tempo do endpoint PDF e linhas retornadas.
- Teste necessário: PDF para pedido existente, inexistente e sem cliente.

### PERF-012 - Orçamento server page busca tudo para um único pedido

- Categoria: backend, frontend, rede
- Severidade: média
- Confiança: alta
- Arquivo e linha aproximada: `app/(dashboard)/pedidos/[orderId]/orcamento/page.tsx:79-93`
- Evidência: página chama `getOrders()`, `getOrderItems()`, `getCustomers()`, `getBusinessPaymentSettings()` e faz `find/filter`.
- Comportamento atual: abrir um orçamento de um pedido carrega coleções completas.
- Causa raiz: reuso dos getters genéricos.
- Impacto para o usuário: orçamento, já pesado no bundle, também fica pesado no servidor.
- Impacto em infraestrutura: leituras desnecessárias de Supabase.
- Recomendação: getters específicos por ID, com seleção de colunas mínima.
- Exemplo de otimização:

```ts
const [order, items, paymentSettings] = await Promise.all([
  getOrderById(orderId),
  getOrderItemsByOrderId(orderId),
  getBusinessPaymentSettings(),
]);
```

- Esforço: pequeno/médio
- Risco de regressão: médio
- Forma de medir antes/depois: tempo server render e bytes retornados.
- Teste necessário: orçamento com/sem cliente, múltiplos itens e pagamento.

## 7. Gargalos prováveis

- RLS com `user_can_access_business(business_id)` por linha pode ter custo adicional em tabelas grandes. Precisa de `EXPLAIN ANALYZE` no Supabase para confirmar.
- `lucide-react` parece bem tree-shaken no build, mas o pacote instalado é grande. Monitorar se imports crescerem ou se aparecer chunk de ícones.
- `React.cache` é seguro por request, mas não reduz chamadas entre requests. Telas com dados pouco mutáveis podem se beneficiar de cache tag-based depois de definir invalidação.
- Busca textual futura com `%termo%` exigiria trigram index; hoje há inputs visuais de busca sem implementação server-side relevante.
- PDF/PNG via canvas no cliente pode consumir muita memória em aparelhos móveis; precisa medição em navegador real.

## 8. Problemas de frontend

- Orçamento carrega exportação pesada no First Load.
- `/pedidos` instancia forms de edição inline para todos os pedidos.
- Algumas listas podem crescer sem virtualização/paginação visual.
- Client Components são razoáveis, mas `OrderForm` recebe coleções grandes como props.
- A tela de calculadoras é client-side e recebe receitas/ingredientes; escala depende do volume de receitas.
- Não há uso de `next/image`, mas também não há imagens bitmap relevantes; logo SVG é pequeno.

## 9. Problemas de backend

- Getters genéricos e amplos.
- Filtros e agregações em memória.
- Geração de número de pedido por scan.
- PDF/orçamento buscam coleções completas.
- Atualização de pedido regrava todos os itens.
- Middleware e contexto autenticado podem duplicar chamadas de Auth.

## 10. Problemas de banco

- Índices simples existem, mas faltam compostos para queries reais por `business_id + date/status/order_id`.
- Falta paginação no banco.
- Falta agregação SQL para gestão.
- Faltam queries específicas por ID para orçamento/PDF.
- RLS precisa de medição com tabelas grandes.

Índices recomendados iniciais:

```sql
create index if not exists orders_business_delivery_date_idx
on public.orders (business_id, delivery_date);

create index if not exists orders_business_status_delivery_date_idx
on public.orders (business_id, status, delivery_date);

create index if not exists order_items_business_order_id_idx
on public.order_items (business_id, order_id);

create index if not exists business_expenses_business_expense_date_idx
on public.business_expenses (business_id, expense_date);
```

Observação: `business_expenses_expense_date_idx` já existe só em `expense_date`; o composto beneficia filtros por empresa e período. Custo esperado: pequeno aumento em escritas.

## 11. Problemas de cache

- `React.cache` evita duplicação dentro do mesmo request, mas não cacheia entre requests.
- `revalidatePath` é chamado amplamente após mutações; isso é seguro, mas pouco granular.
- Não há `unstable_cache` ou cache com tags para dados de baixa frequência.
- Não há risco confirmado de cachear dados privados globalmente; ponto positivo.
- A rota PDF define `Cache-Control: no-store`, apropriado para orçamento privado.

## 12. Problemas de bundle

- Outlier confirmado em `/pedidos/[orderId]/orcamento`.
- `/redefinir-senha` tem 177 kB First Load JS por depender do client Supabase/browser client.
- First Load compartilhado de 102 kB é aceitável para um app interno.
- Chunks grandes confirmam bibliotecas de exportação no build.

## 13. Problemas de rede

- Uso de `select("*")` aumenta payloads Supabase.
- Falta paginação aumenta bytes por request.
- Rotas de orçamento/PDF carregam dados de toda a empresa para uma entidade.
- Não há scripts de terceiros carregados no app.

## 14. Problemas de escalabilidade

### 100 usuários

- Provável comportamento: aceitável se a base de dados ainda for pequena.
- Gargalos: orçamento pesado no celular; ações de pedido com scans de número.
- Monitorar: tempo de `/pedidos`, `/gestao`, criação de pedido e PDF.

### 1.000 usuários

- Gargalos prováveis: Supabase Auth chamado por request, leituras sem paginação, gestão filtrando histórico.
- Banco: índices compostos começam a importar.
- APIs: PDF/orçamento por ID precisam queries específicas.
- Custos: egress Supabase cresce com `select("*")`.

### 10.000 usuários

- Gargalos prováveis: modelo single-company com grandes tabelas e queries por histórico completo.
- Banco: necessidade de agregações SQL, paginação real, particionamento lógico por período se histórico crescer muito.
- APIs: PDF serverless pode sofrer timeout se continuar buscando tudo.
- Observabilidade: tracing por rota e query obrigatório.

### 100.000 usuários

- Arquitetura atual não deve ser assumida pronta.
- Necessário: filas para relatórios/exportações pesadas, cache por período, read models/materialized views, limites rígidos, rate limiting e separação de workloads.
- Banco: Supabase/Postgres precisa plano de índices, pool, limites de conexão e talvez replicas/read scaling.
- Custos: egress e CPU serverless dominam se não reduzir payloads.

## 15. Melhorias rápidas

- Dynamic import de `html2canvas` e `jspdf`.
- Getters específicos para orçamento/PDF por `orderId`.
- Trocar alguns `select("*")` por colunas mínimas nas telas críticas.
- Criar `Map` para itens por receita e itens por pedido.
- Adicionar índices compostos de período/status.
- Proteger/remover rota seed também ajuda evitar trabalho acidental em produção.

## 16. Melhorias estruturais

- Paginação no banco em `/pedidos`, `/producao`, clientes e compras.
- Agregações financeiras via SQL/RPC/view.
- Contador transacional de número de pedido.
- Edição de pedido com diff de itens.
- Observabilidade com tracing de Supabase e Web Vitals.
- Cache com tags por entidade quando houver invalidação clara.

## 17. Plano de otimização priorizado

1. P0: reduzir bundle do orçamento com imports dinâmicos.
2. P1: criar queries específicas por ID para orçamento/PDF.
3. P1: implementar paginação real em produção e pedidos.
4. P1: filtrar gestão por período no banco.
5. P2: substituir `select("*")` nas telas mais acessadas.
6. P2: adicionar índices compostos.
7. P2: otimizar cálculo de custos com mapas.
8. P2: trocar scan de número do pedido por contador transacional.
9. P3: revisar duplicação de Auth/profile upsert por request.
10. P3: diffs de itens em update de pedido.

## Tabela final

| Prioridade | ID | Problema | Impacto | Evidência | Esforço | Arquivo |
|---|---|---|---|---|---|---|
| P0 | PERF-001 | Exportação pesada no orçamento | Alto no carregamento da rota | 288 kB First Load JS; imports `html2canvas/jsPDF` | Pequeno | `lib/client/quote-export.ts` |
| P1 | PERF-003 | Listas sem paginação no banco | Alto com crescimento | getters sem `.limit/.range` | Médio | `lib/data.ts` |
| P1 | PERF-004 | Gestão agrega histórico em memória | Alto em histórico grande | `getManagementData()` filtra arrays | Médio | `lib/data.ts` |
| P1 | PERF-005 | Produção pagina em memória | Alto em histórico grande | `slice` após carregar todos | Médio | `lib/data.ts` |
| P1 | PERF-011 | PDF busca coleções completas | Médio/alto | `getOrders/getOrderItems/getCustomers` para 1 ID | Pequeno/médio | `pdf/route.ts` |
| P1 | PERF-012 | Orçamento busca coleções completas | Médio/alto | `find/filter` após getters globais | Pequeno/médio | `orcamento/page.tsx` |
| P2 | PERF-002 | `select("*")` amplo | Médio | múltiplos `.select("*")` | Médio | `lib/data.ts` |
| P2 | PERF-006 | Forms de edição para todos os pedidos | Médio | `OrderForm` dentro de cada `details` | Médio/grande | `pedidos/page.tsx` |
| P2 | PERF-007 | Filtros aninhados em cálculos | Médio | `recipes.map` + `recipeIngredients.filter` | Pequeno | `pedidos/page.tsx` |
| P2 | PERF-008 | Scan para número do pedido | Médio | select todos `order_number` | Médio | `app/actions.ts` |
| P2 | PERF-009 | Update regrava itens | Médio | delete + insert total | Médio/grande | `app/actions.ts` |
| P3 | PERF-010 | Auth/contexto duplicam chamadas | Médio provável | middleware + `getAccountContext` | Médio | `middleware.ts` |

## Top 10 gargalos

1. Bundle do orçamento com `html2canvas/jsPDF`.
2. Produção com paginação em memória.
3. Gestão com agregação de histórico em memória.
4. Pedidos sem paginação no banco.
5. PDF buscando dados globais para um pedido.
6. Orçamento buscando dados globais para um pedido.
7. `select("*")` em getters principais.
8. Edição inline de todos os pedidos.
9. Scan de `order_number` na criação.
10. Update de pedido apagando/reinserindo itens.

## Quick wins

- Dynamic import nas exportações.
- Query por ID para orçamento/PDF.
- `Map` para agrupar itens por pedido/receita.
- Colunas explícitas em `getOrders()` e `getOrderItems()`.
- Índice `(business_id, delivery_date)` em `orders`.
- Índice `(business_id, expense_date)` em `business_expenses`.

## Melhorias que reduzem custos

- Menos `select("*")`.
- Paginação no banco.
- Agregação SQL para gestão.
- Cache tag-based para dados de baixa mutação.
- Evitar baixar bibliotecas de exportação até o clique.

## Melhorias que aumentam escalabilidade

- Índices compostos.
- Queries específicas por tela.
- Read models ou views para gestão.
- Contador transacional de pedidos.
- Filas para exportações/relatórios se crescerem.

## Melhorias que podem causar regressão

- Paginação de `/pedidos` e edição inline.
- Alterar cálculo de gestão para SQL.
- Refatorar update de itens por diff.
- Mudar fluxo de PDF/PNG.
- Reduzir chamadas de Auth sem quebrar segurança.

## Pontos que precisam de monitoramento em produção

- Tempo por rota: `/pedidos`, `/gestao`, `/producao`, `/pedidos/[id]/orcamento`, `/pedidos/[id]/pdf`.
- Query count por request.
- Tempo e linhas retornadas por query Supabase.
- Erros/timeouts em Server Actions.
- Web Vitals: LCP, INP, CLS.
- Tamanho de JS por rota.
- Memória e duração serverless.
- Taxa de geração de PDF/PNG.
- Concorrência na criação de pedidos.

## Métricas recomendadas

- p50/p95/p99 de TTFB por rota.
- p50/p95/p99 de duração de Server Actions.
- Número de linhas retornadas por query.
- Bytes transferidos Supabase por rota.
- Duração de queries Postgres com `pg_stat_statements`.
- Cache hit ratio quando cache for introduzido.
- First Load JS e route size por build.
- LCP/INP/CLS em dispositivos móveis reais.
- Taxa de erro por rota/action.

## Checklist final

- [x] `/pedidos/[id]/orcamento` abaixo do peso atual de 288 kB First Load JS. Status: otimizado em 26/06/2026; build local mediu 116 kB.
- [x] `/producao` usa `range` no banco. Status: parcialmente otimizado em 26/06/2026; a lista e os itens da página usam paginação no banco, mas o resumo de receita ainda busca colunas mínimas dos pedidos filtrados até haver RPC/aggregate medido.
- [x] `/gestao` filtra período no banco. Status: parcialmente otimizado em 26/06/2026; pedidos e despesas do período são filtrados no Supabase, enquanto agregação e gráfico continuam em Node.
- [x] PDF e orçamento buscam apenas o pedido solicitado. Status: otimizado em 26/06/2026; rotas usam `getOrderById`, `getOrderItemsByOrderId` e `getCustomerById`.
- [x] Getters críticos sem `select("*")`. Status: parcialmente otimizado em 26/06/2026; `customers`, `orders`, `order_items` e `business_expenses` usam colunas explícitas. Outros getters amplos ficam pendentes por menor impacto imediato.
- [ ] Índices compostos criados e medidos com `EXPLAIN ANALYZE`. Status: parcialmente otimizado em 26/06/2026; migration criada em `database/performance-indexes-2026-06-26.sql`, ainda não aplicada nem medida em Supabase isolado.
- [ ] Criação de pedido sem scan de histórico.
- [ ] Atualização de pedido evita regravar itens quando não necessário.
- [ ] Tracing de Supabase ativo em produção.
- [ ] Lighthouse/Web Vitals coletados em dispositivo móvel.
- [ ] `npm run build` acompanhado em CI com budget de bundle.

## 18. Rodada de otimização aplicada em 26/06/2026

Escopo: mudanças de maior impacto e menor risco confirmadas no código local. Não houve teste de carga, alteração destrutiva de banco ou execução contra produção.

| ID | Status | Métrica antes | Métrica depois | Evidência | Efeitos colaterais / risco |
|---|---|---:|---:|---|---|
| PERF-001 | otimizado | `/pedidos/[orderId]/orcamento`: 175 kB route size, 288 kB First Load JS | 3.36 kB route size, 116 kB First Load JS | `npm run build` antes/depois | Exportação PNG/PDF agora baixa `html2canvas`/`jspdf` no clique; precisa QA visual em navegador real |
| PERF-002 | parcialmente otimizado | getters críticos com `select("*")` | `customers`, `orders`, `order_items`, `business_expenses` com seleção explícita | inspeção de `lib/data.ts` e build | Supabase sem tipos gerados exigiu casts nos mapeadores; comportamento funcional preservado |
| PERF-003 | parcialmente otimizado | produção carregava todos os pedidos e itens | produção usa `count`, `range` e busca itens só dos pedidos da página | inspeção de `getProductionData()` e build | resumo de receita ainda não é aggregate SQL; depende de medição real para RPC |
| PERF-004 | parcialmente otimizado | gestão buscava histórico completo e filtrava em memória | gestão filtra pedidos/despesas por período no Supabase | inspeção de `getManagementData()` e build | agregação permanece em Node para preservar regra e reduzir risco |
| PERF-005 | otimizado na lista | `slice` após carregar todos os pedidos/itens | `.range()` no banco e `.in("order_id", pageOrderIds)` para itens | inspeção de `getProductionData()` | filtros e paginação precisam validação com usuário real |
| PERF-007 | otimizado | filtros aninhados por receita/pedido | `Map` por receita, pedido e cliente | testes unitários e build | Sem mudança esperada no resultado |
| PERF-011 | otimizado | PDF usava `getOrders()`, `getOrderItems()`, `getCustomers()` globais | PDF busca pedido, itens e cliente por id | inspeção da rota PDF e build | Sem benchmark autenticado; rota sem sessão redireciona |
| PERF-012 | otimizado | orçamento usava coleções globais | orçamento busca pedido, itens e cliente por id | inspeção da página e build | Sem benchmark autenticado; rota sem sessão redireciona |
| Índices | parcialmente otimizado | índices compostos ausentes | migration criada, não aplicada | arquivo SQL criado | Aplicar primeiro em ambiente isolado e medir `EXPLAIN ANALYZE` |

Medições locais depois:

| Métrica | Antes | Depois | Diferença | Como foi medida |
|---|---:|---:|---:|---|
| `/pedidos/[orderId]/orcamento` First Load JS | 288 kB | 116 kB | -172 kB (-59,7%) | `npm run build` |
| `/pedidos/[orderId]/orcamento` route size | 175 kB | 3.36 kB | -171.64 kB (-98,1%) | `npm run build` |
| Bundle server do orçamento | 900 KB | 44 KB | -856 KB (-95,1%) | `du -k .next/server/app/(dashboard)/pedidos/[orderId]/orcamento/page.js` |
| `.next/static` | 2.0 MB | 2.0 MB | estável | `du -sh .next/static` |
| `.next/server` | 5.2 MB | 5.3 MB | +0.1 MB | `du -sh .next/server` |
| Build de produção | passou, compilação 1351 ms | passou, compilação 1599 ms | +248 ms neste run local | `npm run build` |
| Testes unitários | 4 testes, 84 ms | 6 testes, 107 ms | +2 testes | `npm test` |
| Rota `/producao` sem sessão | não medido nesta rodada antes | 307 em 0.004068 s | não comparável | `curl` local contra `next start`; mede redirect, não dados |
| Rota `/gestao` sem sessão | não medido nesta rodada antes | 307 em 0.056541 s | não comparável | `curl` local contra `next start`; mede redirect, não dados |
| Rota orçamento sem sessão | não medido nesta rodada antes | 307 em 0.003647 s | não comparável | `curl` local contra `next start`; mede redirect, não dados |
| Rota PDF sem sessão | não medido nesta rodada antes | 307 em 0.002900 s | não comparável | `curl` local contra `next start`; mede redirect, não dados |
| `/producao` autenticada | não medido antes | 1.486 s | não comparável | Browser local autenticado, `next start`, após migration |
| `/gestao` autenticada | não medido antes | 1.003 s | não comparável | Browser local autenticado, `next start`, após migration |
| `/pedidos` autenticada | não medido antes | 1.194 s | não comparável | Browser local autenticado, `next start`, após migration |
| `/pedidos/[orderId]/orcamento` autenticada | não medido antes | 1.302 s | não comparável | Browser local autenticado, pedido real, após migration |

Testes executados após a rodada:

- `npm run lint`: passou, sem warnings/errors do ESLint.
- `npx tsc --noEmit`: passou após o build gerar `.next/types`.
- `npm test`: passou, 6 testes.
- `npm run build`: passou.
- Análise de bundle: via tabela do `next build`, `du -sh` e `du -k` em artefatos `.next`.
- Benchmark de rotas alteradas: redirect local sem sessão via `curl` e navegação autenticada via Browser local. Os números autenticados são pós-otimização; não há baseline autenticada anterior, então não foram usados para declarar ganho.
- Medição de queries alteradas: confirmada por inspeção estática do código; `EXPLAIN ANALYZE` depende de aplicar a migration em Supabase isolado.
- QA adicional: página de orçamento autenticada abriu com pedido real e sem erros de console. Navegação direta para `/pedidos/[orderId]/pdf` no Browser foi bloqueada como download/attachment (`ERR_BLOCKED_BY_CLIENT`), então o endpoint PDF ainda precisa ser validado por download real/manual ou curl autenticado.

Itens não otimizados nesta rodada por risco/escopo:

- PERF-006: edição inline de todos os pedidos. Melhoria não recomendada nesta rodada sem redesenhar UX de edição.
- PERF-008: geração de número do pedido por scan. Não otimizado; requer migration/RPC transacional e teste concorrente.
- PERF-009: atualização de pedido apaga/reinsere itens. Não otimizado; alto risco funcional em pedidos.
- PERF-010: chamadas duplicadas Auth/middleware. Não otimizado; precisa tracing real para não prejudicar segurança.
- Agregação SQL completa de gestão. Parcialmente otimizada; recomenda-se RPC/view apenas após `EXPLAIN ANALYZE` e comparação.
