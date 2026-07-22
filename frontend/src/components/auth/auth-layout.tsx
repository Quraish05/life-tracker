import * as React from "react";

import { cn } from "@/lib/utils";

/** Left marketing panel shared by the auth screens. */
function BrandPanel({
  title,
  description,
}: {
  title: React.ReactNode;
  description: React.ReactNode;
}) {
  return (
    <div className="relative flex flex-col justify-between overflow-hidden bg-gradient-to-br from-lilac via-blush to-peach p-10 lg:p-14">
      {/* Decorative pastel blobs */}
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-sky/60 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 right-0 h-80 w-80 rounded-full bg-mint/60 blur-3xl" />

      <div className="relative flex items-center gap-2.5">
        <div className="flex h-10 w-10 rotate-3 items-center justify-center rounded-xl bg-gradient-to-br from-grape to-coral text-sm font-bold text-white shadow-lg shadow-grape/30">
          LT
        </div>
        <span className="text-lg font-bold tracking-tight text-ink">
          Life <span className="font-display italic text-grape">Tracker</span>
        </span>
      </div>

      <div className="relative max-w-md">
        <h1 className="text-5xl font-bold leading-tight tracking-tight text-ink lg:text-6xl">
          {title}
        </h1>
        <p className="mt-5 text-lg text-ink-soft">{description}</p>
      </div>

      <p className="relative text-sm text-ink-soft/80">
        Made with care for the everyday.
      </p>
    </div>
  );
}

/** Styled card that wraps the form fields. Forwards all native form props. */
function AuthCard({ className, ...props }: React.ComponentProps<"form">) {
  return (
    <form
      className={cn(
        "space-y-4 rounded-3xl border border-white/60 bg-white/80 p-7 shadow-xl shadow-grape/10 backdrop-blur-xl",
        className,
      )}
      {...props}
    />
  );
}

interface AuthScreenProps {
  brandTitle: React.ReactNode;
  brandDescription: React.ReactNode;
  title: React.ReactNode;
  subtitle: React.ReactNode;
  footer: React.ReactNode;
  children: React.ReactNode;
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
    <div className="grid min-h-dvh flex-1 lg:grid-cols-2">
      <BrandPanel title={brandTitle} description={brandDescription} />

      <div className="flex items-center justify-center bg-cream px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-ink">
              {title}
            </h2>
            <p className="mt-2 text-sm text-ink-soft">{subtitle}</p>
          </div>

          {children}

          <p className="mt-6 text-center text-sm text-ink-soft">{footer}</p>
        </div>
      </div>
    </div>
  );
}

export { AuthScreen, AuthCard, BrandPanel };
