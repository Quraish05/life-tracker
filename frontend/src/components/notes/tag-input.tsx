"use client";

import { useMemo, useState } from "react";

import { MAX_TAGS, normalizeTag } from "@/lib/validations/note";

type Props = {
  value: string[];
  onChange: (tags: string[]) => void;
  /** Tags already used elsewhere, offered as suggestions. */
  suggestions?: string[];
  max?: number;
};

export function TagInput({ value, onChange, suggestions = [], max = MAX_TAGS }: Props) {
  const [draft, setDraft] = useState("");

  const atMax = value.length >= max;

  // Suggestions matching the draft that aren't already picked.
  const matches = useMemo(() => {
    const slug = normalizeTag(draft);
    return suggestions
      .filter((s) => !value.includes(s))
      .filter((s) => (slug ? s.includes(slug) : true))
      .slice(0, 6);
  }, [draft, suggestions, value]);

  function addTag(raw: string) {
    const slug = normalizeTag(raw);
    if (!slug || value.includes(slug) || atMax) return;
    onChange([...value, slug]);
    setDraft("");
  }

  function removeTag(tag: string) {
    onChange(value.filter((t) => t !== tag));
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(draft);
    } else if (e.key === "Backspace" && !draft && value.length) {
      removeTag(value[value.length - 1]);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-transparent bg-cream/80 px-2.5 py-2 transition focus-within:border-grape focus-within:bg-white focus-within:ring-4 focus-within:ring-lilac">
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-lilac/50 px-2.5 py-1 text-xs font-semibold text-grape-deep"
          >
            #{tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              aria-label={`Remove ${tag}`}
              className="text-grape-deep/60 transition hover:text-coral"
            >
              ✕
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => addTag(draft)}
          disabled={atMax}
          placeholder={
            atMax
              ? `Max ${max} tags`
              : value.length
                ? "Add another…"
                : "personal, work, goal…"
          }
          className="min-w-28 flex-1 bg-transparent px-1 py-0.5 text-sm text-ink placeholder:text-ink-soft/60 focus:outline-none disabled:cursor-not-allowed"
        />
      </div>

      {matches.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {matches.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => addTag(s)}
              className="rounded-full border border-grape/20 bg-white/70 px-2.5 py-1 text-xs font-semibold text-ink/70 transition hover:border-grape/40 hover:text-grape"
            >
              + #{s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
