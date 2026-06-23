import { ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  title: string;
  description: string;
  icon?: React.ReactNode;
  className?: string;
};

export function EmptyState({ title, description, icon, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex min-h-56 flex-col items-center justify-center rounded-xl border border-dashed border-cream-300 bg-cream-50/80 p-7 text-center",
        className,
      )}
    >
      <div className="relative mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-card shadow-sm">
        <div className="absolute -right-2 -top-2 h-5 w-5 rounded-full bg-blush-100" />
        <div className="absolute -bottom-1 -left-2 h-4 w-4 rounded-full bg-cream-300" />
        <div className="text-brand-700">
          {icon ?? <ClipboardList className="h-9 w-9" />}
        </div>
      </div>
      <h3 className="text-lg font-semibold text-cocoa-800">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-6 text-cocoa-500">{description}</p>
    </div>
  );
}
