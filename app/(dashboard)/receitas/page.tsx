import Link from "next/link";
import { CookingPot, Pencil, Plus, Store } from "lucide-react";
import {
  addRecipeIngredientAction,
  createProductAction,
  createRecipeAction,
  deleteRecipeIngredientAction,
  deleteProductAction,
  deleteRecipeAction,
  updateRecipeIngredientAction,
  updateProductAction,
  updateRecipeAction,
} from "@/app/actions";
import { PageTitle } from "@/components/dashboard/page-title";
import { SectionCard } from "@/components/cards/section-card";
import { EmptyState } from "@/components/dashboard/empty-state";
import { ConfirmActionButton, ToastSubmitButton } from "@/components/forms/confirm-action-button";
import { CurrencyInput } from "@/components/forms/currency-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { calculateRecipeCost, calculateRecipeCostPerYield, formatCurrency, formatUnit } from "@/lib/calculations";
import { getIngredients, getProducts, getRecipeIngredients, getRecipes } from "@/lib/data";
import type { Product, Recipe, RecipeIngredient, Unit } from "@/types";

const units: Unit[] = ["g", "kg", "ml", "l", "un"];
const fieldClassName = "h-11 w-full rounded-xl border border-input bg-card px-3 text-sm text-cocoa-800";
const textAreaClassName =
  "min-h-28 w-full rounded-xl border border-input bg-card px-3 py-2 text-sm text-cocoa-800 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

type RecipesPageProps = {
  searchParams?: Promise<{
    receita?: string;
    produto?: string;
  }>;
};

