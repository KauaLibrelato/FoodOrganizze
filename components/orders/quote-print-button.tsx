"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

type QuotePrintButtonProps = {
  className?: string;
  label?: string;
};

export function QuotePrintButton({ className, label = "Imprimir" }: QuotePrintButtonProps) {
  return (
    <Button type="button" variant="secondary" className={className} onClick={() => window.print()}>
      <Printer className="h-4 w-4" />
      {label}
    </Button>
  );
}
