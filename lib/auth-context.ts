import { cache } from "react";
import { redirect } from "next/navigation";
import { DEFAULT_BUSINESS_NAME } from "@/lib/brand";
import { isDemoModeAllowed, isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export const getAccountContext = cache(async () => {
  if (!isSupabaseConfigured() && isDemoModeAllowed()) {
    return {
      accountEmail: "Modo demonstração",
      businessId: "demo-business",
      userId: null,
    };
  }

  if (!isSupabaseConfigured()) {
    redirect("/login?erro=config");
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  await supabase.from("profiles").upsert({
    id: user.id,
    name: user.user_metadata?.name ?? user.email?.split("@")[0] ?? "Confeiteira",
    email: user.email ?? "",
  });

  const { data: business, error } = await supabase
    .from("businesses")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (business?.id) {
    return {
      accountEmail: user.email ?? "Conta conectada",
      businessId: business.id as string,
      userId: user.id,
    };
  }

  const { data: createdBusiness, error: createError } = await supabase
    .from("businesses")
    .insert({ name: DEFAULT_BUSINESS_NAME, owner_id: user.id })
    .select("id")
    .single();

  if (createError) {
    throw new Error(createError.message);
  }

  return {
    accountEmail: user.email ?? "Conta conectada",
    businessId: createdBusiness.id as string,
    userId: user.id,
  };
});

export async function getBusinessId() {
  const context = await getAccountContext();
  return context.businessId;
}
