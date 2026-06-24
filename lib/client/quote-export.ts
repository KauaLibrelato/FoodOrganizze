"use client";

import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

const quoteSelector = "quote-card";

function getQuoteCard() {
  const element = document.getElementById(quoteSelector);
  if (!element) {
    throw new Error("Orçamento não encontrado na tela.");
  }
  return element;
}

async function renderQuoteCanvas() {
  const element = getQuoteCard();
  const originalWidth = element.style.width;
  const originalMaxWidth = element.style.maxWidth;

  element.style.width = "460px";
  element.style.maxWidth = "460px";

  const canvas = await html2canvas(element, {
    backgroundColor: "#fcf6e2",
    scale: Math.min(3, window.devicePixelRatio || 2),
    useCORS: true,
    allowTaint: true,
    logging: false,
    windowWidth: element.scrollWidth,
    windowHeight: element.scrollHeight,
  });

  element.style.width = originalWidth;
  element.style.maxWidth = originalMaxWidth;

  return canvas;
}

export async function downloadQuoteImage(filename = "orcamento-casa-fratoni.png") {
  const canvas = await renderQuoteCanvas();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png", 1));

  if (!blob) {
    throw new Error("Não foi possível gerar a imagem.");
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function downloadQuotePdf(filename = "orcamento-casa-fratoni.pdf") {
  const canvas = await renderQuoteCanvas();
  const image = canvas.toDataURL("image/png", 1);
  const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4", compress: true });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 24;
  const maxWidth = pageWidth - margin * 2;
  const maxHeight = pageHeight - margin * 2;
  const ratio = Math.min(maxWidth / canvas.width, maxHeight / canvas.height);
  const imageWidth = canvas.width * ratio;
  const imageHeight = canvas.height * ratio;
  const x = (pageWidth - imageWidth) / 2;
  const y = margin;

  pdf.addImage(image, "PNG", x, y, imageWidth, imageHeight);
  pdf.save(filename);
}
