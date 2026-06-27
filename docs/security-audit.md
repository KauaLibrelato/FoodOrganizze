# Auditoria de Segurança - Casa Fratoni

Data da auditoria: 24/06/2026  
Escopo: análise local do repositório, sem pentest contra produção, sem alterações em código de aplicação e sem exposição de secrets.

## 1. Resumo executivo

O projeto é um app interno em Next.js App Router, TypeScript e Supabase para gestão da Casa Fratoni. A arquitetura é simples e majoritariamente server-side, com RLS habilitado nas tabelas principais e consultas filtradas por `business_id`. Não foi encontrado uso de `service_role` no frontend, nem `dangerouslySetInnerHTML`, nem SQL dinâmico manual.

Os principais riscos encontrados são:

1. O app entra em modo demonstração e libera rotas quando Supabase não está configurado.
2. O reset de senha revela se um e-mail existe no Auth.
3. Pedidos aceitam preço e custo unitário vindos do cliente, afetando snapshots financeiros.
4. Não há headers de segurança configurados no Next.js.
5. A rota de seed cria/altera dados por `GET` e fica disponível em ambiente configurado.
6. Não há rate limiting ou proteção anti-abuso para login/reset/actions.
7. O modelo single-company permite que qualquer usuário autenticado gerencie todos os dados da empresa.
8. `npm audit` encontrou vulnerabilidade moderada em `postcss` transitivo via `next`.

Risco geral antes de produção: **médio-alto**. O app está bem encaminhado para uso interno, mas eu não recomendaria deploy de produção sem corrigir no mínimo os itens P0/P1 da tabela final.

## 2. Arquitetura identificada

Framework e versões observadas:

- Next.js App Router. `package.json` declara `next: ^15.0.3`; lock/node_modules resolvem `15.5.19` no build.
- React 19.
- TypeScript 5.
- TailwindCSS 3.
- Supabase Auth/Database via `@supabase/ssr` e `@supabase/supabase-js`.
- Componentes locais estilo shadcn/ui.

Arquitetura:

- `app/(auth)`: login e redefinição de senha.
- `app/(dashboard)`: rotas autenticadas de clientes, insumos, receitas, pedidos, produção, gestão, financeiro e calculadoras.
- `app/actions.ts`: Server Actions para auth e mutações de negócio.
- `middleware.ts`: proteção global com Supabase SSR.
- `lib/auth-context.ts`: obtém usuário, cria profile e seleciona a primeira empresa.
- `lib/data.ts`: leitura server-side com Supabase real ou fallback demo.
- `database/*.sql`: schema, RLS, triggers e ajustes pontuais.
- `app/api/seed-sample/route.ts`: rota GET que popula dados de exemplo.
- `app/(dashboard)/pedidos/[orderId]/pdf/route.ts`: gera PDF do orçamento.

Rotas públicas:

- `/login`
- `/redefinir-senha`
- `/auth/callback`
- assets estáticos ignorados pelo matcher do middleware.

Rotas privadas:

- Todas as rotas de dashboard.
- `/api/seed-sample`, quando Supabase está configurado, depende de sessão por `getBusinessId()`.
- `/pedidos/[orderId]/pdf`, protegida pelo middleware e pelas leituras filtradas por `business_id`.

Autenticação:

- E-mail/senha via Supabase Auth.
- Reset de senha via `resetPasswordForEmail`.
- Sessão em cookies gerenciados por `@supabase/ssr`.
- Sem cadastro público.

Autorização:

- Middleware exige usuário para rotas não públicas.
- Server Actions chamam `getBusinessId()`, que chama `supabase.auth.getUser()`.
- Queries usam `.eq("business_id", businessId)`.
- RLS usa `public.user_can_access_business(business_id)`.

Banco e Supabase:

- Tabelas principais com RLS habilitado.
- Triggers para `updated_at` e estoque/custo médio.
- Funções `SECURITY DEFINER`: `user_can_access_business`, `email_has_auth_user`, `apply_ingredient_purchase_to_stock`.
- App single-company: todos os autenticados acessam a primeira empresa.

Integrações externas:

- Supabase Auth/Database.
- WhatsApp via link `wa.me`.
- Sem pagamentos integrados, webhooks, filas, cron jobs ou storage buckets no código analisado.

Variáveis de ambiente:

- `.env` existe localmente com `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`; valores não foram exibidos.
- `.env.example` contém placeholders.
- Não foi encontrado `service_role` versionado.

Fluxo de dados sensíveis:

- Clientes: nome, telefone, endereço, observações.
- Pedidos: itens, valores, custos, lucro estimado, status e pagamento.
- Pagamento: chave Pix, favorecido, banco, link e instruções.
- Auth: e-mail, senha e sessão Supabase.

## 3. Superfície de ataque

- Formulários de login e reset.
- Server Actions com FormData manipulável.
- JSON oculto `order_items` em pedidos.
- Query strings de filtros e seleção.
- Rota GET `/api/seed-sample`.
- Callback `/auth/callback?next=...`.
- Geração de orçamento, PDF, PNG e link WhatsApp.
- Políticas RLS e funções `SECURITY DEFINER`.
- Dependências npm.
- Arquivo `.env` local.

## 4. Pontos positivos encontrados

- RLS habilitado nas tabelas principais em `database/schema.sql`.
- Uso de `supabase.auth.getUser()` no servidor, mais confiável que confiar apenas no cookie local.
- Consultas e mutações de negócio filtram por `business_id`.
- Não foi encontrado `service_role` no bundle ou código cliente.
- Não foi encontrado `dangerouslySetInnerHTML`.
- PDF escapa strings antes de escrever no conteúdo PDF.
- `Content-Disposition` do PDF sanitiza o nome do arquivo.
- Build, lint e typecheck passaram.
- Chaves reais não aparecem nos arquivos de documentação; exemplos usam placeholders.
- App não tem upload de arquivos nem buckets de storage no código atual.

## 5. Vulnerabilidades encontradas

### SEC-001 - Modo demo pode liberar app quando Supabase não está configurado

- Severidade: alta
- Confiança: alta
- OWASP: A01 Broken Access Control, A05 Security Misconfiguration
- Arquivo e linha: `middleware.ts:12-15`, `app/actions.ts:305-308`, `lib/auth-context.ts:7-14`, `lib/data.ts:397-557`
- Descrição: se `NEXT_PUBLIC_SUPABASE_URL` ou `NEXT_PUBLIC_SUPABASE_ANON_KEY` não estiverem configuradas, o middleware não protege as rotas e as actions/readers usam fallback demo.
- Cenário de exploração: um deploy de produção com variável ausente ou placeholder deixa `/dashboard` e demais telas acessíveis sem login em modo demonstração.
- Impacto: exposição de interface interna, fluxo de orçamento e dados demo; risco de operação em ambiente real sem autenticação se fallback for mantido.
- Evidência técnica: `middleware` retorna `NextResponse.next()` quando `!isSupabaseConfigured()`, e `signInAction` redireciona para `/dashboard`.
- Recomendação: em produção, falhar fechado. Permitir demo apenas com flag explícita como `NEXT_PUBLIC_ENABLE_DEMO=true` e nunca em `NODE_ENV=production`.
- Exemplo seguro:

