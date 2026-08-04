import { type ComponentProps, type ReactNode } from "react";

import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/atoms/card";
import { IconTile } from "@/components/ui/atoms/icon-tile";

interface EmptyStateProps
  extends Omit<ComponentProps<"section">, "title"> {
  /** Emoji or icon shown in the tile. */
  icon: ReactNode;
  /** Heading — compose an <AccentText> inside to highlight a word. */
  title: ReactNode;
  /** Supporting copy explaining the state or next step. */
  description: ReactNode;
  /** Optional call to action (e.g. a "+ New" Button). */
  action?: ReactNode;
}

/** Centered dashed-card placeholder for empty lists and blank sections. */
function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <Card
      asChild
      tone="dashed"
      padding="lg"
      className={cn("flex flex-col items-center text-center", className)}
    >
      <section {...props}>
        <IconTile>{icon}</IconTile>
        <h2 className="mt-5 text-xl font-bold text-foreground">{title}</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
          {description}
        </p>
        {action && <div className="mt-5">{action}</div>}
      </section>
    </Card>
  );
}

export { EmptyState };
export type { EmptyStateProps };
