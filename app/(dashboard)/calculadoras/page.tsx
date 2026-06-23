import { PageTitle } from "@/components/dashboard/page-title";
import { CalculatorPanel } from "@/components/calculators/calculator-panel";
import { getRecipeIngredients, getRecipes } from "@/lib/data";

export default async function CalculatorsPage() {
  const [recipes, recipeIngredients] = await Promise.all([getRecipes(), getRecipeIngredients()]);
  const resizeRecipes = recipes.map((recipe) => ({
    id: recipe.id,
    name: recipe.name,
    yieldQuantity: recipe.yieldQuantity,
    yieldUnit: recipe.yieldUnit,
    items: recipeIngredients
      .filter((item) => item.recipeId === recipe.id && item.ingredient)
      .map((item) => ({
        id: item.id,
        name: item.ingredient?.name ?? "Insumo",
        quantity: item.quantity,
        unit: item.unit,
      })),
  }));

  return (
    <div className="space-y-6">
      <PageTitle
        title="Calculadoras"
        description="Preço, rendimento e aumento de receita sem abrir planilha."
      />
      <CalculatorPanel recipes={resizeRecipes} />
    </div>
  );
}
