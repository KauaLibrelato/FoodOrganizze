import { Buffer } from "node:buffer";
import type { BusinessPaymentSettings, Customer, Order, OrderItem } from "@/types";
import { BRAND_NAME } from "@/lib/brand";
import { formatCurrency, formatDate, formatDateTime, formatOrderLabel } from "@/lib/calculations";

type PdfColor = "brand" | "brandDark" | "cream" | "creamSoft" | "card" | "cocoa" | "muted" | "line" | "blush" | "green" | "blue" | "white";

const statusLabels: Record<Order["status"], string> = {
  novo: "Novo",
  confirmado: "Confirmado",
  em_producao: "Em producao",
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
  credito: "Cartao de credito",
  debito: "Cartao de debito",
  transferencia: "Transferencia",
  outro: "Outro",
};

const palette: Record<PdfColor, string> = {
  brand: "0.690 0.133 0.263",
  brandDark: "0.337 0.075 0.133",
  cream: "0.988 0.965 0.886",
  creamSoft: "1 0.992 0.969",
  card: "1 0.988 0.957",
  cocoa: "0.141 0.075 0.067",
  muted: "0.396 0.275 0.216",
  line: "0.918 0.827 0.647",
  blush: "1 0.949 0.949",
  green: "0.925 0.992 0.965",
  blue: "0.929 0.969 0.992",
  white: "1 1 1",
};

function normalizeText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "");
}

