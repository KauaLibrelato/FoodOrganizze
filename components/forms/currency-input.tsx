import { Input, type InputProps } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type CurrencyInputProps = Omit<InputProps, "type" | "inputMode">;

export function CurrencyInput({ className, ...props }: CurrencyInputProps) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-cocoa-400">
        R$
      </span>
      <Input type="text" inputMode="decimal" placeholder="0,00" {...props} className={cn("pl-10", className)} />
    </div>
  );
}
