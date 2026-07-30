import { Fragment } from "react";

/**
 * Render a `ts_headline` snippet whose matched terms are wrapped in
 * `<mark>…</mark>`. We split on those tags and emit React text nodes rather than
 * using `dangerouslySetInnerHTML`, so any raw HTML in the note body is shown as
 * text and can't execute — the highlight is the only markup we introduce.
 */
export function HighlightedSnippet({ text }: { text: string }) {
  // Build the segments up front (a pure loop), so nothing is reassigned inside
  // the render callback below.
  const segments: Array<{ text: string; highlighted: boolean }> = [];
  let highlighted = false;
  for (const token of text.split(/(<mark>|<\/mark>)/)) {
    if (token === "<mark>") {
      highlighted = true;
    } else if (token === "</mark>") {
      highlighted = false;
    } else if (token) {
      segments.push({ text: token, highlighted });
    }
  }

  return (
    <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted">
      {segments.map((seg, i) =>
        seg.highlighted ? (
          <mark key={i} className="rounded bg-grape/25 px-0.5 text-foreground">
            {seg.text}
          </mark>
        ) : (
          <Fragment key={i}>{seg.text}</Fragment>
        ),
      )}
    </p>
  );
}
