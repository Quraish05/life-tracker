import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold transition disabled:pointer-events-none disabled:opacity-60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "rounded-full bg-grape text-on-accent shadow-lg shadow-grape/30 hover:-translate-y-0.5 hover:bg-grape-deep hover:shadow-xl hover:shadow-grape/40 active:translate-y-0 disabled:hover:translate-y-0",
        secondary:
          "rounded-full border border-grape/25 bg-surface/80 text-grape shadow-sm backdrop-blur-xl hover:-translate-y-0.5 hover:border-grape/40 hover:bg-surface active:translate-y-0 disabled:hover:translate-y-0",
        ghost: "rounded-full text-foreground hover:bg-lilac/40",
        link: "font-semibold text-grape underline-offset-4 hover:text-grape-deep hover:underline",
      },
      size: {
        default: "h-11 px-5",
        sm: "h-9 px-4 text-xs",
        lg: "h-12 px-6 text-base",
        block: "w-full py-3 px-4",
        link: "h-auto p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

interface ButtonProps
  extends React.ComponentProps<"button">,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
export type { ButtonProps };
