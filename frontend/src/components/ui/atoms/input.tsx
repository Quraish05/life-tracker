import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "w-full rounded-xl border border-border/60 bg-background/80 px-4 py-2.5 text-sm text-foreground placeholder:text-muted/60 transition",
        "focus:border-grape focus:bg-surface focus:outline-none focus:ring-4 focus:ring-ring",
        "aria-[invalid=true]:border-coral aria-[invalid=true]:focus:ring-coral/30",
        "disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
