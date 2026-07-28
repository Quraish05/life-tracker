/** A markdown-editor toolbar action. */
export type Tool = {
  label: string;
  title: string;
  // Either wrap the selection (before/after) or prefix each selected line.
  wrap?: [string, string];
  linePrefix?: string;
};

export const TOOLS: Tool[] = [
  { label: "B", title: "Bold", wrap: ["**", "**"] },
  { label: "i", title: "Italic", wrap: ["_", "_"] },
  { label: "H", title: "Heading", linePrefix: "## " },
  { label: "“”", title: "Quote", linePrefix: "> " },
  { label: "•", title: "Bullet list", linePrefix: "- " },
  { label: "1.", title: "Numbered list", linePrefix: "1. " },
  { label: "<>", title: "Inline code", wrap: ["`", "`"] },
  { label: "🔗", title: "Link", wrap: ["[", "](https://)"] },
];
