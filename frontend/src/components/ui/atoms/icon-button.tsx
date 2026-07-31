import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const iconButtonVariants = cva(
  "flex cursor-pointer items-center justify-center rounded-full transition disabled:pointer-events-none disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
  {
    variants: {
      size: {
        sm: "h-8 w-8",
        md: "h-9 w-9",
      },
      tone: {
        /** Resting muted, grape on hover — edit and general actions. */
        neutral: "text-muted hover:bg-lilac/50 hover:text-grape",
        /** Resting muted, coral on hover — destructive/close actions. */
        danger: "text-muted hover:bg-coral/15 hover:text-coral",
        /** Solid grape — an on/active toggle (e.g. pinned). */
        active: "text-grape",
      },
    },
    defaultVariants: {
      size: "sm",
      tone: "neutral",
    },
  },
);

interface IconButtonProps
  extends React.ComponentProps<"button">,
    VariantProps<typeof iconButtonVariants> {}

/** Round icon-only action button. Always give it an `aria-label`. */
function IconButton({
  className,
  size,
  tone,
  type = "button",
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      data-slot="icon-button"
      className={cn(iconButtonVariants({ size, tone, className }))}
      {...props}
    />
  );
}

export { IconButton, iconButtonVariants };
export type { IconButtonProps };
