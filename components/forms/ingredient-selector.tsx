import type { Ingredient } from "@/types";

type IngredientSelectorProps = {
  ingredients: Ingredient[];
  value?: string;
  onChange?: (ingredientId: string) => void;
};

export function IngredientSelector({ ingredients, value, onChange }: IngredientSelectorProps) {
  return (
    <select
      value={value}
      onChange={(event) => onChange?.(event.target.value)}
      className="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <option value="">Escolha um insumo</option>
      {ingredients.map((ingredient) => (
        <option key={ingredient.id} value={ingredient.id}>
          {ingredient.name}
        </option>
      ))}
    </select>
  );
}
