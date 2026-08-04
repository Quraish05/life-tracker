import { type ComponentProps } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const chipVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full font-semibold transition",
  {
    variants: {
      tone: {
        /** Translucent lilac — default for tags. */
        soft: "bg-lilac/40 text-grape-deep",
        /** Slightly denser lilac — count badges, category labels. */
        muted: "bg-lilac/50 text-grape-deep",
        /** Filled grape — the selected/active state. */
        solid: "bg-grape text-on-accent",
        /** Sky blue — a secondary category. Fixed-dark text: the tint stays light in both themes. */
        sky: "bg-sky/60 text-ink",
        /** Mint — a positive/complete status. Fixed-dark text on a light tint. */
        success: "bg-mint/50 text-ink",
        /** Coral — a warning/overdue status. */
        danger: "bg-coral/15 text-coral",
        /** No fill — inactive segmented-control option. */
        ghost: "text-foreground/60",
      },
      size: {
        sm: "px-2 py-0.5 text-xs",
        md: "px-2.5 py-1 text-xs",
        lg: "px-4 py-1.5 text-sm",
      },
      /** Adds cursor + hover affordance; pair with `asChild` on a <button>. */
      interactive: {
        true: "cursor-pointer",
        false: "",
      },
    },
    compoundVariants: [
      { tone: "soft", interactive: true, className: "hover:bg-lilac/70" },
      { tone: "muted", interactive: true, className: "hover:bg-lilac/70" },
      { tone: "ghost", interactive: true, className: "hover:text-foreground" },
    ],
    defaultVariants: {
      tone: "soft",
      size: "md",
      interactive: false,
    },
  },
);

interface ChipProps
  extends ComponentProps<"span">,
    VariantProps<typeof chipVariants> {
  asChild?: boolean;
}

/** Small pill for tags, counts, and category labels. Render as a <button> via `asChild`. */
function Chip({
  className,
  tone,
  size,
  interactive,
  asChild = false,
  ...props
}: ChipProps) {
  const Comp = asChild ? Slot : "span";
  return (
    <Comp
      data-slot="chip"
      className={cn(chipVariants({ tone, size, interactive, className }))}
      {...props}
    />
  );
}

export { Chip, chipVariants };
export type { ChipProps };
