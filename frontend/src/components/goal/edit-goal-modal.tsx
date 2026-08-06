"use client";

import { useEffect } from "react";

import type { HealthGoal } from "@/types/health-goal";
import {
  ModalDialog,
  ModalHeader,
  ModalOverlay,
} from "@/components/ui/molecules/modal";
import { GoalForm } from "@/components/goal/goal-form";

/** The health-goal editor in a modal — opened from the dashboard's Edit / Set button. */
export function EditGoalModal({
  initial,
  onClose,
}: {
  initial: HealthGoal | null;
  onClose: () => void;
}) {
  // Close on Escape, matching the app's other modals.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <ModalOverlay className="z-50 items-start overflow-y-auto">
      <ModalDialog className="my-8" onClick={(e) => e.stopPropagation()}>
        <ModalHeader onClose={onClose}>
          {initial ? "Edit goal" : "Set your goal"}
        </ModalHeader>
        <div className="px-6 py-5">
          <GoalForm initial={initial} onSaved={onClose} />
        </div>
      </ModalDialog>
    </ModalOverlay>
  );
}
