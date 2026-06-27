import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { BrandLogo } from "@/components/brand/brand-logo";
import { QuoteImageButton } from "@/components/orders/quote-image-button";
import { QuotePdfButton } from "@/components/orders/quote-pdf-button";
import { QuotePrintButton } from "@/components/orders/quote-print-button";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate, formatDateTime, formatOrderLabel } from "@/lib/calculations";
import { getBusinessPaymentSettings, getCustomerById, getOrderById, getOrderItemsByOrderId } from "@/lib/data";
import { BRAND_NAME } from "@/lib/brand";
import type { BusinessPaymentSettings, Customer, Order, OrderItem } from "@/types";

type PageProps = {
  params: Promise<{
    orderId: string;
  }>;
};

const statusLabels: Record<Order["status"], string> = {
  novo: "Novo",
  confirmado: "Confirmado",
  em_producao: "Em produção",
  pronto: "Pronto",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

const paymentStatusLabels: Record<Order["paymentStatus"], string> = {
  pendente: "Pendente",
  sinal_pago: "Sinal pago",
  pago: "Pago",
  atrasado: "Atrasado",
  cancelado: "Cancelado",
};

const paymentMethodLabels: Record<NonNullable<Order["paymentMethod"]>, string> = {
  dinheiro: "Dinheiro",
  pix: "Pix",
  credito: "Cartão de crédito",
  debito: "Cartão de débito",
  transferencia: "Transferência",
  outro: "Outro",
};

function digitsOnly(value?: string | null) {
  return value?.replace(/\D/g, "") ?? "";
}

function formatQuantity(item: OrderItem) {
  return item.quantity.toLocaleString("pt-BR", {
    maximumFractionDigits: item.quantityUnit === "un" ? 0 : 3,
  });
}

function formatItemTitle(item: OrderItem) {
  const unit = item.quantityUnit === "un" ? "" : ` ${item.quantityUnit}`;
  return `${formatQuantity(item)}${unit} ${item.name}`;
}

function buildWhatsappUrl(order: Order, items: OrderItem[], customer?: Customer, paymentSettings?: BusinessPaymentSettings | null) {
  const text = [
    `Olá${customer?.name ? `, ${customer.name}` : ""}! Segue o orçamento do ${BRAND_NAME}:`,
    `${formatOrderLabel(order.orderNumber)} - entrega ${formatDateTime(order.deliveryDate, order.deliveryTime)}`,
    ...items.map((item) => `${formatItemTitle(item)}: ${formatCurrency(item.totalPrice)}`),
    order.deliveryFee > 0 ? `Entrega: ${formatCurrency(order.deliveryFee)}` : "",
    order.discount > 0 ? `Desconto: ${formatCurrency(order.discount)}` : "",
    `Total: ${formatCurrency(order.totalPrice)}`,
    paymentSettings?.pixKey ? `Pix: ${paymentSettings.pixKey}` : "",
    paymentSettings?.paymentLink ? `Link de pagamento: ${paymentSettings.paymentLink}` : "",
    paymentSettings?.paymentInstructions ?? "",
  ].filter(Boolean);

  const phone = digitsOnly(customer?.phone);
  const target = phone ? (phone.startsWith("55") ? phone : `55${phone}`) : "";
  return `https://wa.me/${target}?text=${encodeURIComponent(text.join("\n"))}`;
}

export default async function OrderQuotePage({ params }: PageProps) {
  const { orderId } = await params;
  const [order, items, paymentSettings] = await Promise.all([
    getOrderById(orderId),
    getOrderItemsByOrderId(orderId),
    getBusinessPaymentSettings(),
  ]);

  if (!order) notFound();

  const customer = order.customerId ? (await getCustomerById(order.customerId)) ?? undefined : undefined;
  const whatsappUrl = buildWhatsappUrl(order, items, customer, paymentSettings);
  const emissionDate = formatDate(new Date().toISOString().slice(0, 10));
  const actionButtonClass = "h-10 min-h-10 justify-center px-3 text-xs font-semibold sm:text-sm";

  return (
    <div className="mx-auto max-w-5xl space-y-4 print:max-w-none print:space-y-0">
      <div className="rounded-2xl border border-cream-300 bg-card/80 p-2 shadow-sm print:hidden">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <Button asChild variant="ghost" className="h-10 min-h-10 justify-start px-3 text-sm font-semibold">
            <Link href="/pedidos">
              <ArrowLeft className="h-4 w-4" />
              Pedidos
            </Link>
          </Button>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:flex lg:items-center">
            <QuotePdfButton className={actionButtonClass} />
            <Button asChild variant="subtle" className={actionButtonClass}>
              <a href={whatsappUrl} target="_blank" rel="noreferrer">
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </a>
            </Button>
            <QuoteImageButton className={actionButtonClass} />
            <QuotePrintButton className={actionButtonClass} />
          </div>
        </div>
      </div>

      <section id="quote-card" className="mx-auto max-w-[460px] overflow-hidden rounded-[1rem] border border-cream-300 bg-card shadow-card print:rounded-none print:border-0 print:shadow-none">
        <div className="border-t-8 border-brand-500 bg-cream-50 px-4 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center">
              <BrandLogo className="w-32" />
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-cocoa-400">Orçamento</p>
              <h1 className="mt-1 text-lg font-bold text-cocoa-800">{formatOrderLabel(order.orderNumber)}</h1>
              <p className="mt-1 text-[11px] font-medium text-cocoa-500">Emissão: {emissionDate}</p>
            </div>
          </div>
        </div>

        <div className="space-y-3 px-4 py-4">
          <div className="grid grid-cols-2 gap-3">
            <InfoBlock title="Cliente">
              <p className="font-semibold text-cocoa-800">{customer?.name ?? "Cliente não informado"}</p>
              {customer?.phone ? <p className="mt-1 text-sm text-cocoa-500">{customer.phone}</p> : null}
              {customer?.address ? <p className="mt-1 text-sm leading-5 text-cocoa-500">{customer.address}</p> : null}
            </InfoBlock>
            <InfoBlock title="Entrega" accent>
              <p className="font-semibold text-cocoa-800">{formatDateTime(order.deliveryDate, order.deliveryTime)}</p>
              <p className="mt-1 text-sm text-cocoa-500">{statusLabels[order.status]}</p>
            </InfoBlock>
            <InfoBlock title="Pagamento" className="col-span-2">
              <p className="font-semibold text-cocoa-800">{paymentStatusLabels[order.paymentStatus]}</p>
              <p className="mt-1 text-sm text-cocoa-500">
                {order.paymentMethod ? paymentMethodLabels[order.paymentMethod] : "Forma de pagamento a combinar"}
              </p>
            </InfoBlock>
          </div>

          <div className="overflow-hidden rounded-xl border border-cream-300">
            <div className="grid grid-cols-[1fr_auto] gap-3 border-b border-cream-300 bg-cream-50 px-3 py-2.5 text-[10px] font-bold uppercase tracking-[0.16em] text-cocoa-400">
              <span>Pedido</span>
              <span>Total</span>
            </div>
            <div className="divide-y divide-cream-300 bg-card">
              {items.length > 0 ? (
                items.map((item) => (
                  <div key={item.id} className="grid grid-cols-[1fr_auto] gap-3 px-3 pb-5 pt-4">
                    <div>
                      <p className="text-sm font-semibold text-cocoa-800">
                        {formatItemTitle(item)}
                      </p>
                      {item.notes ? (
                        <p className="mt-2 rounded-xl bg-cream-50 px-3 py-2 text-sm leading-5 text-cocoa-500">{item.notes}</p>
                      ) : null}
                    </div>
                    <p className="whitespace-nowrap text-sm font-semibold text-cocoa-800">{formatCurrency(item.totalPrice)}</p>
                  </div>
                ))
              ) : (
                <p className="px-4 py-4 text-sm text-cocoa-500">Sem produtos ou receitas vinculados.</p>
              )}
            </div>
          </div>

          <div className="grid gap-3">
            <div className="rounded-xl border border-blush-100 bg-blush-50 px-3 py-3 text-sm leading-6 text-cocoa-600">
              {order.notes ? order.notes : "Agradecemos pela confiança em nosso trabalho."}
            </div>
            <div className="rounded-xl border border-blush-200 bg-blush-50 p-3">
              <div className="space-y-2 text-sm">
                <SummaryLine label="Subtotal" value={order.subtotal} />
                <SummaryLine label="Desconto" value={order.discount} />
                <SummaryLine label="Entrega" value={order.deliveryFee} />
              </div>
              <div className="mt-3 flex items-center justify-between rounded-xl bg-card px-3 py-3 shadow-sm">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-cocoa-700">Total</span>
                <span className="text-xl font-bold text-brand-700">{formatCurrency(order.totalPrice)}</span>
              </div>
            </div>
          </div>

          <PaymentDetails settings={paymentSettings} fallbackMethod={order.paymentMethod ? paymentMethodLabels[order.paymentMethod] : "Pagamento a combinar"} />
        </div>
      </section>
    </div>
  );
}

function InfoBlock({
  title,
  children,
  accent = false,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  accent?: boolean;
  className?: string;
}) {
  return (
    <div
      className={
        accent
          ? `rounded-xl border border-sky-100 bg-sky-50 p-3 ${className}`
          : `rounded-xl border border-cream-300 bg-cream-50 p-3 ${className}`
      }
    >
      <span
        className={
          accent
            ? "inline-flex h-8 min-w-28 items-center justify-center rounded-full border border-sky-200 bg-sky-50 px-4 pt-px text-sm font-semibold leading-none text-sky-800"
            : "inline-flex h-8 min-w-28 items-center justify-center rounded-full border border-cream-300 bg-cream-100 px-4 pt-px text-sm font-semibold leading-none text-cocoa-800"
        }
      >
        {title}
      </span>
      <div className="mt-2 text-sm">{children}</div>
    </div>
  );
}

function SummaryLine({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-cocoa-500">{label}</span>
      <span className="font-semibold text-cocoa-800">{formatCurrency(value)}</span>
    </div>
  );
}

function PaymentDetails({ settings, fallbackMethod }: { settings?: BusinessPaymentSettings | null; fallbackMethod: string }) {
  const hasPaymentData = Boolean(settings?.pixKey || settings?.paymentLink || settings?.pixHolderName || settings?.bankName || settings?.paymentInstructions);

  return (
    <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-800">Dados para pagamento</p>
      {hasPaymentData ? (
        <div className="mt-3 space-y-2 text-sm text-cocoa-700">
          {settings?.pixKey ? (
            <p>
              <span className="font-semibold text-cocoa-800">Pix:</span> {settings.pixKey}
            </p>
          ) : null}
          {settings?.pixHolderName ? (
            <p>
              <span className="font-semibold text-cocoa-800">Favorecido:</span> {settings.pixHolderName}
            </p>
          ) : null}
          {settings?.bankName ? (
            <p>
              <span className="font-semibold text-cocoa-800">Banco:</span> {settings.bankName}
            </p>
          ) : null}
          {settings?.paymentLink ? (
            <p>
              <span className="font-semibold text-cocoa-800">Link:</span> {settings.paymentLink}
            </p>
          ) : null}
          {settings?.paymentInstructions ? <p className="leading-6 text-cocoa-600">{settings.paymentInstructions}</p> : null}
        </div>
      ) : (
        <>
          <p className="mt-2 text-sm font-semibold text-cocoa-800">{fallbackMethod}</p>
          <p className="mt-1 text-sm text-cocoa-500">Cadastre Pix ou link em Financeiro para aparecer aqui.</p>
        </>
      )}
    </div>
  );
}
