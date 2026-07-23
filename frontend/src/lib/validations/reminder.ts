import { z } from "zod";

// The only kind of record a reminder can attach to today — mirrors the
// backend `TargetType`. Widen (e.g. "workout", "meal") as those land.
export const targetTypes = ["note"] as const;
export type TargetType = (typeof targetTypes)[number];

/** Max length of the optional detail line — kept with the schema. */
export const MAX_BODY = 500;

/**
 * Reminder payload as the API expects it. `remind_at` is an ISO-8601 string
 * *with an offset* — the backend rejects naive datetimes, so the editor
 * converts its `datetime-local` value with `new Date(...).toISOString()`
 * before validating here.
 */
export const reminderSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Give it a title")
      .max(120, "Keep the title under 120 characters"),
    body: z
      .string()
      .trim()
      .max(MAX_BODY, `Keep it under ${MAX_BODY} characters`)
      .optional(),
    remind_at: z
      .string()
      .datetime({ offset: true, message: "Pick a date and time" }),
    // A target is all-or-nothing (see the refine below).
    target_type: z.enum(targetTypes).nullable(),
    target_id: z.number().int().positive().nullable(),
  })
  .refine((data) => (data.target_type === null) === (data.target_id === null), {
    message: "Choose something to attach this to",
    path: ["target_id"],
  });

export type ReminderInput = z.infer<typeof reminderSchema>;
