import { NextResponse } from "next/server";
import { createOrderPdf } from "@/lib/order-pdf";
import { getBusinessPaymentSettings, getCustomerById, getOrderById, getOrderItemsByOrderId } from "@/lib/data";
import { formatOrderLabel } from "@/lib/calculations";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    orderId: string;
  }>;
};

function filenameFor(orderNumber: string) {
  const cleanLabel = formatOrderLabel(orderNumber)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

  return `${cleanLabel || "pedido"}-casa-fratoni.pdf`;
}

export async function GET(_request: Request, context: RouteContext) {
  const { orderId } = await context.params;
  const [order, items, paymentSettings] = await Promise.all([
    getOrderById(orderId),
    getOrderItemsByOrderId(orderId),
    getBusinessPaymentSettings(),
  ]);

  if (!order) {
    return new NextResponse("Pedido nao encontrado.", { status: 404 });
  }

  const customer = order.customerId ? (await getCustomerById(order.customerId)) ?? undefined : undefined;
  const pdf = createOrderPdf(order, items, customer, paymentSettings);

  return new NextResponse(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filenameFor(order.orderNumber)}"`,
      "Cache-Control": "no-store",
    },
  });
}
