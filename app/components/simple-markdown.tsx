import { Fragment, type ReactNode } from "react";

type InlineToken = {
  type: "text" | "bold" | "italic" | "underline";
  value: string;
};

const PATTERNS: { type: InlineToken["type"]; regex: RegExp }[] = [
  { type: "bold", regex: /\*\*([^*]+)\*\*/ },
  { type: "underline", regex: /__([^_]+)__/ },
  { type: "italic", regex: /\*([^*]+)\*/ },
];

function tokenize(input: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  let rest = input;
  while (rest.length > 0) {
    let earliest: {
      type: InlineToken["type"];
      index: number;
      match: RegExpExecArray;
    } | null = null;
    for (const p of PATTERNS) {
      const m = p.regex.exec(rest);
      if (m && (earliest === null || m.index < earliest.index)) {
        earliest = { type: p.type, index: m.index, match: m };
      }
    }
    if (!earliest) {
      tokens.push({ type: "text", value: rest });
      break;
    }
    if (earliest.index > 0) {
      tokens.push({ type: "text", value: rest.slice(0, earliest.index) });
    }
    tokens.push({ type: earliest.type, value: earliest.match[1] });
    rest = rest.slice(earliest.index + earliest.match[0].length);
  }
  return tokens;
}

function renderInline(tokens: InlineToken[]): ReactNode {
  return tokens.map((t, i) => {
    if (t.type === "bold") return <strong key={i}>{t.value}</strong>;
    if (t.type === "italic") return <em key={i}>{t.value}</em>;
    if (t.type === "underline") return <u key={i}>{t.value}</u>;
    return <Fragment key={i}>{t.value}</Fragment>;
  });
}

function renderLine(line: string, key: number): ReactNode {
  if (line.startsWith("## ")) {
    return (
      <div key={key} className="font-semibold text-secondary">
        {renderInline(tokenize(line.slice(3)))}
      </div>
    );
  }
  if (line.startsWith("# ")) {
    return (
      <div key={key} className="font-semibold text-primary">
        {renderInline(tokenize(line.slice(2)))}
      </div>
    );
  }
  return (
    <div key={key} style={{ minHeight: "1em" }}>
      {renderInline(tokenize(line))}
    </div>
  );
}

export function SimpleMarkdown({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const lines = text.split("\n");
  return <div className={className}>{lines.map((line, i) => renderLine(line, i))}</div>;
}
