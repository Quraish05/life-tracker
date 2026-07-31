"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { ingredientSchema, type IngredientInput } from "@/lib/validations/ingredient";
import type { Ingredient } from "@/types/ingredient";
import { useCreateIngredient, useUpdateIngredient } from "@/lib/use-ingredients";
import { useFoods, useUpdateFood } from "@/lib/use-food";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/atoms/button";
import { FormError } from "@/components/ui/atoms/form-error";
import { FormField } from "@/components/ui/molecules/form-field";
import { Label } from "@/components/ui/atoms/label";
import {
  ModalDialog,
  ModalHeader,
  ModalOverlay,
} from "@/components/ui/molecules/modal";

type Props = {
  /** The ingredient being edited, or null when creating a new one. */
  ingredient: Ingredient | null;
  onClose: () => void;
  onSaved: () => void;
};

export function IngredientEditor({ ingredient, onClose, onSaved }: Props) {
  const createIngredient = useCreateIngredient();
  const updateIngredient = useUpdateIngredient();
  const updateFood = useUpdateFood();
  const { data: foods = [] } = useFoods();

  // Dishes this ingredient will be appended to on save (optional convenience).
  const [attachTo, setAttachTo] = useState<Set<number>>(new Set());

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<IngredientInput>({
    resolver: zodResolver(ingredientSchema),
    defaultValues: {
      name: ingredient?.name ?? "",
      default_amount: ingredient?.default_amount ?? "",
    },
  });

  // Close on Escape for a native modal feel.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function toggleFood(id: number) {
    setAttachTo((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function onSubmit(values: IngredientInput) {
    try {
      const saved = ingredient
        ? await updateIngredient.mutateAsync({ id: ingredient.id, input: values })
        : await createIngredient.mutateAsync(values);

      // Append the saved ingredient onto any dishes the user picked — skipping
      // dishes that already list it (by name), so re-saving doesn't duplicate.
      const line = { name: saved.name, amount: saved.default_amount };
      await Promise.all(
        [...attachTo].map((id) => {
          const food = foods.find((f) => f.id === id);
          if (
            !food ||
            food.ingredients.some(
              (i) => i.name.toLowerCase() === line.name.toLowerCase(),
            )
          ) {
            return Promise.resolve();
          }
          return updateFood.mutateAsync({
            id,
            input: { ingredients: [...food.ingredients, line] },
          });
        }),
      );

      onSaved();
    } catch {
      setError("root", { message: "Couldn't save. Please try again." });
    }
  }

  return (
    <ModalOverlay className="z-50 items-start overflow-y-auto tablet:p-8">
      <ModalDialog size="md" className="my-auto max-w-md">
        <ModalHeader onClose={onClose}>
          {ingredient ? "Edit" : "New"}{" "}
          <span className="font-display italic text-grape">ingredient</span>
        </ModalHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="space-y-5 px-6 py-5"
        >
          <FormError message={errors.root?.message} />

          <FormField
            label="Ingredient name"
            id="name"
            placeholder="e.g. Rolled oats"
            error={errors.name?.message}
            {...register("name")}
          />

          <FormField
            label="Usual amount"
            id="default_amount"
            placeholder="e.g. 40 g"
            error={errors.default_amount?.message}
            {...register("default_amount")}
          />

          {foods.length > 0 && (
            <div className="space-y-2">
              <Label>
                Add it to a dish{" "}
                <span className="font-normal text-muted">· optional</span>
              </Label>
              <div className="flex flex-wrap gap-2">
                {foods.map((f) => {
                  const on = attachTo.has(f.id);
                  return (
                    <button
                      type="button"
                      key={f.id}
                      onClick={() => toggleFood(f.id)}
                      aria-pressed={on}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                        on
                          ? "border-grape/40 bg-grape/10 text-foreground"
                          : "border-border text-muted hover:bg-grape/8",
                      )}
                    >
                      {f.name}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted">
                Ingredients live on dishes — saving files it in your pantry and
                appends it to anything you picked.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? "Saving…"
                : ingredient
                  ? "Save changes"
                  : "Save ingredient"}
            </Button>
          </div>
        </form>
      </ModalDialog>
    </ModalOverlay>
  );
}
