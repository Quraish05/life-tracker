"use client";

import { useMemo, useState } from "react";

import { type Reminder } from "@/lib/reminders";
import { useDeleteReminder, useReminders } from "@/lib/use-reminders";
import { useNotes } from "@/lib/use-notes";
import {
  useReminderNotifications,
  type PermissionState,
} from "@/lib/reminder-notifications";
import { reminderStatus } from "@/components/reminders/_lib";
import { Button } from "@/components/ui/atoms/button";
import { AccentText } from "@/components/ui/atoms/accent-text";
import { Card } from "@/components/ui/atoms/card";
import { CardGrid } from "@/components/ui/atoms/card-grid";
import { PageHeader } from "@/components/ui/molecules/page-header";
import { Section } from "@/components/ui/molecules/section";
import { EmptyState } from "@/components/ui/molecules/empty-state";
import { ReminderCard } from "@/components/reminders/reminder-card";
import { ReminderEditor } from "@/components/reminders/reminder-editor";
import { DeleteDialog } from "@/components/notes/delete-dialog";

export default function RemindersPage() {
  const { data: reminders = [], isLoading } = useReminders();
  const { data: notes = [] } = useNotes();
  const deleteReminder = useDeleteReminder();
  const { permission, enable } = useReminderNotifications();

  // null = closed, "new" = create, Reminder = edit that reminder.
  const [editing, setEditing] = useState<Reminder | "new" | null>(null);
  const [deleting, setDeleting] = useState<Reminder | null>(null);

  const noteTitle = useMemo(() => {
    const map = new Map<number, string>();
    for (const note of notes) map.set(note.id, note.title);
    return map;
  }, [notes]);

  const { upcoming, past } = useMemo(() => {
    const upcoming: Reminder[] = [];
    const past: Reminder[] = [];
    for (const reminder of reminders) {
      if (reminderStatus(reminder) === "upcoming") upcoming.push(reminder);
      else past.push(reminder);
    }
    // The API returns soonest-first; show past ones most-recent-first.
    return { upcoming, past: past.reverse() };
  }, [reminders]);

  async function confirmDelete() {
    if (!deleting) return;
    await deleteReminder.mutateAsync(deleting.id);
    setDeleting(null);
  }

  function attachedLabel(reminder: Reminder): string | undefined {
    if (reminder.target_type === "note" && reminder.target_id != null) {
      return noteTitle.get(reminder.target_id) ?? "Linked note";
    }
    return undefined;
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <PageHeader
        eyebrow="Reminders"
        title={
          <>
            Never <AccentText>forget</AccentText> a thing
          </>
        }
        subtitle="Nudges for your day — standalone, or attached to a note."
        action={
          <Button onClick={() => setEditing("new")}>+ New reminder</Button>
        }
      />

      {permission !== "granted" && (
        <NotificationBanner permission={permission} onEnable={enable} />
      )}

      {isLoading ? (
        <p className="text-sm text-ink-soft">Loading…</p>
      ) : reminders.length === 0 ? (
        <RemindersEmptyState onCreate={() => setEditing("new")} />
      ) : (
        <div className="space-y-10">
          <Section title="Upcoming" count={upcoming.length}>
            {upcoming.length === 0 ? (
              <p className="text-sm text-ink-soft">Nothing coming up. Enjoy the calm ✨</p>
            ) : (
              <CardGrid>
                {upcoming.map((reminder) => (
                  <ReminderCard
                    key={reminder.id}
                    reminder={reminder}
                    attachedLabel={attachedLabel(reminder)}
                    onEdit={setEditing}
                    onDelete={setDeleting}
                  />
                ))}
              </CardGrid>
            )}
          </Section>

          {past.length > 0 && (
            <Section title="Past" count={past.length}>
              <CardGrid>
                {past.map((reminder) => (
                  <ReminderCard
                    key={reminder.id}
                    reminder={reminder}
                    attachedLabel={attachedLabel(reminder)}
                    onEdit={setEditing}
                    onDelete={setDeleting}
                  />
                ))}
              </CardGrid>
            </Section>
          )}
        </div>
      )}

      {editing !== null && (
        <ReminderEditor
          reminder={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => setEditing(null)}
        />
      )}

      {deleting && (
        <DeleteDialog
          title={deleting.title}
          isDeleting={deleteReminder.isPending}
          onCancel={() => setDeleting(null)}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
}

function NotificationBanner({
  permission,
  onEnable,
}: {
  permission: PermissionState;
  onEnable: () => void;
}) {
  const copy: Record<Exclude<PermissionState, "granted">, string> = {
    default:
      "Turn on browser notifications to get nudged the moment a reminder is due (while this tab is open).",
    denied:
      "Notifications are blocked. Re-enable them for this site in your browser settings to get reminder alerts.",
    unsupported: "This browser doesn't support notifications, so alerts won't pop up here.",
  };

  return (
    <Card
      tone="soft"
      className="mb-8 flex flex-wrap items-center justify-between gap-3"
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">🔔</span>
        <p className="max-w-xl text-sm text-ink-soft">
          {copy[permission as Exclude<PermissionState, "granted">]}
        </p>
      </div>
      {permission === "default" && <Button onClick={onEnable}>Enable notifications</Button>}
    </Card>
  );
}

function RemindersEmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <EmptyState
      icon="⏰"
      title={
        <>
          No <AccentText tone="grape">reminders</AccentText> yet
        </>
      }
      description="Set your first nudge — a workout, a call, or a note to revisit later."
      action={<Button onClick={onCreate}>+ New reminder</Button>}
    />
  );
}
