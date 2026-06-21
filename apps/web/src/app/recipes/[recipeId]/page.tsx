import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, Tags, Utensils } from "lucide-react";
import { getInstructionSteps } from "@helloqwen/domain";
import { getRecipe } from "@/lib/api-client";

export const dynamic = "force-dynamic";

export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ recipeId: string }>;
}) {
  const { recipeId } = await params;
  const recipe = await getRecipe(recipeId).catch(() => null);

  if (!recipe) {
    notFound();
  }

  const totalTime = (recipe.prepTimeMinutes ?? 0) + (recipe.cookTimeMinutes ?? 0);
  const instructionSteps = getInstructionSteps(recipe.instructions);

  return (
    <div className="space-y-6">
      <Link
        href="/recipes"
        className="focus-ring inline-flex items-center gap-2 rounded-md px-2 py-1 text-sm font-semibold text-moss hover:bg-moss/10"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Recipes
      </Link>

      <section className="rounded-md bg-white p-6 shadow-line">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-moss">Recipe</p>
            <h1 className="mt-2 text-3xl font-semibold text-ink">{recipe.title}</h1>
            <p className="mt-3 max-w-3xl text-ink/70">{recipe.description}</p>
          </div>
          <span className="w-fit rounded-md bg-field px-3 py-2 text-sm font-medium text-ink/70">
            {recipe.defaultServings} servings
          </span>
        </div>

        <div className="mt-5 flex flex-wrap gap-2 text-sm text-ink/65">
          <span className="inline-flex items-center gap-1 rounded-md bg-field px-2 py-1">
            <Utensils size={14} aria-hidden="true" />
            {recipe.mealTypes.join(", ")}
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-field px-2 py-1">
            <Clock size={14} aria-hidden="true" />
            {totalTime} min
          </span>
          {recipe.tags.map((tag) => (
            <span key={tag} className="inline-flex items-center gap-1 rounded-md bg-field px-2 py-1">
              <Tags size={14} aria-hidden="true" />
              {tag}
            </span>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <section className="rounded-md bg-white p-5 shadow-line">
          <h2 className="text-xl font-semibold">Ingredients</h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-ink/75">
            {recipe.ingredients.map((ingredient) => (
              <li key={ingredient}>{ingredient}</li>
            ))}
          </ul>
        </section>

        <section className="rounded-md bg-white p-5 shadow-line">
          <h2 className="text-xl font-semibold">Instructions</h2>
          <ol className="mt-4 list-decimal space-y-3 pl-5 text-ink/75">
            {instructionSteps.map((step, index) => (
              <li key={`${recipe.id}-step-${index}`}>{step}</li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
