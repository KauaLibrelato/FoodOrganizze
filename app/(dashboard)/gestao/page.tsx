import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  HandCoins,
  PiggyBank,
  ReceiptText,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { SectionCard } from "@/components/cards/section-card";
import { PageTitle } from "@/components/dashboard/page-title";
import { ManagementPeriodFilter } from "@/components/forms/management-period-filter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/calculations";
import { getManagementData } from "@/lib/data";

type ManagementPageProps = {
  searchParams?: Promise<{
    periodo?: string;
    inicio?: string;
    fim?: string;
  }>;
};

const periodOptions = [
  { value: "hoje", label: "Hoje" },
  { value: "esta-semana", label: "Esta semana" },
  { value: "este-mes", label: "Este mês" },
  { value: "mes-anterior", label: "Mês anterior" },
  { value: "personalizado", label: "Período personalizado" },
];

function formatPercentage(value: number) {
  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(value)}%`;
}

function barWidth(value: number, max: number) {
  if (max <= 0 || value <= 0) return "0%";
  return `${Math.max(5, Math.min(100, (value / max) * 100))}%`;
}

function MetricCard({
  label,
  value,
  detail,
  icon,
  tone = "rose",
}: {
  label: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
  tone?: "rose" | "green" | "amber" | "cream";
}) {
  const toneClass = {
    rose: "bg-blush-50 text-brand-700",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-800",
    cream: "bg-cream-100 text-cocoa-600",
  }[tone];

  return (
    <div className="rounded-xl border border-cream-300 bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cocoa-400">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-cocoa-800">{value}</p>
        </div>
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${toneClass}`}>
          {icon}
        </span>
      </div>
      <p className="mt-2 text-sm leading-6 text-cocoa-500">{detail}</p>
    </div>
  );
}

