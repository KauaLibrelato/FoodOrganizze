export type Unit = "g" | "kg" | "ml" | "l" | "un";

export type OrderStatus =
  | "novo"
  | "confirmado"
  | "em_producao"
  | "pronto"
  | "entregue"
  | "cancelado";

export type PaymentStatus = "pendente" | "sinal_pago" | "pago" | "atrasado" | "cancelado";

export type PaymentMethod = "dinheiro" | "pix" | "credito" | "debito" | "transferencia" | "outro";

export type ExpenseCategory =
  | "Ingredientes"
  | "Embalagens"
  | "Entregas"
  | "Marketing"
  | "Energia"
  | "Água"
  | "Aluguel"
  | "Equipamentos"
  | "Manutenção"
  | "Pró-labore"
  | "Outros";

export type Business = {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
};

export type Profile = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
};

export type Customer = {
  id: string;
  businessId: string;
  name: string;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Ingredient = {
  id: string;
  businessId: string;
  name: string;
  category?: string | null;
  baseUnit: Unit;
  currentStock: number;
  averageCost: number;
  minimumStock: number;
  createdAt: string;
  updatedAt: string;
};

export type IngredientPurchase = {
  id: string;
  businessId: string;
  ingredientId: string;
  quantity: number;
  unit: Unit;
  convertedQuantity: number;
  totalPrice: number;
  unitPrice: number;
  purchaseDate: string;
  supplier?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Recipe = {
  id: string;
  businessId: string;
  name: string;
  description?: string | null;
  yieldQuantity: number;
  yieldUnit: Unit;
  preparationTimeMinutes?: number | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RecipeIngredient = {
  id: string;
  businessId: string;
  recipeId: string;
  ingredientId: string;
  quantity: number;
  unit: Unit;
  convertedQuantity: number;
  createdAt: string;
  updatedAt: string;
  ingredient?: Ingredient;
};

export type Product = {
  id: string;
  businessId: string;
  recipeId?: string | null;
  name: string;
  description?: string | null;
  defaultSalePrice: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Order = {
  id: string;
  businessId: string;
  customerId?: string | null;
  orderNumber: string;
  deliveryDate: string;
  deliveryTime?: string | null;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod | null;
  subtotal: number;
  discount: number;
  deliveryFee: number;
  totalPrice: number;
  totalCostSnapshot: number;
  estimatedProfitSnapshot: number;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type OrderItem = {
  id: string;
  businessId: string;
  orderId: string;
  productId?: string | null;
  recipeId?: string | null;
  name: string;
  quantity: number;
  quantityUnit: Unit;
  unitPrice: number;
  totalPrice: number;
  unitCostSnapshot: number;
  totalCostSnapshot: number;
  profitSnapshot: number;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BusinessExpense = {
  id: string;
  businessId: string;
  description: string;
  category: ExpenseCategory;
  amount: number;
  expenseDate: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProfitDistributionSettings = {
  id: string;
  businessId: string;
  partnersPercentage: number;
  reinvestmentPercentage: number;
  cashReservePercentage: number;
  createdAt: string;
  updatedAt: string;
};

export type PricingSettings = {
  id: string;
  businessId: string;
  defaultProfitMarginPercentage: number;
  defaultLaborCostPerHour: number;
  defaultEnergyCostPercentage: number;
  defaultPackagingCost: number;
  cardFeePercentage: number;
  createdAt: string;
  updatedAt: string;
};
