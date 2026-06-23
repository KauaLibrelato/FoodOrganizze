"use client";

import { useEffect, useMemo, useState } from "react";
import { BadgeDollarSign, RefreshCcw, Scale3D } from "lucide-react";
import { calculateRecipeCostPerYield, calculateSalePrice, formatCurrency, formatUnit } from "@/lib/calculations";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Unit } from "@/types";

type ResizeRecipe = {
  id: string;
  name: string;
  yieldQuantity: number;
  yieldUnit: Unit;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    unit: Unit;
  }>;
};

function NumberField({
  label,
  value,
  onChange,
  prefix,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  prefix?: string;
  suffix?: string;
}) {
  const [inputValue, setInputValue] = useState(String(value).replace(".", ","));

  useEffect(() => {
    const parsedInputValue = Number(inputValue.replace(",", "."));

    if (!Number.isFinite(parsedInputValue) || parsedInputValue !== value) {
      setInputValue(String(value).replace(".", ","));
    }
  }, [inputValue, value]);

  function handleChange(rawValue: string) {
    setInputValue(rawValue);

    if (rawValue.trim() === "" || rawValue === "," || rawValue === ".") {
      onChange(0);
      return;
    }

    const parsedValue = Number(rawValue.replace(",", "."));

    if (Number.isFinite(parsedValue)) {
      onChange(parsedValue);
    }
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="relative">
        {prefix ? (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-cocoa-400">
            {prefix}
          </span>
        ) : null}
        <Input
          className={[prefix ? "pl-10" : "", suffix ? "pr-12" : ""].filter(Boolean).join(" ") || undefined}
          inputMode="decimal"
          placeholder="0"
          value={inputValue}
          onChange={(event) => handleChange(event.target.value)}
        />
        {suffix ? (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-cocoa-400">
            {suffix}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function ResultLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-cream-200 pt-3 text-sm first:border-t-0 first:pt-0">
      <span className="text-cocoa-500">{label}</span>
      <strong className="text-cocoa-800">{value}</strong>
    </div>
  );
}

function CalculatorCard({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-cream-300 bg-card shadow-sm">
      <div className="flex flex-col gap-3 border-b border-cream-300 bg-cream-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blush-50 text-brand-700">
            {icon}
          </div>
          <div>
            <h2 className="font-semibold text-cocoa-800">{title}</h2>
            <p className="mt-1 text-sm leading-6 text-cocoa-500">{description}</p>
          </div>
        </div>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function ResultPanel({
  eyebrow,
  value,
  children,
}: {
  eyebrow: string;
  value: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-blush-200 bg-blush-50 p-4">
      <p className="text-sm font-semibold text-brand-700">{eyebrow}</p>
      <p className="mt-2 text-3xl font-semibold text-cocoa-800">{value}</p>
      <div className="mt-5 space-y-3">{children}</div>
    </div>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-cream-300 bg-card/75 p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cocoa-400">{label}</p>
      <p className="mt-2 text-lg font-semibold text-cocoa-800">{value}</p>
    </div>
  );
}

const yieldUnits = [
  { value: "un", label: "unidades", resultLabel: "unidade" },
  { value: "kg", label: "quilos", resultLabel: "kg" },
  { value: "g", label: "gramas", resultLabel: "grama" },
  { value: "l", label: "litros", resultLabel: "litro" },
  { value: "ml", label: "ml", resultLabel: "ml" },
] as const;

type YieldUnit = (typeof yieldUnits)[number]["value"];

const selectClassName = "h-11 w-full rounded-xl border border-input bg-card px-3 text-sm text-cocoa-800";

function getYieldUnitLabel(unit: YieldUnit) {
  return yieldUnits.find((item) => item.value === unit)?.resultLabel ?? unit;
}

function SalePriceCalculator() {
  const [baseCost, setBaseCost] = useState(35);
  const [packagingCost, setPackagingCost] = useState(4);
  const [laborCost, setLaborCost] = useState(18);
  const [energyCostPercentage, setEnergyCostPercentage] = useState(6);
  const [cardFeePercentage, setCardFeePercentage] = useState(3.49);
  const [profitMarginPercentage, setProfitMarginPercentage] = useState(45);

  const result = useMemo(
    () =>
      calculateSalePrice(baseCost, {
        packagingCost,
        laborCost,
        energyCostPercentage,
        cardFeePercentage,
        profitMarginPercentage,
      }),
    [
      baseCost,
      cardFeePercentage,
      energyCostPercentage,
      laborCost,
      packagingCost,
      profitMarginPercentage,
    ],
  );

  return (
    <CalculatorCard
      title="Preço de venda"
      description="Some custos, taxas e margem para chegar em um preço sugerido."
      icon={<BadgeDollarSign className="h-5 w-5" />}
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
        <div className="grid gap-3 sm:grid-cols-2">
          <NumberField label="Custo da receita" value={baseCost} onChange={setBaseCost} prefix="R$" />
          <NumberField label="Embalagem" value={packagingCost} onChange={setPackagingCost} prefix="R$" />
          <NumberField label="Mão de obra" value={laborCost} onChange={setLaborCost} prefix="R$" />
          <NumberField label="Energia" value={energyCostPercentage} onChange={setEnergyCostPercentage} suffix="%" />
          <NumberField label="Maquininha" value={cardFeePercentage} onChange={setCardFeePercentage} suffix="%" />
          <NumberField label="Margem" value={profitMarginPercentage} onChange={setProfitMarginPercentage} suffix="%" />
        </div>
        <ResultPanel eyebrow="Preço sugerido" value={formatCurrency(result.suggestedPrice)}>
          <ResultLine label="Custo final" value={formatCurrency(result.totalCost)} />
          <ResultLine label="Lucro" value={formatCurrency(result.estimatedProfit)} />
          <ResultLine label="Margem real" value={`${result.realMarginPercentage.toFixed(1)}%`} />
        </ResultPanel>
      </div>
    </CalculatorCard>
  );
}

function YieldCalculator() {
  const [totalCost, setTotalCost] = useState(80);
  const [yieldQuantity, setYieldQuantity] = useState(20);
  const [salePrice, setSalePrice] = useState(8);
  const [yieldUnit, setYieldUnit] = useState<YieldUnit>("un");
  const unitCost = calculateRecipeCostPerYield(totalCost, Math.max(1, yieldQuantity));
  const profitPerUnit = salePrice - unitCost;
  const revenueTotal = salePrice * yieldQuantity;
  const profitTotal = revenueTotal - totalCost;
  const yieldUnitLabel = getYieldUnitLabel(yieldUnit);

  return (
    <CalculatorCard
      title="Custo por rendimento"
      description="Divida o custo final pelo rendimento e veja valor, lucro e total previsto."
      icon={<Scale3D className="h-5 w-5" />}
    >
      <div className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-cream-300 bg-cream-50/70 p-4">
            <p className="text-sm font-semibold text-cocoa-700">Receita</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <NumberField label="Custo final" value={totalCost} onChange={setTotalCost} prefix="R$" />
              <NumberField label="Rendimento" value={yieldQuantity} onChange={setYieldQuantity} />
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="yield-unit">Unidade do rendimento</Label>
                <select
                  id="yield-unit"
                  className={selectClassName}
                  value={yieldUnit}
                  onChange={(event) => setYieldUnit(event.target.value as YieldUnit)}
                >
                  {yieldUnits.map((unit) => (
                    <option key={unit.value} value={unit.value}>
                      {unit.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-blush-200 bg-blush-50 p-4">
            <p className="text-sm font-semibold text-brand-700">Venda</p>
            <div className="mt-3">
              <NumberField label={`Valor por ${yieldUnitLabel}`} value={salePrice} onChange={setSalePrice} prefix="R$" />
            </div>
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.12em] text-brand-700">
              Total previsto
            </p>
            <p className="mt-2 text-3xl font-semibold text-cocoa-800">{formatCurrency(revenueTotal)}</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricTile label={`Custo por ${yieldUnitLabel}`} value={formatCurrency(unitCost)} />
          <MetricTile label={`Lucro por ${yieldUnitLabel}`} value={formatCurrency(profitPerUnit)} />
          <MetricTile label="Faturamento total" value={formatCurrency(revenueTotal)} />
          <MetricTile label="Lucro total" value={formatCurrency(profitTotal)} />
        </div>
      </div>
    </CalculatorCard>
  );
}

function RecipeResizeCalculator({ recipes }: { recipes: ResizeRecipe[] }) {
  const firstRecipe = recipes[0];
  const [recipeId, setRecipeId] = useState(firstRecipe?.id ?? "");
  const selectedRecipe = recipes.find((recipe) => recipe.id === recipeId) ?? firstRecipe;
  const [targetYield, setTargetYield] = useState(selectedRecipe?.yieldQuantity ?? 1);

  useEffect(() => {
    if (selectedRecipe) {
      setTargetYield(selectedRecipe.yieldQuantity);
    }
  }, [selectedRecipe?.id, selectedRecipe]);

  const factor = selectedRecipe && selectedRecipe.yieldQuantity > 0 ? targetYield / selectedRecipe.yieldQuantity : 1;

  return (
    <CalculatorCard
      title="Redimensionar receita"
      description="Escolha uma receita cadastrada e veja as quantidades para um novo rendimento."
      icon={<RefreshCcw className="h-5 w-5" />}
    >
      {recipes.length === 0 ? (
        <div className="rounded-xl border border-cream-300 bg-cream-50 p-4 text-sm text-cocoa-500">
          Cadastre uma receita com insumos para redimensionar por aqui.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="rounded-xl border border-cream-300 bg-cream-50/70 p-4">
            <div className="space-y-2">
              <Label htmlFor="resize-recipe">Receita</Label>
              <select
                id="resize-recipe"
                className={selectClassName}
                value={selectedRecipe?.id ?? ""}
                onChange={(event) => setRecipeId(event.target.value)}
              >
                {recipes.map((recipe) => (
                  <option key={recipe.id} value={recipe.id}>
                    {recipe.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <NumberField
                label="Novo rendimento"
                value={targetYield}
                onChange={setTargetYield}
                suffix={selectedRecipe?.yieldUnit}
              />
              <MetricTile
                label="Receita original"
                value={selectedRecipe ? formatUnit(selectedRecipe.yieldQuantity, selectedRecipe.yieldUnit) : "0"}
              />
            </div>
            <div className="mt-3 rounded-xl border border-blush-200 bg-blush-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-700">Multiplicador</p>
              <p className="mt-1 text-2xl font-semibold text-cocoa-800">{factor.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}x</p>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-cream-300 bg-card">
            <div className="grid grid-cols-[1fr_auto] gap-3 border-b border-cream-300 bg-cream-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-cocoa-400">
              <span>Insumo</span>
              <span>Nova quantidade</span>
            </div>
            {selectedRecipe?.items.length ? (
              <div className="divide-y divide-cream-300">
                {selectedRecipe.items.map((item) => (
                  <div key={item.id} className="grid grid-cols-[1fr_auto] gap-3 px-4 py-3 text-sm">
                    <span className="font-medium text-cocoa-800">{item.name}</span>
                    <span className="text-cocoa-600">{formatUnit(item.quantity * factor, item.unit)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 text-sm text-cocoa-500">Essa receita ainda não tem insumos vinculados.</div>
            )}
          </div>
        </div>
      )}
    </CalculatorCard>
  );
}

export function CalculatorPanel({ recipes }: { recipes: ResizeRecipe[] }) {
  return (
    <div className="space-y-4">
      <SalePriceCalculator />
      <YieldCalculator />
      <RecipeResizeCalculator recipes={recipes} />
    </div>
  );
}
