import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Full-screen dimmed backdrop for modals/dialogs. Pass alignment, z-index, and
 * any extra padding via `className` (e.g. "z-50 items-start overflow-y-auto").
 */
function ModalOverlay({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "fixed inset-0 flex justify-center bg-ink/30 p-4 backdrop-blur-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}

export { ModalOverlay };
