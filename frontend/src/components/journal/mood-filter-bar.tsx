import type { MoodKey } from "@/lib/validations/note";
import { MOOD_FILTERS } from "@/constants/journal";

type Props = {
  value: "all" | MoodKey;
  onChange: (value: "all" | MoodKey) => void;
  className?: string;
};

/** The "All + five moods" filter pills above the journal list. */
export function MoodFilterBar({ value, onChange, className = "" }: Props) {
  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {MOOD_FILTERS.map((m) => {
        const on = value === m.key;
        return (
          <button
            key={m.key}
            type="button"
            onClick={() => onChange(m.key)}
            title={m.label}
            aria-pressed={on}
            className={`rounded-full border px-3 py-2 text-xs font-bold transition ${
              on
                ? "border-grape bg-grape/10 text-foreground"
                : "border-border bg-surface text-muted hover:border-grape/40"
            }`}
          >
            {m.emoji || m.label}
          </button>
        );
      })}
    </div>
  );
}
