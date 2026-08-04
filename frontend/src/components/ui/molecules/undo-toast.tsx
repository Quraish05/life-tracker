type Props = {
  /** Whether the toast is showing. */
  open: boolean;
  /** Confirmation text, e.g. "Entry deleted". */
  message: string;
  /** Show the Undo action (hidden once the action can no longer be undone). */
  canUndo?: boolean;
  onUndo: () => void;
};

/** Bottom-left confirmation toast with an optional Undo action.
 *  Pairs with `useDeleteWithUndo` for delete-with-undo flows. */
export function UndoToast({ open, message, canUndo = true, onUndo }: Props) {
  if (!open) return null;

  return (
    <div className="animate-fade-in fixed bottom-6 left-6 z-[60] flex items-center gap-3 rounded-lg border border-grape/40 bg-surface px-4 py-3 shadow-2xl">
      <span className="text-xs text-mint">✓</span>
      <span className="text-xs font-semibold text-foreground">{message}</span>
      {canUndo && (
        <button
          type="button"
          onClick={onUndo}
          className="pl-1.5 text-xs font-bold text-grape hover:text-grape-deep"
        >
          Undo
        </button>
      )}
    </div>
  );
}
