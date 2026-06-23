"use client";

import { useMemo, useState } from "react";
import { HandCoins, PiggyBank, Save, TrendingUp } from "lucide-react";
import { updateProfitDistributionAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ProfitDistributionSettings } from "@/types";

type ProfitDistributionFormProps = {
  settings: ProfitDistributionSettings;
};

const exampleProfit = 1000;

function parsePercentage(value: string) {
  const normalized = value.replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatPercentage(value: number) {
  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(value)}%`;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function ProfitDistributionForm({ settings }: ProfitDistributionFormProps) {
  const [partners, setPartners] = useState(String(settings.partnersPercentage).replace(".", ","));
  const [reinvestment, setReinvestment] = useState(
    String(settings.reinvestmentPercentage).replace(".", ","),
  );
  const [cashReserve, setCashReserve] = useState(
    String(settings.cashReservePercentage).replace(".", ","),
  );

  const values = useMemo(
    () => ({
      partners: parsePercentage(partners),
      reinvestment: parsePercentage(reinvestment),
      cashReserve: parsePercentage(cashReserve),
    }),
    [partners, reinvestment, cashReserve],
  );
  const total = Math.round((values.partners + values.reinvestment + values.cashReserve) * 100) / 100;
  const isValid = total === 100;
  const difference = Math.round((100 - total) * 100) / 100;
  const progress = Math.max(0, Math.min(100, total));

  const distribution = [
    {
      label: "Sócios",
      percentage: values.partners,
      amount: exampleProfit * (values.partners / 100),
      icon: HandCoins,
    },
    {
      label: "Reinvestimento",
      percentage: values.reinvestment,
      amount: exampleProfit * (values.reinvestment / 100),
      icon: TrendingUp,
    },
    {
      label: "Reserva de caixa",
      percentage: values.cashReserve,
      amount: exampleProfit * (values.cashReserve / 100),
      icon: PiggyBank,
    },
  ];

  return (
    <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
      <form
        action={updateProfitDistributionAction}
        className="grid gap-3 sm:grid-cols-3 lg:self-start"
        onSubmit={() => {
          if (isValid) {
            window.dispatchEvent(
              new CustomEvent("foodorganizze:toast", {
                detail: {
                  title: "Distribuição salva",
                  description: "A Gestão já usa os novos percentuais.",
                  tone: "success",
                },
              }),
            );
          }
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="partners_percentage">Sócios</Label>
          <Input
            id="partners_percentage"
            name="partners_percentage"
            required
            inputMode="decimal"
            placeholder="30"
            value={partners}
            onChange={(event) => setPartners(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="reinvestment_percentage">Reinvestimento</Label>
          <Input
            id="reinvestment_percentage"
            name="reinvestment_percentage"
            required
            inputMode="decimal"
            placeholder="50"
            value={reinvestment}
            onChange={(event) => setReinvestment(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cash_reserve_percentage">Reserva</Label>
          <Input
            id="cash_reserve_percentage"
            name="cash_reserve_percentage"
            required
            inputMode="decimal"
            placeholder="20"
            value={cashReserve}
            onChange={(event) => setCashReserve(event.target.value)}
          />
        </div>

        <div className="sm:col-span-3 rounded-xl border border-cream-300 bg-cream-50 p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-cocoa-800">
                Total: {formatPercentage(total)}
              </p>
              <p className="mt-1 text-sm text-cocoa-500">
                {isValid
                  ? "Fechou em 100%. Pode salvar."
                  : difference > 0
                    ? `Ainda falta ${formatPercentage(difference)}.`
                    : `Passou ${formatPercentage(Math.abs(difference))}.`}
              </p>
            </div>
            <Button type="submit" disabled={!isValid}>
              <Save className="h-4 w-4" />
              Salvar distribuição
            </Button>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-card">
            <div
              className={isValid ? "h-full rounded-full bg-emerald-600" : "h-full rounded-full bg-amber-600"}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </form>

      <div className="grid gap-3 sm:grid-cols-3">
        {distribution.map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-cream-300 bg-cream-50 p-4 transition-colors"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blush-50 text-brand-700">
              <item.icon className="h-5 w-5" />
            </span>
            <p className="mt-3 font-semibold text-cocoa-800">{item.label}</p>
            <p className="mt-1 text-sm text-cocoa-500">{formatPercentage(item.percentage)}</p>
            <p className="mt-3 text-sm font-semibold text-brand-700">
              Ex.: {formatCurrency(item.amount)} a cada {formatCurrency(exampleProfit)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
