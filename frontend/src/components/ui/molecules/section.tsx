import * as React from "react";

import { Chip } from "@/components/ui/atoms/chip";

interface SectionProps
  extends Omit<React.ComponentProps<"section">, "title"> {
  /** Uppercase section label. */
  title: React.ReactNode;
  /** Optional item count rendered as a trailing chip. */
  count?: number;
}

/** Titled content group with an optional count badge. */
function Section({ title, count, children, ...props }: SectionProps) {
  return (
    <section {...props}>
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-ink-soft/70">
        {title}
        {count !== undefined && (
          <Chip tone="muted" size="sm">
            {count}
          </Chip>
        )}
      </h2>
      {children}
    </section>
  );
}

export { Section };
export type { SectionProps };
