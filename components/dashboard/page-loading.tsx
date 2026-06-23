import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type PageLoadingProps = {
  variant?: "dashboard" | "form" | "list";
};

function StatSkeleton() {
  return (
    <div className="rounded-xl border border-cream-300 bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="w-full space-y-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-3 w-40" />
        </div>
        <Skeleton className="h-10 w-10 rounded-2xl" />
      </div>
    </div>
  );
}

function ItemSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div className="rounded-xl border border-cream-300 bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-full max-w-md" />
        </div>
        <Skeleton className="h-7 w-24 rounded-full" />
      </div>
      {!compact ? (
        <div className="mt-4 grid gap-3 rounded-xl bg-cream-50 p-3 sm:grid-cols-3">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
      ) : null}
    </div>
  );
}

function FormSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-11 w-full" />
      <div className="grid gap-3 sm:grid-cols-2">
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-11 w-full" />
      </div>
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-11 w-full" />
    </div>
  );
}

export function PageLoading({ variant = "dashboard" }: PageLoadingProps) {
  const showStats = variant === "dashboard";
  const gridClass = cn(
    "grid gap-4",
    variant === "form" ? "xl:grid-cols-[0.95fr_1.05fr]" : "xl:grid-cols-[1.1fr_0.9fr]",
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-full max-w-xl" />
        </div>
        <Skeleton className="h-11 w-36" />
      </div>

      {showStats ? (
        <div className="grid gap-3 md:grid-cols-3">
          <StatSkeleton />
          <StatSkeleton />
          <StatSkeleton />
        </div>
      ) : (
        <Skeleton className="h-11 w-full max-w-md" />
      )}

      <div className={gridClass}>
        <div className="rounded-xl border border-cream-300 bg-card p-4 shadow-sm sm:p-5">
          <div className="mb-4 space-y-2">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-64 max-w-full" />
          </div>
          <div className="space-y-3">
            <ItemSkeleton />
            <ItemSkeleton />
            <ItemSkeleton compact />
          </div>
        </div>

        <div className="rounded-xl border border-cream-300 bg-card p-4 shadow-sm sm:p-5">
          <div className="mb-4 space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-56 max-w-full" />
          </div>
          {variant === "list" ? (
            <div className="space-y-3">
              <ItemSkeleton compact />
              <ItemSkeleton compact />
              <ItemSkeleton compact />
            </div>
          ) : (
            <FormSkeleton />
          )}
        </div>
      </div>
    </div>
  );
}
