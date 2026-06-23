import {
  CalendarClock,
  CircleDollarSign,
  ClipboardList,
  PackageCheck,
  WalletCards,
} from "lucide-react";
import { PageTitle } from "@/components/dashboard/page-title";
import { StatCard } from "@/components/cards/stat-card";
import { SectionCard } from "@/components/cards/section-card";
import { EmptyState } from "@/components/dashboard/empty-state";
import { OrderStatusBadge } from "@/components/dashboard/status-badge";
import { formatCurrency, formatDateTime, formatOrderLabel } from "@/lib/calculations";
import { getDashboardData } from "@/lib/data";

export default async function DashboardPage() {
  const dashboard = await getDashboardData();
  const openOrders = dashboard.orders.filter((order) =>
    ["novo", "confirmado", "em_producao", "pronto"].includes(order.status),
  );
  const openRevenue = openOrders.reduce((total, order) => total + order.totalPrice, 0);
  const openOrdersOnDisplay = [...openOrders].sort((a, b) => {
    const dateComparison = a.deliveryDate.localeCompare(b.deliveryDate);

    if (dateComparison !== 0) {
      return dateComparison;
    }

    return (a.deliveryTime ?? "").localeCompare(b.deliveryTime ?? "");
  });

  return (
    <div className="space-y-5">
      <PageTitle
        title="Balcão"
        description="Pedidos abertos e números do mês para acompanhar o movimento sem se perder."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Pedidos em aberto"
          value={String(openOrders.length)}
          detail={`${formatCurrency(openRevenue)} em pedidos ativos`}
          icon={<CalendarClock className="h-5 w-5" />}
          tone="rose"
        />
        <StatCard
          title="Pedidos do mês"
          value={String(dashboard.monthOrders.length)}
          detail="Entregas previstas neste mês"
          icon={<PackageCheck className="h-5 w-5" />}
          tone="cream"
        />
        <StatCard
          title="Faturamento do mês"
          value={formatCurrency(dashboard.monthRevenue)}
          detail="Pedidos do mês, sem cancelados"
          icon={<WalletCards className="h-5 w-5" />}
          tone="green"
        />
        <StatCard
          title="Lucro do mês"
          value={formatCurrency(dashboard.monthProfit)}
          detail="Com custo salvo nos pedidos"
          icon={<CircleDollarSign className="h-5 w-5" />}
          tone="amber"
        />
      </div>

      <SectionCard
        title="Pedidos abertos"
        description="Acompanhe o que ainda precisa de atenção no balcão."
      >
        <div className="overflow-hidden rounded-lg border border-cream-300 bg-cream-50/60">
          {openOrdersOnDisplay.length > 0 ? (
            <div className="divide-y divide-cream-300">
              {openOrdersOnDisplay.map((order) => {
                const customer = dashboard.customers.find((item) => item.id === order.customerId);
                const items = dashboard.orderItems.filter((item) => item.orderId === order.id);
                const firstItem = items[0]?.name ?? "Pedido personalizado";
                const extraItems = items.length > 1 ? ` +${items.length - 1}` : "";

                return (
                  <div
                    key={order.id}
                    className="grid gap-4 bg-card/75 p-4 transition-colors hover:bg-card sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-base font-semibold text-cocoa-800">
                          {firstItem}
                          {extraItems ? <span className="text-cocoa-500">{extraItems}</span> : null}
                        </p>
                        <span className="rounded-full bg-cream-100 px-2.5 py-1 text-xs font-semibold text-cocoa-600">
                          {formatOrderLabel(order.orderNumber)}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm leading-6 text-cocoa-500">
                        <span>{customer?.name ?? "Cliente não informado"}</span>
                        <span className="hidden h-1 w-1 rounded-full bg-cocoa-300 sm:inline-block" />
                        <span>
                          {formatDateTime(order.deliveryDate, order.deliveryTime)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 sm:justify-end">
                      <p className="text-sm font-semibold text-cocoa-700">
                        {formatCurrency(order.totalPrice)}
                      </p>
                      <OrderStatusBadge status={order.status} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-card p-6">
              <EmptyState
                title="Nenhum pedido aberto"
                description="Quando houver pedidos em andamento, eles aparecem aqui com cliente, entrega e status."
                icon={<ClipboardList className="h-9 w-9" />}
              />
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
