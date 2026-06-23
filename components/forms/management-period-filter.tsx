"use client";

import { useEffect, useState, useTransition } from "react";
import { Filter } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ManagementPeriodFilterProps = {
  period: string;
  startDate: string;
  endDate: string;
  actionPath?: string;
};

const periodOptions = [
  { value: "hoje", label: "Hoje" },
  { value: "esta-semana", label: "Esta semana" },
  { value: "este-mes", label: "Este mês" },
  { value: "mes-anterior", label: "Mês anterior" },
  { value: "personalizado", label: "Período personalizado" },
];

export function ManagementPeriodFilter({
  period,
  startDate,
  endDate,
  actionPath = "/gestao",
}: ManagementPeriodFilterProps) {
  const router = useRouter();
  const [selectedPeriod, setSelectedPeriod] = useState(period);
  const [selectedStartDate, setSelectedStartDate] = useState(startDate);
  const [selectedEndDate, setSelectedEndDate] = useState(endDate);
  const [isPending, startTransition] = useTransition();
  const isCustom = selectedPeriod === "personalizado";

  useEffect(() => {
    setSelectedPeriod(period);
    setSelectedStartDate(startDate);
    setSelectedEndDate(endDate);
  }, [period, startDate, endDate]);

  function navigate(nextPeriod = selectedPeriod, nextStartDate = selectedStartDate, nextEndDate = selectedEndDate) {
    const search = new URLSearchParams();
    search.set("periodo", nextPeriod);

    if (nextPeriod === "personalizado") {
      search.set("inicio", nextStartDate);
      search.set("fim", nextEndDate);
    }

    startTransition(() => {
      router.replace(`${actionPath}?${search.toString()}`, { scroll: false });
    });
  }

  return (
    <form
      className="grid gap-3 lg:grid-cols-[1.2fr_1fr_1fr_auto]"
      onSubmit={(event) => {
        event.preventDefault();
        navigate();
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="periodo">Filtro</Label>
        <select
          id="periodo"
          name="periodo"
          className="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm text-cocoa-700"
          value={selectedPeriod}
          onChange={(event) => {
            const nextPeriod = event.target.value;
            setSelectedPeriod(nextPeriod);
            navigate(nextPeriod, selectedStartDate, selectedEndDate);
          }}
        >
          {periodOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="inicio">Início</Label>
        <Input
          id="inicio"
          name="inicio"
          type="date"
          value={selectedStartDate}
          disabled={!isCustom}
          onChange={(event) => setSelectedStartDate(event.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="fim">Fim</Label>
        <Input
          id="fim"
          name="fim"
          type="date"
          value={selectedEndDate}
          disabled={!isCustom}
          onChange={(event) => setSelectedEndDate(event.target.value)}
        />
      </div>
      <div className="flex items-end">
        <Button className="w-full" type="submit" variant={isCustom ? "default" : "outline"} disabled={isPending}>
          <Filter className="h-4 w-4" />
          {isPending ? "Atualizando" : isCustom ? "Filtrar" : "Atualizar"}
        </Button>
      </div>
    </form>
  );
}
