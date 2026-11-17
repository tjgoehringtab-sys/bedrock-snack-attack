"use client";

import { useCallback, useEffect, useState } from "react";
import { getCategory } from "@config/snacks";
import type { SnackRequest, Staff } from "@/lib/types";
import { Avatar } from "./Avatar";
import { api } from "./hooks";
import { PinForm, useOrganizer } from "./Organizer";
import { useToast } from "./Toast";
import { When } from "./When";

type Tab = "requests" | "staff" | "reset";

export function AdminPanel({ initialOrganizer, configured }: { initialOrganizer: boolean; configured: boolean }) {
  const { organizer, setOrganizer, signIn, signOut } = useOrganizer(initialOrganizer);
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("requests");

  const onUnauthorized = useCallback(
    (err: unknown) => {
      if ((err as { status?: number }).status === 401) setOrganizer(false);
      toast(err instanceof Error ? err.message : "That didn't work.", "bad");
    },
    [setOrganizer, toast],
  );

  if (!configured) {
    return (
      <Shell>
        <div className="rounded-[24px] border-2 border-line bg-paper p-5 text-[16px] leading-relaxed">
          <p className="heading text-[22px]">Organizer mode is turned off.</p>
          <p className="mt-2 text-ink-soft">
            Add a variable named <code className="rounded bg-brand-soft px-1">ORGANIZER_PIN</code> to the app service in
            Railway (6+ digits), redeploy, then come back here.
          </p>
        </div>
      </Shell>
    );
  }

  if (!organizer) {
    return (
      <Shell>
        <div className="sticker mx-auto max-w-sm rounded-[28px] bg-paper p-5">
          <div className="text-[34px]" aria-hidden>
            🔐
          </div>
          <h2 className="heading text-[24px]">Organizers only</h2>
          <p className="mb-4 mt-1 text-[15px] text-ink-soft">Enter the PIN to clean up requests, manage staff, or reset the list.</p>
          <PinForm
            autoFocus={false}
            onSubmit={async (pin) => {
              await signIn(pin);
              toast("Welcome, snack boss. 🫡");
            }}
          />
        </div>
      </Shell>
    );
  }

  return (
    <Shell
      action={
        <button
          type="button"
          onClick={async () => {
            await signOut();
            toast("Signed out.");
          }}
          className="min-h-[44px] rounded-xl px-3 text-[14px] font-bold underline underline-offset-2"
        >
          Sign out
        </button>
      }
    >
      <div role="tablist" className="sticker flex rounded-2xl bg-paper p-1">
        {(
          [
            ["requests", "Requests"],
            ["staff", "Staff"],
            ["reset", "Reset"],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            type="button"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`min-h-[46px] flex-1 rounded-xl text-[15.5px] font-bold ${tab === id ? "bg-ink text-white" : "hover:bg-brand-soft"}`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="mt-5">
        {tab === "requests" && <RequestsTab onError={onUnauthorized} />}
        {tab === "staff" && <StaffTab onError={onUnauthorized} />}
        {tab === "reset" && <ResetTab onError={onUnauthorized} />}
      </div>
    </Shell>
  );
}

function Shell({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-4">
      <div className="mt-5 flex items-start justify-between gap-3">
        <div>
          <h1 className="heading text-[clamp(2.2rem,9vw,3rem)]">Organizer tools</h1>
          <p className="mt-1 text-[15.5px] text-ink-soft">With great snack power comes great responsibility.</p>
        </div>
        {action}
      </div>
      <div className="mt-5">{children}</div>
    </div>
  );
}

/* ---------------- Requests ---------------- */

function RequestsTab({ onError }: { onError: (e: unknown) => void }) {
  const { toast } = useToast();
  const [requests, setRequests] = useState<SnackRequest[] | null>(null);
  const [filter, setFilter] = useState("");
  const [confirmId, setConfirmId] = useState<number | null>(null);

  useEffect(() => {
    api<{ requests: SnackRequest[] }>("/api/requests", { method: "GET" })
      .then((d) => setRequests(d.requests))
      .catch(onError);
  }, [onError]);

  if (!requests) return <p className="text-ink-soft">Loading requests…</p>;

  const q = filter.trim().toLowerCase();
  const shown = q
    ? requests.filter((r) => `${r.item} ${r.details ?? ""} ${r.firstName}`.toLowerCase().includes(q))
    : requests;

  const remove = async (r: SnackRequest) => {
    try {
      await api(`/api/requests/${r.id}`, { method: "DELETE" });
      setRequests((list) => (list ?? []).filter((x) => x.id !== r.id));
      toast(`Removed ${r.firstName}'s "${r.item}".`);
    } catch (err) {
      onError(err);
    } finally {
      setConfirmId(null);
    }
  };

  return (
    <div>
      <input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder={`Search ${requests.length} requests`}
        className="w-full rounded-2xl border-[2.5px] border-ink bg-paper px-4 py-3 outline-none focus:bg-brand-soft"
      />
      {shown.length === 0 ? (
        <p className="mt-4 text-center text-ink-soft">No requests{q ? " match that" : " yet"}.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {shown.map((r) => (
            <li key={r.id} className="flex items-center gap-3 rounded-2xl border-2 border-line bg-paper p-2.5">
              <Avatar firstName={r.firstName} photo={r.photo} size={40} ring={false} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[16.5px] font-bold">
                  {getCategory(r.category).emoji} {r.item}
                </div>
                <div className="truncate text-[13.5px] text-ink-soft">
                  {r.firstName}
                  {r.details ? `: ${r.details}` : ""}
                </div>
                <When iso={r.createdAt} className="text-[12px] text-ink-soft" />
              </div>
              <button
                type="button"
                onClick={() => (confirmId === r.id ? remove(r) : setConfirmId(r.id))}
                className={`min-h-[44px] shrink-0 rounded-xl px-3 text-[14px] font-bold ${
                  confirmId === r.id ? "bg-[#e5484d] text-white" : "border-2 border-line"
                }`}
              >
                {confirmId === r.id ? "Remove?" : "Remove"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------------- Staff ---------------- */

function StaffTab({ onError }: { onError: (e: unknown) => void }) {
  const { toast } = useToast();
  const [staff, setStaff] = useState<Staff[] | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [adding, setAdding] = useState({ firstName: "", lastName: "", photo: "" });

  useEffect(() => {
    api<{ staff: Staff[]; photos: string[] }>("/api/admin/staff", { method: "GET" })
      .then((d) => {
        setStaff(d.staff);
        setPhotos(d.photos);
      })
      .catch(onError);
  }, [onError]);

  if (!staff) return <p className="text-ink-soft">Loading staff…</p>;

  const save = async (id: string, patch: Partial<Staff>) => {
    try {
      const res = await api<{ staff: Staff }>(`/api/admin/staff/${encodeURIComponent(id)}`, { method: "PATCH", body: patch });
      setStaff((list) => (list ?? []).map((s) => (s.id === id ? res.staff : s)));
      toast(`Saved ${res.staff.firstName}. Phones pick this up on their next refresh.`);
    } catch (err) {
      onError(err);
    }
  };

  const add = async () => {
    if (!adding.firstName.trim()) return;
    try {
      const res = await api<{ staff: Staff }>("/api/admin/staff", { method: "POST", body: adding });
      setStaff((list) => [...(list ?? []), res.staff]);
      setAdding({ firstName: "", lastName: "", photo: "" });
      toast(`${res.staff.firstName} joined the Snack Attack. 🎉`);
    } catch (err) {
      onError(err);
    }
  };

  return (
    <div className="space-y-5">
      <section className="sticker rounded-[24px] bg-paper p-4">
        <h2 className="heading text-[21px]">Add someone</h2>
        <p className="mt-0.5 text-[14px] text-ink-soft">
          For photos, add the image to <code>public/staff</code> in GitHub and redeploy; it will show up in the photo menu.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <input
            value={adding.firstName}
            onChange={(e) => setAdding({ ...adding, firstName: e.target.value })}
            placeholder="First name"
            className="rounded-xl border-2 border-ink bg-paper px-3 py-2.5 outline-none focus:bg-brand-soft"
          />
          <input
            value={adding.lastName}
            onChange={(e) => setAdding({ ...adding, lastName: e.target.value })}
            placeholder="Last name"
            className="rounded-xl border-2 border-ink bg-paper px-3 py-2.5 outline-none focus:bg-brand-soft"
          />
          <PhotoSelect photos={photos} value={adding.photo} onChange={(v) => setAdding({ ...adding, photo: v })} />
        </div>
        <button
          type="button"
          onClick={add}
          disabled={!adding.firstName.trim()}
          className="press sticker heading mt-3 min-h-[50px] w-full rounded-2xl bg-brand text-[17px] disabled:opacity-50"
        >
          Add person
        </button>
      </section>

      <ul className="space-y-2.5">
        {staff.map((s) => (
          <StaffRow key={s.id} person={s} photos={photos} onSave={(patch) => save(s.id, patch)} />
        ))}
      </ul>
    </div>
  );
}

function StaffRow({ person, photos, onSave }: { person: Staff; photos: string[]; onSave: (p: Partial<Staff>) => Promise<void> }) {
  const [draft, setDraft] = useState({ firstName: person.firstName, lastName: person.lastName, photo: person.photo ?? "" });
  const dirty = draft.firstName !== person.firstName || draft.lastName !== person.lastName || draft.photo !== (person.photo ?? "");
  useEffect(() => setDraft({ firstName: person.firstName, lastName: person.lastName, photo: person.photo ?? "" }), [person]);

  return (
    <li className={`rounded-[20px] border-2 bg-paper p-3 ${person.active ? "border-line" : "border-dashed border-ink/30 opacity-70"}`}>
      <div className="flex items-center gap-3">
        <Avatar firstName={draft.firstName || "?"} lastName={draft.lastName} photo={draft.photo || null} size={52} />
        <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-3">
          <input
            aria-label="First name"
            value={draft.firstName}
            onChange={(e) => setDraft({ ...draft, firstName: e.target.value })}
            className="min-w-0 rounded-xl border-2 border-line px-3 py-2 font-bold outline-none focus:border-ink"
          />
          <input
            aria-label="Last name"
            value={draft.lastName}
            onChange={(e) => setDraft({ ...draft, lastName: e.target.value })}
            className="min-w-0 rounded-xl border-2 border-line px-3 py-2 outline-none focus:border-ink"
          />
          <PhotoSelect photos={photos} value={draft.photo} onChange={(v) => setDraft({ ...draft, photo: v })} />
        </div>
      </div>
      <div className="mt-2.5 flex items-center justify-between gap-2">
        <span className="text-[13px] text-ink-soft">{person.active ? "Shown in the app" : "Hidden from the app"}</span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onSave({ active: !person.active })}
            className="min-h-[42px] rounded-xl border-2 border-line px-3 text-[14px] font-bold"
          >
            {person.active ? "Hide" : "Show"}
          </button>
          <button
            type="button"
            disabled={!dirty || !draft.firstName.trim()}
            onClick={() => onSave({ firstName: draft.firstName, lastName: draft.lastName, photo: draft.photo || null })}
            className="min-h-[42px] rounded-xl bg-ink px-4 text-[14px] font-bold text-white disabled:opacity-30"
          >
            Save
          </button>
        </div>
      </div>
    </li>
  );
}

function PhotoSelect({ photos, value, onChange }: { photos: string[]; value: string; onChange: (v: string) => void }) {
  const options = value && !photos.includes(value) ? [value, ...photos] : photos;
  return (
    <select
      aria-label="Photo"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="min-w-0 rounded-xl border-2 border-line bg-paper px-2 py-2 outline-none focus:border-ink"
    >
      <option value="">Initials (no photo)</option>
      {options.map((p) => (
        <option key={p} value={p}>
          {p.replace("/staff/", "")}
        </option>
      ))}
    </select>
  );
}

/* ---------------- Reset ---------------- */

function ResetTab({ onError }: { onError: (e: unknown) => void }) {
  const { toast } = useToast();
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <section className="rounded-[24px] border-[2.5px] border-[#e5484d] bg-paper p-5">
      <div className="text-[34px]" aria-hidden>
        🧨
      </div>
      <h2 className="heading text-[24px]">Start a fresh Snack Attack</h2>
      <p className="mt-2 text-[15.5px] leading-relaxed text-ink-soft">
        This erases every snack request and every shopping checkmark for everyone. Staff and photos stay. There is no undo,
        so copy the shopping list first if you want a record.
      </p>
      <label className="mt-4 block">
        <span className="mb-1.5 block text-[15px] font-bold">
          Type <span className="rounded bg-[#ffe1dc] px-1.5">SNACKS</span> to confirm
        </span>
        <input
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoCapitalize="characters"
          autoComplete="off"
          className="w-full rounded-2xl border-[2.5px] border-ink px-4 py-3 font-bold tracking-widest outline-none"
        />
      </label>
      <button
        type="button"
        disabled={confirm !== "SNACKS" || busy}
        onClick={async () => {
          setBusy(true);
          try {
            const res = await api<{ removed: { requests: number; purchased: number } }>("/api/admin/reset", {
              method: "POST",
              body: { confirm },
            });
            setConfirm("");
            toast(`Reset done. ${res.removed.requests} requests cleared. A clean slate. 🧽`);
          } catch (err) {
            onError(err);
          } finally {
            setBusy(false);
          }
        }}
        className="heading mt-4 min-h-[54px] w-full rounded-2xl bg-[#e5484d] text-[18px] text-white disabled:opacity-40"
      >
        {busy ? "Erasing…" : "Erase all requests"}
      </button>
    </section>
  );
}
