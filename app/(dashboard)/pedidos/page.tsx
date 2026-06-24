import Link from "next/link";
import { ClipboardList, Eye, Pencil, Search, Trash2 } from "lucide-react";
import { createOrderAction, deleteOrderAction, updateOrderAction } from "@/app/actions";
import { PageTitle } from "@/components/dashboard/page-title";
import { SectionCard } from "@/components/cards/section-card";
import { EmptyState } from "@/components/dashboard/empty-state";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/dashboard/status-badge";
import { ConfirmActionButton } from "@/components/forms/confirm-action-button";
import { OrderForm } from "@/components/forms/order-form";
import { Input } from "@/components/ui/input";
import { calculateRecipeCost, calculateRecipeCostPerYield, formatCurrency, formatDateTime, formatOrderLabel } from "@/lib/calculations";
import { getCustomers, getOrderItems, getOrders, getProducts, getRecipeIngredients, getRecipes } from "@/lib/data";
import type { RecipeIngredient } from "@/types";

export default async function OrdersPage() {
  const [orders, orderItems, customers, products, recipes, recipeIngredients] = await Promise.all([
    getOrders(),
    getOrderItems(),
    getCustomers(),
    getProducts(),
    getRecipes(),
    getRecipeIngredients(),
  ]);
  const recipeCosts = Object.fromEntries(
    recipes.map((recipe) => {
      const items = recipeIngredients.filter((item) => item.recipeId === recipe.id && item.ingredient);
      const cost = calculateRecipeCost(items as Required<RecipeIngredient>[]);
      return [
        recipe.id,
        {
          unitCost: calculateRecipeCostPerYield(cost.totalCost, recipe.yieldQuantity),
          totalCost: cost.totalCost,
          yieldQuantity: recipe.yieldQuantity,
          yieldUnit: recipe.yieldUnit,
          hasMissingPrices: cost.hasMissingPrices,
        },
      ];
    }),
  );

  return (
    <div className="space-y-6">
      <PageTitle
        title="Pedidos"
        description="Acompanhe encomendas, pagamentos, custos salvos e lucro estimado."
      />
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar por cliente, produto ou número" />
        </div>
        <a
          href="#novo-pedido"
          className="brand-focus inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-brand-600 xl:hidden"
        >
          Novo pedido
        </a>
      </div>
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_430px]">
        <SectionCard title="Pedidos cadastrados" description="Veja o resumo, edite dados e acompanhe os itens de cada pedido.">
          {orders.length === 0 ? (
            <EmptyState
              title="Nenhum pedido cadastrado"
              description="Cadastre o primeiro pedido para acompanhar entrega, pagamento e lucro."
              icon={<ClipboardList className="h-9 w-9" />}
            />
          ) : (
          <div className="space-y-3">
            {orders.map((order) => {
              const customer = customers.find((item) => item.id === order.customerId);
              const items = orderItems.filter((item) => item.orderId === order.id);
              return (
                <article key={order.id} className="rounded-xl border border-cream-300 bg-card p-4 shadow-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cocoa-400">{formatOrderLabel(order.orderNumber)}</p>
                      <h2 className="mt-1 font-semibold text-cocoa-800">{customer?.name ?? "Cliente não informado"}</h2>
                      <div className="mt-2 inline-flex rounded-full bg-cream-100 px-3 py-1 text-xs font-semibold text-cocoa-600">
                        {formatDateTime(order.deliveryDate, order.deliveryTime)}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <OrderStatusBadge status={order.status} />
                      <PaymentStatusBadge status={order.paymentStatus} />
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 rounded-xl bg-cream-50 p-3 sm:grid-cols-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cocoa-400">Total</p>
                      <p className="font-semibold text-cocoa-800">{formatCurrency(order.totalPrice)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cocoa-400">Custo</p>
                      <p className="font-semibold text-cocoa-800">{formatCurrency(order.totalCostSnapshot)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cocoa-400">Lucro</p>
                      <p className="font-semibold text-brand-700">{formatCurrency(order.estimatedProfitSnapshot)}</p>
                    </div>
                  </div>
                  <div className="mt-3 overflow-hidden rounded-xl border border-cream-300 bg-cream-50/70">
                    <div className="grid grid-cols-[1fr_auto] gap-3 border-b border-cream-300 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-cocoa-400">
                      <span>Resumo do pedido</span>
                      <span>{items.length} linha(s)</span>
                    </div>
                    {items.length > 0 ? (
                      <div className="divide-y divide-cream-300">
                        {items.map((item) => (
                          <div key={item.id} className="grid gap-2 px-3 py-3 text-sm sm:grid-cols-[1fr_auto] sm:items-center">
                            <div>
                              <p className="font-semibold text-cocoa-800">{item.name}</p>
                              <p className="text-cocoa-500">
                                {item.quantity.toLocaleString("pt-BR")} {item.quantityUnit} · {formatCurrency(item.unitPrice)} un. · custo{" "}
                                {formatCurrency(item.unitCostSnapshot)}
                              </p>
                              {item.notes ? <p className="mt-1 text-xs text-cocoa-400">{item.notes}</p> : null}
                            </div>
                            <div className="text-left sm:text-right">
                              <p className="font-semibold text-cocoa-800">{formatCurrency(item.totalPrice)}</p>
                              <p className="text-xs text-brand-700">Lucro {formatCurrency(item.profitSnapshot)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="px-3 py-3 text-sm text-cocoa-500">Sem produtos ou receitas vinculados.</p>
                    )}
                  </div>
                  {order.notes ? (
                    <p className="mt-3 rounded-xl bg-blush-50 px-3 py-2 text-sm text-cocoa-600">{order.notes}</p>
                  ) : null}
                  <div className="mt-3 space-y-3">
                    <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                      <Link
                        href={`/pedidos/${order.id}/orcamento`}
                        className="brand-focus inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-brand-600"
                      >
                        <Eye className="h-4 w-4" />
                        Abrir orçamento
                      </Link>
                      <form action={deleteOrderAction} className="self-start">
                        <input type="hidden" name="order_id" value={order.id} />
                        <ConfirmActionButton
                          variant="outline"
                          className="w-full border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300 hover:bg-rose-100 hover:text-rose-800 sm:w-auto"
                          title="Excluir pedido?"
                          description={`Isso remove o ${formatOrderLabel(order.orderNumber)} e todos os produtos/receitas vinculados a ele.`}
                          confirmLabel="Excluir"
                          successTitle="Pedido excluido"
                          successDescription="A lista de pedidos sera atualizada."
                          tone="danger"
                        >
                          <Trash2 className="h-4 w-4" />
                          Excluir
                        </ConfirmActionButton>
                      </form>
                    </div>
                    <details className="rounded-xl border border-cream-300 bg-cream-50">
                      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-cocoa-700 transition-colors hover:bg-blush-50 hover:text-brand-700">
                        <Pencil className="h-4 w-4" />
                        Editar pedido
                      </summary>
                      <div className="border-t border-cream-300 p-3">
                        <OrderForm
                          action={updateOrderAction}
                          customers={customers}
                          products={products}
                          recipes={recipes}
                          recipeCosts={recipeCosts}
                          order={order}
                          items={items}
                          submitLabel="Salvar pedido"
                        />
                      </div>
                    </details>
                  </div>
                </article>
              );
            })}
          </div>
          )}
        </SectionCard>

        <SectionCard id="novo-pedido" title="Novo pedido" description="Monte um pedido com varios produtos ou receitas e confira o resumo antes de salvar.">
          <OrderForm
            action={createOrderAction}
            customers={customers}
            products={products}
            recipes={recipes}
            recipeCosts={recipeCosts}
            submitLabel="Cadastrar pedido"
          />
        </SectionCard>
      </div>
    </div>
  );
}
