import { EmptyState } from "@/components/dashboard/empty-state";
import { Badge } from "@/components/ui/badge";
import type { RecipeIngredient } from "@/types";
import { formatUnit } from "@/lib/calculations";

type RecipeIngredientListProps = {
  items: RecipeIngredient[];
};

export function RecipeIngredientList({ items }: RecipeIngredientListProps) {
  if (items.length === 0) {
    return (
      <EmptyState
        title="Receita incompleta"
        description="Adicione ingredientes para calcular o custo da receita."
      />
    );
  }

  return (
    <div className="divide-y divide-border rounded-2xl border border-border bg-card">
      {items.map((item) => (
        <div key={item.id} className="flex items-center justify-between gap-4 p-4">
          <div>
            <p className="font-medium">{item.ingredient?.name ?? "Insumo"}</p>
            <p className="text-sm text-muted-foreground">
              {formatUnit(item.quantity, item.unit)}
            </p>
          </div>
          <Badge variant="rose">{formatUnit(item.convertedQuantity, item.ingredient?.baseUnit ?? item.unit)}</Badge>
        </div>
      ))}
    </div>
  );
}
