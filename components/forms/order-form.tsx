"use client";

import { useMemo, useState } from "react";
import { Banknote, Plus, Trash2 } from "lucide-react";
import type { Customer, Order, OrderItem, Product, Recipe, Unit } from "@/types";
import { ToastSubmitButton } from "@/components/forms/confirm-action-button";
import { CurrencyInput } from "@/components/forms/currency-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/calculations";

type OrderFormAction = (formData: FormData) => void | Promise<void>;

type EditableOrderItem = {
  key: string;
  productId: string;
  recipeId: string;
  quantity: string;
  quantityUnit: Unit;
  unitPrice: string;
  unitCostSnapshot: string;
  notes: string;
};

type RecipeCostInfo = {
  unitCost: number;
  totalCost: number;
  yieldQuantity: number;
  yieldUnit: Unit;
  hasMissingPrices: boolean;
};

type OrderFormProps = {
  action: OrderFormAction;
  customers: Customer[];
  products: Product[];
  recipes: Recipe[];
  recipeCosts: Record<string, RecipeCostInfo>;
  submitLabel: string;
  order?: Order;
  items?: OrderItem[];
};

const unitOptions: Array<{ value: Unit; label: string }> = [
  { value: "un", label: "un" },
  { value: "g", label: "g" },
  { value: "kg", label: "kg" },
  { value: "ml", label: "ml" },
  { value: "l", label: "l" },
];

const selectClassName = "h-11 w-full rounded-xl border border-input bg-card px-3 text-sm text-cocoa-800";
const textareaClassName =
  "min-h-20 w-full rounded-xl border border-input bg-card px-3 py-2 text-sm text-cocoa-800 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function formatNumberInput(value: number) {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 3,
  });
}

