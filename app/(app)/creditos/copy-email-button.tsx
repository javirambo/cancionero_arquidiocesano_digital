"use client";

import { useState } from "react";

export function CopyEmailButton({ email }: { email: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={handleCopy}
        className="text-base leading-7 text-primary underline"
      >
        {email}
      </button>
      {copied && (
        <span
          role="status"
          aria-live="polite"
          className="text-sm text-secondary"
        >
          ¡Email copiado al portapapeles!
        </span>
      )}
    </div>
  );
}
