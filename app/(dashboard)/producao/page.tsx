import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, ClipboardList, Filter, PackageCheck } from "lucide-react";
import { PageTitle } from "@/components/dashboard/page-title";
import { SectionCard } from "@/components/cards/section-card";
import { EmptyState } from "@/components/dashboard/empty-state";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/dashboard/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency, formatDateTime, formatOrderLabel } from "@/lib/calculations";
import { groupByKey } from "@/lib/data-helpers";
import { getCustomers, getProductionData } from "@/lib/data";
import type { OrderStatus } from "@/types";

type ProductionPageProps = {
  searchParams?: Promise<{
    status?: string;
    inicio?: string;
    fim?: string;
    pagina?: string;
  }>;
};

const statusOptions: Array<{ value: "todos" | OrderStatus; label: string }> = [
  { value: "todos", label: "Todos os status" },
  { value: "novo", label: "Novo" },
  { value: "confirmado", label: "Confirmado" },
  { value: "em_producao", label: "Em produção" },
  { value: "pronto", label: "Pronto" },
  { value: "entregue", label: "Entregue" },
  { value: "cancelado", label: "Cancelado" },
];

function buildProductionHref(params: {
  status?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
}) {
  const search = new URLSearchParams();

  if (params.status && params.status !== "todos") search.set("status", params.status);
  if (params.startDate) search.set("inicio", params.startDate);
  if (params.endDate) search.set("fim", params.endDate);
  if (params.page && params.page > 1) search.set("pagina", String(params.page));

  const query = search.toString();
  return query ? `/producao?${query}` : "/producao";
}

export default async function ProductionPage({ searchParams }: ProductionPageProps) {
  const params = await searchParams;
  const page = Number(params?.pagina ?? "1");
  const [production, customers] = await Promise.all([
    getProductionData({
      status: params?.status,
      startDate: params?.inicio,
      endDate: params?.fim,
      page,
      pageSize: 10,
    }),
    getCustomers(),
  ]);

  const { filters, pagination, summary } = production;
  const customersById = new Map(customers.map((customer) => [customer.id, customer]));
  const orderItemsByOrder = groupByKey(production.orderItems, (item) => item.orderId);
  const previousHref = buildProductionHref({
    status: filters.status,
    startDate: filters.startDate,
    endDate: filters.endDate,
    page: pagination.page - 1,
  });
  const nextHref = buildProductionHref({
    status: filters.status,
    startDate: filters.startDate,
    endDate: filters.endDate,
    page: pagination.page + 1,
  });

  return (
    <div className="space-y-6">
      <PageTitle
        title="Produção"
        description="Acompanhe todos os pedidos por status e período para organizar a rotina e preparar futuros relatórios."
      />

      <SectionCard title="Filtros" description="Use o intervalo para fechar uma semana, um mês ou qualquer período de produção.">
        <form className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_auto_auto]" action="/producao">
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              name="status"
              className="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm text-cocoa-700"
              defaultValue={filters.status}
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="inicio">Início</Label>
            <Input id="inicio" name="inicio" type="date" defaultValue={filters.startDate} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fim">Fim</Label>
            <Input id="fim" name="fim" type="date" defaultValue={filters.endDate} />
          </div>
          <div className="flex items-end">
            <Button className="w-full" type="submit">
              <Filter className="h-4 w-4" />
              Filtrar
            </Button>
          </div>
          <div className="flex items-end">
            <Button asChild className="w-full" variant="outline">
              <Link href="/producao">Limpar</Link>
            </Button>
          </div>
        </form>
      </SectionCard>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-cream-300 bg-card p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-cocoa-400">Pedidos filtrados</p>
          <p className="mt-2 text-2xl font-semibold text-cocoa-800">{summary.filteredOrders}</p>
          <p className="mt-1 text-sm text-cocoa-500">de {summary.allOrders} pedidos cadastrados</p>
        </div>
        <div className="rounded-xl border border-cream-300 bg-card p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-cocoa-400">Em aberto</p>
          <p className="mt-2 text-2xl font-semibold text-cocoa-800">{summary.openOrders}</p>
          <p className="mt-1 text-sm text-cocoa-500">sem entregue ou cancelado</p>
        </div>
        <div className="rounded-xl border border-cream-300 bg-card p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-cocoa-400">Valor no filtro</p>
          <p className="mt-2 text-2xl font-semibold text-brand-700">{formatCurrency(summary.totalRevenue)}</p>
          <p className="mt-1 text-sm text-cocoa-500">cancelados fora da conta</p>
        </div>
      </div>

      <SectionCard
        title="Pedidos"
        description="Lista paginada por data de entrega, com cliente, itens, pagamento e snapshots financeiros."
      >
        {production.orders.length === 0 ? (
          <EmptyState
            title="Nenhum pedido encontrado"
            description="Ajuste o status ou o período para ver os pedidos cadastrados."
            icon={<ClipboardList className="h-9 w-9" />}
          />
        ) : (
          <div className="space-y-3">
            {production.orders.map((order) => {
              const customer = order.customerId ? customersById.get(order.customerId) : undefined;
              const items = orderItemsByOrder.get(order.id) ?? [];

              return (
                <article key={order.id} className="rounded-xl border border-cream-300 bg-card p-4 shadow-sm">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xs font-semibold uppercase text-cocoa-400">{formatOrderLabel(order.orderNumber)}</p>
                        <Badge variant="cream">
                          <CalendarDays className="mr-1 h-3.5 w-3.5" />
                          {formatDateTime(order.deliveryDate, order.deliveryTime)}
                        </Badge>
                      </div>
                      <h2 className="mt-2 text-base font-semibold text-cocoa-800">
                        {customer?.name ?? "Cliente não informado"}
                      </h2>
                      <p className="mt-2 text-sm text-cocoa-500">
                        {items
                          .map((item) => `${item.quantity.toLocaleString("pt-BR")}x ${item.name}`)
                          .join(", ") || "Sem itens cadastrados"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <OrderStatusBadge status={order.status} />
                      <PaymentStatusBadge status={order.paymentStatus} />
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 rounded-xl bg-cream-50 p-3 sm:grid-cols-3">
                    <div>
                      <p className="text-xs font-semibold uppercase text-cocoa-400">Total</p>
                      <p className="font-semibold text-cocoa-800">{formatCurrency(order.totalPrice)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase text-cocoa-400">Custo</p>
                      <p className="font-semibold text-cocoa-800">{formatCurrency(order.totalCostSnapshot)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase text-cocoa-400">Lucro</p>
                      <p className="font-semibold text-brand-700">{formatCurrency(order.estimatedProfitSnapshot)}</p>
                    </div>
                  </div>

                  {order.notes ? (
                    <p className="mt-3 rounded-xl bg-blush-50 px-3 py-2 text-sm text-cocoa-600">{order.notes}</p>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </SectionCard>

      <div className="flex flex-col gap-3 rounded-xl border border-cream-300 bg-card p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm text-cocoa-500">
          <PackageCheck className="h-4 w-4 text-brand-700" />
          Página {pagination.page} de {pagination.totalPages} · {pagination.totalOrders} pedido(s)
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" className={!pagination.hasPreviousPage ? "pointer-events-none opacity-50" : ""}>
            <Link href={previousHref} scroll={false}>
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Link>
          </Button>
          <Button asChild variant="outline" className={!pagination.hasNextPage ? "pointer-events-none opacity-50" : ""}>
            <Link href={nextHref} scroll={false}>
              Próxima
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
