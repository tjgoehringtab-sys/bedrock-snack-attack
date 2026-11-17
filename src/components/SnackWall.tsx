"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { CATEGORIES, getCategory } from "@config/snacks";
import type { SnackRequest } from "@/lib/types";
import { Avatar } from "./Avatar";
import { Tagline } from "./Chrome";
import { usePolling } from "./hooks";
import { useStaff } from "./StaffProvider";
import { When } from "./When";

type View = "latest" | "person" | "category";
const VIEWS: { id: View; label: string }[] = [
  { id: "latest", label: "Latest" },
  { id: "person", label: "By person" },
  { id: "category", label: "By category" },
];

type Person = { id: string; firstName: string; lastName?: string; photo: string | null; count: number; order: number };

export function SnackWall({ initialRequests }: { initialRequests: SnackRequest[] }) {
  const { staff, me } = useStaff();
  const { data, offline } = usePolling<{ requests: SnackRequest[] }>("/api/requests", { requests: initialRequests }, 7000);
  const requests = data.requests;
  const [view, setView] = useState<View>("latest");
  const [onlyPerson, setOnlyPerson] = useState<string | null>(null);

  // Highlight requests that arrive while the wall is open.
  const seen = useRef<Set<number> | null>(null);
  const [fresh, setFresh] = useState<Set<number>>(new Set());
  useEffect(() => {
    const ids = new Set(requests.map((r) => r.id));
    if (seen.current) {
      const added = requests.filter((r) => !seen.current!.has(r.id)).map((r) => r.id);
      if (added.length) setFresh(new Set(added));
    }
    seen.current = ids;
  }, [requests]);

  const people = useMemo<Person[]>(() => {
    const map = new Map<string, Person>();
    staff.forEach((s, i) => map.set(s.id, { id: s.id, firstName: s.firstName, lastName: s.lastName, photo: s.photo, count: 0, order: i }));
    for (const r of requests) {
      const p = map.get(r.staffId);
      if (p) p.count++;
      else map.set(r.staffId, { id: r.staffId, firstName: r.firstName, photo: r.photo, count: 1, order: 999 });
    }
    return [...map.values()].sort((a, b) => b.count - a.count || a.order - b.order);
  }, [staff, requests]);

  const shown = onlyPerson ? requests.filter((r) => r.staffId === onlyPerson) : requests;
  const focus = onlyPerson ? people.find((p) => p.id === onlyPerson) : null;

  return (
    <div className="mx-auto max-w-3xl px-4">
      <h1 className="heading mt-5 text-[clamp(2.4rem,10vw,3.4rem)]">The Snack Wall</h1>
      <p className="mt-1 text-[16px] font-medium text-ink-soft">Warning: your coworkers can see your food choices.</p>

      {/* Request counts per person */}
      <section aria-label="Requests per person" className="-mx-4 mt-5">
        <ul className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-3 pt-1">
          {people.map((p) => {
            const on = onlyPerson === p.id;
            return (
              <li key={p.id} className="shrink-0">
                <button
                  type="button"
                  onClick={() => setOnlyPerson(on ? null : p.id)}
                  aria-pressed={on}
                  aria-label={`${p.firstName}: ${p.count} request${p.count === 1 ? "" : "s"}${on ? " (showing only theirs)" : ""}`}
                  className={`flex w-[70px] flex-col items-center gap-1 rounded-2xl py-1 ${onlyPerson && !on ? "opacity-45" : ""}`}
                >
                  <span className="relative">
                    <Avatar firstName={p.firstName} lastName={p.lastName} photo={p.photo} size={56} className={on ? "shadow-sticker" : ""} />
                    <span
                      className={`absolute -right-1.5 -top-1 grid h-[26px] min-w-[26px] place-items-center rounded-full border-2 border-ink px-1 text-[13px] font-extrabold ${
                        p.count ? "bg-brand" : "bg-paper"
                      }`}
                    >
                      {p.count}
                    </span>
                  </span>
                  <span className="max-w-full truncate text-[13.5px] font-bold">{p.firstName}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {/* View switcher */}
      <div role="tablist" aria-label="Group requests" className="sticker flex rounded-2xl bg-paper p-1">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            role="tab"
            type="button"
            aria-selected={view === v.id}
            onClick={() => setView(v.id)}
            className={`min-h-[46px] flex-1 rounded-xl text-[15.5px] font-bold transition-colors ${
              view === v.id ? "bg-ink text-white" : "hover:bg-brand-soft"
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      <div className="mt-3 flex min-h-[28px] items-center justify-between gap-2 text-[13.5px] text-ink-soft">
        <span>
          {focus ? (
            <>
              Showing only {focus.firstName}.{" "}
              <button type="button" onClick={() => setOnlyPerson(null)} className="font-bold text-ink underline underline-offset-2">
                Show everyone
              </button>
            </>
          ) : (
            `${requests.length} request${requests.length === 1 ? "" : "s"} from ${people.filter((p) => p.count).length} ${
              people.filter((p) => p.count).length === 1 ? "person" : "people"
            }`
          )}
        </span>
        <span className="flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${offline ? "bg-[#e5484d]" : "bg-cart"}`} aria-hidden />
          {offline ? "Reconnecting…" : "Live"}
        </span>
      </div>

      <div className="mt-3">
        {shown.length === 0 ? (
          <EmptyWall forPerson={focus?.firstName} isMe={!!(focus && me && focus.id === me.id)} />
        ) : view === "latest" ? (
          <ul className="space-y-2.5">
            {shown.map((r) => (
              <FeedCard key={r.id} r={r} fresh={fresh.has(r.id)} />
            ))}
          </ul>
        ) : view === "person" ? (
          <ByPerson requests={shown} people={people} fresh={fresh} />
        ) : (
          <ByCategory requests={shown} fresh={fresh} />
        )}
      </div>

      <Tagline className="mt-10" />
    </div>
  );
}

function FeedCard({ r, fresh }: { r: SnackRequest; fresh: boolean }) {
  const c = getCategory(r.category);
  return (
    <li
      className={`flex gap-3 rounded-[20px] border-2 border-ink bg-paper p-3 ${fresh ? "animate-pop-in" : ""}`}
      style={{ boxShadow: `4px 4px 0 0 ${c.color}` }}
    >
      <Avatar firstName={r.firstName} photo={r.photo} size={48} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[15.5px] font-bold">
            {r.firstName} <span aria-label={c.label}>{c.emoji}</span>
          </span>
          <When iso={r.createdAt} className="shrink-0 text-[12.5px] text-ink-soft" />
        </div>
        <div className="heading mt-0.5 break-words text-[21px]">{r.item}</div>
        {r.details && <p className="mt-0.5 break-words text-[15px] text-ink-soft">{r.details}</p>}
      </div>
    </li>
  );
}

function ByPerson({ requests, people, fresh }: { requests: SnackRequest[]; people: Person[]; fresh: Set<number> }) {
  const groups = people
    .map((p) => ({ p, list: requests.filter((r) => r.staffId === p.id) }))
    .filter((g) => g.list.length > 0);
  return (
    <div className="space-y-4">
      {groups.map(({ p, list }) => (
        <section key={p.id} className="rounded-[24px] border-2 border-ink bg-paper p-3.5">
          <header className="flex items-center gap-3">
            <Avatar firstName={p.firstName} lastName={p.lastName} photo={p.photo} size={52} />
            <div>
              <h2 className="heading text-[22px]">{p.firstName}</h2>
              <p className="text-[13.5px] font-semibold text-ink-soft">
                {list.length} request{list.length === 1 ? "" : "s"}
              </p>
            </div>
          </header>
          <ul className="mt-3 flex flex-wrap gap-2">
            {list.map((r) => {
              const c = getCategory(r.category);
              return (
                <li
                  key={r.id}
                  className={`rounded-2xl px-3 py-2 ${fresh.has(r.id) ? "animate-pop-in" : ""}`}
                  style={{ background: c.color }}
                >
                  <span className="text-[16px] font-bold">
                    <span aria-hidden>{c.emoji}</span> {r.item}
                  </span>
                  {r.details && <span className="block text-[13.5px] text-ink/75">{r.details}</span>}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

function ByCategory({ requests, fresh }: { requests: SnackRequest[]; fresh: Set<number> }) {
  const known = new Set(CATEGORIES.map((c) => c.id));
  const groups = CATEGORIES.map((c) => ({
    c,
    list: requests.filter((r) => r.category === c.id || (c.id === "other" && !known.has(r.category))),
  })).filter((g) => g.list.length > 0);
  return (
    <div className="space-y-4">
      {groups.map(({ c, list }) => (
        <section key={c.id} className="overflow-hidden rounded-[24px] border-2 border-ink bg-paper">
          <header className="flex items-center gap-2 px-4 py-3" style={{ background: c.color }}>
            <span aria-hidden className="text-[26px]">
              {c.emoji}
            </span>
            <h2 className="heading flex-1 text-[21px]">{c.label}</h2>
            <span className="rounded-full bg-paper/80 px-2.5 py-0.5 text-[14px] font-bold">{list.length}</span>
          </header>
          <ul className="divide-y-2 divide-line">
            {list.map((r) => (
              <li key={r.id} className={`flex items-center gap-3 px-4 py-2.5 ${fresh.has(r.id) ? "animate-pop-in" : ""}`}>
                <Avatar firstName={r.firstName} photo={r.photo} size={36} ring={false} />
                <div className="min-w-0 flex-1">
                  <div className="text-[16.5px] font-bold">{r.item}</div>
                  <div className="text-[13.5px] text-ink-soft">
                    {r.firstName}
                    {r.details ? `: ${r.details}` : ""}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function EmptyWall({ forPerson, isMe }: { forPerson?: string; isMe: boolean }) {
  return (
    <div className="rounded-[24px] border-2 border-dashed border-ink/30 px-5 py-10 text-center">
      <div className="text-[48px]" aria-hidden>
        🦗
      </div>
      <p className="heading mt-2 text-[22px]">
        {forPerson ? (isMe ? "You haven't asked for anything yet." : `${forPerson} hasn't asked for anything. Suspicious.`) : "The wall is empty."}
      </p>
      <p className="mt-1 text-[16px] text-ink-soft">{forPerson && !isMe ? "Maybe they're fasting." : "Somebody has to be brave and go first."}</p>
      {(!forPerson || isMe) && (
        <Link href="/snacks" className="press sticker heading mt-5 inline-flex min-h-[54px] items-center rounded-2xl bg-brand px-6 text-[18px]">
          Add a snack 🍿
        </Link>
      )}
    </div>
  );
}
