const allowedAuthRedirects = new Set(["/dashboard", "/redefinir-senha"]);

export const securityLimits = {
  orderItemsJsonBytes: 20_000,
  orderItems: 50,
  itemNotes: 500,
  paymentText: 1_000,
};

export function getSafeAuthRedirect(input: string | null) {
  if (!input || !input.startsWith("/") || input.startsWith("//")) {
    return "/dashboard";
  }

  return allowedAuthRedirects.has(input) ? input : "/dashboard";
}

export function assertHttpsUrl(value: string, fieldLabel = "link") {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error(`Informe um ${fieldLabel} valido.`);
  }

  if (url.protocol !== "https:") {
    throw new Error(`Use um ${fieldLabel} HTTPS.`);
  }

  return url.toString();
}

export function assertMaxLength(value: string | null, maxLength: number, fieldLabel: string) {
  if (value && value.length > maxLength) {
    throw new Error(`${fieldLabel} ultrapassa o limite de ${maxLength} caracteres.`);
  }
}

export function assertArrayLimit(value: unknown[], maxItems: number, fieldLabel: string) {
  if (value.length > maxItems) {
    throw new Error(`${fieldLabel} aceita no maximo ${maxItems} itens.`);
  }
}
