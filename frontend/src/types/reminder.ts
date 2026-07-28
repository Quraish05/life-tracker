import type { TargetType } from "@/lib/validations/reminder";

/** A reminder as returned by the backend. */
export type Reminder = {
  id: number;
  title: string;
  body: string | null;
  /** ISO-8601 with offset — when the reminder should fire. */
  remind_at: string;
  /** Soft reference to what it's about; both null for a standalone reminder. */
  target_type: TargetType | null;
  target_id: number | null;
  /** Null until it's been delivered (shown + acknowledged). */
  sent_at: string | null;
  created_at: string;
  updated_at: string;
};
