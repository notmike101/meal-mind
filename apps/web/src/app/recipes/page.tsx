import Link from "next/link";
import { AlertTriangle, ArrowRight, Clock, Tags, Utensils } from "lucide-react";
import { getRecipes } from "@/lib/api-client";

export const dynamic = "force-dynamic";

export default async function RecipesPage() {
  const { recipes, invalidRecipes } = await getRecipes();

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-medium uppercase tracking-wide text-moss">Recipes</p>
        <h1 className="mt-2 text-3xl font-semibold text-ink">Markdown recipe library</h1>
        <p className="mt-2 max-w-3xl text-ink/70">Valid local recipes available for planning.</p>
      </section>

      {invalidRecipes.length > 0 ? (
        <section className="rounded-md border border-tomato/30 bg-tomato/5 p-4">
          <div className="flex items-center gap-2 font-semibold text-tomato">
            <AlertTriangle size={18} aria-hidden="true" />
            Invalid recipe files
          </div>
          <div className="mt-3 space-y-3">
            {invalidRecipes.map((invalid) => (
              <div key={invalid.filePath} className="rounded-md bg-white p-3 shadow-line">
                <p className="font-medium">{invalid.filePath}</p>
                <ul className="mt-2 list-disc pl-5 text-sm text-ink/70">
                  {invalid.errors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {recipes.map((recipe) => (
          <article key={recipe.id} className="rounded-md bg-white p-5 shadow-line">
            <div className="flex min-h-full flex-col">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">{recipe.title}</h2>
                <p className="mt-2 text-sm leading-6 text-ink/65">{recipe.description}</p>
              </div>
              <span className="rounded-md bg-field px-2 py-1 text-xs font-medium text-ink/70">
                {recipe.defaultServings} servings
              </span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-sm text-ink/65">
              <span className="inline-flex items-center gap-1 rounded-md bg-field px-2 py-1">
                <Utensils size={14} aria-hidden="true" />
                {recipe.mealTypes.join(", ")}
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-field px-2 py-1">
                <Clock size={14} aria-hidden="true" />
                {(recipe.prepTimeMinutes ?? 0) + (recipe.cookTimeMinutes ?? 0)} min
              </span>
            </div>
            {recipe.tags.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-ink/65">
                {recipe.tags.map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1 rounded-md bg-field px-2 py-1">
                    <Tags size={13} aria-hidden="true" />
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
            <div className="mt-5 flex items-center justify-between border-t border-ink/10 pt-4 text-sm text-ink/60">
              <span>{recipe.ingredientCount} ingredients</span>
              <Link
                href={`/recipes/${recipe.id}`}
                className="focus-ring inline-flex items-center gap-2 rounded-md px-2 py-1 font-semibold text-moss hover:bg-moss/10"
              >
                Details
                <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </div>
            </div>
          </article>
        ))}
      </section>

      {recipes.length === 0 ? (
        <div className="rounded-md border border-dashed border-ink/20 bg-white p-6 text-ink/70">
          No valid recipes found.
        </div>
      ) : null}
    </div>
  );
}
