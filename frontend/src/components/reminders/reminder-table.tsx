"use client";

import type { Reminder } from "@/types/reminder";
import {
  formatWhen,
  reminderStatus,
  STATUS_META,
  type ReminderSortKey,
  type SortDir,
} from "@/components/reminders/_lib";
import { COLUMNS } from "@/constants/reminders";
import { Chip } from "@/components/ui/atoms/chip";
import { IconButton } from "@/components/ui/atoms/icon-button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/atoms/table";

type Props = {
  reminders: Reminder[];
  sortKey: ReminderSortKey;
  sortDir: SortDir;
  onSort: (key: ReminderSortKey) => void;
  onEdit: (reminder: Reminder) => void;
  onDelete: (reminder: Reminder) => void;
  /** Resolve the title of an attached note, if any. */
  attachedLabel: (reminder: Reminder) => string | undefined;
};

export function ReminderTable({
  reminders,
  sortKey,
  sortDir,
  onSort,
  onEdit,
  onDelete,
  attachedLabel,
}: Props) {
  return (
    <div className="overflow-hidden rounded-3xl border border-white/60 bg-white/70 shadow-sm backdrop-blur-sm">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {COLUMNS.map((col) => (
              <SortHead
                key={col.key}
                label={col.label}
                active={sortKey === col.key}
                dir={sortDir}
                onClick={() => onSort(col.key)}
              />
            ))}
            <TableHead>Attached</TableHead>
            <TableHead className="text-right">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reminders.map((reminder) => {
            const meta = STATUS_META[reminderStatus(reminder)];
            const attached = attachedLabel(reminder);
            return (
              <TableRow key={reminder.id}>
                <TableCell>
                  <Chip tone={meta.tone} size="sm">
                    {meta.label}
                  </Chip>
                </TableCell>
                <TableCell>
                  <button
                    type="button"
                    onClick={() => onEdit(reminder)}
                    className="text-left font-semibold text-ink transition hover:text-grape"
                  >
                    {reminder.title}
                  </button>
                  {reminder.body && (
                    <p className="mt-0.5 line-clamp-1 text-xs text-ink-soft">
                      {reminder.body}
                    </p>
                  )}
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm text-ink-soft">
                  {formatWhen(reminder.remind_at)}
                </TableCell>
                <TableCell>
                  {attached ? (
                    <Chip tone="soft" size="sm">
                      📓 {attached}
                    </Chip>
                  ) : (
                    <span className="text-sm text-ink-soft/50">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="inline-flex gap-1">
                    <IconButton
                      onClick={() => onEdit(reminder)}
                      aria-label="Edit"
                    >
                      ✏️
                    </IconButton>
                    <IconButton
                      onClick={() => onDelete(reminder)}
                      aria-label="Delete"
                      tone="danger"
                    >
                      🗑️
                    </IconButton>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

/** A sortable column header — shows a ▲/▼ indicator when it's the active sort. */
function SortHead({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
}) {
  return (
    <TableHead aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}>
      <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center gap-1 uppercase tracking-wide transition hover:text-grape"
      >
        {label}
        <span className={active ? "text-grape" : "text-ink-soft/30"}>
          {active ? (dir === "asc" ? "▲" : "▼") : "↕"}
        </span>
      </button>
    </TableHead>
  );
}
