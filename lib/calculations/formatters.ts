import type { Unit } from "@/types";

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatUnit(value: number, unit: Unit) {
  return `${new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: unit === "un" ? 0 : 3,
  }).format(value)} ${unit}`;
}

export function formatDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-");

  if (!year || !month || !day) {
    return value;
  }

  return `${day}/${month}/${year}`;
}

export function formatDateTime(date: string, time?: string | null) {
  const cleanTime = time ? time.slice(0, 5) : "";
  return cleanTime ? `${formatDate(date)} ${cleanTime}` : formatDate(date);
}

export function formatOrderLabel(orderNumber: string) {
  const cleanNumber = orderNumber.trim();

  if (/^pedido\s+\d+$/i.test(cleanNumber)) {
    return cleanNumber.replace(/^pedido/i, "Pedido");
  }

  const numericPart = cleanNumber.match(/\d+/g)?.join("");
  return numericPart ? `Pedido ${Number(numericPart)}` : "Pedido";
}
