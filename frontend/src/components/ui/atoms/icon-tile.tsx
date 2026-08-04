import { type ComponentProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const iconTileVariants = cva(
  "flex items-center justify-center rounded-2xl",
  {
    variants: {
      size: {
        md: "h-11 w-11 text-xl",
        lg: "h-16 w-16 text-3xl",
      },
      tone: {
        butter: "bg-butter",
        white: "bg-surface",
      },
    },
    defaultVariants: {
      size: "lg",
      tone: "butter",
    },
  },
);

interface IconTileProps
  extends ComponentProps<"div">,
    VariantProps<typeof iconTileVariants> {}

/** Rounded square holding an emoji or icon — used for stat badges and empty states. */
function IconTile({ className, size, tone, ...props }: IconTileProps) {
  return (
    <div
      data-slot="icon-tile"
      className={cn(iconTileVariants({ size, tone, className }))}
      {...props}
    />
  );
}

export { IconTile, iconTileVariants };
export type { IconTileProps };
