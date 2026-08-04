import { useEffect, useRef, useState } from "react";

interface Options {
  /** Commit the deletion for real — called when the undo window expires. */
  onCommit: (id: number) => void;
  /** How long the undo window stays open, in ms. */
  delay?: number;
}

/**
 * Delete-with-undo. The caller hides `pending` from its list while a short
 * timer runs; the real delete (`onCommit`) only fires when the timer expires.
 * Starting a new delete while one is still pending commits the previous one
 * first, and the timer is cleared on unmount.
 */
export function useDeleteWithUndo<T extends { id: number }>({
  onCommit,
  delay = 5000,
}: Options) {
  const [pending, setPending] = useState<T | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  function startDelete(item: T) {
    if (timerRef.current) clearTimeout(timerRef.current);
    // If another item is mid-undo, commit that one before starting a new one.
    if (pending && pending.id !== item.id) onCommit(pending.id);
    setPending(item);
    setCanUndo(true);
    timerRef.current = setTimeout(() => {
      onCommit(item.id);
      setPending(null);
      setCanUndo(false);
      timerRef.current = null;
    }, delay);
  }

  function undoDelete() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setPending(null);
    setCanUndo(false);
  }

  return { pending, canUndo, startDelete, undoDelete };
}
