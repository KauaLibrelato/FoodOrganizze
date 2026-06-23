import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-cream-200 text-cocoa-700",
        outline: "border-cream-300 bg-card/60 text-cocoa-600",
        rose: "border-blush-200 bg-blush-50 text-brand-700",
        amber: "border-amber-200 bg-amber-50 text-amber-800",
        green: "border-emerald-200 bg-emerald-50 text-emerald-800",
        blue: "border-sky-200 bg-sky-50 text-sky-800",
        neutral: "border-cream-300 bg-cream-50 text-cocoa-600",
        cream: "border-cream-300 bg-cream-100 text-cocoa-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
