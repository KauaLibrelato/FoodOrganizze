import type { Ingredient, RecipeIngredient } from "@/types";

export type RecipeIngredientCost = RecipeIngredient & {
  ingredient: Ingredient;
};

export type RecipeCostItem = {
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  hasAverageCost: boolean;
};

export function calculateWeightedAverageCost(
  existingStock: number,
  existingAverageCost: number,
  newQuantity: number,
  newTotalPrice: number,
) {
  if (existingStock < 0 || existingAverageCost < 0 || newTotalPrice < 0) {
    throw new Error("Estoque, custo médio e preço não podem ser negativos.");
  }

  if (newQuantity <= 0) {
    throw new Error("A nova quantidade precisa ser maior que zero.");
  }

  const existingTotalCost = existingStock * existingAverageCost;
  const totalQuantity = existingStock + newQuantity;

  if (totalQuantity <= 0) {
    return newTotalPrice / newQuantity;
  }

  return (existingTotalCost + newTotalPrice) / totalQuantity;
}

export function calculateRecipeCost(recipeIngredients: RecipeIngredientCost[]) {
  const items: RecipeCostItem[] = recipeIngredients.map((item) => {
    const totalCost = item.convertedQuantity * item.ingredient.averageCost;

    return {
      ingredientId: item.ingredient.id,
      ingredientName: item.ingredient.name,
      quantity: item.convertedQuantity,
      unitCost: item.ingredient.averageCost,
      totalCost,
      hasAverageCost: item.ingredient.averageCost > 0,
    };
  });

  const missingPriceIngredients = recipeIngredients
    .filter((item) => item.ingredient.averageCost <= 0)
    .map((item) => item.ingredient.name);

  const totalCost = items.reduce((total, item) => total + item.totalCost, 0);

  return {
    totalCost,
    items,
    missingPriceIngredients,
    hasMissingPrices: missingPriceIngredients.length > 0,
  };
}

export function calculateRecipeCostPerYield(totalCost: number, yieldQuantity: number) {
  if (totalCost < 0) {
    throw new Error("O custo total não pode ser negativo.");
  }

  if (yieldQuantity <= 0) {
    throw new Error("O rendimento precisa ser maior que zero.");
  }

  return totalCost / yieldQuantity;
}

export function calculateProfit(salePrice: number, totalCost: number) {
  if (salePrice < 0 || totalCost < 0) {
    throw new Error("Preço de venda e custo total não podem ser negativos.");
  }

  return salePrice - totalCost;
}