export default async function ManagementPage({ searchParams }: ManagementPageProps) {
  const params = await searchParams;
  const management = await getManagementData({
    periodo: params?.periodo,
    inicio: params?.inicio,
    fim: params?.fim,
  });

  const { filters, summary, distributionSettings } = management;
  const periodLabel =
    periodOptions.find((option) => option.value === filters.period)?.label ?? "Este mês";
  const maxResultValue = Math.max(
    summary.revenue,
    summary.costs,
    summary.expenses,
    Math.max(0, summary.grossProfit),
    Math.max(0, summary.netProfit),
  );
  const hasProfitToDistribute = summary.netProfit > 0;
  const health =
    summary.netProfit > 0
      ? {
          title: "Período positivo",
          text: "Depois de custos e despesas, sobrou lucro para decidir o destino.",
          className: "border-emerald-200 bg-emerald-50 text-emerald-900",
        }
      : summary.revenue > 0
        ? {
            title: "Atenção no resultado",
            text: "O período teve venda, mas o lucro líquido ainda não ficou positivo.",
            className: "border-amber-200 bg-amber-50 text-amber-900",
          }
        : {
            title: "Sem movimento no período",
            text: "Troque o filtro ou registre pedidos para ver o fechamento.",
            className: "border-cream-300 bg-cream-50 text-cocoa-700",
          };

  const distribution = [
    {
      label: "Sócios",
      percentage: distributionSettings.partnersPercentage,
      amount: hasProfitToDistribute ? summary.netProfit * (distributionSettings.partnersPercentage / 100) : 0,
      icon: HandCoins,
    },
    {
      label: "Reinvestimento",
      percentage: distributionSettings.reinvestmentPercentage,
      amount: hasProfitToDistribute ? summary.netProfit * (distributionSettings.reinvestmentPercentage / 100) : 0,
      icon: TrendingUp,
    },
    {
      label: "Reserva",
      percentage: distributionSettings.cashReservePercentage,
      amount: hasProfitToDistribute ? summary.netProfit * (distributionSettings.cashReservePercentage / 100) : 0,
      icon: PiggyBank,
    },
  ];

  const categoryTotals = Array.from(
    management.periodExpenses.reduce((totals, expense) => {
      totals.set(expense.category, (totals.get(expense.category) ?? 0) + expense.amount);
      return totals;
    }, new Map<string, number>()),
  )
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 4);

  return (
    <div className="space-y-6">
      <PageTitle
        title="Gestão"
        description="Uma leitura rápida do período, usando pedidos válidos e despesas registradas no Financeiro."
        action={
          <Button asChild variant="outline">
            <Link href="/financeiro">
              Ajustar financeiro
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        }
      />

      <SectionCard title="Período" description="Trocar o filtro atualiza a tela. Datas ficam disponíveis apenas no período personalizado.">
        <ManagementPeriodFilter
          period={filters.period}
          startDate={filters.startDate}
          endDate={filters.endDate}
          actionPath="/gestao"
        />
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge variant="cream">
            <CalendarDays className="mr-1 h-3.5 w-3.5" />
            {periodLabel}
          </Badge>
          <Badge variant="outline">
            {formatDate(filters.startDate)} até {formatDate(filters.endDate)}
          </Badge>
        </div>
      </SectionCard>

      <div className={`rounded-xl border p-4 shadow-sm ${health.className}`}>
        <p className="font-semibold">{health.title}</p>
        <p className="mt-1 text-sm leading-6">{health.text}</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Faturamento"
          value={formatCurrency(summary.revenue)}
          detail={`${summary.orderCount} pedido(s) não cancelado(s)`}
          icon={<Wallet className="h-5 w-5" />}
        />
        <MetricCard
          label="Custos"
          value={formatCurrency(summary.costs)}
          detail="Custo salvo nos pedidos"
          icon={<ReceiptText className="h-5 w-5" />}
          tone="cream"
        />
        <MetricCard
          label="Despesas"
          value={formatCurrency(summary.expenses)}
          detail={`${management.periodExpenses.length} lançamento(s)`}
          icon={<TrendingDown className="h-5 w-5" />}
          tone="amber"
        />
        <MetricCard
          label="Lucro líquido"
          value={formatCurrency(summary.netProfit)}
          detail={`Ticket médio: ${formatCurrency(summary.averageTicket)}`}
          icon={<PiggyBank className="h-5 w-5" />}
          tone={summary.netProfit > 0 ? "green" : "rose"}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard title="Resultado" description="Como o dinheiro caminhou no período.">
          <div className="space-y-4">
            {[
              { label: "Faturamento", value: summary.revenue, color: "bg-primary" },
              { label: "Custo dos pedidos", value: summary.costs, color: "bg-cocoa-500" },
              { label: "Despesas", value: summary.expenses, color: "bg-amber-600" },
              { label: "Lucro bruto", value: summary.grossProfit, color: "bg-blush-500" },
              {
                label: "Lucro líquido",
                value: summary.netProfit,
                color: summary.netProfit > 0 ? "bg-emerald-600" : "bg-rose-600",
              },
            ].map((item) => (
              <div key={item.label} className="grid gap-2 text-sm sm:grid-cols-[150px_1fr_120px] sm:items-center">
                <p className="font-semibold text-cocoa-600">{item.label}</p>
                <div className="h-3 overflow-hidden rounded-full bg-cream-100">
                  <div
                    className={`h-full rounded-full ${item.color}`}
                    style={{ width: barWidth(Math.max(0, item.value), maxResultValue) }}
                  />
                </div>
                <p className="font-semibold text-cocoa-800 sm:text-right">{formatCurrency(item.value)}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Distribuição prevista" description="Configurada na aba Financeiro.">
          <div className="space-y-3">
            {distribution.map((item) => (
              <div key={item.label} className="flex items-center justify-between gap-3 rounded-xl border border-cream-300 bg-cream-50 p-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blush-50 text-brand-700">
                    <item.icon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="font-semibold text-cocoa-800">{item.label}</p>
                    <p className="text-xs text-cocoa-500">{formatPercentage(item.percentage)}</p>
                  </div>
                </div>
                <p className="font-semibold text-brand-700">{formatCurrency(item.amount)}</p>
              </div>
            ))}
          </div>
          <Button asChild className="mt-4 w-full" variant="outline">
            <Link href="/financeiro">
              Alterar percentuais
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </SectionCard>
      </div>

      <SectionCard title="Despesas por categoria" description="Maiores saídas registradas no período.">
        {categoryTotals.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {categoryTotals.map((item) => (
              <div key={item.category} className="rounded-xl border border-cream-300 bg-card p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cocoa-400">{item.category}</p>
                <p className="mt-2 text-xl font-semibold text-cocoa-800">{formatCurrency(item.amount)}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-cream-300 bg-cream-50 p-4 text-sm leading-6 text-cocoa-500">
            Nenhuma despesa registrada neste período. Cadastre as saídas na aba Financeiro para completar o lucro líquido.
          </div>
        )}
      </SectionCard>
    </div>
  );
}
