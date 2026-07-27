"use client";

import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { dishSchema, type DishInput } from "@/lib/validations/dish";
import { type Dish } from "@/lib/dishes";
import { useCreateDish, useUpdateDish } from "@/lib/use-dishes";
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
import { IngredientList } from "@/components/dishes/ingredient-list";

type Props = {
  /** The dish being edited, or null when creating a new one. */
  dish: Dish | null;
  onClose: () => void;
  /** Called with the created/updated dish (callers may ignore the argument). */
  onSaved: (dish: Dish) => void;
};

export function DishEditor({ dish, onClose, onSaved }: Props) {
  const createDish = useCreateDish();
  const updateDish = useUpdateDish();

  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<DishInput>({
    resolver: zodResolver(dishSchema),
    defaultValues: {
      name: dish?.name ?? "",
      recipe_md: dish?.recipe_md ?? "",
      ingredients: dish?.ingredients ?? [],
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

  async function onSubmit(values: DishInput) {
    // Drop half-typed rows with no name; the backend applies the same floor.
    const input = {
      ...values,
      ingredients: values.ingredients.filter((i) => i.name.trim().length > 0),
    };
    try {
      const saved = dish
        ? await updateDish.mutateAsync({ id: dish.id, input })
        : await createDish.mutateAsync(input);
      onSaved(saved);
    } catch {
      setError("root", { message: "Couldn't save. Please try again." });
    }
  }

  return (
    <ModalOverlay className="z-50 items-start overflow-y-auto tablet:p-8">
      <ModalDialog size="lg" className="my-auto">
        <ModalHeader onClose={onClose}>
          {dish ? "Edit" : "New"}{" "}
          <span className="font-display italic text-grape">dish</span>
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
              {isSubmitting ? "Saving…" : dish ? "Save changes" : "Create"}
            </Button>
          </div>
        </form>
      </ModalDialog>
    </ModalOverlay>
  );
}
