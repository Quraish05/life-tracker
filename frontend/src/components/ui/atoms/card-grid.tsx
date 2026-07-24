import * as React from "react";

import { cn } from "@/lib/utils";

/** Responsive 1→2→3 column grid for cards, with consistent gaps. */
function CardGrid({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-grid"
      className={cn(
        "grid grid-cols-1 gap-5 tablet:grid-cols-2 laptop:grid-cols-3",
        className,
      )}
      {...props}
    />
  );
}

export { CardGrid };
