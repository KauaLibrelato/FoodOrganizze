import { cache } from "react";
import { getBusinessId } from "@/lib/auth-context";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import {
  calculateRecipeCost,
  calculateRecipeCostPerYield,
} from "@/lib/calculations";
import type {
  BusinessExpense,
  BusinessPaymentSettings,
  Customer,
  ExpenseCategory,
  Ingredient,
  IngredientPurchase,
  Order,
  OrderItem,
  OrderStatus,
  PricingSettings,
  ProfitDistributionSettings,
  Product,
  Recipe,
  RecipeIngredient,
  Unit,
} from "@/types";

const now = new Date().toISOString();
const today = new Date().toISOString().slice(0, 10);
const currentMonth = today.slice(0, 7);

export const demoCustomers: Customer[] = [
  {
    id: "demo-customer-1",
    businessId: "demo-business",
    name: "Marina Alves",
    phone: "(11) 98888-1010",
    address: "Rua das Camélias, 128",
    notes: "Prefere retirada no ateliê.",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "demo-customer-2",
    businessId: "demo-business",
    name: "Clara Mendes",
    phone: "(11) 97777-2020",
    address: "Av. Primavera, 82",
    notes: "Compra brownies todo mês.",
    createdAt: now,
    updatedAt: now,
  },
];

export const demoIngredients: Ingredient[] = [
  {
    id: "demo-ing-1",
    businessId: "demo-business",
    name: "Chocolate meio amargo",
    category: "Chocolate",
    baseUnit: "g",
    currentStock: 420,
    averageCost: 0.055,
    minimumStock: 1000,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "demo-ing-2",
    businessId: "demo-business",
    name: "Farinha de trigo",
    category: "Secos",
    baseUnit: "g",
    currentStock: 2500,
    averageCost: 0.008,
    minimumStock: 1000,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "demo-ing-3",
    businessId: "demo-business",
    name: "Caixa para bolo 1kg",
    category: "Embalagens",
    baseUnit: "un",
    currentStock: 3,
    averageCost: 3.2,
    minimumStock: 10,
    createdAt: now,
    updatedAt: now,
  },
];

export const demoPurchases: IngredientPurchase[] = [
  {
    id: "demo-purchase-1",
    businessId: "demo-business",
    ingredientId: "demo-ing-1",
    quantity: 1,
    unit: "kg",
    convertedQuantity: 1000,
    totalPrice: 55,
    unitPrice: 0.055,
    purchaseDate: today,
    supplier: "Casa do Chocolate",
    notes: null,
    createdAt: now,
    updatedAt: now,
  },
];

export const demoRecipes: Recipe[] = [
  {
    id: "demo-recipe-1",
    businessId: "demo-business",
    name: "Brownie tradicional",
    description: "Base úmida com chocolate meio amargo.",
    yieldQuantity: 20,
    yieldUnit: "un",
    preparationTimeMinutes: 70,
    notes: "Cortar somente depois de esfriar.",
    createdAt: now,
    updatedAt: now,
  },
];

export const demoRecipeIngredients: RecipeIngredient[] = [
  {
    id: "demo-ri-1",
    businessId: "demo-business",
    recipeId: "demo-recipe-1",
    ingredientId: "demo-ing-1",
    quantity: 300,
    unit: "g",
    convertedQuantity: 300,
    createdAt: now,
    updatedAt: now,
    ingredient: demoIngredients[0],
  },
  {
    id: "demo-ri-2",
    businessId: "demo-business",
    recipeId: "demo-recipe-1",
    ingredientId: "demo-ing-2",
    quantity: 180,
    unit: "g",
    convertedQuantity: 180,
    createdAt: now,
    updatedAt: now,
    ingredient: demoIngredients[1],
  },
];

export const demoProducts: Product[] = [
  {
    id: "demo-product-1",
    businessId: "demo-business",
    recipeId: "demo-recipe-1",
    name: "Brownie unidade",
    description: "Brownie tradicional embalado individualmente.",
    defaultSalePrice: 9,
    active: true,
    createdAt: now,
    updatedAt: now,
  },
];