```ts
export function isDemoModeAllowed() {
  return process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_ENABLE_DEMO === "true";
}

if (!isSupabaseConfigured() && !isDemoModeAllowed()) {
  return NextResponse.redirect(new URL("/login?erro=config", request.url));
}
```

- Esforço estimado: pequeno
- Prioridade de correção: P0
- Possibilidade de regressão: média, por afetar ambiente local/demo
- Teste necessário: build sem env em `NODE_ENV=production` deve bloquear rotas privadas; local com flag demo deve continuar funcionando.

### SEC-002 - Reset de senha permite enumeração de usuários

- Severidade: média
- Confiança: alta
- OWASP: A07 Identification and Authentication Failures
- Arquivo e linha: `app/actions.ts:327-359`, `database/schema.sql:339-351`, `app/(auth)/login/page.tsx:13-24`
- Descrição: o fluxo chama `email_has_auth_user` e retorna mensagem distinta quando o e-mail não existe.
- Cenário de exploração: um atacante testa e-mails e diferencia contas válidas pela mensagem `Esse e-mail não está cadastrado no sistema.`
- Impacto: enumeração de usuários internos, facilitando phishing e ataques de senha.
- Evidência técnica: `requestPasswordResetAction` redireciona para `erro=email_nao_cadastrado`.
- Recomendação: sempre responder com mensagem neutra, enviar e-mail apenas se existir, e registrar tentativa no servidor.
- Exemplo seguro:

```ts
if (emailExists) {
  await supabase.auth.resetPasswordForEmail(email, { redirectTo });
}
redirect("/login?sucesso=reset_solicitado");
```

- Esforço estimado: pequeno
- Prioridade de correção: P1
- Possibilidade de regressão: baixa
- Teste necessário: e-mail existente e inexistente devem retornar mesma UX e não revelar existência.

### SEC-003 - Ausência de rate limiting para login, reset e Server Actions

- Severidade: alta
- Confiança: alta
- OWASP: A07 Identification and Authentication Failures, A04 Insecure Design
- Arquivo e linha: `app/actions.ts:305-359`, `middleware.ts:12-53`
- Descrição: não há limitação por IP, e-mail, usuário ou sessão nas actions sensíveis.
- Cenário de exploração: tentativas repetidas de login/reset ou chamadas massivas a actions de negócio consomem recursos e facilitam brute force contra Auth.
- Impacto: abuso operacional, spam de reset, maior exposição a credential stuffing e DoS lógico.
- Evidência técnica: `signInAction` e `requestPasswordResetAction` chamam Supabase diretamente sem throttle local.
- Recomendação: adicionar rate limiting por IP/e-mail em middleware/action, e configurar proteções de Auth no Supabase.
- Exemplo seguro:

```ts
await assertRateLimit({
  key: `reset:${ip}:${email.toLowerCase()}`,
  limit: 5,
  windowSeconds: 900,
});
```

- Esforço estimado: médio
- Prioridade de correção: P1
- Possibilidade de regressão: média
- Teste necessário: simular limite excedido e garantir resposta 429/erro amigável.

### SEC-004 - Preço e custo de pedidos são aceitos do cliente

- Severidade: alta
- Confiança: alta
- OWASP: A04 Insecure Design, A01 Broken Access Control
- Arquivo e linha: `app/actions.ts:102-142`, `app/actions.ts:265-279`, `app/actions.ts:1149-1278`, `components/forms/order-form.tsx:190-204`
- Descrição: `order_items` é JSON enviado pelo cliente com `unitPrice` e `unitCostSnapshot`. O servidor valida sinal, mas aceita os valores para montar snapshots financeiros.
- Cenário de exploração: um usuário autenticado altera o JSON no navegador e salva pedido com custo artificialmente baixo ou preço divergente, distorcendo lucro e gestão financeira.
- Impacto: integridade financeira comprometida, relatórios incorretos e decisões de negócio baseadas em dados manipulados.
- Evidência técnica: `unitCost = item.unitCost > 0 ? item.unitCost : recipeUnitCostMap...`; `unit_price` vem de `item.unitPrice`.
- Recomendação: recalcular custo sempre no servidor; permitir override de preço/custo apenas em campo explícito com permissão, motivo e auditoria.
- Exemplo seguro:

```ts
const unitCost = recipeUnitCostMap.get(recipeId ?? "") ?? 0;
const unitPrice = product ? Number(product.default_sale_price) : validatedManualPrice;
```

- Esforço estimado: médio
- Prioridade de correção: P1
- Possibilidade de regressão: alta, por alterar fluxo de orçamento
- Teste necessário: manipular payload e verificar que custo final vem do banco.

### SEC-005 - Rota de seed muta dados por GET e fica disponível no app

- Severidade: média
- Confiança: alta
- OWASP: A01 Broken Access Control, A04 Insecure Design
- Arquivo e linha: `app/api/seed-sample/route.ts:47-53`, `app/api/seed-sample/route.ts:299-308`
- Descrição: `/api/seed-sample` cria clientes, insumos, compras, receitas, produtos, pedidos e configurações via GET.
- Cenário de exploração: qualquer usuário autenticado acessa a URL e polui ou altera dados da empresa com exemplos.
- Impacto: contaminação de dados de produção e relatórios financeiros.
- Evidência técnica: handler `GET` executa inserts/upserts e redireciona para dashboard.
- Recomendação: remover da produção, proteger por flag server-only e trocar para POST com confirmação/admin.
- Exemplo seguro:

```ts
if (process.env.NODE_ENV === "production" || process.env.ENABLE_SEED_ROUTE !== "true") {
  return new NextResponse("Not found", { status: 404 });
}
```

- Esforço estimado: pequeno
- Prioridade de correção: P1
- Possibilidade de regressão: baixa
- Teste necessário: rota deve retornar 404 em produção.

### SEC-006 - Headers de segurança não configurados

- Severidade: média
- Confiança: alta
- OWASP: A05 Security Misconfiguration, A03 Injection
- Arquivo e linha: `next.config.ts:1-5`
- Descrição: `next.config.ts` está vazio e não define CSP, HSTS, X-Frame-Options/frame-ancestors, X-Content-Type-Options, Referrer-Policy ou Permissions-Policy.
- Cenário de exploração: maior impacto em caso de XSS, clickjacking, sniffing e vazamento de referrer.
- Impacto: redução de defesa em profundidade.
- Evidência técnica: `const nextConfig: NextConfig = {};`
- Recomendação: configurar headers globais, ajustando CSP para Supabase e assets necessários.
- Exemplo seguro:

