"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type ToastVariant = "default" | "error";

type ToastItem = {
  id: number;
  message: string;
  variant: ToastVariant;
};

type Ctx = {
  show: (message: string, variant?: ToastVariant) => void;
};

const ToastContext = createContext<Ctx | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const show = useCallback((message: string, variant: ToastVariant = "default") => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev, { id, message, variant }]);
  }, []);

  return (
    <ToastContext value={{ show }}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex flex-col items-center gap-2 px-4"
      >
        {items.map((t) => (
          <ToastView
            key={t.id}
            item={t}
            onDismiss={() =>
              setItems((prev) => prev.filter((x) => x.id !== t.id))
            }
          />
        ))}
      </div>
    </ToastContext>
  );
}

function ToastView({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3500);
    return () => clearTimeout(t);
  }, [onDismiss]);

  const variantClass =
    item.variant === "error"
      ? "border-destructive text-destructive"
      : "border-border text-foreground";

  return (
    <div
      role="status"
      className={`pointer-events-auto max-w-sm rounded-xl border bg-background px-4 py-3 text-sm normal-case shadow-lg ${variantClass}`}
    >
      {item.message}
    </div>
  );
}

export function useToast(): Ctx {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast debe usarse dentro de ToastProvider");
  return ctx;
}
