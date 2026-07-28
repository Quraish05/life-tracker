"use client";

import { useMemo, useState } from "react";

import type { Reminder } from "@/types/reminder";
import { PAGE_SIZE, STATUS_FILTERS } from "@/constants/reminders";
import { useDeleteReminder, useReminders } from "@/lib/use-reminders";
import { useNotes } from "@/lib/use-notes";
import {
  useReminderNotifications,
  type PermissionState,
} from "@/lib/reminder-notifications";
import {
  compareReminders,
  reminderStatus,
  type ReminderSortKey,
  type ReminderStatus,
  type SortDir,
} from "@/components/reminders/_lib";
import { Button } from "@/components/ui/atoms/button";
import { AccentText } from "@/components/ui/atoms/accent-text";
import { Card } from "@/components/ui/atoms/card";
import { Chip } from "@/components/ui/atoms/chip";
import { PageHeader } from "@/components/ui/molecules/page-header";
import { EmptyState } from "@/components/ui/molecules/empty-state";
import { Pagination } from "@/components/ui/molecules/pagination";
import { ReminderTable } from "@/components/reminders/reminder-table";
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

  const [statusFilter, setStatusFilter] = useState<"all" | ReminderStatus>("all");
  const [sortKey, setSortKey] = useState<ReminderSortKey>("remind_at");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);

  const noteTitle = useMemo(() => {
    const map = new Map<number, string>();
    for (const note of notes) map.set(note.id, note.title);
    return map;
  }, [notes]);

  // Filter by status, then sort by the active column.
  const visible = useMemo(() => {
    const filtered =
      statusFilter === "all"
        ? reminders
        : reminders.filter((r) => reminderStatus(r) === statusFilter);
    return [...filtered].sort((a, b) => compareReminders(a, b, sortKey, sortDir));
  }, [reminders, statusFilter, sortKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const paged = visible.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

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

  function handleSort(key: ReminderSortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(1);
  }

  function changeFilter(value: "all" | ReminderStatus) {
    setStatusFilter(value);
    setPage(1);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 tablet:px-6 tablet:py-10">
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
        <div className="space-y-5">
          <div className="flex w-fit max-w-full overflow-x-auto rounded-full bg-white/60 p-1 shadow-sm">
            {STATUS_FILTERS.map((f) => (
              <Chip
                key={f.value}
                asChild
                interactive
                size="lg"
                tone={statusFilter === f.value ? "solid" : "ghost"}
              >
                <button type="button" onClick={() => changeFilter(f.value)}>
                  {f.label}
                </button>
              </Chip>
            ))}
          </div>

          {visible.length === 0 ? (
            <p className="text-sm text-ink-soft">
              No reminders match this filter.
            </p>
          ) : (
            <>
              <ReminderTable
                reminders={paged}
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={handleSort}
                onEdit={setEditing}
                onDelete={setDeleting}
                attachedLabel={attachedLabel}
              />
              <Pagination
                page={safePage}
                pageCount={pageCount}
                total={visible.length}
                pageSize={PAGE_SIZE}
                onPageChange={setPage}
              />
            </>
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