```ts
async headers() {
  return [{
    source: "/(.*)",
    headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    ],
  }];
}
```

- Esforço estimado: pequeno
- Prioridade de correção: P1
- Possibilidade de regressão: média, CSP pode bloquear recursos se mal calibrada
- Teste necessário: verificar app, PDF/PNG e Supabase auth com headers ativos.

### SEC-007 - Usuários autenticados têm permissão total no modelo single-company

- Severidade: média
- Confiança: alta
- OWASP: A01 Broken Access Control
- Arquivo e linha: `database/schema.sql:326-337`, `database/schema.sql:417-479`, `lib/auth-context.ts:32-37`
- Descrição: qualquer usuário autenticado pode acessar e gerenciar a empresa existente. Isso é intencional para o modelo atual, mas não há papéis, permissões ou trilha administrativa.
- Cenário de exploração: uma conta interna comprometida pode excluir clientes, alterar custos, pedidos, despesas e dados de pagamento.
- Impacto: impacto total nos dados de negócio da empresa.
- Evidência técnica: `user_can_access_business` só exige `auth.uid() is not null`; policies são `for all`.
- Recomendação: manter single-company, mas adicionar papéis mínimos (`owner`, `admin`, `operador`, `leitura`) e separar operações destrutivas/financeiras.
- Exemplo seguro:

```sql
create policy "Only admins manage expenses" on public.business_expenses
for all using (public.user_has_role(auth.uid(), business_id, array['owner','admin']));
```

- Esforço estimado: grande
- Prioridade de correção: P2 para uso interno pequeno; P1 se houver múltiplos funcionários
- Possibilidade de regressão: alta
- Teste necessário: matriz de permissões por papel e por action.

### SEC-008 - Callback aceita `next` sem allowlist de caminhos

- Severidade: baixa
- Confiança: média
- OWASP: A01 Broken Access Control, A10 SSRF/redirect class
- Arquivo e linha: `app/auth/callback/route.ts:5-14`
- Descrição: `next` é usado em `new URL(next, requestUrl.origin)`. Isso evita domínio externo simples, mas permite redirecionar para qualquer caminho interno.
- Cenário de exploração: link de reset manipulado manda usuário para uma rota interna inesperada após login/reset.
- Impacto: phishing interno de baixa gravidade, confusão de fluxo e bypass de UX esperada.
- Evidência técnica: ausência de allowlist para `/dashboard` e `/redefinir-senha`.
- Recomendação: restringir `next` a caminhos conhecidos e relativos.
- Exemplo seguro:

```ts
const allowedNext = new Set(["/dashboard", "/redefinir-senha"]);
const nextPath = allowedNext.has(next) ? next : "/dashboard";
return NextResponse.redirect(new URL(nextPath, requestUrl.origin));
```

- Esforço estimado: pequeno
- Prioridade de correção: P3
- Possibilidade de regressão: baixa
- Teste necessário: `next=https://...` e `next=/rota-invalida` devem cair no fallback.

### SEC-009 - Secrets locais presentes em `.env`

- Severidade: informativa
- Confiança: alta
- OWASP: A05 Security Misconfiguration
- Arquivo e linha: `.env:1-2`
- Descrição: há variáveis reais/locais de Supabase no `.env`. O arquivo não apareceu no `git status`, mas deve permanecer fora do Git e fora de logs.
- Cenário de exploração: inclusão acidental em commit ou compartilhamento de tela/log expõe URL e anon key.
- Impacto: a anon key não é secreta como service role, mas combinada com RLS fraco pode permitir acesso indevido; URL facilita enumeração do projeto.
- Evidência técnica: nomes encontrados: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Valores foram omitidos.
- Recomendação: garantir `.env` no `.gitignore`, usar `.env.example` sem valores reais e rotacionar se algum valor já foi publicado.
- Exemplo seguro:

```txt
.env
.env.local
.env*.local
```

- Esforço estimado: pequeno
- Prioridade de correção: P3
- Possibilidade de regressão: baixa
- Teste necessário: `git check-ignore .env` e secret scan antes de commit.

### SEC-010 - Link de pagamento aceita qualquer protocolo URL válido

- Severidade: baixa
- Confiança: alta
- OWASP: A03 Injection, A04 Insecure Design
- Arquivo e linha: `app/actions.ts:544-570`, `components/forms/payment-settings-form.tsx:32-33`
- Descrição: o frontend usa `type="url"`, mas o servidor aceita qualquer `new URL`, incluindo protocolos não HTTP(S) se enviado manualmente.
- Cenário de exploração: usuário autenticado salva `javascript:...`, `data:...` ou outro esquema; no orçamento aparece em texto/WhatsApp. Hoje não é renderizado como link clicável na tela principal, mas pode ser compartilhado.
- Impacto: risco baixo de phishing/abuso em mensagens enviadas a clientes.
- Evidência técnica: validação server-side só chama `new URL(paymentLink)`.
- Recomendação: permitir apenas `https:` e, se necessário, `http:` em desenvolvimento.
- Exemplo seguro:

```ts
const url = new URL(paymentLink);
if (url.protocol !== "https:") throw new Error("Use um link HTTPS.");
```

- Esforço estimado: pequeno
- Prioridade de correção: P3
- Possibilidade de regressão: baixa
- Teste necessário: `javascript:` deve ser rejeitado; `https://...` aceito.

### SEC-011 - Falta de limites de tamanho para campos textuais e payload JSON

- Severidade: média
- Confiança: alta
- OWASP: A04 Insecure Design
- Arquivo e linha: `app/actions.ts:102-142`, `app/actions.ts:395-585`, `app/actions.ts:651-771`, `app/actions.ts:940-1026`
- Descrição: Server Actions aceitam textos e JSON sem limite explícito de tamanho/quantidade de itens.
- Cenário de exploração: usuário autenticado envia payload muito grande em observações, itens de pedido ou instruções de pagamento, causando lentidão, erros de PDF ou aumento desnecessário de banco.
- Impacto: DoS lógico e degradação de relatórios/exportações.
- Evidência técnica: `JSON.parse(rawItems)` sem limite e campos `text` no banco sem constraints de tamanho.
- Recomendação: validar tamanho, quantidade máxima de itens e comprimento de campos no servidor e no banco.
- Exemplo seguro:

```ts
if (rawItems.length > 20_000) throw new Error("Pedido grande demais.");
if (payload.length > 50) throw new Error("Limite de 50 itens por pedido.");
```

- Esforço estimado: médio
- Prioridade de correção: P2
- Possibilidade de regressão: média
- Teste necessário: payload acima do limite deve falhar de forma controlada.

### SEC-012 - Operações financeiras/destrutivas sem auditoria

