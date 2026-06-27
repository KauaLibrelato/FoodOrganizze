export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("sua-url"),
  );
}

export function isDemoModeAllowed() {
  return process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_ENABLE_DEMO === "true";
}

export function isSeedRouteAllowed() {
  return process.env.NODE_ENV !== "production" && process.env.ENABLE_SEED_ROUTE === "true";
}

export function getSupabaseUrl() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!rawUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL não configurada.");
  }

  return new URL(rawUrl).origin;
}

export function getSupabaseAnonKey() {
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!anonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY não configurada.");
  }

  return anonKey;
}

export function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}
