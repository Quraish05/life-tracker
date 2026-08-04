"use client";

import { type ReactNode } from "react";
import { useEffect } from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { IconButton } from "@/components/ui/atoms/icon-button";

const drawerPanelVariants = cva(
  "ml-auto flex h-full w-full flex-col border-l border-border bg-surface shadow-2xl animate-slide-in-right",
  {
    variants: {
      size: {
        sm: "max-w-sm",
        md: "max-w-md",
        lg: "max-w-lg",
      },
    },
    defaultVariants: {
      size: "md",
    },
  },
);

interface DrawerProps extends VariantProps<typeof drawerPanelVariants> {
  onClose: () => void;
  /** Rendered in the header bar; pair with the built-in close button. */
  title?: ReactNode;
  /** Optional small uppercase eyebrow above the title. */
  eyebrow?: ReactNode;
  /** Sticky footer (e.g. primary actions). */
  footer?: ReactNode;
  className?: string;
  children: ReactNode;
}

/**
 * A right-anchored slide-in panel — the app's off-canvas surface for contextual
 * detail (a food, a meal slot). Same conventions as the Modal molecule (dimmed
 * scrim, Escape to close, scrim-click to close) but docked to the right edge and
 * full-height, with a scrollable body between a fixed header and optional footer.
 */
function Drawer({
  onClose,
  title,
  eyebrow,
  footer,
  size,
  className,
  children,
}: DrawerProps) {
  // Close on Escape, matching the modals.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex bg-ink/40 animate-fade-in"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        data-slot="drawer"
        className={cn(drawerPanelVariants({ size }), className)}
        // Clicks inside the panel shouldn't fall through to the scrim.
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            {eyebrow && (
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
                {eyebrow}
              </p>
            )}
            {title && (
              <h2 className="truncate text-lg font-bold text-foreground">
                {title}
              </h2>
            )}
          </div>
          <IconButton tone="danger" aria-label="Close" onClick={onClose}>
            ✕
          </IconButton>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>

        {footer && (
          <div className="border-t border-border px-5 py-4">{footer}</div>
        )}
      </div>
    </div>
  );
}

export { Drawer };
export type { DrawerProps };