export const demoOrders: Order[] = [
  {
    id: "demo-order-1",
    businessId: "demo-business",
    customerId: "demo-customer-1",
    orderNumber: "DO-1001",
    deliveryDate: today,
    deliveryTime: "15:30",
    status: "em_producao",
    paymentStatus: "sinal_pago",
    paymentMethod: "pix",
    subtotal: 720,
    discount: 0,
    deliveryFee: 0,
    totalPrice: 720,
    totalCostSnapshot: 285,
    estimatedProfitSnapshot: 435,
    notes: "Retirada no ateliê.",
    createdAt: now,
    updatedAt: now,
  },
];

export const demoOrderItems: OrderItem[] = [
  {
    id: "demo-order-item-1",
    businessId: "demo-business",
    orderId: "demo-order-1",
    productId: "demo-product-1",
    recipeId: "demo-recipe-1",
    name: "Brownie unidade",
    quantity: 80,
    quantityUnit: "un",
    unitPrice: 9,
    totalPrice: 720,
    unitCostSnapshot: 3.56,
    totalCostSnapshot: 285,
    profitSnapshot: 435,
    notes: null,
    createdAt: now,
    updatedAt: now,
  },
];

export const demoPricingSettings: PricingSettings = {
  id: "demo-pricing-settings",
  businessId: "demo-business",
  defaultProfitMarginPercentage: 45,
  defaultLaborCostPerHour: 28,
  defaultEnergyCostPercentage: 6,
  defaultPackagingCost: 2.5,
  cardFeePercentage: 3.49,
  createdAt: now,
  updatedAt: now,
};

export const demoExpenses: BusinessExpense[] = [];

export const demoPaymentSettings: BusinessPaymentSettings = {
  id: "demo-payment-settings",
  businessId: "demo-business",
  pixKey: "contato@casafratoni.com.br",
  pixHolderName: "Casa Fratoni",
  bankName: "Banco exemplo",
  paymentLink: null,
  paymentInstructions: "Envie o comprovante pelo WhatsApp para confirmarmos o pedido.",
  createdAt: now,
  updatedAt: now,
};

export const demoProfitDistributionSettings: ProfitDistributionSettings = {
  id: "demo-profit-distribution-settings",
  businessId: "demo-business",
  partnersPercentage: 30,
  reinvestmentPercentage: 50,
  cashReservePercentage: 20,
  createdAt: now,
  updatedAt: now,
};