- Severidade: média
- Confiança: alta
- OWASP: A09 Security Logging and Monitoring Failures
- Arquivo e linha: `app/actions.ts:395-585`, `app/actions.ts:621-648`, `app/actions.ts:814-844`, `app/actions.ts:1280-1307`
- Descrição: alterações e exclusões de clientes, insumos, despesas, pedidos, distribuição de lucro e pagamento não registram ator, IP ou motivo.
- Cenário de exploração: usuário interno ou conta comprometida altera dados financeiros e não há trilha suficiente para investigação.
- Impacto: baixa capacidade de resposta a incidente e reconciliação financeira.
- Evidência técnica: actions executam mutações e apenas revalidam páginas.
- Recomendação: criar tabela `audit_events` e registrar eventos relevantes via Server Actions ou triggers.
- Exemplo seguro:

```ts
await supabase.from("audit_events").insert({
  business_id: businessId,
  actor_id: userId,
  action: "order.update",
  resource_id: orderId,
});
```

- Esforço estimado: médio
- Prioridade de correção: P2
- Possibilidade de regressão: baixa
- Teste necessário: mutações críticas devem gerar evento de auditoria.

### SEC-013 - Dependência vulnerável: PostCSS transitivo via Next

- Severidade: média
- Confiança: alta
- OWASP: A06 Vulnerable and Outdated Components
- Arquivo e linha: `package-lock.json`, `node_modules/next/node_modules/postcss`
- Descrição: `npm audit --omit=dev` reportou `GHSA-qx2v-qp2m-jg93`, XSS por `</style>` não escapado no stringify do PostCSS `<8.5.10`, transitivo em `next`.
- Cenário de exploração: depende de fluxo que stringify CSS controlado por atacante. No app atual, exploração parece menos provável, mas a dependência vulnerável existe.
- Impacto: XSS em cenários específicos de CSS controlado/gerado.
- Evidência técnica: audit report: `postcss <8.5.10`, severidade moderate, CWE-79; afeta `next`.
- Recomendação: atualizar Next para versão que traga PostCSS corrigido ou acompanhar advisory. Não usar `npm audit fix` cego, pois sugeriu downgrade/major impróprio.
- Exemplo seguro:

```bash
npm install next@latest eslint-config-next@latest
npm run build
npm audit --omit=dev
```

- Esforço estimado: médio
- Prioridade de correção: P2
- Possibilidade de regressão: média
- Teste necessário: build, rotas auth/dashboard/PDF/PNG e audit zerado ou justificado.

### SEC-014 - Typecheck direto depende de `.next/types`

- Severidade: informativa
- Confiança: alta
- OWASP: A05 Security Misconfiguration
- Arquivo e linha: `tsconfig.json` include `.next/types/**/*.ts`
- Descrição: `npx tsc --noEmit` falhou antes do build por arquivos `.next/types` ausentes; passou após `npm run build`.
- Cenário de exploração: CI que roda typecheck antes do build pode falhar ou ser ignorado.
- Impacto: risco de pipeline inconsistente.
- Evidência técnica: primeiro typecheck retornou TS6053; depois do build passou.
- Recomendação: ajustar scripts de CI para gerar tipos Next antes do typecheck ou depender do `next build` como verificação de tipos.
- Exemplo seguro:

```json
"typecheck": "next build"
```

ou remover dependência indevida de `.next/types` em checagem isolada, se aplicável.

- Esforço estimado: pequeno
- Prioridade de correção: P4
- Possibilidade de regressão: baixa
- Teste necessário: CI limpo executando typecheck/build a partir de checkout novo.

## 6. Falhas de configuração

- `next.config.ts` sem headers de segurança.
- Modo demo/fallback não é condicionado explicitamente por ambiente.
- Rota de seed disponível junto ao app.
- `.env` local existe; não foi versionado, mas precisa seguir fora do Git.
- `npm run lint` usa `next lint`, já depreciado para Next 16.

## 7. Dependências vulneráveis

Resultado de `npm audit --omit=dev --json`:

- Total: 2 vulnerabilidades moderadas.
- `postcss <8.5.10`: `GHSA-qx2v-qp2m-jg93`, CWE-79, via `next/node_modules/postcss`.
- `next`: listado como afetado por depender de `postcss`.

Resultado de `npm outdated --json`:

- Desatualizadas relevantes: `next` 15.5.19 -> latest 16.2.9, `eslint-config-next` 15.5.19 -> 16.2.9, `@supabase/ssr` 0.5.2 -> 0.12.0, `lucide-react` 0.468.0 -> 1.21.0, `tailwind-merge` 2.6.1 -> 3.6.0, `tailwindcss` 3.4.19 -> 4.3.1.
- Não foi aplicada nenhuma atualização nesta auditoria.

## 8. Riscos relacionados ao banco e ao Supabase

- RLS existe e cobre tabelas principais.
- Policies são amplas (`for all`) para qualquer usuário autenticado que acesse a empresa.
- `user_can_access_business` é `SECURITY DEFINER` e só verifica existência da empresa e sessão.
- `email_has_auth_user` permite enumeração quando combinado com mensagem distinta na UI.
- Sem storage buckets ou policies de arquivo no repositório.
- Sem uso de service role no código analisado.
- Constraints numéricas básicas existem, mas faltam limites de tamanho textual e regras de transição de status.

## 9. Riscos relacionados a autenticação e autorização

- Login usa mensagem genérica para credenciais inválidas: ponto positivo.
- Reset revela e-mail inexistente: corrigir.
- Sem rate limiting local.
- Sem papéis administrativos.
- Middleware protege rotas, mas falha aberto quando Supabase não está configurado.
- Server Actions não confiam em `userId` do cliente e usam `getBusinessId()`: ponto positivo.
- Cookies são gerenciados pela lib Supabase; a auditoria não confirmou flags finais sem inspeção em navegador/resposta real.

## 10. Riscos de isolamento multitenant

O app não é multitenant no produto atual. Ainda assim:

- O banco suporta múltiplas linhas em `businesses`, mas o app usa a primeira por `created_at`.
- `businesses` permite `for all` a qualquer autenticado.
- Se o produto voltar a ser multitenant, a política atual quebra isolamento horizontal.
- A decisão single-company é aceitável temporariamente se todos os usuários internos tiverem confiança equivalente.

## 11. Riscos de negócio

- Manipulação de preço/custo pelo cliente afeta lucro e gestão.
- Sem trilha de auditoria para alterações críticas.
- Sem regras de transição de status de pedido.
- Rota de seed pode contaminar dados reais.
- Descontos e entrega são recalculados, mas descontos podem zerar pedido; talvez seja desejado, mas merece regra explícita.
- Pedidos cancelados são excluídos dos relatórios conforme regra, mas status financeiro ainda pode ser manipulado por qualquer usuário autenticado.

## 12. Testes executados

