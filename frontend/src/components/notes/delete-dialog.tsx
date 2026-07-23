"use client";

import { Button } from "@/components/ui/atoms/button";
import { ModalOverlay } from "@/components/ui/molecules/modal";

type Props = {
  title: string;
  onCancel: () => void;
  onConfirm: () => void;
  isDeleting?: boolean;
};

export function DeleteDialog({ title, onCancel, onConfirm, isDeleting }: Props) {
  return (
    <ModalOverlay className="z-[60] items-center">
      <div
        role="alertdialog"
        aria-modal="true"
        className="w-full max-w-sm rounded-3xl border border-white/70 bg-cream p-6 shadow-2xl shadow-grape/20"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-coral/15 text-2xl">
          🗑️
        </div>
        <h2 className="mt-4 text-lg font-bold text-ink">Delete this entry?</h2>
        <p className="mt-1.5 text-sm text-ink-soft">
          <span className="font-semibold text-ink">“{title}”</span> will be gone
          for good. This can&apos;t be undone.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onCancel}>
            Keep it
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-gradient-to-r from-coral to-coral"
          >
            {isDeleting ? "Deleting…" : "Delete"}
          </Button>
        </div>
      </div>
    </ModalOverlay>
  );
}
