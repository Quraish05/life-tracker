"use client";

import { useWatch, type Control } from "react-hook-form";

import { canSuggestTags } from "@/lib/notes";
import { useSuggestTags } from "@/lib/use-notes";
import {
  MAX_TAGS,
  normalizeTag,
  type NoteInput,
} from "@/lib/validations/note";
import { Button } from "@/components/ui/atoms/button";
import { Chip } from "@/components/ui/atoms/chip";

type Props = {
  /** The editor form's control — we watch title/body here so only this
   *  component re-renders per keystroke, not the whole modal. */
  control: Control<NoteInput>;
  /** Tags already on the note, so we don't re-offer them. */
  current: string[];
  /** Add a normalized tag to the note's tag field. */
  onAdd: (tag: string) => void;
};

/**
 * A "✨ Suggest tags" affordance for the editor's Tags section. The AI proposes
 * topic tags for what you're writing; you apply the ones you want by tapping —
 * nothing is auto-added. It sits inline (not in a modal) because a tag just
 * fills a field, so there's nothing to review-and-commit.
 */
export function TagSuggestions({ control, current, onAdd }: Props) {
  const title = useWatch({ control, name: "title" });
  const body = useWatch({ control, name: "body_md" });

  const suggest = useSuggestTags();
  const enoughContent = canSuggestTags(title, body);
  const atMax = current.length >= MAX_TAGS;

  // Normalize + drop any already applied, so tapping is always additive.
  const fresh = (suggest.data?.suggestions ?? [])
    .map((s) => ({ slug: normalizeTag(s.tag), reason: s.reason }))
    .filter((s) => s.slug && !current.includes(s.slug));

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => suggest.mutate({ title, body_md: body })}
          disabled={!enoughContent || atMax || suggest.isPending}
          title={
            atMax
              ? `You already have the max ${MAX_TAGS} tags.`
              : enoughContent
                ? undefined
                : "Write a bit more to get tag ideas."
          }
        >
          {suggest.isPending ? "✨ Thinking…" : "✨ Suggest tags"}
        </Button>
        {suggest.isSuccess && fresh.length === 0 && (
          <span className="text-xs text-ink-soft">
            {suggest.data.suggestions.length === 0
              ? "No tag ideas for this yet."
              : "Those are already added."}
          </span>
        )}
      </div>

      {suggest.isError && (
        <p className="text-xs text-coral">
          {suggest.error.message || "Couldn't suggest tags. Please try again."}
        </p>
      )}

      {fresh.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {fresh.map((s) => (
            <Chip key={s.slug} asChild interactive tone="soft" size="sm">
              <button type="button" onClick={() => onAdd(s.slug)} title={s.reason}>
                + #{s.slug}
              </button>
            </Chip>
          ))}
        </div>
      )}
    </div>
  );
}
