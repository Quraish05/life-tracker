import { type ComponentProps } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const cardVariants = cva("rounded-2xl", {
  variants: {
    tone: {
      /** The default content surface (e.g. note cards) — flat, hairline border. */
      glass: "border border-border bg-surface",
      /** Softer tinted panel — banners and callouts. */
      soft: "border border-grape/20 bg-surface",
      /** Dashed outline — empty states and drop zones. */
      dashed: "border-2 border-dashed border-grape/25 bg-surface",
      /** No border or fill — supply your own background via className. */
      plain: "",
    },
    padding: {
      none: "",
      sm: "p-5",
      md: "p-6",
      lg: "p-12",
    },
    /** Tint-on-hover affordance for clickable cards (flat — no shadow/lift). */
    interactive: {
      true: "transition-colors hover:border-grape/30 hover:bg-grape/5",
      false: "",
    },
  },
  defaultVariants: {
    tone: "glass",
    padding: "sm",
    interactive: false,
  },
});

interface CardProps
  extends ComponentProps<"div">,
    VariantProps<typeof cardVariants> {
  asChild?: boolean;
}

/** Rounded surface primitive. Render as another element (e.g. <article>) via `asChild`. */
function Card({
  className,
  tone,
  padding,
  interactive,
  asChild = false,
  ...props
}: CardProps) {
  const Comp = asChild ? Slot : "div";
  return (
    <Comp
      data-slot="card"
      className={cn(cardVariants({ tone, padding, interactive, className }))}
      {...props}
    />
  );
}

export { Card, cardVariants };
export type { CardProps };
