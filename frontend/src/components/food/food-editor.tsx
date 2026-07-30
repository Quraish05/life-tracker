"use client";

import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { foodItemSchema, type FoodItemInput } from "@/lib/validations/food";
import type { FoodItem } from "@/types/food";
import { useCreateFood, useUpdateFood } from "@/lib/use-food";
import { Button } from "@/components/ui/atoms/button";
import { FieldError, FormError } from "@/components/ui/atoms/form-error";
import { FormField } from "@/components/ui/molecules/form-field";
import { Label } from "@/components/ui/atoms/label";
import {
  ModalDialog,
  ModalHeader,
  ModalOverlay,
} from "@/components/ui/molecules/modal";
import { MarkdownEditor } from "@/components/notes/markdown-editor";
import { IngredientList } from "@/components/food/ingredient-list";

type Props = {
  /** The food being edited, or null when creating a new one. */
  food: FoodItem | null;
  onClose: () => void;
  /** Called with the created/updated food (callers may ignore the argument). */
  onSaved: (food: FoodItem) => void;
};

export function FoodEditor({ food, onClose, onSaved }: Props) {
  const createFood = useCreateFood();
  const updateFood = useUpdateFood();

  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FoodItemInput>({
    resolver: zodResolver(foodItemSchema),
    defaultValues: {
      name: food?.name ?? "",
      recipe_md: food?.recipe_md ?? "",
      ingredients: food?.ingredients ?? [],
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

  async function onSubmit(values: FoodItemInput) {
    // Drop half-typed rows with no name; the backend applies the same floor.
    const input = {
      ...values,
      ingredients: values.ingredients.filter((i) => i.name.trim().length > 0),
    };
    try {
      const saved = food
        ? await updateFood.mutateAsync({ id: food.id, input })
        : await createFood.mutateAsync(input);
      onSaved(saved);
    } catch {
      setError("root", { message: "Couldn't save. Please try again." });
    }
  }

  return (
    <ModalOverlay className="z-50 items-start overflow-y-auto tablet:p-8">
      <ModalDialog size="lg" className="my-auto">
        <ModalHeader onClose={onClose}>
          {food ? "Edit" : "New"}{" "}
          <span className="font-display italic text-grape">food</span>
        </ModalHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5 px-6 py-5">
          <FormError message={errors.root?.message} />

          <FormField
            label="Name"
            id="name"
            placeholder="e.g. Big green salad"
            error={errors.name?.message}
            {...register("name")}
          />

          <div className="space-y-1.5">
            <Label>Ingredients</Label>
            <Controller
              control={control}
              name="ingredients"
              render={({ field }) => (
                <IngredientList value={field.value} onChange={field.onChange} />
              )}
            />
            <FieldError message={errors.ingredients?.message} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="recipe_md">Recipe (optional)</Label>
            <Controller
              control={control}
              name="recipe_md"
              render={({ field }) => (
                <MarkdownEditor
                  id="recipe_md"
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.recipe_md?.message}
                  placeholder="How do you make it? Write in markdown ✨"
                />
              )}
            />
            <FieldError message={errors.recipe_md?.message} />
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : food ? "Save changes" : "Create"}
            </Button>
          </div>
        </form>
      </ModalDialog>
    </ModalOverlay>
  );
}
