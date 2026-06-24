"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadQuotePdf } from "@/lib/client/quote-export";

type QuotePdfButtonProps = {
  className?: string;
  label?: string;
};

export function QuotePdfButton({ className, label = "PDF" }: QuotePdfButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  async function handleDownload() {
    setIsExporting(true);
    try {
      await downloadQuotePdf();
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <Button type="button" variant="outline" className={className} onClick={handleDownload} disabled={isExporting}>
      <Download className="h-4 w-4" />
      {isExporting ? "Gerando..." : label}
    </Button>
  );
}
