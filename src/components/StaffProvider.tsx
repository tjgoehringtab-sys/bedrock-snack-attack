"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Staff } from "@/lib/types";

/**
 * Knows the roster and who is using this device.
 * Only the chosen staff id is kept in localStorage — all real data lives in Postgres.
 */
const STORAGE_KEY = "snack-attack:me";

type Ctx = {
  staff: Staff[];
  me: Staff | null;
  ready: boolean; // false until we've checked this device's saved choice
  chooseMe: (id: string) => void;
  forgetMe: () => void;
  findStaff: (id: string) => Staff | undefined;
};

const StaffContext = createContext<Ctx | null>(null);

export function StaffProvider({ staff, children }: { staff: Staff[]; children: React.ReactNode }) {
  const [meId, setMeId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = window.localStorage.getItem(STORAGE_KEY);
    } catch {}
    if (saved && staff.some((s) => s.id === saved)) setMeId(saved);
    else if (saved) {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {}
    }
    setReady(true);
  }, [staff]);

  const chooseMe = useCallback((id: string) => {
    setMeId(id);
    try {
      window.localStorage.setItem(STORAGE_KEY, id);
    } catch {}
  }, []);

  const forgetMe = useCallback(() => {
    setMeId(null);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }, []);

  const value = useMemo<Ctx>(() => {
    const byId = new Map(staff.map((s) => [s.id, s]));
    return {
      staff,
      me: meId ? byId.get(meId) ?? null : null,
      ready,
      chooseMe,
      forgetMe,
      findStaff: (id) => byId.get(id),
    };
  }, [staff, meId, ready, chooseMe, forgetMe]);

  return <StaffContext.Provider value={value}>{children}</StaffContext.Provider>;
}

export function useStaff(): Ctx {
  const ctx = useContext(StaffContext);
  if (!ctx) throw new Error("useStaff must be used inside <StaffProvider>");
  return ctx;
}
