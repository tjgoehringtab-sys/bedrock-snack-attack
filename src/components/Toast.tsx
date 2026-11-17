"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

type ToastItem = { id: number; text: string; tone: "good" | "bad" };
type Ctx = {
  toast: (text: string, tone?: "good" | "bad") => void;
  /** Throw emoji confetti from an element (or the screen center). */
  burst: (from?: HTMLElement | null, emojis?: string[]) => void;
};

const ToastContext = createContext<Ctx | null>(null);
const DEFAULT_EMOJIS = ["🍿", "🍫", "🥤", "🍕", "🍩", "🥨", "🍪", "🌮"];

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const toast = useCallback((text: string, tone: "good" | "bad" = "good") => {
    const id = nextId.current++;
    setItems((list) => [...list.slice(-1), { id, text, tone }]);
    window.setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), tone === "bad" ? 4200 : 3000);
  }, []);

  const burst = useCallback((from?: HTMLElement | null, emojis: string[] = DEFAULT_EMOJIS) => {
    if (typeof window === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const rect = from?.getBoundingClientRect();
    const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const y = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
    for (let i = 0; i < 14; i++) {
      const el = document.createElement("span");
      el.className = "burst-particle";
      el.textContent = emojis[i % emojis.length];
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.3;
      const dist = 90 + Math.random() * 120;
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      el.style.setProperty("--dx", `${Math.cos(angle) * dist}px`);
      el.style.setProperty("--dy", `${Math.sin(angle) * dist}px`);
      el.style.setProperty("--rot", `${(Math.random() - 0.5) * 120}deg`);
      el.style.animationDelay = `${i * 12}ms`;
      document.body.appendChild(el);
      window.setTimeout(() => el.remove(), 1200);
    }
  }, []);

  return (
    <ToastContext.Provider value={{ toast, burst }}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-[max(12px,env(safe-area-inset-top))] z-[90] flex flex-col items-center gap-2 px-4"
      >
        {items.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`sticker animate-slide-up max-w-md rounded-2xl px-4 py-3 text-center text-[15px] font-semibold leading-snug ${
              t.tone === "good" ? "bg-ink text-white" : "bg-[#ffe1dc] text-ink"
            }`}
          >
            {t.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): Ctx {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
