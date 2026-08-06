import { cn } from "@/lib/utils";

/**
 * The Thyme "Bowl Clock" mark: a thyme-sprig clock (a clock face whose single
 * hand is a sprig with two leaves) sitting above a bowl. Drawn in `currentColor`
 * — set the colour on the parent (`text-on-accent` on a filled tile, `text-grape`
 * standalone). Legible down to favicon size.
 */
export function BowlClock({
  size = 22,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="8.4" r="5.9" />
      <path d="M12 8.9V4.4" />
      <ellipse
        cx="13.9"
        cy="6"
        rx="2.1"
        ry="1.2"
        transform="rotate(-42 13.9 6)"
        fill="currentColor"
        stroke="none"
      />
      <ellipse
        cx="10.3"
        cy="7.5"
        rx="1.8"
        ry="1"
        transform="rotate(42 10.3 7.5)"
        fill="currentColor"
        stroke="none"
      />
      <path d="M2.8 16.4h18.4c0 3.4-4.1 5.8-9.2 5.8s-9.2-2.4-9.2-5.8Z" />
    </svg>
  );
}

/** The accent-filled app tile — the Bowl Clock on a grape square. Replaces "LT". */
export function BrandMark({
  size = 30,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-none items-center justify-center rounded-md bg-grape text-on-accent",
        className,
      )}
      style={{ height: size, width: size }}
    >
      <BowlClock size={Math.round(size * 0.72)} />
    </div>
  );
}

/** Horizontal lockup: the app tile + the "Thyme" wordmark. */
export function BrandLockup({
  markSize = 30,
  className,
  textClassName,
}: {
  markSize?: number;
  className?: string;
  textClassName?: string;
}) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <BrandMark size={markSize} />
      <span className={cn("font-bold tracking-tight text-foreground", textClassName)}>
        Thyme
      </span>
    </span>
  );
}
