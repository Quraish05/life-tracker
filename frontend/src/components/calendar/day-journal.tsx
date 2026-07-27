"use client";

import Link from "next/link";

import type { Note } from "@/lib/notes";
import { MOOD_BY_KEY } from "@/lib/validations/note";
import { toSnippet } from "@/components/notes/_lib";

type Props = {
  /** Journal entries whose entry_date is this day. */
  entries: Note[];
};

/** Read-only summary of the day's journal entries, linking out to each. */
export function DayJournal({ entries }: Props) {
  if (entries.length === 0) return null;

  return (
    <section className="rounded-3xl border border-white/60 bg-white/50 p-4">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-lg">📓</span>
        <h3 className="font-bold text-ink">Journal</h3>
        <span className="rounded-full bg-lilac/40 px-2 py-0.5 text-xs font-semibold text-grape-deep">
          {entries.length}
        </span>
      </div>

      <ul className="space-y-1.5">
        {entries.map((entry) => (
          <li key={entry.id}>
            <Link
              href={`/notes/${entry.id}`}
              className="group flex items-start gap-2 rounded-xl bg-white/70 px-3 py-2 transition hover:bg-white"
            >
              {entry.mood && (
                <span className="text-lg" title={MOOD_BY_KEY[entry.mood].label}>
                  {MOOD_BY_KEY[entry.mood].emoji}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-ink group-hover:text-grape">
                  {entry.title}
                </p>
                <p className="line-clamp-1 text-sm text-ink-soft">
                  {toSnippet(entry.body_md, 100) || "No content yet."}
                </p>
              </div>
              <span className="text-ink-soft/50">→</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
