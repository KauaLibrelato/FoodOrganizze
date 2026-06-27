# Resumo de Otimização de Performance - Casa Fratoni

Data: 26/06/2026  
Escopo: otimizações locais de maior impacto e menor risco a partir de `docs/performance-audit.md`. Não houve teste de carga, execução contra produção ou alteração destrutiva no banco.

## 1. Resumo das otimizações

- Orçamento: removidos imports estáticos de `html2canvas` e `jspdf`; as bibliotecas agora carregam somente no clique de exportar.
- Orçamento/PDF: rotas passaram a buscar pedido, itens e cliente por ID, em vez de carregar coleções completas.
- Produção: lista usa paginação no banco com `count`/`range` e busca itens apenas dos pedidos da página.
- Gestão: pedidos e despesas são filtrados por período no Supabase antes da agregação em Node.
- Cálculos/listas: filtros aninhados foram trocados por agrupamentos em `Map`.
- Banco: criada migration manual com índices compostos para os filtros reais.

## 2. Arquivos alterados

- `lib/client/quote-export.ts`
- `lib/data.ts`
- `lib/data-helpers.ts`
- `app/(dashboard)/pedidos/page.tsx`
- `app/(dashboard)/producao/page.tsx`
- `app/(dashboard)/pedidos/[orderId]/orcamento/page.tsx`
- `app/(dashboard)/pedidos/[orderId]/pdf/route.ts`
- `tests/performance.test.ts`
- `database/performance-indexes-2026-06-26.sql`
- `docs/performance-audit.md`
- `docs/performance-optimization-summary.md`

## 3. Migrations criadas

- `database/performance-indexes-2026-06-26.sql`

Índices:

- `orders_business_delivery_date_idx`
- `orders_business_status_delivery_date_idx`
- `order_items_business_order_id_idx`
- `business_expenses_business_expense_date_idx`

Risco: pequeno aumento de custo em inserts/updates nas tabelas indexadas.  
Rollback: `drop index if exists ...`, já documentado no próprio SQL.  
Ação manual: aplicar primeiro em Supabase isolado/staging e medir `EXPLAIN ANALYZE`.

## 4. Métricas antes e depois

| Métrica | Antes | Depois | Diferença | Como foi medida |
|---|---:|---:|---:|---|
| `/pedidos/[orderId]/orcamento` First Load JS | 288 kB | 116 kB | -172 kB (-59,7%) | `npm run build` |
| `/pedidos/[orderId]/orcamento` route size | 175 kB | 3.36 kB | -171.64 kB (-98,1%) | `npm run build` |
| Bundle server do orçamento | 900 KB | 44 KB | -856 KB (-95,1%) | `du -k .next/server/app/(dashboard)/pedidos/[orderId]/orcamento/page.js` |
| `.next/static` | 2.0 MB | 2.0 MB | estável | `du -sh .next/static` |
| `.next/server` | 5.2 MB | 5.3 MB | +0.1 MB | `du -sh .next/server` |
| Build de produção | passou, compilação 1351 ms | passou, compilação 1599 ms | +248 ms neste run local | `npm run build` |
| Testes unitários | 4 testes, 84 ms | 6 testes, 107 ms | +2 testes | `npm test` |
| `/producao` sem sessão | não medido nesta rodada antes | 307 em 0.004068 s | não comparável | `curl` local; mede redirect |
| `/gestao` sem sessão | não medido nesta rodada antes | 307 em 0.056541 s | não comparável | `curl` local; mede redirect |
| Orçamento sem sessão | não medido nesta rodada antes | 307 em 0.003647 s | não comparável | `curl` local; mede redirect |
| PDF sem sessão | não medido nesta rodada antes | 307 em 0.002900 s | não comparável | `curl` local; mede redirect |
| `/producao` autenticada | não medido antes | 1.486 s | não comparável | Browser local autenticado, `next start`, após migration |
| `/gestao` autenticada | não medido antes | 1.003 s | não comparável | Browser local autenticado, `next start`, após migration |
| `/pedidos` autenticada | não medido antes | 1.194 s | não comparável | Browser local autenticado, `next start`, após migration |
| Orçamento autenticado | não medido antes | 1.302 s | não comparável | Browser local autenticado, pedido real, após migration |

