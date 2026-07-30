"use client";

import { useMemo, useState } from "react";

import type { FoodItem } from "@/types/food";
import { useDeleteFood, useFoods } from "@/lib/use-food";
import { AccentText } from "@/components/ui/atoms/accent-text";
import { Button } from "@/components/ui/atoms/button";
import { EmptyState } from "@/components/ui/molecules/empty-state";
import { FoodListPanel } from "@/components/food/food-list-panel";
import { FoodReader } from "@/components/food/food-reader";
import { FoodEditor } from "@/components/food/food-editor";
import { DeleteDialog } from "@/components/notes/delete-dialog";

type SortKey = "recent" | "name";

export default function FoodPage() {
  const { data: foods = [], isLoading } = useFoods();
  const deleteFood = useDeleteFood();

  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("recent");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  // null = closed, "new" = create, FoodItem = edit that food.
  const [editing, setEditing] = useState<FoodItem | "new" | null>(null);
  const [deleting, setDeleting] = useState<FoodItem | null>(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matched = !q
      ? foods
      : foods.filter(
          (d) =>
            d.name.toLowerCase().includes(q) ||
            (d.recipe_md ?? "").toLowerCase().includes(q) ||
            d.ingredients.some((i) => i.name.toLowerCase().includes(q)),
        );
    // Copy before sorting — never mutate the query cache's array.
    return [...matched].sort((a, b) =>
      sort === "name"
        ? a.name.localeCompare(b.name)
        : b.updated_at.localeCompare(a.updated_at),
    );
  }, [foods, query, sort]);

  // The reader shows the selection when it's in view, else the first result —
  // so searching, or deleting the open food, always lands on something sensible
  // without a synchronizing effect.
  const activeId =
    selectedId != null && visible.some((d) => d.id === selectedId)
      ? selectedId
      : (visible[0]?.id ?? null);
  const active = visible.find((d) => d.id === activeId) ?? null;

  async function confirmDelete() {
    if (!deleting) return;
    await deleteFood.mutateAsync(deleting.id);
    setDeleting(null);
  }

  const total = foods.length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 tablet:px-6 tablet:py-10">
      {/* Header — eyebrow, serif-accent title, search, and New food */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted">
            Food
          </p>
          <h1 className="mt-1.5 text-3xl font-normal tracking-tight text-foreground">
            Your{" "}
            <AccentText tone="grape">
              {total} saved
            </AccentText>{" "}
            {total === 1 ? "food item" : "food items"}
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
                placeholder="Search food"
                aria-label="Search food"
                className="w-36 bg-transparent text-foreground placeholder:text-muted/70 focus:outline-none tablet:w-48"
              />
            </div>
            <Button size="sm" onClick={() => setEditing("new")}>
              + New food
            </Button>
          </div>
        )}
      </header>

      {isLoading ? (
        <p className="mt-8 text-sm text-muted">Loading…</p>
      ) : total === 0 ? (
        <EmptyState
          className="mt-10"
          icon="🍽️"
          title={
            <>
              Start your <AccentText tone="grape">library</AccentText>
            </>
          }
          description="Add a food you eat often — its ingredients and how you make it."
          action={<Button onClick={() => setEditing("new")}>+ New food</Button>}
        />
      ) : (
        <div className="mt-6 grid gap-6 laptop:grid-cols-[minmax(0,1fr)_360px] laptop:items-start">
          {/* Main pane — the scannable food list */}
          <div>
            <div className="mb-3 flex items-center justify-end">
              <label className="flex items-center gap-1.5 text-[11px] font-semibold text-muted">
                Sort
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortKey)}
                  className="rounded-md border border-border bg-surface px-2 py-1 text-[11px] font-semibold text-foreground transition focus:border-grape focus:outline-none"
                >
                  <option value="recent">Recently updated</option>
                  <option value="name">Name (A–Z)</option>
                </select>
              </label>
            </div>
            <FoodListPanel
              foods={visible}
              activeId={activeId}
              onSelect={setSelectedId}
            />
          </div>

          {/* Detail aside — the selected food in full */}
          <div className="laptop:sticky laptop:top-6">
            <FoodReader
              key={active?.id ?? "empty"}
              food={active}
              onEdit={setEditing}
              onDelete={setDeleting}
            />
          </div>
        </div>
      )}

      {editing !== null && (
        <FoodEditor
          food={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => setEditing(null)}
        />
      )}

      {deleting && (
        <DeleteDialog
          title={deleting.name}
          isDeleting={deleteFood.isPending}
          onCancel={() => setDeleting(null)}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
}
