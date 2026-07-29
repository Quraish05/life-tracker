import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const cardVariants = cva("rounded-3xl", {
  variants: {
    tone: {
      /** Frosted white — the default content surface (e.g. note cards). */
      glass: "border border-border/60 bg-surface/70 backdrop-blur-sm",
      /** Softer frosted panel — banners and callouts. */
      soft: "border border-grape/20 bg-surface/60 backdrop-blur-sm",
      /** Dashed outline — empty states and drop zones. */
      dashed:
        "border-2 border-dashed border-grape/25 bg-surface/60 backdrop-blur-sm",
      /** No border or fill — supply your own background via className. */
      plain: "",
    },
    padding: {
      none: "",
      sm: "p-5",
      md: "p-6",
      lg: "p-12",
    },
    /** Adds shadow + hover lift for clickable cards. */
    interactive: {
      true: "shadow-sm transition hover:-translate-y-1 hover:shadow-lg",
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
  extends React.ComponentProps<"div">,
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
