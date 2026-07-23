import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const accentTextVariants = cva("font-display italic", {
  variants: {
    tone: {
      coral: "text-coral",
      grape: "text-grape",
    },
  },
  defaultVariants: {
    tone: "coral",
  },
});

interface AccentTextProps
  extends React.ComponentProps<"span">,
    VariantProps<typeof accentTextVariants> {}

/** Inline display-font accent for highlighting a word inside a heading. */
function AccentText({ className, tone, ...props }: AccentTextProps) {
  return (
    <span
      data-slot="accent-text"
      className={cn(accentTextVariants({ tone, className }))}
      {...props}
    />
  );
}

export { AccentText, accentTextVariants };
export type { AccentTextProps };