## 5. Redução de bundle

- Redução confirmada na rota de orçamento: 288 kB para 116 kB First Load JS.
- `html2canvas` e `jspdf` continuam instalados, mas saem do carregamento inicial da página.
- O tamanho estático total permaneceu em 2.0 MB; a maior melhora aparece no chunk inicial por rota e no bundle server da página.

## 6. Redução de requests

- Orçamento/PDF antes: 4 leituras amplas reaproveitando getters globais.
- Orçamento/PDF depois: leituras específicas por ID para pedido, itens e cliente, mais configuração de pagamento.
- Produção depois: itens são buscados apenas para os pedidos visíveis na página.

## 7. Redução de tempo de resposta

Não declarei ganho de TTFB autenticado porque não havia sessão/ambiente isolado com dados reais. A redução esperada vem de menos linhas retornadas pelo Supabase e menor serialização server-side.

## 8. Queries otimizadas

- `orders`: seleção explícita de colunas nos caminhos críticos.
- `order_items`: seleção explícita e filtro por `order_id` em orçamento/PDF.
- `customers`: seleção explícita e busca por `id` quando necessário.
- `business_expenses`: seleção explícita e filtro por `expense_date` na gestão.
- `getProductionData`: `count`, `range` e busca de itens por `order_id in (...)`.

## 9. Índices adicionados

Criados como migration, ainda não aplicados:

- `(business_id, delivery_date)` em `orders`
- `(business_id, status, delivery_date)` em `orders`
- `(business_id, order_id)` em `order_items`
- `(business_id, expense_date)` em `business_expenses`

## 10. Melhorias de cache

Nenhum cache compartilhado novo foi criado. O uso de `React.cache` por request foi preservado para evitar vazamento de dados privados.

## 11. Testes executados

- `npm run lint`: passou.
- `npx tsc --noEmit`: passou após o build gerar `.next/types`.
- `npm test`: passou, 6 testes.
- `npm run build`: passou.
- Análise do bundle: executada via `next build` e inspeção de `.next`.
- Benchmark de rotas: executado localmente sem sessão via `curl` e com sessão real via Browser local. Como não havia baseline autenticada antes das mudanças, os números autenticados são referência pós-otimização.
- QA autenticado: produção, gestão, pedidos e orçamento abriram com sessão real. A página de orçamento não apresentou erros de console.

## 12. Gargalos pendentes

- PERF-006: edição inline de todos os pedidos.
- PERF-008: scan de `order_number` na criação de pedido.
- PERF-009: update de pedido apaga e reinsere todos os itens.
- PERF-010: possível duplicação Auth/middleware.
- Agregação SQL/RPC para gestão.
- Paginação real de `/pedidos`.

## 13. Riscos residuais

- Exportação PNG/PDF precisa QA visual em navegador real, especialmente celular.
- Queries de produção e gestão precisam medição com dados reais e RLS ativo.
- Migration de índices precisa ser validada em ambiente isolado antes de produção.
- Resumo de receita da produção ainda não usa aggregate SQL.

## 14. Ações manuais

- Aplicar `database/performance-indexes-2026-06-26.sql` em ambiente isolado.
- Rodar `EXPLAIN ANALYZE` nas queries de produção, gestão, orçamento e PDF.
- Testar com dois usuários reais em ambiente isolado para validar RLS junto das queries novas.
- Fazer QA de exportar PNG/PDF, imprimir e WhatsApp na página de orçamento. A navegação direta para PDF no Browser local foi bloqueada como download/attachment (`ERR_BLOCKED_BY_CLIENT`), então a validação do PDF precisa ser manual ou por curl autenticado.

## 15. Métricas recomendadas para produção

- p50/p95/p99 de TTFB por rota.
- Duração e linhas retornadas por query Supabase.
- Tempo de geração de PDF.
- Taxa de erro das Server Actions.
- First Load JS por build.
- Web Vitals em celular real: LCP, INP e CLS.
- `pg_stat_statements` para confirmar impacto dos índices.