function parseNumberInput(value: string) {
  const input = value.trim().replace(/[R$\s]/g, "");
  const raw = input.includes(",") ? input.replace(/\./g, "").replace(",", ".") : input;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getDefaultCost(product: Product | undefined, recipeId: string | undefined, recipeCosts: Record<string, RecipeCostInfo>) {
  const linkedRecipeId = recipeId || product?.recipeId || "";
  return linkedRecipeId ? recipeCosts[linkedRecipeId]?.unitCost ?? 0 : 0;
}

function getRecipeUnit(recipe: Recipe | undefined): Unit {
  return recipe?.yieldUnit ?? "un";
}

function getDefaultUnitPrice(product: Product | undefined, recipe: Recipe | undefined) {
  if (!product) {
    return 0;
  }

  if (recipe && recipe.yieldUnit !== "un" && recipe.yieldQuantity > 0) {
    return product.defaultSalePrice / recipe.yieldQuantity;
  }

  return product.defaultSalePrice;
}

function createBlankItem(products: Product[], recipes: Recipe[], recipeCosts: Record<string, RecipeCostInfo>): EditableOrderItem {
  const product = products[0];
  const recipe = product?.recipeId ? recipes.find((item) => item.id === product.recipeId) : undefined;
  const defaultCost = getDefaultCost(product, product?.recipeId ?? "", recipeCosts);
  const unitPrice = getDefaultUnitPrice(product, recipe);

  return {
    key: crypto.randomUUID(),
    productId: product?.id ?? "",
    recipeId: product?.recipeId ?? "",
    quantity: "1",
    quantityUnit: getRecipeUnit(recipe),
    unitPrice: unitPrice > 0 ? formatNumberInput(unitPrice) : "",
    unitCostSnapshot: defaultCost > 0 ? formatNumberInput(defaultCost) : "",
    notes: "",
  };
}

function toEditableItem(item: OrderItem): EditableOrderItem {
  return {
    key: item.id,
    productId: item.productId ?? "",
    recipeId: item.recipeId ?? "",
    quantity: formatNumberInput(item.quantity),
    quantityUnit: item.quantityUnit ?? "un",
    unitPrice: formatNumberInput(item.unitPrice),
    unitCostSnapshot: formatNumberInput(item.unitCostSnapshot),
    notes: item.notes ?? "",
  };
}

export function OrderForm({ action, customers, products, recipes, recipeCosts, submitLabel, order, items = [] }: OrderFormProps) {
  const [orderItems, setOrderItems] = useState<EditableOrderItem[]>(
    items.length > 0 ? items.map(toEditableItem) : [createBlankItem(products, recipes, recipeCosts)],
  );
  const [discountType, setDiscountType] = useState<"amount" | "percentage">("amount");
  const [discount, setDiscount] = useState(order ? formatNumberInput(order.discount) : "0");
  const [deliveryFee, setDeliveryFee] = useState(order ? formatNumberInput(order.deliveryFee) : "0");

  const productById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);
  const recipeById = useMemo(() => new Map(recipes.map((recipe) => [recipe.id, recipe])), [recipes]);

  function updateItem(key: string, patch: Partial<EditableOrderItem>) {
    setOrderItems((current) => current.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  }

  function updateProduct(key: string, productId: string) {
    const product = productById.get(productId);
    const recipe = product?.recipeId ? recipeById.get(product.recipeId) : undefined;
    const defaultCost = getDefaultCost(product, product?.recipeId ?? "", recipeCosts);
    const unitPrice = getDefaultUnitPrice(product, recipe);
    updateItem(key, {
      productId,
      recipeId: product?.recipeId ?? "",
      quantityUnit: getRecipeUnit(recipe),
      unitPrice: unitPrice > 0 ? formatNumberInput(unitPrice) : "",
      unitCostSnapshot: defaultCost > 0 ? formatNumberInput(defaultCost) : "",
    });
  }

  function updateRecipe(key: string, recipeId: string) {
    const recipe = recipeById.get(recipeId);
    const defaultCost = getDefaultCost(undefined, recipeId, recipeCosts);
    updateItem(key, {
      recipeId,
      quantityUnit: getRecipeUnit(recipe),
      unitCostSnapshot: defaultCost > 0 ? formatNumberInput(defaultCost) : "",
    });
  }

  function addItem() {
    setOrderItems((current) => [...current, createBlankItem(products, recipes, recipeCosts)]);
  }

  function removeItem(key: string) {
    setOrderItems((current) => (current.length === 1 ? current : current.filter((item) => item.key !== key)));
  }

  const itemSummaries = orderItems.map((item) => {
    const quantity = parseNumberInput(item.quantity);
    const unitPrice = parseNumberInput(item.unitPrice);
    const unitCost = parseNumberInput(item.unitCostSnapshot);
    const product = item.productId ? productById.get(item.productId) : undefined;
    const linkedRecipeId = item.recipeId || product?.recipeId || "";
    const recipeCost = linkedRecipeId ? recipeCosts[linkedRecipeId] : undefined;
    return {
      ...item,
      quantity,
      unitPrice,
      unitCost,
      recipeCost,
      totalPrice: quantity * unitPrice,
      totalCost: quantity * unitCost,
    };
  });

  const subtotal = itemSummaries.reduce((sum, item) => sum + item.totalPrice, 0);
  const totalCost = itemSummaries.reduce((sum, item) => sum + item.totalCost, 0);
  const discountInput = parseNumberInput(discount);
  const discountAmount =
    discountType === "percentage" ? Math.min(subtotal, Math.max(0, subtotal * (discountInput / 100))) : Math.max(0, discountInput);
  const totalPrice = Math.max(0, subtotal + parseNumberInput(deliveryFee) - discountAmount);
  const profit = totalPrice - totalCost;
  const hasInvalidItems = itemSummaries.some(
    (item) => (!item.productId && !item.recipeId) || item.quantity <= 0 || item.unitPrice < 0 || item.unitCost < 0,
  );
  const hasMissingCosts = itemSummaries.some((item) => (item.productId || item.recipeId) && item.unitCost <= 0);

  const payload = JSON.stringify(
    orderItems.map((item) => ({
      productId: item.productId || null,
      recipeId: item.recipeId || null,
      quantity: item.quantity,
      quantityUnit: item.quantityUnit,
      unitPrice: item.unitPrice,
      unitCostSnapshot: item.unitCostSnapshot,
      notes: item.notes,
    })),
  );

  return (
    <form action={action} className="space-y-4">
      {order ? <input type="hidden" name="order_id" value={order.id} /> : null}
      <input type="hidden" name="order_items" value={payload} />
      <input type="hidden" name="discount" value={formatNumberInput(discountAmount)} />

      <div className="space-y-2">
        <Label htmlFor={`${order?.id ?? "new"}_customer_id`}>Cliente</Label>
        <select
          id={`${order?.id ?? "new"}_customer_id`}
          name="customer_id"
          className={selectClassName}
          defaultValue={order?.customerId ?? ""}
        >
          <option value="">Sem cliente</option>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`${order?.id ?? "new"}_delivery_date`}>Data de entrega</Label>
          <Input
            id={`${order?.id ?? "new"}_delivery_date`}
            name="delivery_date"
            required
            type="date"
            defaultValue={order?.deliveryDate ?? new Date().toISOString().slice(0, 10)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${order?.id ?? "new"}_delivery_time`}>Horario</Label>
          <Input
            id={`${order?.id ?? "new"}_delivery_time`}
            name="delivery_time"
            type="time"
            placeholder="15:30"
            defaultValue={order?.deliveryTime ?? ""}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`${order?.id ?? "new"}_status`}>Status</Label>
          <select id={`${order?.id ?? "new"}_status`} name="status" className={selectClassName} defaultValue={order?.status ?? "novo"}>
            <option value="novo">Novo</option>
            <option value="confirmado">Confirmado</option>
            <option value="em_producao">Em producao</option>
            <option value="pronto">Pronto</option>
            <option value="entregue">Entregue</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${order?.id ?? "new"}_payment_status`}>Pagamento</Label>
          <select
            id={`${order?.id ?? "new"}_payment_status`}
            name="payment_status"
            className={selectClassName}
            defaultValue={order?.paymentStatus ?? "pendente"}
          >
            <option value="pendente">Pendente</option>
            <option value="pago">Pago</option>
            <option value="cancelado">Cancelado</option>
            <option value="atrasado">Atrasado</option>
          </select>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-cocoa-800">Produtos e receitas</h3>
            <p className="text-xs text-cocoa-500">Adicione quantas linhas precisar para o mesmo pedido.</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addItem}>
            <Plus className="h-4 w-4" />
            Adicionar
          </Button>
        </div>

        <div className="space-y-3">
          {orderItems.map((item, index) => (
            <div key={item.key} className="rounded-xl border border-cream-300 bg-cream-50 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cocoa-400">Linha {index + 1}</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                  onClick={() => removeItem(item.key)}
                  disabled={orderItems.length === 1}
                  aria-label="Remover linha"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Produto</Label>
                  <select className={selectClassName} value={item.productId} onChange={(event) => updateProduct(item.key, event.target.value)}>
                    <option value="">Sem produto</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Receita</Label>
                  <select
                    className={selectClassName}
                    value={item.recipeId}
                    onChange={(event) => updateRecipe(item.key, event.target.value)}
                  >
                    <option value="">Sem receita</option>
                    {recipes.map((recipe) => (
                      <option key={recipe.id} value={recipe.id}>
                        {recipe.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_0.8fr_1fr_1fr]">
                <div className="space-y-2">
                  <Label>Qtd.</Label>
                  <Input
                    required
                    inputMode="decimal"
                    value={item.quantity}
                    placeholder="1"
                    onChange={(event) => updateItem(item.key, { quantity: event.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Unidade</Label>
                  <select
                    className={selectClassName}
                    value={item.quantityUnit}
                    onChange={(event) => updateItem(item.key, { quantityUnit: event.target.value as Unit })}
                  >
                    {unitOptions.map((unit) => (
                      <option key={unit.value} value={unit.value}>
                        {unit.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="rounded-xl border border-cream-300 bg-card px-4 py-3 text-sm sm:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cocoa-400">Valor da linha</p>
                  <p className="mt-1 font-semibold text-cocoa-800">{formatCurrency(itemSummaries[index]?.totalPrice ?? 0)}</p>
                  <p className="mt-1 text-xs text-cocoa-500">
                    {parseNumberInput(item.unitPrice) > 0
                      ? `${formatCurrency(parseNumberInput(item.unitPrice))} por ${item.quantityUnit}`
                      : "Defina um valor nos ajustes se este item nao tiver produto com preco."}
                  </p>
                  {item.quantityUnit !== "un" ? (
                    <p className="mt-1 text-xs text-cocoa-400">
                      Use decimal para tamanhos personalizados, como 1,5 {item.quantityUnit}.
                    </p>
                  ) : null}
                  {itemSummaries[index]?.unitCost <= 0 ? (
                    <p className="mt-2 rounded-lg bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800">
                      Custo zerado. Confira se a receita tem ingredientes com compras/custo medio.
                    </p>
                  ) : null}
                  {itemSummaries[index]?.recipeCost ? (
                    <p className="mt-2 rounded-lg bg-cream-100 px-2 py-1 text-xs leading-5 text-cocoa-500">
                      Custo calculado: {formatCurrency(itemSummaries[index].recipeCost.unitCost)} por{" "}
                      {itemSummaries[index].recipeCost.yieldUnit}. Receita rende{" "}
                      {itemSummaries[index].recipeCost.yieldQuantity.toLocaleString("pt-BR")}{" "}
                      {itemSummaries[index].recipeCost.yieldUnit} e custa{" "}
                      {formatCurrency(itemSummaries[index].recipeCost.totalCost)}.
                    </p>
                  ) : null}
                  {itemSummaries[index]?.recipeCost?.hasMissingPrices ? (
                    <p className="mt-2 rounded-lg bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800">
                      Tem insumo sem custo medio nessa receita. O custo pode estar abaixo do real.
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="mt-3 grid gap-3">
                <div className="space-y-2">
                  <Label>Observacao da linha</Label>
                  <Input
                    value={item.notes}
                    placeholder="Ex.: sem recheio"
                    onChange={(event) => updateItem(item.key, { notes: event.target.value })}
                  />
                </div>
                <details className="rounded-xl border border-cream-300 bg-card p-3">
                  <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-cocoa-700">
                    <Banknote className="h-4 w-4" />
                    Ajustes de valores
                  </summary>
                  <div className="mt-3 grid gap-3 border-t border-cream-300 pt-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Valor unitario</Label>
                      <CurrencyInput
                        required
                        value={item.unitPrice}
                        placeholder="9,00"
                        onChange={(event) => updateItem(item.key, { unitPrice: event.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Custo unitario</Label>
                      <CurrencyInput
                        value={item.unitCostSnapshot}
                        placeholder="3,50"
                        onChange={(event) => updateItem(item.key, { unitCostSnapshot: event.target.value })}
                      />
                    </div>
                    <p className="text-xs leading-5 text-cocoa-500 sm:col-span-2">
                      O valor vem do produto cadastrado. O custo vem da receita vinculada, quando houver ingredientes com custo medio.
                    </p>
                  </div>
                </details>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-cream-300 bg-cream-50 p-3">
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-cocoa-800">Ajustes do pedido</h3>
          <p className="text-xs text-cocoa-500">Use desconto quando precisar fechar um combinado diferente.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-[0.8fr_1fr_1fr]">
          <div className="space-y-2">
            <Label htmlFor={`${order?.id ?? "new"}_discount_type`}>Tipo</Label>
            <select
              id={`${order?.id ?? "new"}_discount_type`}
              className={selectClassName}
              value={discountType}
              onChange={(event) => setDiscountType(event.target.value as "amount" | "percentage")}
            >
              <option value="amount">Desconto em R$</option>
              <option value="percentage">Desconto em %</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${order?.id ?? "new"}_discount`}>Desconto</Label>
            {discountType === "amount" ? (
              <CurrencyInput
                id={`${order?.id ?? "new"}_discount`}
                value={discount}
                placeholder="0,00"
                onChange={(event) => setDiscount(event.target.value)}
              />
            ) : (
              <Input
                id={`${order?.id ?? "new"}_discount`}
                value={discount}
                inputMode="decimal"
                placeholder="10"
                onChange={(event) => setDiscount(event.target.value)}
              />
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${order?.id ?? "new"}_delivery_fee`}>Entrega</Label>
            <CurrencyInput
              id={`${order?.id ?? "new"}_delivery_fee`}
              name="delivery_fee"
              value={deliveryFee}
              placeholder="0,00"
              onChange={(event) => setDeliveryFee(event.target.value)}
            />
          </div>
        </div>
        <div className="mt-3 rounded-xl border border-cream-300 bg-card px-3 py-2 text-sm text-cocoa-600">
          Desconto aplicado: <span className="font-semibold text-cocoa-800">{formatCurrency(discountAmount)}</span>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${order?.id ?? "new"}_notes`}>Observacoes do pedido</Label>
        <textarea
          id={`${order?.id ?? "new"}_notes`}
          name="notes"
          className={textareaClassName}
          placeholder="Ex.: retirada no atelie"
          defaultValue={order?.notes ?? ""}
        />
      </div>

      <div className="rounded-xl border border-blush-200 bg-blush-50 p-4">
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <SummaryLine label="Subtotal" value={subtotal} />
          <SummaryLine label="Desconto" value={discountAmount} />
          <SummaryLine label="Entrega" value={parseNumberInput(deliveryFee)} />
          <SummaryLine label="Custo estimado" value={totalCost} />
          <SummaryLine label="Total do pedido" value={totalPrice} strong />
          <SummaryLine label="Lucro estimado" value={profit} strong />
        </div>
        {hasInvalidItems ? (
          <p className="mt-3 text-sm font-medium text-rose-700">Revise as linhas: cada uma precisa ter produto ou receita e quantidade valida.</p>
        ) : null}
        {hasMissingCosts ? (
          <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
            Existe item com custo zerado. O pedido pode ser salvo, mas o lucro fica alto demais ate a receita ter custo medio nos ingredientes.
          </p>
        ) : null}
      </div>

      <ToastSubmitButton
        className="w-full"
        disabled={hasInvalidItems}
        successTitle={order ? "Pedido atualizado" : "Pedido cadastrado"}
        successDescription="Resumo, custos e lucro foram recalculados."
      >
        {submitLabel}
      </ToastSubmitButton>
    </form>
  );
}

function SummaryLine({ label, value, strong = false }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className="rounded-xl border border-cream-300 bg-card px-3 py-2">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cocoa-400">{label}</p>
      <p className={strong ? "mt-1 text-lg font-semibold text-brand-700" : "mt-1 font-semibold text-cocoa-800"}>
        {formatCurrency(value)}
      </p>
    </div>
  );
}
