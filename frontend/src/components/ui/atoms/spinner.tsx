import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/**
 * A ring spinner in the grape accent. Size it with `className` (e.g. `size-6`);
 * defaults to `size-5`. Carries an accessible label unless one is provided by a
 * parent `role="status"` region (pass `aria-hidden` in that case).
 */
function Spinner({ className, ...props }: ComponentProps<"span">) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        "inline-block size-5 animate-spin rounded-full border-2 border-grape/25 border-t-grape",
        className,
      )}
      {...props}
    />
  );
}

export { Spinner };
