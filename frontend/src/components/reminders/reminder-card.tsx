"use client";

import type { Reminder } from "@/lib/reminders";
import { formatWhen, reminderStatus } from "@/components/reminders/_lib";

type Props = {
  reminder: Reminder;
  onEdit: (reminder: Reminder) => void;
  onDelete: (reminder: Reminder) => void;
  /** Title of the attached note, if any — resolved by the page. */
  attachedLabel?: string;
};

const STATUS_BADGE: Record<
  ReturnType<typeof reminderStatus>,
  { label: string; className: string }
> = {
  upcoming: { label: "⏰ Upcoming", className: "bg-sky/60 text-ink" },
  overdue: { label: "⚠️ Overdue", className: "bg-coral/15 text-coral" },
  delivered: { label: "✓ Delivered", className: "bg-mint/50 text-ink" },
};

export function ReminderCard({ reminder, onEdit, onDelete, attachedLabel }: Props) {
  const status = reminderStatus(reminder);
  const badge = STATUS_BADGE[status];

  return (
    <article className="group flex flex-col rounded-3xl border border-white/60 bg-white/70 p-5 shadow-sm backdrop-blur-sm transition hover:-translate-y-1 hover:shadow-lg">
      <div className="mb-3 flex items-center justify-between">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${badge.className}`}
        >
          {badge.label}
        </span>
        <div className="flex gap-1 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
          <button
            type="button"
            onClick={() => onEdit(reminder)}
            aria-label="Edit"
            className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft transition hover:bg-lilac/50 hover:text-grape"
          >
            ✏️
          </button>
          <button
            type="button"
            onClick={() => onDelete(reminder)}
            aria-label="Delete"
            className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft transition hover:bg-coral/15 hover:text-coral"
          >
            🗑️
          </button>
        </div>
      </div>

      <button type="button" onClick={() => onEdit(reminder)} className="flex-1 text-left">
        <h3 className="line-clamp-2 text-lg font-bold text-ink">{reminder.title}</h3>
        {reminder.body && (
          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink-soft">
            {reminder.body}
          </p>
        )}
      </button>

      {attachedLabel && (
        <p className="mt-4 inline-flex w-fit items-center gap-1.5 rounded-full bg-lilac/40 px-2.5 py-1 text-xs font-semibold text-grape-deep">
          📓 {attachedLabel}
        </p>
      )}

      <p className="mt-4 text-xs font-semibold text-ink-soft/70">
        {formatWhen(reminder.remind_at)}
      </p>
    </article>
  );
}
