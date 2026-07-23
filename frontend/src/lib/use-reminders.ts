import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";

import { remindersApi, type Reminder } from "@/lib/reminders";
import type { ReminderInput } from "@/lib/validations/reminder";

/** Cache keys. `dueKey` is a child of `remindersKey`, so invalidating the
 * parent refetches both the full list and the due list. */
export const remindersKey = ["reminders"] as const;
export const dueRemindersKey = ["reminders", "due"] as const;

/** The current user's reminders, cached and kept fresh across the app. */
export function useReminders() {
  return useQuery({ queryKey: remindersKey, queryFn: remindersApi.list });
}

/**
 * Due-but-undelivered reminders, re-fetched on an interval. The notifier owns
 * this: pass `enabled: false` to stop polling (e.g. before permission is
 * granted). Polling pauses automatically when the tab is hidden.
 */
export function useDueReminders(options?: { enabled?: boolean; intervalMs?: number }) {
  return useQuery({
    queryKey: dueRemindersKey,
    queryFn: remindersApi.listDue,
    enabled: options?.enabled ?? true,
    refetchInterval: options?.intervalMs ?? 30_000,
    refetchIntervalInBackground: false,
  });
}

/** Shared success handler: refetch every reminders query from the server. */
function useInvalidateReminders() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: remindersKey });
}

export function useCreateReminder(): UseMutationResult<Reminder, Error, ReminderInput> {
  const invalidate = useInvalidateReminders();
  return useMutation({
    mutationFn: (input: ReminderInput) => remindersApi.create(input),
    onSuccess: invalidate,
  });
}

export function useUpdateReminder(): UseMutationResult<
  Reminder,
  Error,
  { id: number; input: Partial<ReminderInput> }
> {
  const invalidate = useInvalidateReminders();
  return useMutation({
    mutationFn: ({ id, input }) => remindersApi.update(id, input),
    onSuccess: invalidate,
  });
}

/** Acknowledge delivery. Used by the notifier after it shows a notification. */
export function useAckReminder(): UseMutationResult<Reminder, Error, number> {
  const invalidate = useInvalidateReminders();
  return useMutation({
    mutationFn: (id: number) => remindersApi.ack(id),
    onSuccess: invalidate,
  });
}

export function useDeleteReminder(): UseMutationResult<void, Error, number> {
  const invalidate = useInvalidateReminders();
  return useMutation({
    mutationFn: (id: number) => remindersApi.remove(id),
    onSuccess: invalidate,
  });
}
