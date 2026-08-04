import Link from "next/link";

import type { Note } from "@/types/note";
import { shortDate } from "@/components/journal/_lib";

type Props = {
  /** All journal entries in display order (newest first). */
  entries: Note[];
  /** The entry currently being read — highlighted, not a link. */
  activeId: number;
};

/** "Entries near this one" — a compact jump list to sibling entries, each a real
 *  link to that entry's standalone page. Shared surface for the reader sidebar. */
export function EntriesNear({ entries, activeId }: Props) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.1em] text-muted">
        Entries near this one
      </p>
      <div className="flex flex-col gap-0.5">
        {entries.map((e) => {
          const active = e.id === activeId;
          return (
            <Link
              key={e.id}
              href={`/journal/${e.id}`}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition hover:bg-grape/10 ${
                active ? "bg-grape/10" : ""
              }`}
            >
              <span className="w-12 flex-none text-[11px] font-bold text-muted">
                {e.entry_date ? shortDate(e.entry_date) : "—"}
              </span>
              <span
                className={`min-w-0 flex-1 truncate text-xs ${
                  active
                    ? "font-bold text-foreground"
                    : "font-semibold text-foreground/80"
                }`}
              >
                {e.title || "Untitled entry"}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
