import type { Ingredient, OrderItem, RecipeIngredient, Unit } from "@/types";

export type ProductionRecipeIngredient = RecipeIngredient & {
  ingredient: Ingredient;
};

export type ProductionOrderItem = OrderItem & {
  recipeIngredients?: ProductionRecipeIngredient[];
};

export type ProductionIngredientTotal = {
  ingredientId: string;
  name: string;
  unit: Unit;
  requiredQuantity: number;
  currentStock: number;
  estimatedCost: number;
  insufficientQuantity: number;
};

export function calculateProductionIngredients(orderItems: ProductionOrderItem[]) {
  const totals = new Map<string, ProductionIngredientTotal>();

  for (const orderItem of orderItems) {
    if (orderItem.quantity <= 0) {
      continue;
    }

    for (const recipeIngredient of orderItem.recipeIngredients ?? []) {
      const ingredient = recipeIngredient.ingredient;
      const existing = totals.get(ingredient.id);
      const requiredQuantity = recipeIngredient.convertedQuantity * orderItem.quantity;

      if (existing) {
        existing.requiredQuantity += requiredQuantity;
        existing.estimatedCost += requiredQuantity * ingredient.averageCost;
        existing.insufficientQuantity = Math.max(0, existing.requiredQuantity - ingredient.currentStock);
      } else {
        totals.set(ingredient.id, {
          ingredientId: ingredient.id,
          name: ingredient.name,
          unit: ingredient.baseUnit,
          requiredQuantity,
          currentStock: ingredient.currentStock,
          estimatedCost: requiredQuantity * ingredient.averageCost,
          insufficientQuantity: Math.max(0, requiredQuantity - ingredient.currentStock),
        });
      }
    }
  }

  return Array.from(totals.values());
}
