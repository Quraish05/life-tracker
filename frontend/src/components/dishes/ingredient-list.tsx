"use client";

import { MAX_INGREDIENTS, type Ingredient } from "@/lib/validations/dish";
import { IconButton } from "@/components/ui/atoms/icon-button";

type Props = {
  value: Ingredient[];
  onChange: (ingredients: Ingredient[]) => void;
  max?: number;
};

const rowInputClass =
  "min-w-0 rounded-xl border border-border/60 bg-background/80 px-3 py-2 text-sm text-foreground placeholder:text-muted/60 transition focus:border-grape focus:bg-surface focus:outline-none focus:ring-4 focus:ring-ring";

/**
 * Editable list of `{name, amount}` ingredient rows. Blank rows are kept while
 * editing (add a fresh one, fill it in later) — the dish editor and the backend
 * both drop rows with an empty name before saving.
 */
export function IngredientList({ value, onChange, max = MAX_INGREDIENTS }: Props) {
  const atMax = value.length >= max;

  function updateRow(index: number, patch: Partial<Ingredient>) {
    onChange(value.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function removeRow(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function addRow() {
    if (!atMax) onChange([...value, { name: "", amount: "" }]);
  }

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className="space-y-2">
          {value.map((row, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                value={row.name}
                onChange={(e) => updateRow(index, { name: e.target.value })}
                placeholder="Ingredient"
                aria-label={`Ingredient ${index + 1} name`}
                className={`${rowInputClass} flex-[2]`}
              />
              <input
                value={row.amount}
                onChange={(e) => updateRow(index, { amount: e.target.value })}
                placeholder="Amount (e.g. 200g)"
                aria-label={`Ingredient ${index + 1} amount`}
                className={`${rowInputClass} flex-1`}
              />
              <IconButton
                onClick={() => removeRow(index)}
                aria-label={`Remove ingredient ${index + 1}`}
                tone="danger"
              >
                ✕
              </IconButton>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={addRow}
        disabled={atMax}
        className="rounded-full border border-grape/20 bg-surface/70 px-3.5 py-1.5 text-sm font-semibold text-foreground/70 transition hover:border-grape/40 hover:text-grape disabled:cursor-not-allowed disabled:opacity-50"
      >
        {atMax ? `Max ${max} ingredients` : "+ Add ingredient"}
      </button>
    </div>
  );
}
