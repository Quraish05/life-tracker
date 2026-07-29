"use client";

import { Button } from "@/components/ui/atoms/button";
import { ModalDialog, ModalOverlay } from "@/components/ui/molecules/modal";

type Props = {
  title: string;
  onCancel: () => void;
  onConfirm: () => void;
  isDeleting?: boolean;
};

export function DeleteDialog({ title, onCancel, onConfirm, isDeleting }: Props) {
  return (
    <ModalOverlay className="z-[60] items-center">
      <ModalDialog role="alertdialog" size="sm" className="p-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-coral/15 text-2xl">
          🗑️
        </div>
        <h2 className="mt-4 text-lg font-bold text-foreground">Delete this entry?</h2>
        <p className="mt-1.5 text-sm text-muted">
          <span className="font-semibold text-foreground">“{title}”</span> will be gone
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
            className="bg-coral text-white hover:bg-coral/90"
          >
            {isDeleting ? "Deleting…" : "Delete"}
          </Button>
        </div>
      </ModalDialog>
    </ModalOverlay>
  );
}
