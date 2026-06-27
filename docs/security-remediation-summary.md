# Resumo de Remediação de Segurança - Casa Fratoni

Data: 25/06/2026

## 1. Resumo das correções

Foram corrigidos os principais riscos de configuração, integridade de pedidos, enumeração de usuários, seed inseguro, headers, callback, links de pagamento, limites de payload e dependências vulneráveis.

## 2. Vulnerabilidades críticas corrigidas

Não havia vulnerabilidades classificadas como críticas no relatório original.

## 3. Vulnerabilidades altas corrigidas

- SEC-001: modo demo agora requer flag explícita e nunca funciona em produção.
- SEC-004: custo do pedido é recalculado no backend; preço de produto vem do banco.
- SEC-003: proteção local contra abuso adicionada para login e reset. Permanece pendência de rate limit distribuído antes de exposição pública.

## 4. Alterações de arquitetura

- Modo demo separado por `NEXT_PUBLIC_ENABLE_DEMO=true`, apenas fora de produção.
- Seed convertido de GET mutável para POST protegido por `ENABLE_SEED_ROUTE=true`, apenas fora de produção.
- Regras reutilizáveis de segurança em `lib/security.ts`.
- Limitador local em `lib/rate-limit.ts`.

## 5. Migrations criadas

Nenhuma. As correções aplicadas não exigiram mudança destrutiva de banco.

## 6. Dependências atualizadas

- `postcss` atualizado/fixado em `8.5.15`.
- Override aplica a mesma versão à dependência transitiva de Next.
- `npm audit --omit=dev --json`: 0 vulnerabilidades.

## 7. Testes adicionados

- `tests/security.test.ts`
  - allowlist de callback;
  - rejeição de URL não HTTPS;
  - limites de payload;
  - rate limit local.

## 8. Problemas ainda pendentes

- Papéis/permissões: todos os usuários autenticados do modelo single-company ainda têm acesso operacional total.
- Auditoria persistente de alterações financeiras/destrutivas.
- Rate limit distribuído e proteção anti-bot para autenticação exposta à internet.
- Constraints de tamanho no banco e limites para todos os campos textuais.
- Teste real de RLS com pelo menos dois usuários em Supabase isolado.

## 9. Ações manuais necessárias

- No Supabase Auth, configurar limitação de tentativas, proteção contra abuso e captcha conforme o plano disponível.
- Na Vercel ou WAF, aplicar rate limiting de borda para `/login` e rotas de autenticação.
- Testar RLS em projeto isolado com dois usuários autenticados.
- Não habilitar `ENABLE_SEED_ROUTE` em ambientes compartilhados.

## 10. Variáveis de ambiente

Obrigatórias em produção:

```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=SUA_ANON_KEY
NEXT_PUBLIC_APP_URL=https://SEU-DOMINIO
```

Somente desenvolvimento local:

```env
NEXT_PUBLIC_ENABLE_DEMO=true
ENABLE_SEED_ROUTE=true
```

As flags de demo e seed são ignoradas em produção.

## 11. Cuidados no deploy

- Não publicar `.env` ou logs com variáveis de ambiente.
- Confirmar redirects do Supabase para `/auth/callback` e `/redefinir-senha`.
- Validar headers de resposta em produção.
- Executar `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build` e `npm audit --omit=dev`.

## 12. Checklist final para produção

- [x] Sem fallback demo em produção.
- [x] Sem seed mutável por GET.
- [x] Headers de segurança configurados.
- [x] Dependências auditadas sem vulnerabilidades conhecidas.
- [x] Custo de pedido calculado no servidor.
- [ ] Rate limiting distribuído/captcha configurado.
- [ ] RLS validado com múltiplos usuários.
- [ ] Papéis e auditoria persistente avaliados conforme a equipe crescer.
