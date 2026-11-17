"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Keeps data fresh by re-fetching on an interval while the tab is visible,
 * and immediately when the person comes back to the tab/app.
 */
export function usePolling<T>(url: string, initial: T, intervalMs = 8000) {
  const [data, setData] = useState<T>(initial);
  const [offline, setOffline] = useState(false);
  const busy = useRef(false);

  const refresh = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      setData((await res.json()) as T);
      setOffline(false);
    } catch {
      setOffline(true);
    } finally {
      busy.current = false;
    }
  }, [url]);

  useEffect(() => {
    refresh();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, intervalMs);
    const onShow = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onShow);
    window.addEventListener("focus", onShow);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onShow);
      window.removeEventListener("focus", onShow);
    };
  }, [refresh, intervalMs]);

  return { data, setData, refresh, offline };
}

/** True after the first client render (for things that depend on the device clock/locale). */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

/** JSON fetch helper that throws the server's friendly error message. */
export async function api<T>(url: string, init: { method: string; body?: unknown }): Promise<T> {
  const res = await fetch(url, {
    method: init.method,
    headers: init.body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
  let payload: unknown = null;
  try {
    payload = await res.json();
  } catch {}
  if (!res.ok) {
    const msg =
      payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
        ? payload.error
        : "Something went sideways. Check your connection and try again.";
    const err = new Error(msg) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return payload as T;
}
