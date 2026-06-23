import { Badge } from "@/components/ui/badge";
import type { OrderStatus, PaymentStatus } from "@/types";

const orderLabels: Record<OrderStatus, string> = {
  novo: "Novo",
  confirmado: "Confirmado",
  em_producao: "Em produção",
  pronto: "Pronto",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

const orderVariants: Record<OrderStatus, React.ComponentProps<typeof Badge>["variant"]> = {
  novo: "rose",
  confirmado: "blue",
  em_producao: "amber",
  pronto: "green",
  entregue: "neutral",
  cancelado: "outline",
};

const paymentLabels: Record<PaymentStatus, string> = {
  pendente: "Pendente",
  sinal_pago: "Sinal pago",
  pago: "Pago",
  atrasado: "Atrasado",
  cancelado: "Cancelado",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge variant={orderVariants[status]}>{orderLabels[status]}</Badge>;
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return <Badge variant={status === "pago" ? "green" : status === "atrasado" ? "amber" : "rose"}>{paymentLabels[status]}</Badge>;
}
