import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { IconButton } from "@/components/ui/atoms/icon-button";

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

const modalDialogVariants = cva(
  "w-full rounded-3xl border border-border/70 bg-background shadow-2xl shadow-grape/20",
  {
    variants: {
      size: {
        sm: "max-w-sm",
        md: "max-w-2xl",
        lg: "max-w-3xl",
      },
    },
    defaultVariants: {
      size: "md",
    },
  },
);

interface ModalDialogProps
  extends React.ComponentProps<"div">,
    VariantProps<typeof modalDialogVariants> {
  /** "alertdialog" for confirmations that demand a response; else "dialog". */
  role?: "dialog" | "alertdialog";
}

/** The panel inside a ModalOverlay — sized, rounded, aria-modal. */
function ModalDialog({
  className,
  size,
  role = "dialog",
  ...props
}: ModalDialogProps) {
  return (
    <div
      role={role}
      aria-modal="true"
      data-slot="modal-dialog"
      className={cn(modalDialogVariants({ size, className }))}
      {...props}
    />
  );
}

interface ModalHeaderProps extends React.ComponentProps<"div"> {
  onClose: () => void;
}

/** Title bar with a bottom divider and a built-in close button. */
function ModalHeader({ className, children, onClose, ...props }: ModalHeaderProps) {
  return (
    <div
      data-slot="modal-header"
      className={cn(
        "flex items-center justify-between border-b border-border/40 px-6 py-4",
        className,
      )}
      {...props}
    >
      <h2 className="text-lg font-bold text-foreground">{children}</h2>
      <IconButton tone="danger" aria-label="Close" onClick={onClose}>
        ✕
      </IconButton>
    </div>
  );
}

export { ModalOverlay, ModalDialog, ModalHeader };
export type { ModalDialogProps, ModalHeaderProps };
