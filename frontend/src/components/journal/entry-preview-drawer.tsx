"use client";

import Link from "next/link";

import type { Note } from "@/types/note";
import { Drawer } from "@/components/ui/molecules/drawer";
import { Button } from "@/components/ui/atoms/button";
import { MarkdownPreview } from "@/components/notes/markdown-preview";
import { EntryMeta } from "@/components/journal/entry-meta";
import { EntryTags } from "@/components/journal/entry-tags";
import { ThatDay } from "@/components/journal/that-day";
import { formatDayLong } from "@/components/calendar/_lib";

type Props = {
  note: Note;
  onClose: () => void;
  onEdit: (note: Note) => void;
  onDelete: (note: Note) => void;
};

/** Right-anchored preview of a selected journal entry, read alongside the list.
 *  Shares its meta/tags/"that day" sections with the full-entry page so the two
 *  stay in lockstep; "Open full entry" navigates to that entry's own URL. */
export function EntryPreviewDrawer({ note, onClose, onEdit, onDelete }: Props) {
  return (
    <Drawer
      size="sm"
      onClose={onClose}
      eyebrow={note.entry_date ? formatDayLong(note.entry_date) : "Journal"}
      title={note.title || "Untitled entry"}
      footer={
        <div className="flex flex-col gap-2">
          <Button asChild>
            <Link href={`/journal/${note.id}`}>Open full entry ↗</Link>
          </Button>
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => onEdit(note)}>
              Edit entry
            </Button>
            <Button variant="ghost" onClick={() => onDelete(note)}>
              Delete
            </Button>
          </div>
        </div>
      }
    >
      <EntryMeta note={note} variant="compact" />

      <div className="mt-4 text-sm leading-relaxed text-foreground/90 [&>*:first-child]:mt-0">
        <MarkdownPreview>{note.body_md}</MarkdownPreview>
      </div>

      <EntryTags tags={note.tags} size="sm" className="mt-4" />

      {note.entry_date && (
        <div className="mt-6">
          <ThatDay date={note.entry_date} />
        </div>
      )}
    </Drawer>
  );
}
