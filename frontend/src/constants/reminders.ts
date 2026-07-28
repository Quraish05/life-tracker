import type { ReminderSortKey, ReminderStatus } from "@/components/reminders/_lib";

/** Rows per page in the reminders table. */
export const PAGE_SIZE = 10;

/** Options for the reminders status filter. */
export const STATUS_FILTERS: { value: "all" | ReminderStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "upcoming", label: "⏰ Upcoming" },
  { value: "overdue", label: "⚠️ Overdue" },
  { value: "delivered", label: "✓ Delivered" },
];

/** Sortable columns in the reminders table. */
export const COLUMNS: { key: ReminderSortKey; label: string }[] = [
  { key: "status", label: "Status" },
  { key: "title", label: "Title" },
  { key: "remind_at", label: "When" },
];
