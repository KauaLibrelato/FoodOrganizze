import { PackageOpen, Pencil, ShoppingBasket, Trash2 } from "lucide-react";
import {
  createIngredientPurchaseAction,
  createIngredientWithPurchaseAction,
  deleteIngredientAction,
  updateIngredientAction,
} from "@/app/actions";
import { PageTitle } from "@/components/dashboard/page-title";
import { SectionCard } from "@/components/cards/section-card";
import { EmptyState } from "@/components/dashboard/empty-state";
import { ConfirmActionButton, ToastSubmitButton } from "@/components/forms/confirm-action-button";
import { CurrencyInput } from "@/components/forms/currency-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getIngredientPurchases, getIngredients } from "@/lib/data";
import { formatCurrency, formatDate, formatUnit } from "@/lib/calculations";
import type { Unit } from "@/types";

const units: Unit[] = ["g", "kg", "ml", "l", "un"];
const fieldClassName = "h-11 w-full rounded-xl border border-input bg-card px-3 text-sm text-cocoa-800";

export default async function IngredientsPage() {
  const [ingredients, purchases] = await Promise.all([getIngredients(), getIngredientPurchases()]);

  return (
    <div className="space-y-6">
      <PageTitle
        title="Insumos"
        description="Cadastre ingredientes, embalagens, caixas e outros itens que entram no custo."
      />
      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr] xl:items-stretch">
        <SectionCard title="Cadastrar insumo" className="xl:min-h-[640px]">
          <form action={createIngredientWithPurchaseAction} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Insumo</Label>
                <Input id="name" name="name" required placeholder="Chocolate meio amargo, caixa para bolo..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="base_unit">Unidade do estoque</Label>
                <select id="base_unit" name="base_unit" className={fieldClassName}>
                  {units.map((unit) => (
                    <option key={unit} value={unit}>{unit}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="rounded-xl border border-cream-300 bg-cream-50 p-4">
              <p className="font-semibold text-cocoa-800">Primeira compra</p>
              <p className="mt-1 text-sm text-cocoa-500">Opcional, mas já deixa estoque e custo médio prontos.</p>
              <div className="mt-4 grid grid-cols-[1fr_96px] gap-3">
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantidade comprada</Label>
                  <Input id="quantity" name="quantity" inputMode="decimal" placeholder="1" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit">Unidade</Label>
                  <select id="unit" name="unit" className={fieldClassName}>
                    {units.map((unit) => (
                      <option key={unit} value={unit}>{unit}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="total_price">Valor pago</Label>
                  <CurrencyInput id="total_price" name="total_price" placeholder="55,00" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="purchase_date">Data</Label>
                  <Input id="purchase_date" name="purchase_date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
                </div>
              </div>
              <div className="mt-3 space-y-2">
                <Label htmlFor="supplier">Fornecedor</Label>
                <Input id="supplier" name="supplier" placeholder="Opcional" />
              </div>
            </div>
            <ToastSubmitButton className="w-full" successTitle="Insumo cadastrado" successDescription="Estoque e custo médio foram atualizados.">
              Salvar insumo
            </ToastSubmitButton>
          </form>
        </SectionCard>

        <SectionCard title="Estoque" className="xl:h-[640px]" contentClassName="xl:min-h-0 xl:overflow-y-auto xl:pr-2">
          {ingredients.length === 0 ? (
            <EmptyState
              title="Nenhum insumo cadastrado"
              description="Salve ingredientes, embalagens ou outros itens com unidade para começar o custo médio."
              icon={<PackageOpen className="h-9 w-9" />}
            />
          ) : (
            <div className="grid auto-rows-max gap-3 md:grid-cols-2 xl:grid-cols-2">
              {ingredients.map((ingredient) => {
                return (
                  <article key={ingredient.id} className="rounded-xl border border-cream-300 bg-card p-4 shadow-sm">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h2 className="font-semibold text-cocoa-800">{ingredient.name}</h2>
                        <p className="mt-1 text-sm text-cocoa-500">Unidade do estoque: {ingredient.baseUnit}</p>
                      </div>
                      <span className="rounded-full bg-cream-100 px-3 py-1 text-xs font-semibold text-cocoa-600">
                        {ingredient.baseUnit}
                      </span>
                    </div>
                    <div className="mt-4 grid gap-3 rounded-xl bg-cream-50 p-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cocoa-400">Estoque</p>
                        <p className="mt-1 font-semibold text-cocoa-800">
                          {formatUnit(ingredient.currentStock, ingredient.baseUnit)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cocoa-400">Custo médio</p>
                        <p className="mt-1 font-semibold text-cocoa-800">
                          {formatCurrency(ingredient.averageCost)} / {ingredient.baseUnit}
                        </p>
                      </div>
                    </div>
                    <details className="mt-3 rounded-xl border border-cream-300 bg-cream-50 px-3 py-2">
                      <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-cocoa-700">
                        <Pencil className="h-4 w-4" />
                        Editar insumo
                      </summary>
                      <div className="mt-3 border-t border-cream-300 pt-3">
                        <form action={updateIngredientAction} className="space-y-2">
                          <input type="hidden" name="ingredient_id" value={ingredient.id} />
                          <div className="grid gap-2">
                            <div>
                              <Input id={`name-${ingredient.id}`} name="name" required defaultValue={ingredient.name} />
                            </div>
                            <div className="grid grid-cols-[1fr_92px] gap-2">
                              <Input
                                id={`minimum-stock-${ingredient.id}`}
                                name="minimum_stock"
                                inputMode="decimal"
                                defaultValue={ingredient.minimumStock}
                                placeholder="Estoque mínimo"
                              />
                              <select
                                id={`base-unit-${ingredient.id}`}
                                name="base_unit"
                                className={fieldClassName}
                                defaultValue={ingredient.baseUnit}
                              >
                                {units.map((unit) => (
                                  <option key={unit} value={unit}>{unit}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <ToastSubmitButton type="submit" size="sm" className="h-9" successTitle="Insumo atualizado">
                              Salvar
                            </ToastSubmitButton>
                            <ConfirmActionButton
                              formAction={deleteIngredientAction}
                              variant="outline"
                              size="sm"
                              className="h-9 border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300 hover:bg-rose-100 hover:text-rose-800"
                              title="Excluir insumo?"
                              description="Compras desse insumo também serão removidas. Se ele estiver em alguma receita, remova da receita antes."
                              confirmLabel="Excluir"
                              successTitle="Insumo excluído"
                              successDescription="O estoque será atualizado."
                              tone="danger"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Excluir
                            </ConfirmActionButton>
                          </div>
                        </form>
                      </div>
                    </details>
                  </article>
                );
              })}
            </div>
          )}
        </SectionCard>
      </div>

      <SectionCard title="Nova compra">
        <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <form action={createIngredientPurchaseAction} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div className="space-y-2 sm:col-span-2 lg:col-span-1">
              <Label htmlFor="ingredient_id">Insumo</Label>
              <select id="ingredient_id" name="ingredient_id" required className={fieldClassName}>
                {ingredients.map((ingredient) => (
                  <option key={ingredient.id} value={ingredient.id}>{ingredient.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-[1fr_96px] gap-3 sm:col-span-2 lg:col-span-1">
              <div className="space-y-2">
                <Label htmlFor="purchase-quantity">Quantidade</Label>
                <Input id="purchase-quantity" name="quantity" required inputMode="decimal" placeholder="1" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="purchase-unit">Unidade</Label>
                <select id="purchase-unit" name="unit" className={fieldClassName}>
                  {units.map((unit) => (
                    <option key={unit} value={unit}>{unit}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="purchase-total-price">Valor pago</Label>
              <CurrencyInput id="purchase-total-price" name="total_price" required placeholder="55,00" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="purchase-date">Data</Label>
              <Input id="purchase-date" name="purchase_date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
            </div>
            <div className="space-y-2 sm:col-span-2 lg:col-span-1">
              <Label htmlFor="purchase-supplier">Fornecedor</Label>
              <Input id="purchase-supplier" name="supplier" placeholder="Opcional" />
            </div>
            <ToastSubmitButton
              className="w-full sm:col-span-2 lg:col-span-1"
              successTitle="Compra registrada"
              successDescription="Estoque e custo médio foram recalculados."
            >
              <ShoppingBasket className="h-4 w-4" />
              Registrar compra
            </ToastSubmitButton>
          </form>
          <div className="max-h-[420px] overflow-y-auto pr-1">
            {purchases.length === 0 ? (
              <EmptyState
                title="Nenhuma compra registrada"
                description="As compras aparecem aqui e atualizam estoque e custo médio dos insumos."
                icon={<ShoppingBasket className="h-9 w-9" />}
              />
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {purchases.slice(0, 8).map((purchase) => {
                  const ingredient = ingredients.find((item) => item.id === purchase.ingredientId);
                  return (
                    <article key={purchase.id} className="rounded-xl border border-cream-300 bg-card p-4 shadow-sm">
                      <div>
                        <p className="font-semibold text-cocoa-800">{ingredient?.name ?? "Insumo"}</p>
                        <p className="mt-1 text-sm text-cocoa-500">
                          {formatUnit(purchase.quantity, purchase.unit)} · {purchase.supplier ?? "Sem fornecedor"}
                        </p>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                        <p className="font-semibold text-cocoa-800">{formatCurrency(purchase.totalPrice)}</p>
                        <p className="rounded-full bg-cream-100 px-3 py-1 text-xs font-semibold text-cocoa-600">{formatDate(purchase.purchaseDate)}</p>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
