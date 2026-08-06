"use client";

import { useState } from "react";

import { useHealthGoal } from "@/lib/queries/use-health-goal";
import { AccentText } from "@/components/ui/atoms/accent-text";
import { Button } from "@/components/ui/atoms/button";
import { EmptyState } from "@/components/ui/molecules/empty-state";
import { PageHeader } from "@/components/ui/molecules/page-header";
import { AlignmentBars } from "@/components/goal/alignment-bars";
import { EditGoalModal } from "@/components/goal/edit-goal-modal";
import { FocusGoalCard } from "@/components/goal/focus-goal-card";
import { GoalEvaluator } from "@/components/goal/goal-evaluator";
import { TodayAgainstGoal } from "@/components/goal/today-against-goal";

/**
 * Goals — a progress dashboard for the user's health goal. The metrics (today's
 * tally, seven-day alignment) are computed client-side and free; the right-rail
 * Goal Evaluator is the one on-demand, quota-charged AI read. Editing the goal
 * happens in a modal so the page stays a dashboard, not a form.
 */
export default function GoalPage() {
  const { data: goal, isLoading } = useHealthGoal();
  const [editing, setEditing] = useState(false);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 tablet:px-6 tablet:py-10">
      <PageHeader
        eyebrow="Plan"
        title={
          <>
            Your goal, and <AccentText>how it&rsquo;s going</AccentText>
          </>
        }
        subtitle="Where you are against your goal — and, when you ask, an AI read on the week."
        action={
          goal ? (
            <Button variant="secondary" onClick={() => setEditing(true)}>
              Edit goal
            </Button>
          ) : undefined
        }
      />

      {isLoading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : !goal ? (
        <EmptyState
          icon="🎯"
          title={
            <>
              No goal <AccentText tone="grape">set yet</AccentText>
            </>
          }
          description="Set a health goal and the dashboard fills in with your progress, today's meals against it, and an AI evaluator."
          action={<Button onClick={() => setEditing(true)}>Set your goal</Button>}
        />
      ) : (
        <div className="flex flex-col gap-4 laptop:flex-row laptop:items-start">
          <div className="flex-1 space-y-4">
            <FocusGoalCard goal={goal} onEdit={() => setEditing(true)} />
            <TodayAgainstGoal />
          </div>
          <aside className="w-full space-y-4 laptop:w-[344px] laptop:flex-none">
            <GoalEvaluator />
            <AlignmentBars />
          </aside>
        </div>
      )}

      {editing && (
        <EditGoalModal initial={goal ?? null} onClose={() => setEditing(false)} />
      )}
    </div>
  );
}