- `rg --files`: inventário do repositório.
- Busca estática por `dangerouslySetInnerHTML`, `eval`, storage, redirects, env vars, tokens e padrões de secrets.
- Inspeção manual de `middleware.ts`, `app/actions.ts`, `lib/auth-context.ts`, `lib/data.ts`, Supabase clients, rotas API/PDF/auth e SQL.
- Busca de arquivos `.env*` e listagem sanitizada de nomes de variáveis.
- `npm audit --omit=dev --json`: executado com rede permitida.
- `npm outdated --json`: executado com rede permitida.
- `npm run lint`: passou sem warnings/erros; exibiu aviso de depreciação do `next lint`.
- `npx tsc --noEmit`: falhou antes do build por `.next/types` ausentes; passou após build.
- `npm run build`: passou.

## 13. Testes que não puderam ser executados

- Testes reais de autenticação/autorização com Supabase remoto: não executados para evitar interação com sistemas externos.
- Inspeção real de flags de cookies em navegador/produção.
- Testes de brute force/rate limit reais: fora do escopo seguro.
- Testes de RLS diretamente no Supabase com múltiplos usuários.
- Secret scanning com ferramenta dedicada externa: não foi instalada dependência nova.
- Testes E2E de PDF/PNG com navegador: não necessários para a auditoria e fora do foco de segurança imediata.

## 14. Plano de correção priorizado

1. P0: remover falha aberta do modo demo em produção.
2. P1: neutralizar reset de senha e adicionar rate limiting.
3. P1: recalcular custo/preço sensível no servidor e auditar overrides.
4. P1: remover/proteger rota de seed.
5. P1: configurar headers de segurança.
6. P2: introduzir papéis/permissões para operações críticas.
7. P2: adicionar auditoria de mutações financeiras/destrutivas.
8. P2: limitar tamanho de payloads e campos.
9. P2: atualizar Next/PostCSS ou justificar advisory.
10. P3/P4: allowlist de callback, validar protocolo de link, ajustar typecheck/CI.

## Tabela de prioridades

| Prioridade | ID | Problema | Severidade | Impacto | Esforço | Arquivo |
|---|---|---|---|---|---|---|
| P0 | SEC-001 | Modo demo falha aberto | Alta | Acesso sem auth se env faltar | Pequeno | `middleware.ts` |
| P1 | SEC-003 | Sem rate limiting | Alta | Brute force/spam/abuso | Médio | `app/actions.ts` |
| P1 | SEC-004 | Preço/custo aceitos do cliente | Alta | Lucro/gestão manipuláveis | Médio | `app/actions.ts` |
| P1 | SEC-002 | Reset enumera usuários | Média | Descoberta de contas | Pequeno | `app/actions.ts` |
| P1 | SEC-005 | Seed por GET | Média | Dados reais contaminados | Pequeno | `app/api/seed-sample/route.ts` |
| P1 | SEC-006 | Sem headers de segurança | Média | Menos defesa contra XSS/clickjacking | Pequeno | `next.config.ts` |
| P2 | SEC-007 | Sem papéis internos | Média | Conta comprometida gerencia tudo | Grande | `database/schema.sql` |
| P2 | SEC-011 | Sem limites de payload | Média | DoS lógico/dados gigantes | Médio | `app/actions.ts` |
| P2 | SEC-012 | Sem auditoria | Média | Investigação fraca | Médio | `app/actions.ts` |
| P2 | SEC-013 | PostCSS vulnerável via Next | Média | XSS em cenário específico | Médio | `package-lock.json` |
| P3 | SEC-008 | Callback sem allowlist | Baixa | Redirecionamento interno indevido | Pequeno | `app/auth/callback/route.ts` |
| P3 | SEC-010 | URL de pagamento aceita protocolos | Baixa | Phishing/link indevido | Pequeno | `app/actions.ts` |
| P3 | SEC-009 | `.env` local com chaves públicas | Informativa | Vazamento acidental | Pequeno | `.env` |
| P4 | SEC-014 | Typecheck depende de `.next/types` | Informativa | CI inconsistente | Pequeno | `tsconfig.json` |

## 10 problemas mais urgentes

1. SEC-001 - Modo demo falha aberto.
2. SEC-003 - Sem rate limiting.
3. SEC-004 - Preço/custo manipuláveis.
4. SEC-002 - Enumeração no reset.
5. SEC-005 - Rota seed por GET.
6. SEC-006 - Headers ausentes.
7. SEC-007 - Permissão total para qualquer autenticado.
8. SEC-012 - Sem auditoria.
9. SEC-011 - Sem limites de payload.
10. SEC-013 - Dependência vulnerável.

## Correções rápidas

- Bloquear modo demo em produção.
- Neutralizar mensagem de reset.
- Remover/proteger `/api/seed-sample`.
- Adicionar headers básicos.
- Validar protocolo HTTPS para link de pagamento.
- Allowlist para `next` no callback.
- Verificar `git check-ignore .env`.

## Correções arquiteturais

- Papéis e permissões por operação.
- Auditoria de eventos críticos.
- Rate limiting persistente.
- Regras de transição de status e overrides financeiros.
- Estratégia formal para modo demo separada do app produtivo.

## 15. Status de remediação - 25/06/2026

### SEC-001 - corrigido

- Arquivos alterados: `lib/env.ts`, `middleware.ts`, `lib/auth-context.ts`, `lib/data.ts`, `app/actions.ts`, `app/(auth)/login/page.tsx`.
- Solução: demo só é permitido fora de produção com `NEXT_PUBLIC_ENABLE_DEMO=true`. Sem Supabase e sem a flag, middleware bloqueia rotas privadas e actions/readers não simulam sucesso.
- Testes: build de produção e typecheck passaram. A validação de caminho crítico foi revisada em código.
- Risco residual: configurar `NEXT_PUBLIC_ENABLE_DEMO=true` em produção não ativa demo, mas o deploy ainda precisa das variáveis Supabase válidas para operar.

### SEC-002 - corrigido

- Arquivos alterados: `app/actions.ts`, `app/(auth)/login/page.tsx`.
- Solução: reset retorna a mesma confirmação para e-mail existente ou inexistente; o e-mail só é enviado quando a conta existe.
- Testes: revisão da action e build passaram.
- Risco residual: a RPC de existência ainda existe no banco para o fluxo interno; ela não pode ser exposta diretamente a clientes não confiáveis.

### SEC-003 - parcialmente corrigido

- Arquivos alterados: `app/actions.ts`, `lib/rate-limit.ts`, `tests/security.test.ts`.
- Solução: login limita 8 tentativas por IP/e-mail a cada 15 minutos e reset limita 5 por hora, no backend.
- Testes: teste unitário confirma bloqueio após exceder o limite.
- Risco residual: o limitador em memória é por instância e não é distribuído. Antes de exposição pública, configurar rate limits/captcha no Supabase Auth e proteção de borda/WAF. Este risco ainda impede produção pública sem essa configuração.