export default async function RecipesPage({ searchParams }: RecipesPageProps) {
  const params = await searchParams;
  const [recipes, recipeIngredients, ingredients, products] = await Promise.all([
    getRecipes(),
    getRecipeIngredients(),
    getIngredients(),
    getProducts(),
  ]);
  const selectedRecipe = recipes.find((recipe) => recipe.id === params?.receita);
  const selectedProduct = products.find((product) => product.id === params?.produto);

  return (
    <div className="space-y-6">
      <PageTitle
        title="Receitas e produtos"
        description="Receita é custo, insumos e preparo. Produto é o que entra no pedido."
      />

      <div className="space-y-4">
        <SectionCard
          title="Receitas"
          description="Escolha uma receita para editar ou comece uma nova."
          contentClassName="overflow-hidden"
        >
          <div className="flex gap-3 overflow-x-auto pb-2">
            <Link
              href="/receitas"
              scroll={false}
              className={cn(
                "brand-focus flex min-h-[132px] min-w-[220px] flex-col justify-center rounded-xl border border-dashed border-cream-300 bg-cream-50/70 p-4 text-cocoa-600 transition-colors hover:border-blush-200 hover:bg-blush-50/70",
                !selectedRecipe && "border-blush-300 bg-blush-50 text-brand-700 shadow-sm",
              )}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-card text-brand-700 shadow-sm">
                <Plus className="h-5 w-5" />
              </span>
              <strong className="mt-3 text-sm">Nova receita</strong>
              <span className="mt-1 text-xs text-cocoa-500">Base, rendimento e preparo</span>
            </Link>
            {recipes.length === 0 ? (
              <div className="flex min-h-[132px] min-w-[280px] items-center rounded-xl border border-dashed border-cream-300 bg-cream-50/80 p-4 text-sm text-cocoa-500">
                Nenhuma receita cadastrada ainda.
              </div>
            ) : (
              recipes.map((recipe) => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  items={recipeIngredients.filter((item) => item.recipeId === recipe.id && item.ingredient)}
                  selected={recipe.id === selectedRecipe?.id}
                />
              ))
            )}
          </div>
        </SectionCard>

        <SectionCard
          title={selectedRecipe ? "Editar receita" : "Montar receita"}
          description={
            selectedRecipe
              ? "Ajuste a base, insumos e preparo no mesmo lugar."
              : "Salve a base da receita para liberar o cadastro dos insumos."
          }
        >
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)] xl:items-start">
            <div className="rounded-xl border border-cream-300 bg-cream-50/60 p-4">
              <p className="mb-4 font-semibold text-cocoa-800">Dados da receita</p>
              {selectedRecipe ? (
                <RecipeForm recipe={selectedRecipe} mode="edit" />
              ) : (
                <RecipeForm mode="create" />
              )}
            </div>

            <div className="rounded-xl border border-cream-300 bg-cream-50/60 p-4">
              <div className="mb-4">
                <p className="font-semibold text-cocoa-800">Insumos da receita</p>
                <p className="mt-1 text-sm text-cocoa-500">
                  {selectedRecipe
                    ? "Adicione ou ajuste o que entra no custo."
                    : "Depois de criar a receita, esta área fica liberada."}
                </p>
              </div>
              {selectedRecipe ? (
                  <>
                    <form action={addRecipeIngredientAction} className="rounded-xl border border-cream-300 bg-cream-50 p-3">
                      <input type="hidden" name="recipe_id" value={selectedRecipe.id} />
                      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_120px_96px_auto] sm:items-end">
                        <div className="space-y-1.5">
                          <Label htmlFor="ingredient_id">Insumo</Label>
                          <select id="ingredient_id" name="ingredient_id" required className={fieldClassName}>
                            <option value="">Escolha um insumo</option>
                            {ingredients.map((ingredient) => (
                              <option key={ingredient.id} value={ingredient.id}>
                                {ingredient.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="quantity">Qtd.</Label>
                          <Input id="quantity" name="quantity" required inputMode="decimal" placeholder="300" />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="unit">Unid.</Label>
                          <select id="unit" name="unit" className={fieldClassName}>
                            {units.map((unit) => (
                              <option key={unit} value={unit}>
                                {unit}
                              </option>
                            ))}
                          </select>
                        </div>
                        <ToastSubmitButton className="w-full sm:w-auto sm:px-4" successTitle="Insumo adicionado">
                          Adicionar
                        </ToastSubmitButton>
                      </div>
                    </form>
                    <RecipeDetails
                      items={recipeIngredients.filter((item) => item.recipeId === selectedRecipe.id && item.ingredient)}
                      ingredients={ingredients}
                    />
                </>
              ) : (
                <div className="rounded-xl border border-dashed border-cream-300 bg-card/70 p-4 text-sm leading-6 text-cocoa-500">
                  Primeiro salve nome, rendimento e preparo. Aí você volta aqui para colocar farinha,
                  chocolate, embalagem ou qualquer outro insumo que entra no custo.
                </div>
              )}
            </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Produtos" description="Clique em um produto para ver, editar ou excluir.">
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_430px]">
          <div className="grid auto-rows-max items-start gap-3 sm:grid-cols-[repeat(auto-fit,minmax(240px,1fr))]">
            {products.length === 0 ? (
              <EmptyState
                className="sm:col-span-2"
                title="Nenhum produto ainda"
                description="Produto é o nome vendável: brownie unidade, bolo P, cento de docinhos."
                icon={<Store className="h-9 w-9" />}
              />
            ) : (
              products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  recipe={recipes.find((recipe) => recipe.id === product.recipeId)}
                  selected={product.id === selectedProduct?.id}
                />
              ))
            )}
          </div>
          {selectedProduct ? (
            <ProductForm
              product={selectedProduct}
              recipes={recipes}
              recipe={recipes.find((item) => item.id === selectedProduct.recipeId)}
              mode="edit"
            />
          ) : (
            <ProductForm recipes={recipes} mode="create" />
          )}
        </div>
      </SectionCard>
    </div>
  );
}

