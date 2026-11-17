"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./hooks";

/** Organizer sign-in state. The server is the source of truth (httpOnly cookie). */
export function useOrganizer(initial: boolean) {
  const [organizer, setOrganizer] = useState(initial);

  const signIn = useCallback(async (pin: string) => {
    await api("/api/organizer", { method: "POST", body: { pin } });
    setOrganizer(true);
  }, []);

  const signOut = useCallback(async () => {
    await api("/api/organizer", { method: "DELETE" }).catch(() => {});
    setOrganizer(false);
  }, []);

  return { organizer, setOrganizer, signIn, signOut };
}

export function PinForm({
  onSubmit,
  onCancel,
  autoFocus = true,
}: {
  onSubmit: (pin: string) => Promise<void>;
  onCancel?: () => void;
  autoFocus?: boolean;
}) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!pin.trim() || busy) return;
        setBusy(true);
        setError(null);
        try {
          await onSubmit(pin.trim());
        } catch (err) {
          setError(err instanceof Error ? err.message : "That didn't work.");
          setPin("");
          inputRef.current?.focus();
        } finally {
          setBusy(false);
        }
      }}
      className="space-y-3"
    >
      <label className="block">
        <span className="mb-1.5 block text-[15px] font-semibold">Organizer PIN</span>
        <input
          ref={inputRef}
          type="password"
          inputMode="numeric"
          autoComplete="current-password"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          className="w-full rounded-2xl border-[2.5px] border-ink bg-paper px-4 py-3 text-center text-[24px] font-bold tracking-[0.3em] outline-none focus:bg-brand-soft"
          aria-invalid={!!error}
        />
      </label>
      {error && (
        <p role="alert" className="rounded-xl bg-[#ffe1dc] px-3 py-2 text-[14.5px] font-semibold">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        {onCancel && (
          <button type="button" onClick={onCancel} className="press min-h-[52px] flex-1 rounded-2xl bg-paper font-bold sticker">
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={!pin.trim() || busy}
          className="press min-h-[52px] flex-[2] rounded-2xl bg-brand font-bold sticker disabled:opacity-50"
        >
          {busy ? "Checking…" : "Unlock"}
        </button>
      </div>
    </form>
  );
}

export function PinDialog({
  open,
  onClose,
  onSubmit,
  title = "Organizer sign-in",
  blurb = "Checking items off and cleaning up the list is for the organizer.",
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (pin: string) => Promise<void>;
  title?: string;
  blurb?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-ink/50 p-3 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="sticker animate-slide-up w-full max-w-sm rounded-[28px] bg-paper p-5 pb-[max(20px,env(safe-area-inset-bottom))]"
      >
        <div className="mb-1 text-[30px]" aria-hidden>
          🔐
        </div>
        <h2 className="heading text-[26px]">{title}</h2>
        <p className="mb-4 mt-1 text-[15px] text-ink-soft">{blurb}</p>
        <PinForm onSubmit={onSubmit} onCancel={onClose} />
      </div>
    </div>
  );
}
