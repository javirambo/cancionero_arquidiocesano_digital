import { Fragment, type ReactNode } from "react";
import { MarkdownLink } from "./markdown-link";

type InlineToken = {
  type: "text" | "bold" | "italic" | "underline" | "link";
  value: string;
  href?: string;
};

const PATTERNS: { type: InlineToken["type"]; regex: RegExp }[] = [
  { type: "link", regex: /\[([^\]]+)\]\(([^)]+)\)/ },
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
    if (earliest.type === "link") {
      tokens.push({
        type: "link",
        value: earliest.match[1],
        href: earliest.match[2],
      });
    } else {
      tokens.push({ type: earliest.type, value: earliest.match[1] });
    }
    rest = rest.slice(earliest.index + earliest.match[0].length);
  }
  return tokens;
}

function renderInline(tokens: InlineToken[], linksClickable: boolean): ReactNode {
  return tokens.map((t, i) => {
    if (t.type === "bold") return <strong key={i}>{t.value}</strong>;
    if (t.type === "italic") return <em key={i}>{t.value}</em>;
    if (t.type === "underline") return <u key={i}>{t.value}</u>;
    if (t.type === "link") {
      // Si la tarjeta contenedora ya es un enlace, no anidamos otro `<a>`
      // (sería HTML inválido y rompería la hidratación): mostramos el texto.
      if (!linksClickable || !t.href) return <Fragment key={i}>{t.value}</Fragment>;
      return (
        <MarkdownLink key={i} href={t.href}>
          {t.value}
        </MarkdownLink>
      );
    }
    return <Fragment key={i}>{t.value}</Fragment>;
  });
}

function renderLine(line: string, key: number, linksClickable: boolean): ReactNode {
  if (line.startsWith("## ")) {
    return (
      <div key={key} className="font-semibold text-secondary">
        {renderInline(tokenize(line.slice(3)), linksClickable)}
      </div>
    );
  }
  if (line.startsWith("# ")) {
    return (
      <div key={key} className="font-semibold text-primary">
        {renderInline(tokenize(line.slice(2)), linksClickable)}
      </div>
    );
  }
  return (
    <div key={key} style={{ minHeight: "1em" }}>
      {renderInline(tokenize(line), linksClickable)}
    </div>
  );
}

/**
 * Versión en texto plano del mismo mini-markdown: quita los marcadores y
 * colapsa los saltos de línea en espacios.
 *
 * Se usa en las vistas compactas (carousels de altura fija), donde solo entra
 * el comienzo del texto: ahí hace falta un flujo de texto continuo para que
 * `line-clamp` pueda recortar con "…". El render normal, con un `<div>` por
 * línea, no se deja recortar así.
 */
export function simpleMarkdownToPlainText(text: string): string {
  return text
    .split("\n")
    .map((line) => line.replace(/^#{1,2}\s+/, ""))
    .join(" ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

export function SimpleMarkdown({
  text,
  className,
  linksClickable = true,
}: {
  text: string;
  className?: string;
  /**
   * Si false, los links se muestran como texto plano (no `<a>`). Se usa cuando
   * el contenedor ya es un enlace, para no anidar anchors.
   */
  linksClickable?: boolean;
}) {
  const lines = text.split("\n");
  return (
    <div className={className}>
      {lines.map((line, i) => renderLine(line, i, linksClickable))}
    </div>
  );
}

/**
 * Versión inline del mini-markdown para las vistas compactas: colapsa los
 * saltos de línea en espacios y quita los marcadores de título, igual que
 * `simpleMarkdownToPlainText`, pero conserva los links como clickeables. Al ser
 * un flujo inline continuo, `line-clamp` puede recortar con "…".
 */
export function SimpleMarkdownInline({
  text,
  linksClickable = true,
}: {
  text: string;
  linksClickable?: boolean;
}) {
  const flat = text
    .split("\n")
    .map((line) => line.replace(/^#{1,2}\s+/, ""))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  return <>{renderInline(tokenize(flat), linksClickable)}</>;
}
