import assert from "node:assert/strict";
import test from "node:test";
import {
  assertArrayLimit,
  assertHttpsUrl,
  assertMaxLength,
  getSafeAuthRedirect,
} from "../lib/security.ts";
import { assertRateLimit, resetRateLimitsForTests } from "../lib/rate-limit.ts";

test("auth callback only allows known internal redirects", () => {
  assert.equal(getSafeAuthRedirect("/dashboard"), "/dashboard");
  assert.equal(getSafeAuthRedirect("/redefinir-senha"), "/redefinir-senha");
  assert.equal(getSafeAuthRedirect("/financeiro"), "/dashboard");
  assert.equal(getSafeAuthRedirect("https://example.com"), "/dashboard");
  assert.equal(getSafeAuthRedirect("//example.com"), "/dashboard");
});

test("payment links must use https", () => {
  assert.equal(assertHttpsUrl("https://pagamento.example/pedido", "link de pagamento"), "https://pagamento.example/pedido");
  assert.throws(() => assertHttpsUrl("javascript:alert(1)", "link de pagamento"), /HTTPS/);
  assert.throws(() => assertHttpsUrl("data:text/html,teste", "link de pagamento"), /HTTPS/);
});

test("payload limits reject oversized input", () => {
  assert.doesNotThrow(() => assertMaxLength("observacao curta", 20, "Observação"));
  assert.throws(() => assertMaxLength("texto grande", 4, "Observação"), /limite/);
  assert.doesNotThrow(() => assertArrayLimit([1, 2], 2, "Pedido"));
  assert.throws(() => assertArrayLimit([1, 2, 3], 2, "Pedido"), /maximo 2/);
});

test("rate limiter blocks attempts over the configured window", () => {
  resetRateLimitsForTests();
  assert.doesNotThrow(() => assertRateLimit({ key: "login:test", limit: 2, windowMs: 60_000 }));
  assert.doesNotThrow(() => assertRateLimit({ key: "login:test", limit: 2, windowMs: 60_000 }));
  assert.throws(
    () => assertRateLimit({ key: "login:test", limit: 2, windowMs: 60_000 }),
    /Muitas tentativas/,
  );
});
