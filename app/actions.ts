"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getBusinessId } from "@/lib/auth-context";
import { isSupabaseConfigured } from "@/lib/env";
import { getAppUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { convertUnit } from "@/lib/calculations";
import type { ExpenseCategory, OrderStatus, PaymentStatus, Unit } from "@/types";

const expenseCategories: ExpenseCategory[] = [
  "Ingredientes",
  "Embalagens",
  "Entregas",
  "Marketing",
  "Energia",
  "Água",
  "Aluguel",
  "Equipamentos",
  "Manutenção",
  "Pró-labore",
  "Outros",
];

const units: Unit[] = ["g", "kg", "ml", "l", "un"];

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getNullableString(formData: FormData, key: string) {
  const value = getString(formData, key);
  return value.length > 0 ? value : null;
}

function getNumber(formData: FormData, key: string, fallback = 0) {
  const input = getString(formData, key).replace(/[R$\s]/g, "");
  const raw = input.includes(",") ? input.replace(/\./g, "").replace(",", ".") : input;
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

function toNumberInput(value: unknown, fallback = 0) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : fallback;
  }

  if (typeof value !== "string") {
    return fallback;
  }

  const input = value.trim().replace(/[R$\s]/g, "");
  const raw = input.includes(",") ? input.replace(/\./g, "").replace(",", ".") : input;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getUnit(value: unknown): Unit {
  return units.includes(value as Unit) ? (value as Unit) : "un";
}

type ParsedOrderItem = {
  product_id: string | null;
  recipe_id: string | null;
  name: string;
  quantity: number;
  quantity_unit: Unit;
  unit_price: number;
  total_price: number;
  unit_cost_snapshot: number;
  total_cost_snapshot: number;
  profit_snapshot: number;
  notes: string | null;
};

type OrderTotals = {
  items: ParsedOrderItem[];
  subtotal: number;
  totalCost: number;
};

async function getNextOrderNumber(supabase: Awaited<ReturnType<typeof createClient>>, businessId: string) {
  const { data, error } = await supabase
    .from("orders")
    .select("order_number")
    .eq("business_id", businessId);

  if (error) {
    throw new Error(error.message);
  }

  const maxNumber = (data ?? []).reduce((max, row) => {
    const number = String(row.order_number).match(/^Pedido\s+(\d+)$/i)?.[1];
    return number ? Math.max(max, Number(number)) : max;
  }, 0);

  return `Pedido ${maxNumber + 1}`;
}

async function getParsedOrderItems(
  supabase: Awaited<ReturnType<typeof createClient>>,
  businessId: string,
  formData: FormData,
): Promise<OrderTotals> {
  const rawItems = getString(formData, "order_items");

  if (!rawItems) {
    throw new Error("Adicione pelo menos um produto ou receita ao pedido.");
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawItems);
  } catch {
    throw new Error("Nao foi possivel ler os itens do pedido.");
  }

  if (!Array.isArray(payload) || payload.length === 0) {
    throw new Error("Adicione pelo menos um produto ou receita ao pedido.");
  }

  const normalizedPayload = payload.map((item) => {
    const record = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    const productId = typeof record.productId === "string" && record.productId ? record.productId : null;
    const recipeId = typeof record.recipeId === "string" && record.recipeId ? record.recipeId : null;
    const quantity = toNumberInput(record.quantity, 1);
    const unitPrice = toNumberInput(record.unitPrice);
    const unitCost = toNumberInput(record.unitCostSnapshot);
    const notes = typeof record.notes === "string" && record.notes.trim() ? record.notes.trim() : null;

    return {
      productId,
      recipeId,
      quantity,
      quantityUnit: getUnit(record.quantityUnit),
      unitPrice,
      unitCost,
      notes,
    };
  });

  const productIds = [...new Set(normalizedPayload.map((item) => item.productId).filter(Boolean))] as string[];
  const recipeIds = [...new Set(normalizedPayload.map((item) => item.recipeId).filter(Boolean))] as string[];

  const [{ data: products, error: productsError }, { data: recipes, error: recipesError }] = await Promise.all([
    productIds.length > 0
      ? supabase
          .from("products")
          .select("id, name, recipe_id")
          .eq("business_id", businessId)
          .in("id", productIds)
      : Promise.resolve({ data: [], error: null }),
    recipeIds.length > 0
      ? supabase
          .from("recipes")
          .select("id, name, yield_quantity")
          .eq("business_id", businessId)
          .in("id", recipeIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (productsError) {
    throw new Error(productsError.message);
  }

  if (recipesError) {
    throw new Error(recipesError.message);
  }

  const productMap = new Map((products ?? []).map((product) => [String(product.id), product]));
  const productRecipeIds = (products ?? [])
    .map((product) => (product.recipe_id ? String(product.recipe_id) : null))
    .filter(Boolean) as string[];
  const allRecipeIds = [...new Set([...recipeIds, ...productRecipeIds])];

  const { data: linkedRecipes, error: linkedRecipesError } =
    allRecipeIds.length > 0
      ? await supabase
          .from("recipes")
          .select("id, name, yield_quantity")
          .eq("business_id", businessId)
          .in("id", allRecipeIds)
      : { data: recipes ?? [], error: null };

  if (linkedRecipesError) {
    throw new Error(linkedRecipesError.message);
  }

  const recipeMap = new Map((linkedRecipes ?? []).map((recipe) => [String(recipe.id), recipe]));
  const { data: recipeIngredientRows, error: recipeIngredientsError } =
    allRecipeIds.length > 0
      ? await supabase
          .from("recipe_ingredients")
          .select("recipe_id, ingredient_id, converted_quantity")
          .eq("business_id", businessId)
          .in("recipe_id", allRecipeIds)
      : { data: [], error: null };

  if (recipeIngredientsError) {
    throw new Error(recipeIngredientsError.message);
  }

  const ingredientIds = [
    ...new Set((recipeIngredientRows ?? []).map((row) => (row.ingredient_id ? String(row.ingredient_id) : null)).filter(Boolean)),
  ] as string[];

  const { data: ingredientRows, error: ingredientsError } =
    ingredientIds.length > 0
      ? await supabase
          .from("ingredients")
          .select("id, average_cost")
          .eq("business_id", businessId)
          .in("id", ingredientIds)
      : { data: [], error: null };

  if (ingredientsError) {
    throw new Error(ingredientsError.message);
  }

  const ingredientCostMap = new Map((ingredientRows ?? []).map((ingredient) => [String(ingredient.id), Number(ingredient.average_cost)]));
  const recipeTotalCostMap = new Map<string, number>();

  for (const row of recipeIngredientRows ?? []) {
    const recipeId = String(row.recipe_id);
    const ingredientCost = ingredientCostMap.get(String(row.ingredient_id)) ?? 0;
    const quantity = Number(row.converted_quantity);
    recipeTotalCostMap.set(recipeId, (recipeTotalCostMap.get(recipeId) ?? 0) + quantity * ingredientCost);
  }

  const recipeUnitCostMap = new Map(
    (linkedRecipes ?? []).map((recipe) => {
      const recipeId = String(recipe.id);
      const yieldQuantity = Number(recipe.yield_quantity);
      const totalCost = recipeTotalCostMap.get(recipeId) ?? 0;
      return [recipeId, yieldQuantity > 0 ? totalCost / yieldQuantity : 0];
    }),
  );

  const items = normalizedPayload.map((item) => {
    if (!item.productId && !item.recipeId) {
      throw new Error("Cada linha do pedido precisa ter produto ou receita.");
    }

    if (item.quantity <= 0) {
      throw new Error("A quantidade precisa ser maior que zero.");
    }

    if (item.unitPrice < 0 || item.unitCost < 0) {
      throw new Error("Precos e custos nao podem ser negativos.");
    }

    const product = item.productId ? productMap.get(item.productId) : null;
    if (item.productId && !product) {
      throw new Error("Produto nao encontrado para este pedido.");
    }

    const recipeId = item.recipeId ?? (product?.recipe_id ? String(product.recipe_id) : null);
    const recipe = recipeId ? recipeMap.get(recipeId) : null;
    if (item.recipeId && !recipe) {
      throw new Error("Receita nao encontrada para este pedido.");
    }

    const unitCost = item.unitCost > 0 ? item.unitCost : recipeUnitCostMap.get(recipeId ?? "") ?? 0;
    const totalPrice = item.quantity * item.unitPrice;
    const totalCost = item.quantity * unitCost;

    return {
      product_id: item.productId,
      recipe_id: recipeId,
      name: product ? String(product.name) : String(recipe?.name ?? "Receita do pedido"),
      quantity: item.quantity,
      quantity_unit: item.quantityUnit,
      unit_price: item.unitPrice,
      total_price: totalPrice,
      unit_cost_snapshot: unitCost,
      total_cost_snapshot: totalCost,
      profit_snapshot: totalPrice - totalCost,
      notes: item.notes,
    };
  });

  return {
    items,
    subtotal: items.reduce((sum, item) => sum + item.total_price, 0),
    totalCost: items.reduce((sum, item) => sum + item.total_cost_snapshot, 0),
  };
}

function getExpenseCategory(formData: FormData) {
  const category = getString(formData, "category") as ExpenseCategory;
  return expenseCategories.includes(category) ? category : "Outros";
}

function isMissingTableError(error: { code?: string; message?: string }) {
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    /relation .* does not exist/i.test(error.message ?? "") ||
    /could not find the table/i.test(error.message ?? "")
  );
}

export async function signInAction(formData: FormData) {
  if (!isSupabaseConfigured()) {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const email = getString(formData, "email");
  const password = getString(formData, "password");

  if (!email || !password) {
    redirect("/login?erro=campos");
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect("/login?erro=credenciais");
  }

  redirect("/dashboard");
}

export async function requestPasswordResetAction(formData: FormData) {
  if (!isSupabaseConfigured()) {
    redirect("/login?sucesso=reset");
  }

  const supabase = await createClient();
  const email = getString(formData, "reset_email");

  if (!email) {
    redirect("/login?erro=campos");
  }

  const { data: emailExists, error: emailCheckError } = await supabase.rpc("email_has_auth_user", {
    target_email: email,
  });

  if (emailCheckError) {
    redirect("/login?erro=reset_config");
  }

  if (!emailExists) {
    redirect("/login?erro=email_nao_cadastrado");
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${getAppUrl()}/auth/callback?next=/redefinir-senha`,
  });

  if (error) {
    redirect("/login?erro=reset");
  }

  redirect("/login?sucesso=reset");
}

export async function signOutAction() {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }

  redirect("/login");
}

export async function createCustomerAction(formData: FormData) {
  if (!isSupabaseConfigured()) {
    revalidatePath("/clientes");
    return;
  }

  const businessId = await getBusinessId();
  const supabase = await createClient();
  const { error } = await supabase.from("customers").insert({
    business_id: businessId,
    name: getString(formData, "name"),
    phone: getNullableString(formData, "phone"),
    address: getNullableString(formData, "address"),
    notes: getNullableString(formData, "notes"),
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/clientes");
  revalidatePath("/dashboard");
}

export async function createBusinessExpenseAction(formData: FormData) {
  if (!isSupabaseConfigured()) {
    revalidatePath("/gestao");
    return;
  }

  const businessId = await getBusinessId();
  const description = getString(formData, "description");
  const amount = getNumber(formData, "amount");
  const expenseDate = getString(formData, "expense_date");

  if (!description || amount < 0 || !expenseDate) {
    throw new Error("Informe descrição, valor e data da despesa.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("business_expenses").insert({
    business_id: businessId,
    description,
    category: getExpenseCategory(formData),
    amount,
    expense_date: expenseDate,
    notes: getNullableString(formData, "notes"),
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/gestao");
  revalidatePath("/financeiro");
  revalidatePath("/dashboard");
}

export async function updateBusinessExpenseAction(formData: FormData) {
  if (!isSupabaseConfigured()) {
    revalidatePath("/gestao");
    return;
  }

  const businessId = await getBusinessId();
  const expenseId = getString(formData, "expense_id");
  const description = getString(formData, "description");
  const amount = getNumber(formData, "amount");
  const expenseDate = getString(formData, "expense_date");

  if (!expenseId || !description || amount < 0 || !expenseDate) {
    throw new Error("Informe despesa, descrição, valor e data para salvar.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("business_expenses")
    .update({
      description,
      category: getExpenseCategory(formData),
      amount,
      expense_date: expenseDate,
      notes: getNullableString(formData, "notes"),
    })
    .eq("business_id", businessId)
    .eq("id", expenseId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/gestao");
  revalidatePath("/financeiro");
  revalidatePath("/dashboard");
}

export async function deleteBusinessExpenseAction(formData: FormData) {
  if (!isSupabaseConfigured()) {
    revalidatePath("/gestao");
    revalidatePath("/financeiro");
    redirect("/financeiro");
  }

  const businessId = await getBusinessId();
  const expenseId = getString(formData, "expense_id");

  if (!expenseId) {
    throw new Error("Despesa não encontrada para exclusão.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("business_expenses")
    .delete()
    .eq("business_id", businessId)
    .eq("id", expenseId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/gestao");
  revalidatePath("/financeiro");
  revalidatePath("/dashboard");
  redirect("/financeiro");
}

export async function updateProfitDistributionAction(formData: FormData) {
  if (!isSupabaseConfigured()) {
    revalidatePath("/gestao");
    return;
  }

  const businessId = await getBusinessId();
  const partnersPercentage = getNumber(formData, "partners_percentage");
  const reinvestmentPercentage = getNumber(formData, "reinvestment_percentage");
  const cashReservePercentage = getNumber(formData, "cash_reserve_percentage");
  const total = Math.round(
    (partnersPercentage + reinvestmentPercentage + cashReservePercentage) * 100,
  ) / 100;

  if (
    partnersPercentage < 0 ||
    reinvestmentPercentage < 0 ||
    cashReservePercentage < 0 ||
    total !== 100
  ) {
    throw new Error("A distribuição do lucro precisa fechar exatamente em 100%.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("profit_distribution_settings").upsert(
    {
      business_id: businessId,
      partners_percentage: partnersPercentage,
      reinvestment_percentage: reinvestmentPercentage,
      cash_reserve_percentage: cashReservePercentage,
    },
    { onConflict: "business_id" },
  );

  if (error) {
    if (isMissingTableError(error)) {
      throw new Error("Rode o arquivo database/gestao-financeira.sql no Supabase antes de salvar a distribuição.");
    }

    throw new Error(error.message);
  }

  revalidatePath("/gestao");
  revalidatePath("/financeiro");
}

export async function updateCustomerAction(formData: FormData) {
  if (!isSupabaseConfigured()) {
    revalidatePath("/clientes");
    return;
  }

  const businessId = await getBusinessId();
  const customerId = getString(formData, "customer_id");
  const name = getString(formData, "name");

  if (!customerId || !name) {
    throw new Error("Informe o cliente e o nome para salvar.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("customers")
    .update({
      name,
      phone: getNullableString(formData, "phone"),
      address: getNullableString(formData, "address"),
      notes: getNullableString(formData, "notes"),
    })
    .eq("business_id", businessId)
    .eq("id", customerId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/clientes");
  revalidatePath("/dashboard");
}

export async function deleteCustomerAction(formData: FormData) {
  if (!isSupabaseConfigured()) {
    revalidatePath("/clientes");
    redirect("/clientes");
  }

  const businessId = await getBusinessId();
  const customerId = getString(formData, "customer_id");

  if (!customerId) {
    throw new Error("Cliente não encontrado para exclusão.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("customers")
    .delete()
    .eq("business_id", businessId)
    .eq("id", customerId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/clientes");
  revalidatePath("/dashboard");
  revalidatePath("/pedidos");
  redirect("/clientes");
}

export async function createIngredientAction(formData: FormData) {
  if (!isSupabaseConfigured()) {
    revalidatePath("/ingredientes");
    return;
  }

  const businessId = await getBusinessId();
  const supabase = await createClient();
  const { error } = await supabase.from("ingredients").insert({
    business_id: businessId,
    name: getString(formData, "name"),
    base_unit: getString(formData, "base_unit") as Unit,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/ingredientes");
  revalidatePath("/dashboard");
}

export async function createIngredientWithPurchaseAction(formData: FormData) {
  if (!isSupabaseConfigured()) {
    revalidatePath("/ingredientes");
    return;
  }

  const businessId = await getBusinessId();
  const supabase = await createClient();
  const baseUnit = getString(formData, "base_unit") as Unit;
  const quantity = getNumber(formData, "quantity");
  const totalPrice = getNumber(formData, "total_price");

  const { data: ingredient, error: ingredientError } = await supabase
    .from("ingredients")
    .insert({
      business_id: businessId,
      name: getString(formData, "name"),
      base_unit: baseUnit,
    })
    .select("id")
    .single();

  if (ingredientError || !ingredient) {
    throw new Error(ingredientError?.message ?? "Não foi possível cadastrar o ingrediente.");
  }

  if (quantity > 0 && totalPrice > 0) {
    const unit = getString(formData, "unit") as Unit;
    const convertedQuantity = convertUnit(quantity, unit, baseUnit);

    const { error: purchaseError } = await supabase.from("ingredient_purchases").insert({
      business_id: businessId,
      ingredient_id: ingredient.id,
      quantity,
      unit,
      converted_quantity: convertedQuantity,
      total_price: totalPrice,
      purchase_date: getString(formData, "purchase_date") || new Date().toISOString().slice(0, 10),
      supplier: getNullableString(formData, "supplier"),
    });

    if (purchaseError) {
      throw new Error(purchaseError.message);
    }
  }

  revalidatePath("/ingredientes");
  revalidatePath("/dashboard");
  revalidatePath("/receitas");
  revalidatePath("/pedidos");
}

export async function createIngredientPurchaseAction(formData: FormData) {
  if (!isSupabaseConfigured()) {
    revalidatePath("/ingredientes");
    return;
  }

  const businessId = await getBusinessId();
  const supabase = await createClient();
  const ingredientId = getString(formData, "ingredient_id");
  const quantity = getNumber(formData, "quantity");
  const unit = getString(formData, "unit") as Unit;
  const totalPrice = getNumber(formData, "total_price");

  const { data: ingredient, error: ingredientError } = await supabase
    .from("ingredients")
    .select("base_unit")
    .eq("business_id", businessId)
    .eq("id", ingredientId)
    .single();

  if (ingredientError || !ingredient) {
    throw new Error(ingredientError?.message ?? "Ingrediente não encontrado.");
  }

  const convertedQuantity = convertUnit(quantity, unit, ingredient.base_unit as Unit);

  const { error } = await supabase.from("ingredient_purchases").insert({
    business_id: businessId,
    ingredient_id: ingredientId,
    quantity,
    unit,
    converted_quantity: convertedQuantity,
    total_price: totalPrice,
    purchase_date: getString(formData, "purchase_date") || new Date().toISOString().slice(0, 10),
    supplier: getNullableString(formData, "supplier"),
    notes: getNullableString(formData, "notes"),
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/ingredientes");
  revalidatePath("/dashboard");
  revalidatePath("/receitas");
  revalidatePath("/pedidos");
  revalidatePath("/gestao");
}

export async function updateIngredientAction(formData: FormData) {
  if (!isSupabaseConfigured()) {
    revalidatePath("/ingredientes");
    return;
  }

  const businessId = await getBusinessId();
  const ingredientId = getString(formData, "ingredient_id");
  const name = getString(formData, "name");
  const baseUnit = getString(formData, "base_unit") as Unit;
  const minimumStock = getNumber(formData, "minimum_stock");

  if (!ingredientId || !name || !units.includes(baseUnit)) {
    throw new Error("Informe nome e unidade para salvar o insumo.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("ingredients")
    .update({
      name,
      base_unit: baseUnit,
      minimum_stock: Math.max(0, minimumStock),
    })
    .eq("business_id", businessId)
    .eq("id", ingredientId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/ingredientes");
  revalidatePath("/receitas");
  revalidatePath("/pedidos");
  revalidatePath("/dashboard");
  revalidatePath("/gestao");
}

export async function deleteIngredientAction(formData: FormData) {
  if (!isSupabaseConfigured()) {
    revalidatePath("/ingredientes");
    return;
  }

  const businessId = await getBusinessId();
  const ingredientId = getString(formData, "ingredient_id");

  if (!ingredientId) {
    throw new Error("Insumo não encontrado para exclusão.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("ingredients")
    .delete()
    .eq("business_id", businessId)
    .eq("id", ingredientId);

  if (error) {
    if (error.code === "23503") {
      throw new Error("Este insumo está em uma receita. Remova-o das receitas antes de excluir.");
    }

    throw new Error(error.message);
  }

  revalidatePath("/ingredientes");
  revalidatePath("/receitas");
  revalidatePath("/pedidos");
  revalidatePath("/dashboard");
  revalidatePath("/gestao");
}

export async function createRecipeAction(formData: FormData) {
  if (!isSupabaseConfigured()) {
    revalidatePath("/receitas");
    return;
  }

  const businessId = await getBusinessId();
  const supabase = await createClient();
  const { error } = await supabase.from("recipes").insert({
    business_id: businessId,
    name: getString(formData, "name"),
    description: getNullableString(formData, "description"),
    yield_quantity: getNumber(formData, "yield_quantity", 1),
    yield_unit: getString(formData, "yield_unit") as Unit,
    preparation_time_minutes: getNumber(formData, "preparation_time_minutes"),
    notes: getNullableString(formData, "notes"),
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/receitas");
}

export async function updateRecipeAction(formData: FormData) {
  if (!isSupabaseConfigured()) {
    revalidatePath("/receitas");
    return;
  }

  const businessId = await getBusinessId();
  const recipeId = getString(formData, "recipe_id");
  const name = getString(formData, "name");

  if (!recipeId || !name) {
    throw new Error("Informe a receita e o nome para salvar.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("recipes")
    .update({
      name,
      description: getNullableString(formData, "description"),
      yield_quantity: getNumber(formData, "yield_quantity", 1),
      yield_unit: getString(formData, "yield_unit") as Unit,
      preparation_time_minutes: getNumber(formData, "preparation_time_minutes"),
      notes: getNullableString(formData, "notes"),
    })
    .eq("business_id", businessId)
    .eq("id", recipeId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/receitas");
  revalidatePath("/pedidos");
  revalidatePath("/calculadoras");
}

export async function deleteRecipeAction(formData: FormData) {
  if (!isSupabaseConfigured()) {
    revalidatePath("/receitas");
    redirect("/receitas");
  }

  const businessId = await getBusinessId();
  const recipeId = getString(formData, "recipe_id");

  if (!recipeId) {
    throw new Error("Receita não encontrada para exclusão.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("recipes")
    .delete()
    .eq("business_id", businessId)
    .eq("id", recipeId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/receitas");
  revalidatePath("/pedidos");
  revalidatePath("/producao");
  redirect("/receitas");
}

export async function addRecipeIngredientAction(formData: FormData) {
  if (!isSupabaseConfigured()) {
    revalidatePath("/receitas");
    return;
  }

  const businessId = await getBusinessId();
  const supabase = await createClient();
  const recipeId = getString(formData, "recipe_id");
  const ingredientId = getString(formData, "ingredient_id");
  const quantity = getNumber(formData, "quantity");
  const unit = getString(formData, "unit") as Unit;

  const { data: ingredient, error: ingredientError } = await supabase
    .from("ingredients")
    .select("base_unit")
    .eq("business_id", businessId)
    .eq("id", ingredientId)
    .single();

  if (ingredientError || !ingredient) {
    throw new Error(ingredientError?.message ?? "Ingrediente não encontrado.");
  }

  const convertedQuantity = convertUnit(quantity, unit, ingredient.base_unit as Unit);
  const { error } = await supabase.from("recipe_ingredients").insert({
    business_id: businessId,
    recipe_id: recipeId,
    ingredient_id: ingredientId,
    quantity,
    unit,
    converted_quantity: convertedQuantity,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/receitas");
}

export async function updateRecipeIngredientAction(formData: FormData) {
  if (!isSupabaseConfigured()) {
    revalidatePath("/receitas");
    return;
  }

  const businessId = await getBusinessId();
  const supabase = await createClient();
  const recipeIngredientId = getString(formData, "recipe_ingredient_id");
  const ingredientId = getString(formData, "ingredient_id");
  const quantity = getNumber(formData, "quantity");
  const unit = getString(formData, "unit") as Unit;

  if (!recipeIngredientId || !ingredientId) {
    throw new Error("Ingrediente da receita não encontrado.");
  }

  const { data: ingredient, error: ingredientError } = await supabase
    .from("ingredients")
    .select("base_unit")
    .eq("business_id", businessId)
    .eq("id", ingredientId)
    .single();

  if (ingredientError || !ingredient) {
    throw new Error(ingredientError?.message ?? "Ingrediente não encontrado.");
  }

  const convertedQuantity = convertUnit(quantity, unit, ingredient.base_unit as Unit);
  const { error } = await supabase
    .from("recipe_ingredients")
    .update({
      ingredient_id: ingredientId,
      quantity,
      unit,
      converted_quantity: convertedQuantity,
    })
    .eq("business_id", businessId)
    .eq("id", recipeIngredientId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/receitas");
  revalidatePath("/dashboard");
}

export async function deleteRecipeIngredientAction(formData: FormData) {
  if (!isSupabaseConfigured()) {
    revalidatePath("/receitas");
    return;
  }

  const businessId = await getBusinessId();
  const recipeIngredientId = getString(formData, "recipe_ingredient_id");

  if (!recipeIngredientId) {
    throw new Error("Ingrediente da receita não encontrado para remoção.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("recipe_ingredients")
    .delete()
    .eq("business_id", businessId)
    .eq("id", recipeIngredientId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/receitas");
  revalidatePath("/dashboard");
}

export async function createProductAction(formData: FormData) {
  if (!isSupabaseConfigured()) {
    revalidatePath("/calculadoras");
    return;
  }

  const businessId = await getBusinessId();
  const supabase = await createClient();
  const recipeId = getNullableString(formData, "recipe_id");
  const { error } = await supabase.from("products").insert({
    business_id: businessId,
    recipe_id: recipeId,
    name: getString(formData, "name"),
    description: getNullableString(formData, "description"),
    default_sale_price: getNumber(formData, "default_sale_price"),
    active: true,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/pedidos");
  revalidatePath("/calculadoras");
  revalidatePath("/receitas");
}

export async function updateProductAction(formData: FormData) {
  if (!isSupabaseConfigured()) {
    revalidatePath("/receitas");
    return;
  }

  const businessId = await getBusinessId();
  const productId = getString(formData, "product_id");
  const name = getString(formData, "name");

  if (!productId || !name) {
    throw new Error("Informe o produto e o nome para salvar.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("products")
    .update({
      recipe_id: getNullableString(formData, "recipe_id"),
      name,
      description: getNullableString(formData, "description"),
      default_sale_price: getNumber(formData, "default_sale_price"),
      active: getString(formData, "active") !== "false",
    })
    .eq("business_id", businessId)
    .eq("id", productId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/receitas");
  revalidatePath("/pedidos");
  revalidatePath("/calculadoras");
}

export async function deleteProductAction(formData: FormData) {
  if (!isSupabaseConfigured()) {
    revalidatePath("/receitas");
    redirect("/receitas");
  }

  const businessId = await getBusinessId();
  const productId = getString(formData, "product_id");

  if (!productId) {
    throw new Error("Produto não encontrado para exclusão.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("products")
    .delete()
    .eq("business_id", businessId)
    .eq("id", productId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/receitas");
  revalidatePath("/pedidos");
  revalidatePath("/calculadoras");
  redirect("/receitas");
}

export async function createOrderAction(formData: FormData) {
  if (!isSupabaseConfigured()) {
    revalidatePath("/pedidos");
    return;
  }

  const businessId = await getBusinessId();
  const supabase = await createClient();
  const { items, subtotal, totalCost } = await getParsedOrderItems(supabase, businessId, formData);
  const deliveryFee = getNumber(formData, "delivery_fee");
  const discount = getNumber(formData, "discount");
  const totalPrice = Math.max(0, subtotal + deliveryFee - discount);
  const profit = totalPrice - totalCost;

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      business_id: businessId,
      customer_id: getNullableString(formData, "customer_id"),
      order_number: await getNextOrderNumber(supabase, businessId),
      delivery_date: getString(formData, "delivery_date"),
      delivery_time: getNullableString(formData, "delivery_time"),
      status: getString(formData, "status") as OrderStatus,
      payment_status: getString(formData, "payment_status") as PaymentStatus,
      payment_method: getNullableString(formData, "payment_method"),
      subtotal,
      discount,
      delivery_fee: deliveryFee,
      total_price: totalPrice,
      total_cost_snapshot: totalCost,
      estimated_profit_snapshot: profit,
      notes: getNullableString(formData, "notes"),
    })
    .select("id")
    .single();

  if (orderError || !order) {
    throw new Error(orderError?.message ?? "Não foi possível criar o pedido.");
  }

  const { error: itemError } = await supabase.from("order_items").insert(
    items.map((item) => ({
      ...item,
      business_id: businessId,
      order_id: order.id,
    })),
  );

  if (itemError) {
    throw new Error(itemError.message);
  }

  revalidatePath("/pedidos");
  revalidatePath("/dashboard");
  revalidatePath("/producao");
  revalidatePath("/gestao");
  revalidatePath("/financeiro");
}

export async function updateOrderAction(formData: FormData) {
  if (!isSupabaseConfigured()) {
    revalidatePath("/pedidos");
    return;
  }

  const orderId = getString(formData, "order_id");
  if (!orderId) {
    throw new Error("Pedido nao encontrado para edicao.");
  }

  const businessId = await getBusinessId();
  const supabase = await createClient();
  const { items, subtotal, totalCost } = await getParsedOrderItems(supabase, businessId, formData);
  const deliveryFee = getNumber(formData, "delivery_fee");
  const discount = getNumber(formData, "discount");
  const totalPrice = Math.max(0, subtotal + deliveryFee - discount);
  const profit = totalPrice - totalCost;

  const { error: orderError } = await supabase
    .from("orders")
    .update({
      customer_id: getNullableString(formData, "customer_id"),
      delivery_date: getString(formData, "delivery_date"),
      delivery_time: getNullableString(formData, "delivery_time"),
      status: getString(formData, "status") as OrderStatus,
      payment_status: getString(formData, "payment_status") as PaymentStatus,
      payment_method: getNullableString(formData, "payment_method"),
      subtotal,
      discount,
      delivery_fee: deliveryFee,
      total_price: totalPrice,
      total_cost_snapshot: totalCost,
      estimated_profit_snapshot: profit,
      notes: getNullableString(formData, "notes"),
    })
    .eq("business_id", businessId)
    .eq("id", orderId);

  if (orderError) {
    throw new Error(orderError.message);
  }

  const { error: deleteItemsError } = await supabase
    .from("order_items")
    .delete()
    .eq("business_id", businessId)
    .eq("order_id", orderId);

  if (deleteItemsError) {
    throw new Error(deleteItemsError.message);
  }

  const { error: itemError } = await supabase.from("order_items").insert(
    items.map((item) => ({
      ...item,
      business_id: businessId,
      order_id: orderId,
    })),
  );

  if (itemError) {
    throw new Error(itemError.message);
  }

  revalidatePath("/pedidos");
  revalidatePath("/dashboard");
  revalidatePath("/producao");
  revalidatePath("/gestao");
  revalidatePath("/financeiro");
}

export async function deleteOrderAction(formData: FormData) {
  if (!isSupabaseConfigured()) {
    revalidatePath("/pedidos");
    return;
  }

  const orderId = getString(formData, "order_id");
  if (!orderId) {
    throw new Error("Pedido nao encontrado para exclusao.");
  }

  const businessId = await getBusinessId();
  const supabase = await createClient();
  const { error } = await supabase
    .from("orders")
    .delete()
    .eq("business_id", businessId)
    .eq("id", orderId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/pedidos");
  revalidatePath("/dashboard");
  revalidatePath("/producao");
  revalidatePath("/gestao");
  revalidatePath("/financeiro");
}
