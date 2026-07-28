"use client";

import { useMemo, useState } from "react";

import type { Dish } from "@/types/dish";
import { useDeleteDish, useDishes } from "@/lib/use-dishes";
import { Button } from "@/components/ui/atoms/button";
import { AccentText } from "@/components/ui/atoms/accent-text";
import { PageHeader } from "@/components/ui/molecules/page-header";
import { EmptyState } from "@/components/ui/molecules/empty-state";
import { DishListPanel } from "@/components/dishes/dish-list-panel";
import { DishReader } from "@/components/dishes/dish-reader";
import { DishEditor } from "@/components/dishes/dish-editor";
import { DeleteDialog } from "@/components/notes/delete-dialog";

export default function DishesPage() {
  const { data: dishes = [], isLoading } = useDishes();
  const deleteDish = useDeleteDish();

  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  // null = closed, "new" = create, Dish = edit that dish.
  const [editing, setEditing] = useState<Dish | "new" | null>(null);
  const [deleting, setDeleting] = useState<Dish | null>(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return dishes;
    return dishes.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        (d.recipe_md ?? "").toLowerCase().includes(q) ||
        d.ingredients.some((i) => i.name.toLowerCase().includes(q)),
    );
  }, [dishes, query]);

  // The reader shows the selection when it's in view, else the first result —
  // so searching, or deleting the open dish, always lands on something sensible
  // without a synchronizing effect.
  const activeId =
    selectedId != null && visible.some((d) => d.id === selectedId)
      ? selectedId
      : (visible[0]?.id ?? null);
  const active = visible.find((d) => d.id === activeId) ?? null;

  async function confirmDelete() {
    if (!deleting) return;
    await deleteDish.mutateAsync(deleting.id);
    setDeleting(null);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 tablet:px-6 tablet:py-10">
      <PageHeader
        eyebrow="Meals"
        title={
          <>
            Your <AccentText>recipe</AccentText> binder
          </>
        }
        subtitle="Browse the meals you eat — pick one to read its ingredients and recipe."
        action={<Button onClick={() => setEditing("new")}>+ New dish</Button>}
      />

      {isLoading ? (
        <p className="text-sm text-ink-soft">Loading…</p>
      ) : dishes.length === 0 ? (
        <EmptyState
          icon="🍽️"
          title={
            <>
              Start your <AccentText tone="grape">library</AccentText>
            </>
          }
          description="Add a dish you eat often — its ingredients and how you make it."
          action={<Button onClick={() => setEditing("new")}>+ New dish</Button>}
        />
      ) : (
        <div className="grid gap-6 laptop:grid-cols-[280px_1fr] laptop:items-start">
          <div className="laptop:sticky laptop:top-8">
            <DishListPanel
              dishes={visible}
              total={dishes.length}
              activeId={activeId}
              onSelect={setSelectedId}
              query={query}
              onQueryChange={setQuery}
              onNew={() => setEditing("new")}
            />
          </div>
          <DishReader
            key={active?.id ?? "empty"}
            dish={active}
            onEdit={setEditing}
            onDelete={setDeleting}
          />
        </div>
      )}

      {editing !== null && (
        <DishEditor
          dish={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => setEditing(null)}
        />
      )}

      {deleting && (
        <DeleteDialog
          title={deleting.name}
          isDeleting={deleteDish.isPending}
          onCancel={() => setDeleting(null)}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
}
