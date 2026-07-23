"use client";

import { useRef, useState } from "react";

import { Textarea } from "@/components/ui/atoms/textarea";
import { MarkdownPreview } from "@/components/notes/markdown-preview";

type EditorProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
};

type Tool = {
  label: string;
  title: string;
  // Either wrap the selection (before/after) or prefix each selected line.
  wrap?: [string, string];
  linePrefix?: string;
};

const TOOLS: Tool[] = [
  { label: "B", title: "Bold", wrap: ["**", "**"] },
  { label: "i", title: "Italic", wrap: ["_", "_"] },
  { label: "H", title: "Heading", linePrefix: "## " },
  { label: "“”", title: "Quote", linePrefix: "> " },
  { label: "•", title: "Bullet list", linePrefix: "- " },
  { label: "1.", title: "Numbered list", linePrefix: "1. " },
  { label: "<>", title: "Inline code", wrap: ["`", "`"] },
  { label: "🔗", title: "Link", wrap: ["[", "](https://)"] },
];

export function MarkdownEditor({
  id,
  value,
  onChange,
  error,
  placeholder,
}: EditorProps) {
  const [mode, setMode] = useState<"write" | "preview">("write");
  const ref = useRef<HTMLTextAreaElement>(null);

  function applyTool(tool: Tool) {
    const el = ref.current;
    if (!el) return;

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = value.slice(start, end);
    let next = value;
    let caret = end;

    if (tool.wrap) {
      const [before, after] = tool.wrap;
      next = value.slice(0, start) + before + selected + after + value.slice(end);
      // Put the caret inside the wrappers when nothing was selected.
      caret = selected ? end + before.length + after.length : start + before.length;
    } else if (tool.linePrefix) {
      const lineStart = value.lastIndexOf("\n", start - 1) + 1;
      const block = value.slice(lineStart, end);
      const prefixed = block
        .split("\n")
        .map((line) => tool.linePrefix + line)
        .join("\n");
      next = value.slice(0, lineStart) + prefixed + value.slice(end);
      caret = end + (prefixed.length - block.length);
    }

    onChange(next);
    // Restore focus + caret after React re-renders the value.
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(caret, caret);
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-2 rounded-t-xl border border-b-0 border-lilac/60 bg-lilac/20 px-2 py-1.5">
        <div className="flex flex-wrap items-center gap-0.5">
          {TOOLS.map((tool) => (
            <button
              key={tool.title}
              type="button"
              title={tool.title}
              onClick={() => applyTool(tool)}
              disabled={mode === "preview"}
              className="flex h-8 min-w-8 items-center justify-center rounded-lg px-1.5 text-sm font-semibold text-ink/70 transition hover:bg-white hover:text-grape disabled:opacity-40 disabled:hover:bg-transparent"
            >
              {tool.label}
            </button>
          ))}
        </div>
        <div className="flex shrink-0 rounded-lg bg-white/70 p-0.5 text-xs font-semibold">
          {(["write", "preview"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded-md px-3 py-1 capitalize transition ${
                mode === m ? "bg-grape text-white shadow-sm" : "text-ink/60 hover:text-ink"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {mode === "write" ? (
        <Textarea
          id={id}
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-invalid={error ? "true" : undefined}
          rows={12}
          className="min-h-64 resize-y rounded-t-none font-mono text-[13px] leading-relaxed"
        />
      ) : (
        <div className="min-h-64 rounded-b-xl border border-t-0 border-lilac/60 bg-white/70 px-4 py-3 text-sm">
          <MarkdownPreview>{value}</MarkdownPreview>
        </div>
      )}
    </div>
  );
}
