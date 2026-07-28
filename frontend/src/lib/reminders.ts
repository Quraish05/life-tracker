import { ApiError, request, tokenStore } from "@/lib/api";
import type { ReminderInput } from "@/lib/validations/reminder";
import type { Reminder } from "@/types/reminder";

/**
 * Reminders data layer — a thin client over the backend `reminders` API.
 * Consumed through the React Query hooks in `lib/use-reminders.ts`.
 */

/** Grab the current token, or fail loudly rather than hit the API unauthenticated. */
function authToken(): string {
  const token = tokenStore.get();
  if (!token) throw new ApiError(401, "Your session has expired. Please sign in again.");
  return token;
}

export const remindersApi = {
  list: (): Promise<Reminder[]> => request<Reminder[]>("/reminders", { token: authToken() }),

  /** Reminders whose time has passed and that haven't been delivered — polled by the notifier. */
  listDue: (): Promise<Reminder[]> =>
    request<Reminder[]>("/reminders/due", { token: authToken() }),

  create: (input: ReminderInput): Promise<Reminder> =>
    request<Reminder>("/reminders", { method: "POST", body: input, token: authToken() }),

  /** Partial update — only the fields in `patch` change. */
  update: (id: number, patch: Partial<ReminderInput>): Promise<Reminder> =>
    request<Reminder>(`/reminders/${id}`, { method: "PATCH", body: patch, token: authToken() }),

  /** Mark a reminder delivered so it stops coming back from `listDue`. */
  ack: (id: number): Promise<Reminder> =>
    request<Reminder>(`/reminders/${id}/ack`, { method: "POST", token: authToken() }),

  remove: (id: number): Promise<void> =>
    request<void>(`/reminders/${id}`, { method: "DELETE", token: authToken() }),
};
