import * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "w-full rounded-xl border border-lilac/60 bg-cream/80 px-4 py-2.5 text-sm text-ink placeholder:text-ink-soft/60 transition",
        "focus:border-grape focus:bg-white focus:outline-none focus:ring-4 focus:ring-lilac",
        "aria-[invalid=true]:border-coral aria-[invalid=true]:focus:ring-coral/30",
        "disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
