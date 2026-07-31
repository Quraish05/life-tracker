"use client";

import { useMemo, useState } from "react";

import type { Ingredient } from "@/types/ingredient";
import { useDeleteIngredient, useIngredients } from "@/lib/use-ingredients";
import { AccentText } from "@/components/ui/atoms/accent-text";
import { Button } from "@/components/ui/atoms/button";
import { IconButton } from "@/components/ui/atoms/icon-button";
import { EmptyState } from "@/components/ui/molecules/empty-state";
import { DeleteDialog } from "@/components/notes/delete-dialog";
import { IngredientEditor } from "@/components/ingredients/ingredient-editor";

export default function IngredientsPage() {
  const { data: ingredients = [], isLoading } = useIngredients();
  const deleteIngredient = useDeleteIngredient();

  const [query, setQuery] = useState("");
  // null = closed, "new" = create, Ingredient = edit that one.
  const [editing, setEditing] = useState<Ingredient | "new" | null>(null);
  const [deleting, setDeleting] = useState<Ingredient | null>(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ingredients;
    return ingredients.filter((i) => i.name.toLowerCase().includes(q));
  }, [ingredients, query]);

  const total = ingredients.length;

  async function confirmDelete() {
    if (!deleting) return;
    await deleteIngredient.mutateAsync(deleting.id);
    setDeleting(null);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 tablet:px-6 tablet:py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted">
            Pantry
          </p>
          <h1 className="mt-1.5 text-3xl font-normal tracking-tight text-foreground">
            Your <AccentText tone="grape">{total}</AccentText>{" "}
            {total === 1 ? "ingredient" : "ingredients"}
          </h1>
        </div>
        {total > 0 && (
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-muted transition focus-within:border-grape">
              <span aria-hidden>🔍</span>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search pantry"
                aria-label="Search pantry"
                className="w-36 bg-transparent text-foreground placeholder:text-muted/70 focus:outline-none tablet:w-48"
              />
            </div>
            <Button size="sm" onClick={() => setEditing("new")}>
              + New ingredient
            </Button>
          </div>
        )}
      </header>

      {isLoading ? (
        <p className="mt-8 text-sm text-muted">Loading…</p>
      ) : total === 0 ? (
        <EmptyState
          className="mt-10"
          icon="🥕"
          title={
            <>
              Start your <AccentText tone="grape">pantry</AccentText>
            </>
          }
          description="Add ingredients you use often, then sprinkle them onto your dishes."
          action={
            <Button onClick={() => setEditing("new")}>+ New ingredient</Button>
          }
        />
      ) : visible.length === 0 ? (
        <p className="mt-8 text-sm text-muted">No ingredients match.</p>
      ) : (
        <ul className="mt-6 grid gap-2 tablet:grid-cols-2">
          {visible.map((ing) => (
            <li key={ing.id}>
              <div className="group flex items-center gap-3 rounded-lg border border-border bg-surface px-3.5 py-3 transition-colors hover:border-grape/30">
                <button
                  type="button"
                  onClick={() => setEditing(ing)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <span className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-foreground/5 text-[15px]">
                    🥕
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-bold text-foreground">
                      {ing.name}
                    </span>
                    {ing.default_amount && (
                      <span className="block truncate text-[11px] text-muted">
                        {ing.default_amount}
                      </span>
                    )}
                  </span>
                </button>
                <IconButton
                  aria-label={`Edit ${ing.name}`}
                  onClick={() => setEditing(ing)}
                >
                  ✏️
                </IconButton>
                <IconButton
                  tone="danger"
                  aria-label={`Delete ${ing.name}`}
                  onClick={() => setDeleting(ing)}
                >
                  🗑️
                </IconButton>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing !== null && (
        <IngredientEditor
          ingredient={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => setEditing(null)}
        />
      )}

      {deleting && (
        <DeleteDialog
          title={deleting.name}
          isDeleting={deleteIngredient.isPending}
          onCancel={() => setDeleting(null)}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
}