### SEC-004 - corrigido

- Arquivos alterados: `app/actions.ts`.
- Solução: custo unitário é sempre recalculado pelo servidor a partir da receita e do custo médio de insumos. Para produtos, o preço vem de `products.default_sale_price`; preço enviado pelo cliente só é aceito para uma receita sem produto associado.
- Testes: typecheck e build passaram após os novos selects e cálculos.
- Risco residual: receita sem produto continua aceitando preço de orçamento manual, comportamento necessário; não há override de custo.

### SEC-005 - corrigido

- Arquivos alterados: `app/api/seed-sample/route.ts`, `lib/env.ts`.
- Solução: `GET` devolve 404. A criação de exemplos exige `POST`, Supabase configurado e `ENABLE_SEED_ROUTE=true`; a flag nunca funciona em produção.
- Testes: build passou.
- Risco residual: em desenvolvimento com a flag habilitada, qualquer usuário autenticado ainda pode acionar o seed; não habilitar a flag em ambientes compartilhados.

### SEC-006 - corrigido

- Arquivos alterados: `next.config.ts`.
- Solução: adicionados CSP, HSTS, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` e `Permissions-Policy`.
- Testes: build passou.
- Risco residual: a CSP permite `unsafe-inline` e `unsafe-eval` por compatibilidade com Next em desenvolvimento; revisar e endurecer com nonces ao migrar a uma estratégia CSP estrita.

### SEC-007 - risco aceito

- Motivo: o produto é explicitamente single-company e todos os usuários autenticados hoje possuem o mesmo nível operacional.
- Risco residual: conta interna comprometida pode alterar dados críticos. Antes de incluir funcionários com privilégios distintos, implementar papéis, policies por papel e testes de matriz de permissões.

### SEC-008 - corrigido

- Arquivos alterados: `app/auth/callback/route.ts`, `lib/security.ts`, `tests/security.test.ts`.
- Solução: `next` aceita apenas `/dashboard` e `/redefinir-senha`.
- Testes: teste unitário cobre caminhos válidos, externos e protocolo relativo.
- Risco residual: nenhum conhecido para o fluxo atual.

### SEC-009 - corrigido

- Arquivos verificados: `.gitignore`.
- Solução: `.env` e `.env.local` estão ignorados; busca de secrets não encontrou service role ou chaves privadas versionadas.
- Testes: `git check-ignore .env .env.local` passou.
- Risco residual: rotação é necessária caso algum valor real tenha sido publicado fora deste repositório.

### SEC-010 - corrigido

- Arquivos alterados: `app/actions.ts`, `lib/security.ts`, `tests/security.test.ts`.
- Solução: link de pagamento aceita exclusivamente URLs HTTPS.
- Testes: teste unitário rejeita `javascript:` e `data:`.
- Risco residual: links HTTPS ainda podem apontar a destinos de phishing; a configuração é restrita a usuários internos.

### SEC-011 - parcialmente corrigido

- Arquivos alterados: `app/actions.ts`, `lib/security.ts`, `tests/security.test.ts`.
- Solução: limite de 20 KB para JSON de itens, 50 itens por pedido, 500 caracteres por observação de item e 1.000 caracteres para instruções de pagamento.
- Testes: testes unitários validam os limites comuns.
- Risco residual: outros campos textuais e limites equivalentes no banco ainda devem receber constraints numa revisão de schema.

### SEC-012 - não corrigido

- Motivo: exige arquitetura de auditoria persistente, schema, políticas e cobertura de todas as mutações críticas.
- Risco residual: alterações financeiras e destrutivas não têm trilha forense suficiente. Implementar antes de considerar o sistema adequado a controles financeiros rigorosos.

### SEC-013 - corrigido

- Arquivos alterados: `package.json`, `package-lock.json`.
- Solução: PostCSS atualizado e fixado com override em `8.5.15`, inclusive para a cópia transitiva de Next.
- Testes: `npm ls postcss --all` confirma `8.5.15`; `npm audit --omit=dev --json` retornou zero vulnerabilidades.
- Risco residual: acompanhar advisories futuros de Next/PostCSS.

### SEC-014 - corrigido

- Arquivos alterados: `tsconfig.json`, `package.json`.
- Solução: `allowImportingTsExtensions` permite os testes TypeScript sem emissão; `npm run build` continua como checagem completa de tipos do Next.
- Testes: `npx tsc --noEmit` e build passaram.
- Risco residual: CI deve sempre executar typecheck e build.

## Riscos que ainda impedem produção

- SEC-003: para app exposto à internet, configurar rate limit distribuído/captcha no Supabase Auth e proteção de borda.
- SEC-007: se usuários internos não tiverem confiança operacional equivalente, implementar papéis e autorização por operação.
- SEC-012: se houver exigência de rastreabilidade financeira ou resposta a incidente, implementar auditoria persistente.
- SEC-011: se o app receber entradas de grande porte fora de pedidos/pagamento, completar limites no schema e nas actions restantes.

## Checklist de segurança após correções

- [x] Produção sem Supabase configurado bloqueia rotas privadas.
- [x] Reset retorna a mesma mensagem para e-mail existente e inexistente.
- [x] Login/reset têm rate limit local testado.
- [x] Pedido recalcula custo no servidor; preço de produto vem do banco.
- [x] `/api/seed-sample` retorna 404 por GET e exige flag por POST fora de produção.
- [x] Headers de segurança configurados.
- [ ] RLS validado com pelo menos dois usuários de teste em um projeto Supabase isolado.
- [ ] Actions destrutivas registram auditoria persistente.
- [x] Payloads grandes de pedido/pagamento são rejeitados.
- [x] `npm audit --omit=dev` sem vulnerabilidades abertas.
- [x] `.env` ignorado pelo Git.
- [x] Testes, lint, typecheck e build passam.

## 16. Plano de endurecimento antes da exposição pública

Atualização: 26/06/2026  
Status: planejamento aprovado para execução. Os controles desta seção ainda não estão implementados ou configurados.

Os itens SEC-003, SEC-007 e SEC-012 dependem de decisões de operação e de mudanças coordenadas entre Supabase, hospedagem/WAF, schema, RLS, Server Actions e testes. Eles não devem ser tratados como ajustes isolados no frontend.

### 16.1 Decisão de arquitetura

Adotar defesa em camadas:

1. O Supabase Auth deve limitar e desafiar tentativas abusivas de autenticação.
2. O provedor de borda/WAF deve bloquear automação e picos antes de chegarem ao Next.js.
3. O app deve preservar limites de negócio por usuário e ação; o limitador em memória atual é apenas uma proteção complementar.
4. O Postgres deve ser a fonte de verdade para autorização, papéis e eventos de auditoria.

Antes da execução, registrar qual será o provedor de rate limit distribuído e WAF. A preferência é usar os controles nativos já contratados no provedor de deploy; caso não cubram janelas, chaves ou observabilidade necessárias, usar um armazenamento compartilhado de rate limit compatível com o runtime da Vercel. Não usar memória do processo como controle único em produção.

### 16.2 SEC-003 - Rate limit distribuído, CAPTCHA e WAF

#### Objetivo

Reduzir credential stuffing, força bruta, spam de reset, automação contra Server Actions e consumo abusivo de recursos antes da autenticação.

#### Camadas e responsabilidades

| Camada | Controle | Escopo mínimo |
|---|---|---|
| Supabase Auth | Habilitar CAPTCHA/bot detection no login, cadastro se vier a existir e reset; configurar os limites de e-mail, OTP e tentativas disponíveis no projeto | Auth exposto à internet |
| WAF/borda | Rate limit por IP e regra de desafio/bloqueio para picos suspeitos | `/login`, `/redefinir-senha`, `/auth/callback`, chamadas de Auth e endpoints públicos futuros |
| Aplicação | Substituir ou complementar `lib/rate-limit.ts` por armazenamento distribuído; manter chave por IP + e-mail normalizado para login/reset | `signInAction`, `requestPasswordResetAction` e mutações caras |
| Observabilidade | Registrar bloqueios agregados, sem senha, token ou corpo de formulário | Investigação operacional |

#### Limites iniciais propostos

Os números devem ser observados durante a primeira semana e ajustados sem abrir brecha para abuso:

| Operação | Chave | Janela inicial | Ação ao exceder |
|---|---|---|---|
| Login | IP + e-mail normalizado | 8 tentativas / 15 min | Mensagem neutra e bloqueio temporário |
| Reset de senha | IP + e-mail normalizado | 5 solicitações / 60 min | Resposta neutra; não revelar se o e-mail existe |
| Callback de Auth | IP | 30 requisições / 5 min | Resposta de bloqueio da borda |
| Server Actions de escrita | usuário autenticado + ação | 60 operações / 5 min, com limites menores para geração de PDF/PNG e seed | Erro controlado e evento operacional agregado |

O rate limit de login/reset deve considerar simultaneamente IP e e-mail. Limitar somente por IP prejudica redes compartilhadas; limitar somente por e-mail facilita rotação de endereços IP.

#### Implementação no repositório

1. Manter a interface de `assertRateLimit`, mas trocar o backend de `Map` em `lib/rate-limit.ts` por um adaptador distribuído configurado por variáveis server-only.
2. Definir falha fechada para login/reset quando o serviço de rate limit estiver indisponível em produção; para mutações autenticadas, decidir explicitamente entre falha fechada e um limite local de contingência, registrando o incidente.
3. Extrair a identificação de cliente para uma função que trate `x-forwarded-for` apenas quando a origem for o proxy confiável de produção.
4. Não armazenar e-mail em texto puro na chave remota ou nos logs. Usar hash com segredo server-only ou identificador equivalente.
5. Exigir token CAPTCHA no formulário e validá-lo no fluxo de Auth conforme o provedor escolhido. Não confiar em uma validação apenas visual no cliente.
6. Deixar a configuração de CAPTCHA, rate limits do Auth e WAF documentada como checklist de deploy, pois ela não pode ser garantida somente pelo Git.

#### Critérios de aceite

- Tentativas excedentes não chegam repetidamente ao Supabase Auth.
- Uma tentativa com e-mail existente e outra com e-mail inexistente apresentam a mesma resposta.
- O mesmo limite é compartilhado por duas instâncias simultâneas do app.
- Um desafio CAPTCHA inválido ou ausente não inicia o fluxo protegido.
- Logs de bloqueio não contêm senha, token, chave Pix, endereço completo ou e-mail em claro.
- O ambiente de produção tem evidência exportável da regra de WAF e da configuração do Auth.

### 16.3 Validação de RLS com dois usuários reais em Supabase isolado

#### Objetivo

Validar o comportamento efetivo do banco usando sessões reais de `auth.users`, token de usuário e a `anon key`; não usar `service_role` para provar RLS, pois essa chave ignora as policies.

#### Ambiente de teste

1. Criar um projeto Supabase separado, sem dados de clientes e sem conexão com produção.
2. Aplicar apenas as migrations revisadas necessárias, incluindo as mudanças de papéis/auditoria quando elas existirem.
3. Criar dois usuários de teste reais no Auth: `rls-owner` e `rls-operator`.
4. Criar dados identificáveis somente de laboratório: duas empresas, dois clientes, dois pedidos e uma despesa por empresa.
5. Executar testes com dois clientes Supabase independentes, cada um autenticado com a sessão do respectivo usuário.

#### Importante sobre o modelo atual

A função atual `public.user_can_access_business` concede acesso a qualquer `business_id` existente para qualquer usuário autenticado. Por isso:

- dois usuários na única empresa Casa Fratoni devem enxergar os mesmos dados hoje; esse é o contrato atual;
- ao criar uma segunda empresa no projeto isolado, o teste de isolamento entre empresas deve falhar com a policy atual;
- esse resultado não é um bug novo descoberto pelo teste: ele confirma que o banco só é seguro sob a premissa operacional de existir uma única empresa e todos os usuários terem confiança equivalente;
- não permitir uma segunda empresa em produção enquanto a policy continuar assim.

#### Matriz mínima de testes

| Cenário | Sessão | Resultado esperado após implementação de papéis |
|---|---|---|
| Ler dados da própria empresa | `rls-owner` | Permitido |
| Ler dados da outra empresa | `rls-owner` | Negado/sem linhas |
| Criar pedido na própria empresa | `rls-operator` | Permitido |
| Alterar despesa, distribuição de lucro ou dados de pagamento | `rls-operator` | Negado |
| Alterar despesa, distribuição de lucro ou dados de pagamento | `rls-owner` | Permitido |
| Inserir `business_id` de outra empresa em payload manual | ambos | Negado pela policy/foreign key |
| Atualizar ou apagar um evento de auditoria | ambos | Negado |
| Acessar tabelas sem sessão | cliente anônimo | Negado |

Adicionar uma suíte de integração separada, por exemplo `tests/integration/rls.test.ts`, executada apenas quando as credenciais do projeto isolado estiverem presentes. Ela deve limpar somente os dados com prefixo de teste e nunca apontar para a URL de produção.

#### Critérios de aceite

- A matriz roda contra o Supabase isolado e gera um relatório reproduzível.
- O teste falha se receber URL de produção ou se as credenciais de teste não estiverem explicitamente habilitadas.
- Não há uso de `service_role` na suíte que valida policies.
- O cenário de segunda empresa deixa de vazar dados depois da migration de papéis.

### 16.4 SEC-007 - Papéis internos e autorização por operação

#### Quando implementar

Implementar antes de cadastrar qualquer pessoa que não deva ter poder operacional e financeiro equivalente ao proprietário. Enquanto todos os usuários forem administradores de confiança, o risco é formalmente aceito, mas deve continuar registrado.

#### Modelo proposto

Adicionar uma associação explícita entre usuário e empresa, mesmo com uma única empresa:

```text
business_members
- business_id
- user_id
- role: owner | admin | operator | viewer
- created_at
- created_by
```

Papéis mínimos:

| Papel | Permissões |
|---|---|
| `owner` | Acesso integral, gestão de membros, dados de pagamento, distribuição de lucro, despesas, exclusões e leitura da auditoria |
| `admin` | Operação integral, exceto gestão de `owner`; pode consultar auditoria |
| `operator` | Clientes, insumos, compras, receitas, produtos e pedidos; sem configurações financeiras, membros ou exclusões críticas |
| `viewer` | Leitura dos dados operacionais autorizados; sem mutações e sem dados de pagamento |

O papel deve ser consultado no banco por funções como `public.user_has_role(...)` ou `public.user_has_permission(...)`, usadas tanto pelas policies RLS quanto pelas Server Actions. Ocultar botões na interface melhora a experiência, mas não é autorização.

#### Sequência segura de migration

1. Criar enum/tabela de membros, índices e funções auxiliares com `SECURITY DEFINER`, `search_path` fixado e privilégios mínimos.
2. Popular o proprietário atual da primeira empresa como `owner`.
3. Alterar `user_can_access_business` para consultar a associação em vez de aceitar qualquer usuário autenticado.
4. Substituir policies `for all` genéricas por policies de leitura/escrita segmentadas por permissão.
5. Atualizar `getBusinessId()` para validar associação ativa e parar de inferir autorização pela primeira empresa existente.
6. Criar uma interface exclusiva de `owner` para convidar, alterar papel e desativar membro, ou executar essa gestão inicialmente por migration/administração Supabase documentada.
7. Executar a matriz RLS antes de liberar usuários não administrativos.

Não remover a policy antiga antes de confirmar que o proprietário foi migrado; isso pode bloquear completamente o acesso legítimo.

#### Critérios de aceite

- Não existe usuário autenticado sem associação explícita à empresa.
- `viewer` não consegue mutar via UI, Server Action nem chamada direta ao banco.
- `operator` não consegue alterar despesas, dados de pagamento, distribuição de lucro, membros ou eventos de auditoria.
- A remoção/desativação de um membro revoga acesso sem exigir alteração no frontend.
- Toda policy é coberta pela suíte RLS isolada.

### 16.5 SEC-012 - Auditoria persistente de alterações críticas

#### Objetivo

Criar trilha forense e operacional para alterações relevantes, sem registrar segredos ou dados pessoais além do necessário.

#### Modelo proposto

```text
audit_events
- id
- business_id
- actor_id
- action                 (ex.: order.update, expense.delete)
- resource_type          (ex.: orders, business_expenses)
- resource_id
- occurred_at
- request_id             (correlação, quando disponível)
- source                 (app | database | migration)
- reason                 (obrigatório em override/exclusão crítica)
- before_data            (JSONB com allowlist de campos)
- after_data             (JSONB com allowlist de campos)
- metadata               (JSONB sem segredos)
```

Regras de retenção e privacidade:

- Não registrar senha, token de sessão, token CAPTCHA, cookie, `Authorization`, chave Pix completa, endereço completo ou observações livres de cliente.
- Para dados de pagamento, registrar somente que o campo foi alterado e, quando necessário, os últimos quatro caracteres já mascarados.
- Guardar IP apenas se houver necessidade operacional explícita; preferir hash com segredo rotacionável e prazo de retenção definido.
- Eventos são append-only: sem `UPDATE` ou `DELETE` para usuários da aplicação.
- Leitura dos eventos apenas por `owner` e `admin`; inserção apenas por trigger/função controlada.

#### Cobertura inicial obrigatória

| Área | Eventos |
|---|---|
| Pedidos | criação, edição, cancelamento, exclusão e alteração de pagamento/desconto |
| Financeiro | criação, edição e exclusão de despesas; alteração de distribuição de lucro, precificação e dados de pagamento |
| Estoque | compra/lote criado, editado ou removido; ajuste de custo/estoque quando existir |
| Acesso | membro criado, papel alterado, membro desativado/removido |
| Exceções | override manual de preço permitido, com motivo |

#### Implementação recomendada

Usar triggers `AFTER INSERT OR UPDATE OR DELETE` para tabelas de alto risco, pois eles registram alterações também quando alguém chama o banco fora da UI. Para o contexto de ação, as Server Actions devem definir um contexto controlado de request/motivo antes da mutação, e o trigger deve capturar `auth.uid()` como ator.

Para tabelas em que o before/after integral seja sensível ou muito volumoso, registrar somente os campos da allowlist. As Server Actions continuam responsáveis por validar motivo obrigatório em exclusões e overrides; o trigger é responsável por garantir que o evento exista.

#### Critérios de aceite

- Cada mutação crítica listada gera exatamente um evento pesquisável.
- Um usuário não consegue inserir, alterar ou apagar evento diretamente.
- Exclusão registra estado anterior permitido pela allowlist.
- Alteração de dados de pagamento não expõe a chave completa no evento.
- Testes cobrem criação, atualização, exclusão, falha de permissão e tentativa de adulterar o log.

### 16.6 Ordem de execução recomendada

1. Configurar CAPTCHA e limites do Supabase Auth, depois WAF/rate limit de borda.
2. Implementar rate limit distribuído no app e validar os bloqueios.
3. Criar projeto Supabase isolado e automatizar a linha de base da matriz RLS.
4. Implementar `business_members`, papéis e policies; repetir a matriz até o isolamento passar.
5. Implementar `audit_events` e triggers para a cobertura inicial.
6. Adicionar visualização de auditoria apenas para `owner`/`admin`.
7. Atualizar o checklist de deploy e anexar evidências de configuração/testes à próxima auditoria.

### 16.7 Checklist de liberação

- [ ] CAPTCHA/bot detection habilitado no Supabase Auth e validado no fluxo real.
- [ ] Rate limits do Supabase Auth revisados e registrados.
- [ ] Regras de WAF/rate limit de borda ativas para autenticação.
- [ ] Limitador distribuído ativo em produção; `Map` local não é o único controle.
- [ ] Projeto Supabase isolado criado para integração de RLS.
- [ ] Dois usuários reais de teste e matriz RLS automatizada.
- [ ] Segunda empresa de laboratório não é visível a usuário sem associação após a migration.
- [ ] Papéis `owner`, `admin`, `operator` e `viewer` aplicados no banco e nas actions.
- [ ] Eventos críticos são append-only e não expõem segredos.
- [ ] Evidências de teste e configuração revisadas antes do deploy público.
