import { type ComponentProps, type ReactNode } from "react";

import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ui/atoms/theme-toggle";

/** Left marketing panel shared by the auth screens. */
function BrandPanel({
  title,
  description,
}: {
  title: ReactNode;
  description: ReactNode;
}) {
  return (
    <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-lilac via-blush to-peach p-10 dark:from-[#2a1530] dark:via-[#221428] dark:to-[#1a0f1e] laptop:flex laptop:p-14">
      {/* Decorative pastel blobs — barely-there in dark so they don't glow white. */}
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-sky/60 blur-3xl dark:bg-grape/[0.07]" />
      <div className="pointer-events-none absolute -bottom-28 right-0 h-80 w-80 rounded-full bg-mint/60 blur-3xl dark:bg-grape/[0.07]" />

      <div className="relative flex items-center gap-2.5">
        <div className="flex h-10 w-10 rotate-3 items-center justify-center rounded-xl bg-gradient-to-br from-grape to-coral text-sm font-bold text-white shadow-lg shadow-grape/30">
          LT
        </div>
        <span className="text-lg font-bold tracking-tight text-foreground">
          Life <span className="font-display italic text-grape">Tracker</span>
        </span>
      </div>

      <div className="relative max-w-md">
        <h1 className="text-5xl font-bold leading-tight tracking-tight text-foreground laptop:text-6xl">
          {title}
        </h1>
        <p className="mt-5 text-lg text-muted">{description}</p>
      </div>

      <p className="relative text-sm text-muted/80">
        Made with care for the everyday.
      </p>
    </div>
  );
}

/** Styled card that wraps the form fields. Forwards all native form props. */
function AuthCard({ className, ...props }: ComponentProps<"form">) {
  return (
    <form
      className={cn(
        "space-y-4 rounded-3xl border border-border/60 bg-surface/80 p-7 shadow-xl shadow-grape/10 backdrop-blur-xl",
        className,
      )}
      {...props}
    />
  );
}

interface AuthScreenProps {
  brandTitle: ReactNode;
  brandDescription: ReactNode;
  title: ReactNode;
  subtitle: ReactNode;
  footer: ReactNode;
  children: ReactNode;
}

/** Full split-screen auth layout: brand panel + centered form column. */
function AuthScreen({
  brandTitle,
  brandDescription,
  title,
  subtitle,
  footer,
  children,
}: AuthScreenProps) {
  return (
    <div className="relative grid min-h-dvh flex-1 laptop:grid-cols-2">
      <ThemeToggle className="absolute right-4 top-4 z-10" />
      <BrandPanel title={brandTitle} description={brandDescription} />

      <div className="flex items-center justify-center bg-background px-4 py-12">
        <div className="w-full max-w-sm">
          {/* Compact brand — only when the marketing panel is hidden. */}
          <div className="mb-8 flex items-center justify-center gap-2.5 laptop:hidden">
            <div className="flex h-9 w-9 rotate-3 items-center justify-center rounded-xl bg-gradient-to-br from-grape to-coral text-sm font-bold text-white shadow-md shadow-grape/30">
              LT
            </div>
            <span className="text-lg font-bold tracking-tight text-foreground">
              Life <span className="font-display italic text-grape">Tracker</span>
            </span>
          </div>
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              {title}
            </h2>
            <p className="mt-2 text-sm text-muted">{subtitle}</p>
          </div>

          {children}

          <p className="mt-6 text-center text-sm text-muted">{footer}</p>
        </div>
      </div>
    </div>
  );
}

export { AuthScreen, AuthCard, BrandPanel };
