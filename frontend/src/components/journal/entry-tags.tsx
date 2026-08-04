type Props = {
  tags: string[];
  /** `sm` — drawer preview; `md` — the reader/page. */
  size?: "sm" | "md";
  className?: string;
};

/** Shared hashtag chip row for a journal entry. Renders nothing when empty. */
export function EntryTags({ tags, size = "md", className = "" }: Props) {
  if (tags.length === 0) return null;

  const chip =
    size === "sm"
      ? "px-2.5 py-1 text-[11px]"
      : "px-3 py-1.5 text-[11.5px]";

  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {tags.map((t) => (
        <span
          key={t}
          className={`rounded-full border border-border font-semibold text-muted ${chip}`}
        >
          #{t}
        </span>
      ))}
    </div>
  );
}
