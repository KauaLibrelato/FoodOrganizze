"use client";

import { useState } from "react";
import { ImageDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadQuoteImage } from "@/lib/client/quote-export";

type QuoteImageButtonProps = {
  className?: string;
  label?: string;
};

export function QuoteImageButton({ className, label = "Imagem" }: QuoteImageButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  async function handleDownload() {
    setIsExporting(true);
    try {
      await downloadQuoteImage();
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <Button type="button" variant="outline" className={className} onClick={handleDownload} disabled={isExporting}>
      <ImageDown className="h-4 w-4" />
      {isExporting ? "Gerando..." : label}
    </Button>
  );
}
