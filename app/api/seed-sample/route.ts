import { NextResponse, type NextRequest } from "next/server";
import { getBusinessId } from "@/lib/auth-context";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

const today = new Date().toISOString().slice(0, 10);
const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

async function getOrCreateByName<T extends { id: string; name: string }>(
  table: string,
  businessId: string,
  rows: Array<Record<string, unknown> & { name: string }>,
) {
  const supabase = await createClient();
  const names = rows.map((row) => row.name);
  const { data: existing, error: selectError } = await supabase
    .from(table)
    .select("id,name")
    .eq("business_id", businessId)
    .in("name", names);

  if (selectError) {
    throw new Error(selectError.message);
  }

  const existingByName = new Map((existing as T[] | null)?.map((row) => [row.name, row]) ?? []);
  const missingRows = rows.filter((row) => !existingByName.has(row.name));

  if (missingRows.length > 0) {
    const { data: created, error: insertError } = await supabase
      .from(table)
      .insert(missingRows.map((row) => ({ ...row, business_id: businessId })))
      .select("id,name");

    if (insertError) {
      throw new Error(insertError.message);
    }

    for (const row of (created as T[] | null) ?? []) {
      existingByName.set(row.name, row);
    }
  }

  return existingByName;
}

export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  const supabase = await createClient();
  const businessId = await getBusinessId();

  const customers = await getOrCreateByName("customers", businessId, [
    {
      name: "Marina Alves",
      phone: "(11) 98888-1010",
      address: "Rua das Camélias, 128",
      notes: "Prefere retirada no ateliê.",
    },
    {
      name: "Clara Mendes",
      phone: "(11) 97777-2020",
      address: "Av. Primavera, 82",
      notes: "Compra brownies todo mês.",
    },
    {
      name: "Renata Lima",
      phone: "(11) 96666-3030",
      address: "Rua Aurora, 45",
      notes: "Gosta de brigadeiro menos doce.",
    },
  ]);

  const ingredients = await getOrCreateByName("ingredients", businessId, [
    { name: "Chocolate meio amargo", category: "Chocolate", base_unit: "g", minimum_stock: 1000 },
    { name: "Farinha de trigo", category: "Secos", base_unit: "g", minimum_stock: 1000 },
    { name: "Açúcar refinado", category: "Secos", base_unit: "g", minimum_stock: 1200 },
    { name: "Manteiga sem sal", category: "Laticínios", base_unit: "g", minimum_stock: 500 },
    { name: "Ovos", category: "Frios", base_unit: "un", minimum_stock: 24 },
    { name: "Caixa para bolo 1kg", category: "Embalagens", base_unit: "un", minimum_stock: 10 },
  ]);

  const purchaseSeeds = [
    { ingredient: "Chocolate meio amargo", quantity: 1, unit: "kg", converted_quantity: 1000, total_price: 55, supplier: "Casa do Chocolate" },
    { ingredient: "Farinha de trigo", quantity: 5, unit: "kg", converted_quantity: 5000, total_price: 35, supplier: "Atacadão" },
    { ingredient: "Açúcar refinado", quantity: 5, unit: "kg", converted_quantity: 5000, total_price: 28, supplier: "Atacadão" },
    { ingredient: "Manteiga sem sal", quantity: 2, unit: "kg", converted_quantity: 2000, total_price: 74, supplier: "Mercado Central" },
    { ingredient: "Ovos", quantity: 30, unit: "un", converted_quantity: 30, total_price: 24, supplier: "Granja Boa Vista" },
    { ingredient: "Caixa para bolo 1kg", quantity: 20, unit: "un", converted_quantity: 20, total_price: 64, supplier: "Embalagens Sol" },
  ];

  for (const purchase of purchaseSeeds) {
    const ingredient = ingredients.get(purchase.ingredient);
    if (!ingredient) continue;

    const { data: existingPurchase } = await supabase
      .from("ingredient_purchases")
      .select("id")
      .eq("business_id", businessId)
      .eq("ingredient_id", ingredient.id)
      .limit(1)
      .maybeSingle();

    if (!existingPurchase) {
      const { error } = await supabase.from("ingredient_purchases").insert({
        business_id: businessId,
        ingredient_id: ingredient.id,
        quantity: purchase.quantity,
        unit: purchase.unit,
        converted_quantity: purchase.converted_quantity,
        total_price: purchase.total_price,
        purchase_date: today,
        supplier: purchase.supplier,
      });

      if (error) {
        throw new Error(error.message);
      }
    }
  }

  const recipes = await getOrCreateByName("recipes", businessId, [
    {
      name: "Brownie tradicional",
      description: "Brownie úmido com chocolate meio amargo.",
      yield_quantity: 20,
      yield_unit: "un",
      preparation_time_minutes: 70,
      notes: "Cortar depois de esfriar.",
    },
    {
      name: "Bolo de chocolate 1kg",
      description: "Massa de chocolate com cobertura cremosa.",
      yield_quantity: 1,
      yield_unit: "un",
      preparation_time_minutes: 120,
      notes: "Usar caixa 1kg para entrega.",
    },
  ]);

  const recipeIngredientSeeds = [
    { recipe: "Brownie tradicional", ingredient: "Chocolate meio amargo", quantity: 300, unit: "g", converted_quantity: 300 },
    { recipe: "Brownie tradicional", ingredient: "Farinha de trigo", quantity: 180, unit: "g", converted_quantity: 180 },
    { recipe: "Brownie tradicional", ingredient: "Açúcar refinado", quantity: 250, unit: "g", converted_quantity: 250 },
    { recipe: "Brownie tradicional", ingredient: "Manteiga sem sal", quantity: 160, unit: "g", converted_quantity: 160 },
    { recipe: "Brownie tradicional", ingredient: "Ovos", quantity: 4, unit: "un", converted_quantity: 4 },
    { recipe: "Bolo de chocolate 1kg", ingredient: "Chocolate meio amargo", quantity: 220, unit: "g", converted_quantity: 220 },
    { recipe: "Bolo de chocolate 1kg", ingredient: "Farinha de trigo", quantity: 350, unit: "g", converted_quantity: 350 },
    { recipe: "Bolo de chocolate 1kg", ingredient: "Açúcar refinado", quantity: 300, unit: "g", converted_quantity: 300 },
    { recipe: "Bolo de chocolate 1kg", ingredient: "Ovos", quantity: 4, unit: "un", converted_quantity: 4 },
    { recipe: "Bolo de chocolate 1kg", ingredient: "Caixa para bolo 1kg", quantity: 1, unit: "un", converted_quantity: 1 },
  ];

  for (const item of recipeIngredientSeeds) {
    const recipe = recipes.get(item.recipe);
    const ingredient = ingredients.get(item.ingredient);
    if (!recipe || !ingredient) continue;

    const { data: existingItem } = await supabase
      .from("recipe_ingredients")
      .select("id")
      .eq("business_id", businessId)
      .eq("recipe_id", recipe.id)
      .eq("ingredient_id", ingredient.id)
      .limit(1)
      .maybeSingle();

    if (!existingItem) {
      const { error } = await supabase.from("recipe_ingredients").insert({
        business_id: businessId,
        recipe_id: recipe.id,
        ingredient_id: ingredient.id,
        quantity: item.quantity,
        unit: item.unit,
        converted_quantity: item.converted_quantity,
      });

      if (error) {
        throw new Error(error.message);
      }
    }
  }

  const products = await getOrCreateByName("products", businessId, [
    {
      recipe_id: recipes.get("Brownie tradicional")?.id,
      name: "Brownie unidade",
      description: "Brownie tradicional embalado individualmente.",
      default_sale_price: 9,
      active: true,
    },
    {
      recipe_id: recipes.get("Bolo de chocolate 1kg")?.id,
      name: "Bolo de chocolate 1kg",
      description: "Bolo de chocolate para aniversário pequeno.",
      default_sale_price: 95,
      active: true,
    },
  ]);

  const orderSeeds = [
    {
      order_number: "FO-1001",
      customer: "Marina Alves",
      product: "Brownie unidade",
      recipe: "Brownie tradicional",
      item_name: "Brownie unidade",
      quantity: 40,
      unit_price: 9,
      unit_cost: 3.3,
      delivery_date: today,
      delivery_time: "15:30",
      status: "em_producao",
      payment_status: "sinal_pago",
      notes: "Retirada no ateliê.",
    },
    {
      order_number: "FO-1002",
      customer: "Renata Lima",
      product: "Bolo de chocolate 1kg",
      recipe: "Bolo de chocolate 1kg",
      item_name: "Bolo de chocolate 1kg",
      quantity: 1,
      unit_price: 95,
      unit_cost: 38,
      delivery_date: tomorrow,
      delivery_time: "10:00",
      status: "confirmado",
      payment_status: "pendente",
      notes: "Escrever parabéns na plaquinha.",
    },
  ];

  for (const seed of orderSeeds) {
    const { data: existingOrder } = await supabase
      .from("orders")
      .select("id")
      .eq("business_id", businessId)
      .eq("order_number", seed.order_number)
      .limit(1)
      .maybeSingle();

    if (existingOrder) continue;

    const quantity = seed.quantity;
    const subtotal = quantity * seed.unit_price;
    const totalCost = quantity * seed.unit_cost;
    const customer = customers.get(seed.customer);
    const product = products.get(seed.product);
    const recipe = recipes.get(seed.recipe);

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        business_id: businessId,
        customer_id: customer?.id,
        order_number: seed.order_number,
        delivery_date: seed.delivery_date,
        delivery_time: seed.delivery_time,
        status: seed.status,
        payment_status: seed.payment_status,
        payment_method: seed.payment_status === "pendente" ? null : "pix",
        subtotal,
        discount: 0,
        delivery_fee: 0,
        total_price: subtotal,
        total_cost_snapshot: totalCost,
        estimated_profit_snapshot: subtotal - totalCost,
        notes: seed.notes,
      })
      .select("id")
      .single();

    if (orderError || !order) {
      throw new Error(orderError?.message ?? "Não foi possível criar pedido de exemplo.");
    }

    const { error: itemError } = await supabase.from("order_items").insert({
      business_id: businessId,
      order_id: order.id,
      product_id: product?.id,
      recipe_id: recipe?.id,
      name: seed.item_name,
      quantity,
      unit_price: seed.unit_price,
      total_price: subtotal,
      unit_cost_snapshot: seed.unit_cost,
      total_cost_snapshot: totalCost,
      profit_snapshot: subtotal - totalCost,
    });

    if (itemError) {
      throw new Error(itemError.message);
    }
  }

  await supabase.from("pricing_settings").upsert({
    business_id: businessId,
    default_profit_margin_percentage: 45,
    default_labor_cost_per_hour: 28,
    default_energy_cost_percentage: 6,
    default_packaging_cost: 2.5,
    card_fee_percentage: 3.49,
  });

  return NextResponse.redirect(new URL("/dashboard", request.url));
}
