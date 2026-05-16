"use client";

import { useEffect, useState, type ReactNode } from "react";

type SectionId = "ios" | "android" | "desktop" | "info";

function detectOS(): SectionId | null {
  if (typeof navigator === "undefined") return null;
  const ua = navigator.userAgent || "";
  const platform = navigator.platform || "";
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (isIOS) return "ios";
  if (/android/i.test(ua)) return "android";
  if (/Windows|Macintosh|Linux/.test(ua)) return "desktop";
  return null;
}

export function InstallSections({
  ios,
  android,
  desktop,
  info,
}: {
  ios: ReactNode;
  android: ReactNode;
  desktop: ReactNode;
  info: ReactNode;
}) {
  const [openId, setOpenId] = useState<SectionId | null>(null);

  useEffect(() => {
    setOpenId(detectOS());
  }, []);

  const sections: { id: SectionId; title: string; content: ReactNode }[] = [
    { id: "ios", title: "iPhone / iPad", content: ios },
    { id: "android", title: "Android", content: android },
    { id: "desktop", title: "Computadora (Windows / Mac / Linux)", content: desktop },
    { id: "info", title: "¿Qué cambia al instalarla?", content: info },
  ];

  return (
    <div className="flex flex-col gap-4">
      {sections.map((s) => {
        const open = openId === s.id;
        return (
          <section
            key={s.id}
            className="overflow-hidden rounded-2xl border border-border bg-sidebar"
          >
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setOpenId(open ? null : s.id)}
              className="flex w-full items-center justify-between gap-3 px-6 py-4 text-left"
            >
              <h2 className="text-xl text-page-title">{s.title}</h2>
              <span
                aria-hidden="true"
                className={`text-muted-foreground transition-transform ${
                  open ? "rotate-90" : "rotate-0"
                }`}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </span>
            </button>
            {open && <div className="px-6 pb-6">{s.content}</div>}
          </section>
        );
      })}
    </div>
  );
}