function RecipeCard({
  recipe,
  items,
  selected,
}: {
  recipe: Recipe;
  items: RecipeIngredient[];
  selected: boolean;
}) {
  const cost = calculateRecipeCost(items as Required<RecipeIngredient>[]);
  const unitCost = calculateRecipeCostPerYield(cost.totalCost, recipe.yieldQuantity);

  return (
    <Link
      href={`/receitas?receita=${recipe.id}`}
      scroll={false}
      className={cn(
        "brand-focus block min-w-[280px] max-w-[320px] rounded-xl border border-cream-300 bg-cream-50/70 p-4 transition-colors hover:border-blush-200 hover:bg-blush-50/70",
        selected && "border-blush-300 bg-blush-50 shadow-sm",
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-cocoa-800">{recipe.name}</h2>
            {selected ? <Pencil className="h-4 w-4 text-brand-700" /> : null}
          </div>
          <p className="mt-1 text-sm text-cocoa-500">
            Rende {formatUnit(recipe.yieldQuantity, recipe.yieldUnit)} · {recipe.preparationTimeMinutes ?? 0} min
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <InfoMetric label="Custo total" value={formatCurrency(cost.totalCost)} />
        <InfoMetric label="Por rendimento" value={formatCurrency(unitCost)} />
        <InfoMetric label="Insumos" value={String(items.length)} />
      </div>
    </Link>
  );
}

function RecipeForm({ recipe, mode }: { recipe?: Recipe; mode: "create" | "edit" }) {
  const isEdit = mode === "edit" && recipe;

  return (
    <form action={isEdit ? updateRecipeAction : createRecipeAction} className="space-y-4">
      {isEdit ? <input type="hidden" name="recipe_id" value={recipe.id} /> : null}
      <div className="grid gap-3">
        <div className="space-y-2">
          <Label htmlFor={isEdit ? "edit-recipe-name" : "name"}>Nome</Label>
          <Input
            id={isEdit ? "edit-recipe-name" : "name"}
            name="name"
            required
            defaultValue={recipe?.name ?? ""}
            placeholder="Ex.: Brownie tradicional"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={isEdit ? "edit-description" : "description"}>Descrição</Label>
          <Input
            id={isEdit ? "edit-description" : "description"}
            name="description"
            defaultValue={recipe?.description ?? ""}
            placeholder="Resumo da receita"
          />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_96px_minmax(0,1fr)]">
        <div className="space-y-2">
          <Label htmlFor={isEdit ? "edit-yield-quantity" : "yield_quantity"}>Rendimento</Label>
          <Input
            id={isEdit ? "edit-yield-quantity" : "yield_quantity"}
            name="yield_quantity"
            required
            inputMode="decimal"
            defaultValue={recipe?.yieldQuantity ?? "20"}
            placeholder="20"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={isEdit ? "edit-yield-unit" : "yield_unit"}>Unidade</Label>
          <select
            id={isEdit ? "edit-yield-unit" : "yield_unit"}
            name="yield_unit"
            className={fieldClassName}
            defaultValue={recipe?.yieldUnit ?? "un"}
          >
            {units.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor={isEdit ? "edit-prep-time" : "preparation_time_minutes"}>Tempo em minutos</Label>
          <Input
            id={isEdit ? "edit-prep-time" : "preparation_time_minutes"}
            name="preparation_time_minutes"
            inputMode="numeric"
            defaultValue={recipe?.preparationTimeMinutes ?? "60"}
            placeholder="60"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor={isEdit ? "edit-notes" : "notes"}>Passo a passo</Label>
        <textarea
          id={isEdit ? "edit-notes" : "notes"}
          name="notes"
          className={textAreaClassName}
          defaultValue={recipe?.notes ?? ""}
          placeholder={"1. Misture os secos\n2. Adicione os líquidos\n3. Asse até firmar"}
        />
      </div>
      {isEdit ? (
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <ConfirmActionButton
            className="w-full"
            title="Salvar alterações da receita?"
            description="As informações da receita serão atualizadas e usadas nos próximos cálculos."
            confirmLabel="Salvar receita"
            successTitle="Receita atualizada"
          >
            Salvar receita
          </ConfirmActionButton>
          <Button asChild variant="outline">
            <Link href="/receitas">Cancelar</Link>
          </Button>
        </div>
      ) : (
        <ToastSubmitButton className="w-full" successTitle="Receita criada">
          Criar receita
        </ToastSubmitButton>
      )}
      {isEdit ? (
        <div>
          <ConfirmActionButton
            formAction={deleteRecipeAction}
            variant="outline"
            className="w-full border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300 hover:bg-rose-100 hover:text-rose-800"
            title="Excluir receita?"
            description="A receita será removida junto com seus insumos vinculados. Produtos e pedidos antigos podem ficar sem esse vínculo."
            confirmLabel="Excluir receita"
            successTitle="Receita excluída"
            tone="danger"
          >
            Excluir receita
          </ConfirmActionButton>
        </div>
      ) : null}
    </form>
  );
}

function RecipeDetails({ items, ingredients }: { items: RecipeIngredient[]; ingredients: Awaited<ReturnType<typeof getIngredients>> }) {
  return (
    <div className="mt-3 max-h-[360px] space-y-3 overflow-y-auto pr-1">
        {items.length > 0 ? (
          items.map((item) => <RecipeIngredientRow key={item.id} item={item} ingredients={ingredients} />)
        ) : (
          <div className="rounded-xl border border-dashed border-cream-300 bg-cream-50 p-4 text-sm text-cocoa-500">
            Sem insumos vinculados.
          </div>
        )}
    </div>
  );
}

function RecipeIngredientRow({
  item,
  ingredients,
}: {
  item: RecipeIngredient;
  ingredients: Awaited<ReturnType<typeof getIngredients>>;
}) {
  return (
    <form action={updateRecipeIngredientAction} className="rounded-xl border border-cream-300 bg-card p-4 shadow-sm">
      <input type="hidden" name="recipe_ingredient_id" value={item.id} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-semibold text-cocoa-800">{item.ingredient?.name ?? "Insumo"}</p>
          <p className="mt-1 text-sm text-cocoa-500">{formatUnit(item.quantity, item.unit)}</p>
        </div>
        <div className="flex gap-2">
          <ConfirmActionButton
            variant="outline"
            size="sm"
            title="Salvar insumo?"
            description="A quantidade e a unidade deste insumo serão atualizadas na receita."
            confirmLabel="Salvar"
            successTitle="Insumo atualizado"
          >
            Salvar
          </ConfirmActionButton>
          <ConfirmActionButton
            formAction={deleteRecipeIngredientAction}
            variant="outline"
            size="sm"
            className="border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300 hover:bg-rose-100 hover:text-rose-800"
            title="Remover insumo?"
            description="Esse insumo sai da receita e o custo será recalculado sem ele."
            confirmLabel="Remover"
            successTitle="Insumo removido"
            tone="danger"
          >
            Remover
          </ConfirmActionButton>
        </div>
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_120px_96px]">
        <div className="space-y-2">
          <Label htmlFor={`ingredient-${item.id}`}>Trocar insumo</Label>
          <select
            id={`ingredient-${item.id}`}
            name="ingredient_id"
            required
            className={fieldClassName}
            defaultValue={item.ingredientId}
          >
            {ingredients.map((ingredient) => (
              <option key={ingredient.id} value={ingredient.id}>
                {ingredient.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor={`quantity-${item.id}`}>Quantidade</Label>
          <Input id={`quantity-${item.id}`} name="quantity" required inputMode="decimal" defaultValue={item.quantity} placeholder="300" />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`unit-${item.id}`}>Unidade</Label>
          <select id={`unit-${item.id}`} name="unit" className={fieldClassName} defaultValue={item.unit}>
            {units.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </select>
        </div>
      </div>
    </form>
  );
}

function ProductCard({
  product,
  recipe,
  selected,
}: {
  product: Product;
  recipe?: Recipe;
  selected: boolean;
}) {
  return (
    <Link
      href={`/receitas?produto=${product.id}`}
      scroll={false}
      className={cn(
        "brand-focus block self-start rounded-xl border border-cream-300 bg-card p-4 transition-colors hover:border-blush-200 hover:bg-blush-50/60",
        selected && "border-blush-300 bg-blush-50 shadow-sm",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-semibold text-cocoa-800">{product.name}</p>
            {selected ? <Pencil className="h-4 w-4 text-brand-700" /> : null}
          </div>
          <p className="mt-1 text-sm text-cocoa-500">{product.description ?? "Sem descrição"}</p>
        </div>
      </div>
      <p className="mt-3 font-semibold text-brand-700">{formatCurrency(product.defaultSalePrice)}</p>
      <p className="mt-1 text-xs font-semibold text-cocoa-400">
        {recipe ? `Receita: ${recipe.name}` : "Produto personalizado"}
      </p>
    </Link>
  );
}

function ProductForm({
  product,
  recipes,
  recipe,
  mode,
}: {
  product?: Product;
  recipes: Recipe[];
  recipe?: Recipe;
  mode: "create" | "edit";
}) {
  const isEdit = mode === "edit" && product;

  return (
    <form
      action={isEdit ? updateProductAction : createProductAction}
      className="self-start space-y-4 rounded-xl border border-cream-300 bg-cream-50 p-4"
    >
      {isEdit ? <input type="hidden" name="product_id" value={product.id} /> : null}
      <p className="font-semibold text-cocoa-800">{isEdit ? "Editar produto" : "Novo produto"}</p>
      {isEdit ? (
        <div className="rounded-lg bg-card p-3 text-sm text-cocoa-600">
          {recipe ? `Vinculado à receita ${recipe.name}.` : "Produto sem receita vinculada."}
        </div>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
        <Label htmlFor={isEdit ? "edit-product-name" : "product-name"}>Nome do produto</Label>
        <Input
          id={isEdit ? "edit-product-name" : "product-name"}
          name="name"
          required
          defaultValue={product?.name ?? ""}
          placeholder="Ex.: Brownie unidade"
        />
        </div>
        <div className="space-y-2">
        <Label htmlFor={isEdit ? "edit-default-sale-price" : "default_sale_price"}>Preço padrão</Label>
        <CurrencyInput
          id={isEdit ? "edit-default-sale-price" : "default_sale_price"}
          name="default_sale_price"
          required
          defaultValue={product?.defaultSalePrice ?? ""}
          placeholder="12,00"
        />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor={isEdit ? "edit-recipe-product" : "recipe-product"}>Receita vinculada</Label>
        <select
          id={isEdit ? "edit-recipe-product" : "recipe-product"}
          name="recipe_id"
          className={fieldClassName}
          defaultValue={product?.recipeId ?? ""}
        >
          <option value="">Produto personalizado</option>
          {recipes.map((recipeItem) => (
            <option key={recipeItem.id} value={recipeItem.id}>
              {recipeItem.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor={isEdit ? "edit-product-description" : "product-description"}>Descrição</Label>
        <Input
          id={isEdit ? "edit-product-description" : "product-description"}
          name="description"
          defaultValue={product?.description ?? ""}
          placeholder="Opcional"
        />
      </div>
      {isEdit ? (
        <ConfirmActionButton
          className="w-full"
          title="Salvar alterações do produto?"
          description="Nome, preço e vínculo com receita serão atualizados para os próximos pedidos."
          confirmLabel="Salvar produto"
          successTitle="Produto atualizado"
        >
          Salvar produto
        </ConfirmActionButton>
      ) : (
        <ToastSubmitButton className="w-full" successTitle="Produto criado">
          Criar produto
        </ToastSubmitButton>
      )}
      {isEdit ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Button asChild variant="outline">
            <Link href="/receitas">Cancelar edição</Link>
          </Button>
          <ConfirmActionButton
            formAction={deleteProductAction}
            variant="outline"
            className="w-full border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300 hover:bg-rose-100 hover:text-rose-800"
            title="Excluir produto?"
            description="O produto sai da lista de venda. Pedidos antigos continuam salvos."
            confirmLabel="Excluir produto"
            successTitle="Produto excluído"
            tone="danger"
          >
            Excluir produto
          </ConfirmActionButton>
        </div>
      ) : null}
    </form>
  );
}

function InfoMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cocoa-400">{label}</p>
      <p className="mt-1 font-semibold text-cocoa-800">{value}</p>
    </div>
  );
}
