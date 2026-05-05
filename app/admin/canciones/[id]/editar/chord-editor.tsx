"use client";

import { useEffect, useImperativeHandle, useRef, forwardRef } from "react";
import { EditorState, RangeSetBuilder } from "@codemirror/state";
import {
  Decoration,
  EditorView,
  ViewPlugin,
  keymap,
  type DecorationSet,
  type ViewUpdate,
} from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";

const chordRe = /\[[^\]]+\]/g;
const directiveRe = /\{[^}]+\}/g;
const chordMark = Decoration.mark({ class: "cm-chord" });
const directiveMark = Decoration.mark({ class: "cm-directive" });

function buildChordDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  for (const { from, to } of view.visibleRanges) {
    const text = view.state.sliceDoc(from, to);
    type Hit = { start: number; end: number; deco: Decoration };
    const hits: Hit[] = [];
    chordRe.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = chordRe.exec(text)) !== null) {
      hits.push({ start: from + m.index, end: from + m.index + m[0].length, deco: chordMark });
    }
    directiveRe.lastIndex = 0;
    while ((m = directiveRe.exec(text)) !== null) {
      hits.push({ start: from + m.index, end: from + m.index + m[0].length, deco: directiveMark });
    }
    hits.sort((a, b) => a.start - b.start || a.end - b.end);
    for (const h of hits) builder.add(h.start, h.end, h.deco);
  }
  return builder.finish();
}

const chordHighlighter = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = buildChordDecorations(view);
    }
    update(u: ViewUpdate) {
      if (u.docChanged || u.viewportChanged) {
        this.decorations = buildChordDecorations(u.view);
      }
    }
  },
  { decorations: (v) => v.decorations }
);

const editorTheme = EditorView.theme({
  "&": {
    fontSize: "0.875rem",
    fontFamily:
      "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
  ".cm-content": {
    padding: "0.5rem 0",
    caretColor: "var(--color-foreground)",
  },
  ".cm-gutters": { display: "none" },
  ".cm-chord": {
    color: "var(--color-primary)",
    fontWeight: "700",
  },
  ".cm-directive": {
    color: "var(--color-secondary)",
    fontWeight: "600",
  },
  "&.cm-focused": { outline: "none" },
});

export type ChordEditorHandle = {
  /** Inserta texto en la posición actual del cursor (o reemplaza la selección),
   *  preservando el undo stack. Devuelve foco al editor. */
  insertText: (text: string) => void;
  /** Envuelve la selección actual con `before` y `after` en líneas propias.
   *  Si no hay selección, inserta el bloque vacío y deja el cursor entre medio. */
  wrapSelectionAsBlock: (before: string, after: string) => void;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minRows?: number;
};

export const ChordEditor = forwardRef<ChordEditorHandle, Props>(
  function ChordEditor({ value, onChange, minRows = 20 }, ref) {
    const hostRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);
    // Cache para evitar reaplicar `value` cuando el cambio vino del propio editor.
    const lastEmittedRef = useRef<string>(value);

    useEffect(() => {
      if (!hostRef.current || viewRef.current) return;
      const state = EditorState.create({
        doc: value,
        extensions: [
          history(),
          keymap.of([...defaultKeymap, ...historyKeymap]),
          EditorView.lineWrapping,
          editorTheme,
          chordHighlighter,
          EditorView.updateListener.of((u) => {
            if (u.docChanged) {
              const next = u.state.doc.toString();
              lastEmittedRef.current = next;
              onChange(next);
            }
          }),
        ],
      });
      const view = new EditorView({ state, parent: hostRef.current });
      viewRef.current = view;
      return () => {
        view.destroy();
        viewRef.current = null;
      };
      // Inicializa una sola vez. Cambios de `value` se manejan en el otro effect.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Sincroniza cambios externos de `value` (ej: reset de form) sin pisar
    // ediciones locales — el `lastEmittedRef` evita reentrada infinita.
    useEffect(() => {
      const view = viewRef.current;
      if (!view) return;
      if (value === lastEmittedRef.current) return;
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: value },
      });
      lastEmittedRef.current = value;
    }, [value]);

    useImperativeHandle(ref, () => ({
      insertText(text: string) {
        const view = viewRef.current;
        if (!view) return;
        view.focus();
        const { from, to } = view.state.selection.main;
        view.dispatch({
          changes: { from, to, insert: text },
          selection: { anchor: from + text.length },
        });
      },
      wrapSelectionAsBlock(before: string, after: string) {
        const view = viewRef.current;
        if (!view) return;
        view.focus();
        const doc = view.state.doc;
        const { from, to } = view.state.selection.main;
        // Expandir el rango a líneas completas para que `before`/`after`
        // queden en sus propias líneas.
        const startLine = doc.lineAt(from);
        const endLine = doc.lineAt(to);
        const blockFrom = startLine.from;
        const blockTo = endLine.to;
        const inner = doc.sliceString(blockFrom, blockTo);
        const needsLeadNl = blockFrom > 0 && doc.sliceString(blockFrom - 1, blockFrom) !== "\n";
        const needsTrailNl = blockTo < doc.length && doc.sliceString(blockTo, blockTo + 1) !== "\n";
        const insert =
          (needsLeadNl ? "\n" : "") +
          before + "\n" +
          (inner.length > 0 ? inner + "\n" : "") +
          after +
          (needsTrailNl ? "\n" : "");
        // Cursor: si no había selección, queda entre las dos directivas.
        const cursor =
          inner.length === 0
            ? blockFrom + (needsLeadNl ? 1 : 0) + before.length + 1
            : blockFrom + insert.length;
        view.dispatch({
          changes: { from: blockFrom, to: blockTo, insert },
          selection: { anchor: cursor },
        });
      },
    }));

    return (
      <div
        ref={hostRef}
        className="cm-host w-full overflow-hidden rounded-lg border border-border bg-background px-3"
        style={{ minHeight: `${minRows * 1.5}rem` }}
      />
    );
  }
);