function escapePdfString(value: string) {
  return normalizeText(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrapText(text: string, maxChars: number) {
  const words = normalizeText(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) lines.push(current);
  return lines.length ? lines : [""];
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

class Pdf {
  private readonly width = 595;
  private readonly height = 842;
  private content = "";

  rect(x: number, top: number, w: number, h: number, fill: PdfColor, stroke?: PdfColor) {
    const bottom = top - h;
    const strokeCommand = stroke ? ` ${palette[stroke]} RG` : "";
    this.content += `${palette[fill]} rg${strokeCommand}\n${x} ${bottom} ${w} ${h} re ${stroke ? "B" : "f"}\n`;
  }

  line(x1: number, y1: number, x2: number, y2: number, color: PdfColor = "line", width = 1) {
    this.content += `${palette[color]} RG\n${width} w\n${x1} ${y1} m ${x2} ${y2} l S\n`;
  }

  text(text: string, x: number, baseline: number, options: { size?: number; bold?: boolean; color?: PdfColor } = {}) {
    const size = options.size ?? 10;
    const font = options.bold ? "F2" : "F1";
    const color = options.color ?? "cocoa";
    this.content += `BT\n${palette[color]} rg\n/${font} ${size} Tf\n1 0 0 1 ${x} ${baseline} Tm\n(${escapePdfString(text)}) Tj\nET\n`;
  }

  wrappedText(text: string, x: number, baseline: number, maxChars: number, options: { size?: number; bold?: boolean; color?: PdfColor; lineGap?: number } = {}) {
    const size = options.size ?? 10;
    const lineGap = options.lineGap ?? 4;
    let y = baseline;
    for (const line of wrapText(text, maxChars)) {
      this.text(line, x, y, options);
      y -= size + lineGap;
    }
    return y;
  }

  finish() {
    const objects = [
      "<< /Type /Catalog /Pages 2 0 R >>",
      "<< /Type /Pages /Kids [5 0 R] /Count 1 >>",
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${this.width} ${this.height}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents 6 0 R >>`,
      `<< /Length ${Buffer.byteLength(this.content, "latin1")} >>\nstream\n${this.content}\nendstream`,
    ];

    let pdf = "%PDF-1.4\n";
    const offsets = [0];

    objects.forEach((object, index) => {
      offsets.push(Buffer.byteLength(pdf, "latin1"));
      pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
    });

    const xrefOffset = Buffer.byteLength(pdf, "latin1");
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    offsets.slice(1).forEach((offset) => {
      pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
    });
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

    return Buffer.from(pdf, "latin1");
  }
}

function drawChip(pdf: Pdf, label: string, x: number, y: number, color: PdfColor = "creamSoft") {
  pdf.rect(x, y, 78, 20, color, "line");
  pdf.text(label, x + 12, y - 13, { size: 9, bold: true, color: color === "blue" ? "brand" : "cocoa" });
}

function drawInfoBlock(pdf: Pdf, options: { x: number; top: number; width: number; height: number; title: string; rows: string[]; accent?: boolean }) {
  pdf.rect(options.x, options.top, options.width, options.height, options.accent ? "blue" : "creamSoft", "line");
  drawChip(pdf, options.title, options.x + 14, options.top - 18, options.accent ? "blue" : "creamSoft");
  let y = options.top - 58;
  options.rows.filter(Boolean).forEach((row, index) => {
    y = pdf.wrappedText(row, options.x + 14, y, Math.floor(options.width / 6), {
      size: index === 0 ? 11 : 9,
      bold: index === 0,
      color: index === 0 ? "cocoa" : "muted",
      lineGap: 3,
    });
  });
}

function drawPaymentDetails(pdf: Pdf, settings: BusinessPaymentSettings | null | undefined, x: number, top: number, width: number) {
  const hasPaymentData = Boolean(settings?.pixKey || settings?.pixHolderName || settings?.bankName || settings?.paymentLink || settings?.paymentInstructions);
  pdf.rect(x, top, width, hasPaymentData ? 110 : 62, "green", "line");
  pdf.text("DADOS PARA PAGAMENTO", x + 16, top - 25, { size: 9, bold: true, color: "brand" });

  if (!hasPaymentData) {
    pdf.text("Cadastre Pix ou link em Financeiro para aparecer aqui.", x + 16, top - 48, { size: 9, color: "muted" });
    return;
  }

  let y = top - 48;
  if (settings?.pixKey) {
    pdf.text(`Pix: ${settings.pixKey}`, x + 16, y, { size: 10, bold: true, color: "cocoa" });
    y -= 17;
  }
  if (settings?.pixHolderName) {
    pdf.text(`Favorecido: ${settings.pixHolderName}`, x + 16, y, { size: 10, bold: true, color: "cocoa" });
    y -= 17;
  }
  if (settings?.bankName) {
    pdf.text(`Banco: ${settings.bankName}`, x + 16, y, { size: 10, bold: true, color: "cocoa" });
    y -= 17;
  }
  if (settings?.paymentLink) {
    y = pdf.wrappedText(`Link: ${settings.paymentLink}`, x + 16, y, 56, { size: 9, color: "muted", lineGap: 3 });
  }
  if (settings?.paymentInstructions) {
    pdf.wrappedText(settings.paymentInstructions, x + 16, y - 4, 56, { size: 9, color: "muted", lineGap: 3 });
  }
}

export function createOrderPdf(order: Order, items: OrderItem[], customer?: Customer, paymentSettings?: BusinessPaymentSettings | null) {
  const pdf = new Pdf();
  const x = 80;
  const width = 435;
  let top = 820;

  pdf.rect(0, 842, 595, 842, "cream", "cream");
  pdf.rect(x, top, width, 6, "brand");
  top -= 30;

  pdf.text(BRAND_NAME, x + 16, top - 22, { size: 24, bold: true, color: "brand" });
  pdf.text("ORCAMENTO", x + width - 104, top - 12, { size: 9, bold: true, color: "muted" });
  pdf.text(formatOrderLabel(order.orderNumber), x + width - 136, top - 37, { size: 18, bold: true, color: "cocoa" });
  pdf.text(`Emissao: ${formatDate(new Date().toISOString().slice(0, 10))}`, x + width - 136, top - 57, { size: 10, color: "muted" });
  top -= 104;

  const gap = 12;
  const half = (width - gap) / 2;
  drawInfoBlock(pdf, {
    x,
    top,
    width: half,
    height: 108,
    title: "Cliente",
    rows: [customer?.name ?? "Cliente nao informado", customer?.phone ?? "", customer?.address ?? ""],
  });
  drawInfoBlock(pdf, {
    x: x + half + gap,
    top,
    width: half,
    height: 108,
    title: "Entrega",
    rows: [formatDateTime(order.deliveryDate, order.deliveryTime), statusLabels[order.status]],
    accent: true,
  });
  top -= 124;

  drawInfoBlock(pdf, {
    x,
    top,
    width,
    height: 78,
    title: "Pagamento",
    rows: [paymentStatusLabels[order.paymentStatus], order.paymentMethod ? paymentMethodLabels[order.paymentMethod] : "Forma de pagamento a combinar"],
  });
  top -= 100;

  pdf.rect(x, top, width, 32, "creamSoft", "line");
  pdf.text("PEDIDO", x + 16, top - 20, { size: 9, bold: true, color: "muted" });
  pdf.text("TOTAL", x + width - 54, top - 20, { size: 9, bold: true, color: "muted" });
  top -= 32;

  if (items.length === 0) {
    pdf.rect(x, top, width, 38, "card", "line");
    pdf.text("Sem produtos ou receitas vinculados.", x + 16, top - 24, { size: 10, color: "muted" });
    top -= 50;
  } else {
    for (const item of items) {
      const notes = item.notes ? wrapText(item.notes, 42) : [];
      const rowHeight = 42 + notes.length * 12;
      pdf.rect(x, top, width, rowHeight, "card", "line");
      pdf.wrappedText(formatItemTitle(item), x + 16, top - 22, 38, { size: 11, bold: true, color: "cocoa", lineGap: 2 });
      pdf.text(formatCurrency(item.totalPrice), x + width - 84, top - 22, { size: 11, bold: true, color: "cocoa" });
      let notesY = top - 38;
      notes.forEach((note) => {
        pdf.text(note, x + 16, notesY, { size: 8, color: "muted" });
        notesY -= 12;
      });
      top -= rowHeight;
    }
    top -= 14;
  }

  if (order.notes) {
    pdf.rect(x, top, width, 48, "blush", "line");
    pdf.wrappedText(order.notes, x + 16, top - 24, 58, { size: 10, color: "muted", lineGap: 3 });
    top -= 62;
  }

  pdf.rect(x, top, width, 112, "blush", "line");
  pdf.text("Subtotal", x + 16, top - 27, { size: 10, color: "muted" });
  pdf.text(formatCurrency(order.subtotal), x + width - 90, top - 27, { size: 10, bold: true, color: "cocoa" });
  pdf.text("Desconto", x + 16, top - 47, { size: 10, color: "muted" });
  pdf.text(formatCurrency(order.discount), x + width - 90, top - 47, { size: 10, bold: true, color: "cocoa" });
  pdf.text("Entrega", x + 16, top - 67, { size: 10, color: "muted" });
  pdf.text(formatCurrency(order.deliveryFee), x + width - 90, top - 67, { size: 10, bold: true, color: "cocoa" });
  pdf.rect(x + 16, top - 84, width - 32, 22, "card");
  pdf.text("TOTAL", x + 28, top - 99, { size: 10, bold: true, color: "cocoa" });
  pdf.text(formatCurrency(order.totalPrice), x + width - 116, top - 99, { size: 16, bold: true, color: "brand" });
  top -= 128;

  drawPaymentDetails(pdf, paymentSettings, x, top, width);

  return pdf.finish();
}
