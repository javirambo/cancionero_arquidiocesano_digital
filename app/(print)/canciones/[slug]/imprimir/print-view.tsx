"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  parseBody,
  transposeLine,
  type ChordLine,
  type ChordSystem,
} from "@/lib/chordpro";
import { groupChorus, LineView } from "@/app/components/song-render";

const MAX_PT = 11;
const MIN_PT = 9;
const STEP_PT = 0.5;

type Props = {
  slug: string;
  title: string;
  number: number | null;
  author: string | null;
  body: string;
  showChords: boolean;
  semitones: number;
  system: ChordSystem;
};

export function PrintView({
  slug,
  title,
  number,
  author,
  body,
  showChords,
  semitones,
  system,
}: Props) {
  const lines = useMemo(() => parseBody(body), [body]);
  const transposed: ChordLine[] = useMemo(
    () => lines.map((l) => transposeLine(l, semitones, system)),
    [lines, semitones, system]
  );

  const pageRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [fontSizePt, setFontSizePt] = useState(MAX_PT);
  const [adjusted, setAdjusted] = useState(false);

  // Auto-shrink: medimos la altura del contenido vs el alto disponible de
  // una hoja A4 (297mm - 2*1.5cm de margen). Si excede, bajamos el font
  // hasta que entre en una página, o llegamos al mínimo y dejamos que
  // fluya a más páginas.
  useEffect(() => {
    const page = pageRef.current;
    const content = contentRef.current;
    if (!page || !content) return;

    let pt = MAX_PT;
    content.style.fontSize = `${pt}pt`;

    const fits = () => {
      const available = page.clientHeight;
      return content.scrollHeight <= available + 1;
    };

    while (!fits() && pt > MIN_PT) {
      pt = Math.max(MIN_PT, pt - STEP_PT);
      content.style.fontSize = `${pt}pt`;
    }
    setFontSizePt(pt);
    setAdjusted(true);
  }, [transposed, showChords]);

  useEffect(() => {
    if (!adjusted) return;
    const t = window.setTimeout(() => window.print(), 100);
    return () => window.clearTimeout(t);
  }, [adjusted]);

  // Evita que esta página quede en el bfcache. Sin esto, al volver desde
  // /imprimir el navegador puede restaurar el DOM de impresión bajo la URL
  // de la canción y romper la hidratación de SongView.
  useEffect(() => {
    const onBeforeUnload = () => {};
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  return (
    <div className="print-root">
      <PrintStyles />

      <div className="print:hidden flex items-center justify-between gap-4 border-b border-border bg-sidebar px-6 py-3 normal-case">
        <a
          href={`/canciones/${slug}`}
          className="rounded-full border border-primary px-4 py-1 text-sm text-primary transition-colors hover:bg-primary hover:text-white"
        >
          ← Volver
        </a>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-full border border-primary bg-primary px-4 py-1 text-sm text-white transition-colors hover:bg-primary-hover"
        >
          Imprimir
        </button>
      </div>

      <div ref={pageRef} className="print-page">
        <div ref={contentRef} style={{ fontSize: `${fontSizePt}pt` }}>
          <header className="mb-4">
            <p className="text-[0.7em] uppercase tracking-[0.2em] text-secondary">
              {number !== null ? `Nº ${number}` : "Canto"}
            </p>
            <h1 className="text-[1.6em] font-bold uppercase leading-tight text-song-title">
              {title}
            </h1>
            {author && (
              <p className="text-[0.75em] normal-case text-muted-foreground">
                Autor: {author}
              </p>
            )}
          </header>

          <div className="font-serif leading-7 normal-case text-foreground">
            {groupChorus(transposed).map((block, i) =>
              block.inChorus ? (
                <div
                  key={i}
                  className="my-2 border-l-4 border-primary pl-4 italic"
                >
                  {block.lines.map((line, j) => (
                    <LineView key={j} line={line} showChords={showChords} />
                  ))}
                </div>
              ) : (
                <div key={i}>
                  {block.lines.map((line, j) => (
                    <LineView key={j} line={line} showChords={showChords} />
                  ))}
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PrintStyles() {
  return (
    <style jsx global>{`
      @page {
        size: A4;
        margin: 1.5cm;
      }
      .print-page {
        width: 210mm;
        min-height: calc(297mm - 3cm);
        padding: 0;
        margin: 0 auto;
        background: white;
      }
      @media screen {
        .print-root {
          background: #f3f3f3;
          min-height: 100vh;
        }
        .print-page {
          margin-top: 1.5cm;
          margin-bottom: 1.5cm;
          padding: 1.5cm;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
        }
      }
      @media print {
        body {
          background: white !important;
        }
        .print-page {
          box-shadow: none;
          margin: 0 auto;
        }
      }
    `}</style>
  );
}