function mapCustomer(row: Record<string, unknown>): Customer {
  return {
    id: String(row.id),
    businessId: String(row.business_id),
    name: String(row.name),
    phone: row.phone ? String(row.phone) : null,
    address: row.address ? String(row.address) : null,
    notes: row.notes ? String(row.notes) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapIngredient(row: Record<string, unknown>): Ingredient {
  return {
    id: String(row.id),
    businessId: String(row.business_id),
    name: String(row.name),
    category: row.category ? String(row.category) : null,
    baseUnit: row.base_unit as Unit,
    currentStock: Number(row.current_stock),
    averageCost: Number(row.average_cost),
    minimumStock: Number(row.minimum_stock),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapRecipe(row: Record<string, unknown>): Recipe {
  return {
    id: String(row.id),
    businessId: String(row.business_id),
    name: String(row.name),
    description: row.description ? String(row.description) : null,
    yieldQuantity: Number(row.yield_quantity),
    yieldUnit: row.yield_unit as Unit,
    preparationTimeMinutes: row.preparation_time_minutes ? Number(row.preparation_time_minutes) : null,
    notes: row.notes ? String(row.notes) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapProduct(row: Record<string, unknown>): Product {
  return {
    id: String(row.id),
    businessId: String(row.business_id),
    recipeId: row.recipe_id ? String(row.recipe_id) : null,
    name: String(row.name),
    description: row.description ? String(row.description) : null,
    defaultSalePrice: Number(row.default_sale_price),
    active: Boolean(row.active),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapOrder(row: Record<string, unknown>): Order {
  return {
    id: String(row.id),
    businessId: String(row.business_id),
    customerId: row.customer_id ? String(row.customer_id) : null,
    orderNumber: String(row.order_number),
    deliveryDate: String(row.delivery_date),
    deliveryTime: row.delivery_time ? String(row.delivery_time) : null,
    status: row.status as Order["status"],
    paymentStatus: row.payment_status as Order["paymentStatus"],
    paymentMethod: row.payment_method as Order["paymentMethod"],
    subtotal: Number(row.subtotal),
    discount: Number(row.discount),
    deliveryFee: Number(row.delivery_fee),
    totalPrice: Number(row.total_price),
    totalCostSnapshot: Number(row.total_cost_snapshot),
    estimatedProfitSnapshot: Number(row.estimated_profit_snapshot),
    notes: row.notes ? String(row.notes) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapOrderItem(row: Record<string, unknown>): OrderItem {
  return {
    id: String(row.id),
    businessId: String(row.business_id),
    orderId: String(row.order_id),
    productId: row.product_id ? String(row.product_id) : null,
    recipeId: row.recipe_id ? String(row.recipe_id) : null,
    name: String(row.name),
    quantity: Number(row.quantity),
    quantityUnit: (row.quantity_unit ?? "un") as OrderItem["quantityUnit"],
    unitPrice: Number(row.unit_price),
    totalPrice: Number(row.total_price),
    unitCostSnapshot: Number(row.unit_cost_snapshot),
    totalCostSnapshot: Number(row.total_cost_snapshot),
    profitSnapshot: Number(row.profit_snapshot),
    notes: row.notes ? String(row.notes) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapBusinessExpense(row: Record<string, unknown>): BusinessExpense {
  return {
    id: String(row.id),
    businessId: String(row.business_id),
    description: String(row.description),
    category: String(row.category) as ExpenseCategory,
    amount: Number(row.amount),
    expenseDate: String(row.expense_date),
    notes: row.notes ? String(row.notes) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapBusinessPaymentSettings(row: Record<string, unknown>): BusinessPaymentSettings {
  return {
    id: String(row.id),
    businessId: String(row.business_id),
    pixKey: row.pix_key ? String(row.pix_key) : null,
    pixHolderName: row.pix_holder_name ? String(row.pix_holder_name) : null,
    bankName: row.bank_name ? String(row.bank_name) : null,
    paymentLink: row.payment_link ? String(row.payment_link) : null,
    paymentInstructions: row.payment_instructions ? String(row.payment_instructions) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapProfitDistributionSettings(row: Record<string, unknown>): ProfitDistributionSettings {
  return {
    id: String(row.id),
    businessId: String(row.business_id),
    partnersPercentage: Number(row.partners_percentage),
    reinvestmentPercentage: Number(row.reinvestment_percentage),
    cashReservePercentage: Number(row.cash_reserve_percentage),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function isMissingTableError(error: { code?: string; message?: string }) {
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    /relation .* does not exist/i.test(error.message ?? "") ||
    /could not find the table/i.test(error.message ?? "")
  );
}

export const getCustomers = cache(async function getCustomers() {
  if (!isSupabaseConfigured()) return demoCustomers;
  const businessId = await getBusinessId();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapCustomer);
});

export const getIngredients = cache(async function getIngredients() {
  if (!isSupabaseConfigured()) return demoIngredients;
  const businessId = await getBusinessId();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ingredients")
    .select("*")
    .eq("business_id", businessId)
    .order("name");
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapIngredient);
});

export const getIngredientPurchases = cache(async function getIngredientPurchases() {
  if (!isSupabaseConfigured()) return demoPurchases;
  const businessId = await getBusinessId();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ingredient_purchases")
    .select("*")
    .eq("business_id", businessId)
    .order("purchase_date", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: String(row.id),
    businessId: String(row.business_id),
    ingredientId: String(row.ingredient_id),
    quantity: Number(row.quantity),
    unit: row.unit as Unit,
    convertedQuantity: Number(row.converted_quantity),
    totalPrice: Number(row.total_price),
    unitPrice: Number(row.unit_price),
    purchaseDate: String(row.purchase_date),
    supplier: row.supplier ? String(row.supplier) : null,
    notes: row.notes ? String(row.notes) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }));
});

export const getRecipes = cache(async function getRecipes() {
  if (!isSupabaseConfigured()) return demoRecipes;
  const businessId = await getBusinessId();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recipes")
    .select("*")
    .eq("business_id", businessId)
    .order("name");
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapRecipe);
});

export const getRecipeIngredients = cache(async function getRecipeIngredients() {
  if (!isSupabaseConfigured()) return demoRecipeIngredients;
  const [businessId, ingredients] = await Promise.all([getBusinessId(), getIngredients()]);
  const ingredientMap = new Map(ingredients.map((ingredient) => [ingredient.id, ingredient]));
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recipe_ingredients")
    .select("*")
    .eq("business_id", businessId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: String(row.id),
    businessId: String(row.business_id),
    recipeId: String(row.recipe_id),
    ingredientId: String(row.ingredient_id),
    quantity: Number(row.quantity),
    unit: row.unit as Unit,
    convertedQuantity: Number(row.converted_quantity),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    ingredient: ingredientMap.get(String(row.ingredient_id)),
  }));
});

export const getProducts = cache(async function getProducts() {
  if (!isSupabaseConfigured()) return demoProducts;
  const businessId = await getBusinessId();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("business_id", businessId)
    .order("name");
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapProduct);
});

export const getOrders = cache(async function getOrders() {
  if (!isSupabaseConfigured()) return demoOrders;
  const businessId = await getBusinessId();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("business_id", businessId)
    .order("delivery_date", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapOrder);
});

export const getOrderItems = cache(async function getOrderItems() {
  if (!isSupabaseConfigured()) return demoOrderItems;
  const businessId = await getBusinessId();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("order_items")
    .select("*")
    .eq("business_id", businessId);
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapOrderItem);
});

export const getBusinessExpenses = cache(async function getBusinessExpenses() {
  if (!isSupabaseConfigured()) return demoExpenses;
  const businessId = await getBusinessId();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("business_expenses")
    .select("*")
    .eq("business_id", businessId)
    .order("expense_date", { ascending: false });
  if (error) {
    if (isMissingTableError(error)) return [];
    throw new Error(error.message);
  }
  return (data ?? []).map(mapBusinessExpense);
});

export const getBusinessPaymentSettings = cache(async function getBusinessPaymentSettings() {
  if (!isSupabaseConfigured()) return demoPaymentSettings;
  const businessId = await getBusinessId();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("business_payment_settings")
    .select("*")
    .eq("business_id", businessId)
    .maybeSingle();
  if (error) {
    if (isMissingTableError(error)) return null;
    throw new Error(error.message);
  }
  return data ? mapBusinessPaymentSettings(data) : null;
});

export const getProfitDistributionSettings = cache(async function getProfitDistributionSettings() {
  if (!isSupabaseConfigured()) return demoProfitDistributionSettings;
  const businessId = await getBusinessId();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profit_distribution_settings")
    .select("*")
    .eq("business_id", businessId)
    .maybeSingle();
  if (error) {
    if (isMissingTableError(error)) return null;
    throw new Error(error.message);
  }
  return data ? mapProfitDistributionSettings(data) : null;
});

export const managementPeriods = [
  "hoje",
  "esta-semana",
  "este-mes",
  "mes-anterior",
  "personalizado",
] as const;

export type ManagementPeriod = (typeof managementPeriods)[number];

export type ManagementFilters = {
  periodo?: string;
  inicio?: string;
  fim?: string;
};

function toBrazilDateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function dateFromKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12));
}

function addDays(value: string, days: number) {
  const date = dateFromKey(value);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function startOfWeek(value: string) {
  const date = dateFromKey(value);
  const day = date.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + diff);
  return date.toISOString().slice(0, 10);
}

function startOfMonth(value: string) {
  return `${value.slice(0, 7)}-01`;
}

function previousMonthRange(value: string) {
  const currentStart = dateFromKey(startOfMonth(value));
  currentStart.setUTCMonth(currentStart.getUTCMonth() - 1);
  const startDate = currentStart.toISOString().slice(0, 10);
  const endDate = addDays(startOfMonth(value), -1);
  return { startDate, endDate };
}

function normalizeManagementPeriod(value?: string): ManagementPeriod {
  return managementPeriods.includes(value as ManagementPeriod)
    ? (value as ManagementPeriod)
    : "este-mes";
}

function normalizeManagementDate(value?: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value ?? "") ? value : "";
}

function getPeriodRange(filters: ManagementFilters) {
  const period = normalizeManagementPeriod(filters.periodo);
  const todayKey = toBrazilDateKey(new Date());

  if (period === "hoje") {
    return { period, startDate: todayKey, endDate: todayKey };
  }

  if (period === "esta-semana") {
    const startDate = startOfWeek(todayKey);
    return { period, startDate, endDate: addDays(startDate, 6) };
  }

  if (period === "mes-anterior") {
    return { period, ...previousMonthRange(todayKey) };
  }

  if (period === "personalizado") {
    const fallbackStart = startOfMonth(todayKey);
    return {
      period,
      startDate: normalizeManagementDate(filters.inicio) || fallbackStart,
      endDate: normalizeManagementDate(filters.fim) || todayKey,
    };
  }

  return {
    period,
    startDate: startOfMonth(todayKey),
    endDate: addDays(startOfMonth(addDays(startOfMonth(todayKey), 32)), -1),
  };
}

function isFinancialOrder(order: Order) {
  return (
    order.status !== "cancelado" &&
    order.paymentStatus !== "cancelado"
  );
}

function buildChartPoints(orders: Order[], expenses: BusinessExpense[], startDate: string, endDate: string) {
  const dates: string[] = [];
  for (let cursor = startDate; cursor <= endDate; cursor = addDays(cursor, 1)) {
    dates.push(cursor);
    if (dates.length > 370) break;
  }

  const useMonthly = dates.length > 62;
  const keys = useMonthly
    ? Array.from(new Set(dates.map((date) => date.slice(0, 7))))
    : dates;

  return keys.map((key) => {
    const ordersInPeriod = orders.filter((order) =>
      useMonthly ? order.deliveryDate.slice(0, 7) === key : order.deliveryDate === key,
    );
    const expensesInPeriod = expenses.filter((expense) =>
      useMonthly ? expense.expenseDate.slice(0, 7) === key : expense.expenseDate === key,
    );
    const revenue = ordersInPeriod.reduce((sum, order) => sum + order.totalPrice, 0);
    const costs = ordersInPeriod.reduce((sum, order) => sum + order.totalCostSnapshot, 0);
    const expenseTotal = expensesInPeriod.reduce((sum, expense) => sum + expense.amount, 0);

    return {
      label: useMonthly ? key.split("-").reverse().join("/") : key.slice(5).split("-").reverse().join("/"),
      revenue,
      grossProfit: revenue - costs,
      netProfit: revenue - costs - expenseTotal,
    };
  });
}

export const getManagementData = cache(async function getManagementData(filters: ManagementFilters = {}) {
  const [orders, expenses, distributionSettings] = await Promise.all([
    getOrders(),
    getBusinessExpenses(),
    getProfitDistributionSettings(),
  ]);
  const range = getPeriodRange(filters);
  const startDate = range.startDate <= range.endDate ? range.startDate : range.endDate;
  const endDate = range.endDate >= range.startDate ? range.endDate : range.startDate;

  const periodOrders = orders
    .filter(isFinancialOrder)
    .filter((order) => order.deliveryDate >= startDate && order.deliveryDate <= endDate);
  const periodExpenses = expenses.filter(
    (expense) => expense.expenseDate >= startDate && expense.expenseDate <= endDate,
  );

  const revenue = periodOrders.reduce((sum, order) => sum + order.totalPrice, 0);
  const costs = periodOrders.reduce((sum, order) => sum + order.totalCostSnapshot, 0);
  const expenseTotal = periodExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const grossProfit = revenue - costs;
  const netProfit = grossProfit - expenseTotal;

  return {
    filters: {
      period: range.period,
      startDate,
      endDate,
    },
    expenses,
    periodExpenses,
    distributionSettings: distributionSettings ?? demoProfitDistributionSettings,
    chartPoints: buildChartPoints(periodOrders, periodExpenses, startDate, endDate),
    summary: {
      revenue,
      orderCount: periodOrders.length,
      averageTicket: periodOrders.length > 0 ? revenue / periodOrders.length : 0,
      costs,
      expenses: expenseTotal,
      grossProfit,
      netProfit,
    },
  };
});

const productionStatusFilters = [
  "todos",
  "novo",
  "confirmado",
  "em_producao",
  "pronto",
  "entregue",
  "cancelado",
] as const;

export type ProductionStatusFilter = (typeof productionStatusFilters)[number];

export type ProductionFilters = {
  status?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
};

function normalizeProductionStatus(status?: string): ProductionStatusFilter {
  return productionStatusFilters.includes(status as ProductionStatusFilter)
    ? (status as ProductionStatusFilter)
    : "todos";
}

function normalizeProductionDate(value?: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value ?? "") ? value : "";
}

function normalizeProductionPage(value?: number) {
  return Number.isFinite(value) && value && value > 0 ? Math.floor(value) : 1;
}

export const getDashboardData = cache(async function getDashboardData() {
  const [customers, ingredients, recipes, recipeIngredients, products, orders, orderItems] =
    await Promise.all([
      getCustomers(),
      getIngredients(),
      getRecipes(),
      getRecipeIngredients(),
      getProducts(),
      getOrders(),
      getOrderItems(),
    ]);

  const todayOrders = orders.filter((order) => order.deliveryDate === today);
  const monthOrders = orders.filter((order) => order.deliveryDate.slice(0, 7) === currentMonth);
  const billableMonthOrders = monthOrders.filter((order) => order.status !== "cancelado");
  const monthRevenue = billableMonthOrders.reduce((total, order) => total + order.totalPrice, 0);
  const monthProfit = billableMonthOrders.reduce(
    (total, order) => total + order.estimatedProfitSnapshot,
    0,
  );
  const lowStockIngredients = ingredients.filter(
    (ingredient) => ingredient.currentStock <= ingredient.minimumStock,
  );
  const recipeCosts = recipes.map((recipe) => {
    const items = recipeIngredients.filter((item) => item.recipeId === recipe.id && item.ingredient);
    const cost = calculateRecipeCost(items as Required<RecipeIngredient>[]);
    return {
      recipe,
      totalCost: cost.totalCost,
      unitCost: calculateRecipeCostPerYield(cost.totalCost, recipe.yieldQuantity),
      hasMissingPrices: cost.hasMissingPrices,
    };
  });

  return {
    customers,
    ingredients,
    recipes,
    recipeIngredients,
    products,
    orders,
    orderItems,
    todayOrders,
    monthOrders,
    monthRevenue,
    monthProfit,
    lowStockIngredients,
    recipeCosts,
  };
});

export const getProductionData = cache(async function getProductionData(filters: ProductionFilters = {}) {
  const [orders, orderItems] = await Promise.all([getOrders(), getOrderItems()]);
  const status = normalizeProductionStatus(filters.status);
  const startDate = normalizeProductionDate(filters.startDate);
  const endDate = normalizeProductionDate(filters.endDate);
  const pageSize = filters.pageSize && filters.pageSize > 0 ? Math.floor(filters.pageSize) : 10;

  const filteredOrders = orders
    .filter((order) => {
      const matchesStatus = status === "todos" || order.status === (status as OrderStatus);
      const matchesStart = !startDate || order.deliveryDate >= startDate;
      const matchesEnd = !endDate || order.deliveryDate <= endDate;

      return matchesStatus && matchesStart && matchesEnd;
    })
    .sort((a, b) => {
      const dateCompare = b.deliveryDate.localeCompare(a.deliveryDate);
      return dateCompare === 0 ? b.createdAt.localeCompare(a.createdAt) : dateCompare;
    });

  const totalOrders = filteredOrders.length;
  const totalPages = Math.max(1, Math.ceil(totalOrders / pageSize));
  const page = Math.min(normalizeProductionPage(filters.page), totalPages);
  const pageOrders = filteredOrders.slice((page - 1) * pageSize, page * pageSize);
  const pageOrderIds = new Set(pageOrders.map((order) => order.id));

  return {
    orders: pageOrders,
    orderItems: orderItems.filter((item) => pageOrderIds.has(item.orderId)),
    filters: {
      status,
      startDate,
      endDate,
    },
    pagination: {
      page,
      pageSize,
      totalOrders,
      totalPages,
      hasPreviousPage: page > 1,
      hasNextPage: page < totalPages,
    },
    summary: {
      allOrders: orders.length,
      filteredOrders: totalOrders,
      openOrders: orders.filter((order) => !["entregue", "cancelado"].includes(order.status)).length,
      totalRevenue: filteredOrders
        .filter((order) => order.status !== "cancelado")
        .reduce((sum, order) => sum + order.totalPrice, 0),
    },
  };
});
