import * as React from "react";

import { cn } from "@/lib/utils";

interface PageHeaderProps
  extends Omit<React.ComponentProps<"header">, "title"> {
  /** Small colored kicker above the title. */
  eyebrow: React.ReactNode;
  /** Main heading — compose an <AccentText> inside to highlight a word. */
  title: React.ReactNode;
  /** Optional supporting line beneath the title. */
  subtitle?: React.ReactNode;
  /** Optional trailing content (e.g. a primary Button), right-aligned. */
  action?: React.ReactNode;
}

/** Standard page masthead: eyebrow + title + subtitle, with an optional action. */
function PageHeader({
  eyebrow,
  title,
  subtitle,
  action,
  className,
  ...props
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "mb-8",
        action && "flex flex-wrap items-end justify-between gap-4",
        className,
      )}
      {...props}
    >
      <div>
        <p className="text-sm font-semibold text-grape">{eyebrow}</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-ink tablet:text-4xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-2 text-base text-ink-soft">{subtitle}</p>
        )}
      </div>
      {action}
    </header>
  );
}

export { PageHeader };
export type { PageHeaderProps };
