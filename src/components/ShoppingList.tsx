"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CATEGORIES, getCategory } from "@config/snacks";
import { SITE, pick } from "@config/site";
import type { ShoppingItem } from "@/lib/types";
import { Avatar } from "./Avatar";
import { Tagline } from "./Chrome";
import { api, usePolling } from "./hooks";
import { PinDialog, useOrganizer } from "./Organizer";
import { useToast } from "./Toast";

const BOUGHT_LINES = ["In the cart. 🛒", "Got it. Blessed.", "One less thing to argue about.", "Checked off. Keep rolling."];

export function ShoppingList({
  initialItems,
  initialOrganizer,
  organizerEnabled,
}: {
  initialItems: ShoppingItem[];
  initialOrganizer: boolean;
  organizerEnabled: boolean;
}) {
  const { toast, burst } = useToast();
  const { organizer, setOrganizer, signIn, signOut } = useOrganizer(initialOrganizer);
  const { data, setData, offline } = usePolling<{ items: ShoppingItem[]; organizer: boolean }>(
    "/api/shopping",
    { items: initialItems, organizer: initialOrganizer },
    8000,
  );
  const [pinOpen, setPinOpen] = useState(false);
  const [hideBought, setHideBought] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function"), []);
  // If the cookie expired, the server tells us on the next refresh.
  useEffect(() => setOrganizer(data.organizer), [data.organizer, setOrganizer]);

  const items = data.items;
  const bought = items.filter((i) => i.purchased).length;

  const groups = useMemo(() => {
    const known = new Set(CATEGORIES.map((c) => c.id));
    return CATEGORIES.map((c) => ({
      c,
      list: items
        .filter((i) => i.category === c.id || (c.id === "other" && !known.has(i.category)))
        .sort((a, b) => Number(a.purchased) - Number(b.purchased) || b.peopleCount - a.peopleCount || a.name.localeCompare(b.name)),
    })).filter((g) => g.list.length > 0);
  }, [items]);

  const toggle = async (item: ShoppingItem, el: HTMLElement) => {
    if (!organizer) {
      setPinOpen(true);
      return;
    }
    const next = !item.purchased;
    setData((d) => ({ ...d, items: d.items.map((i) => (i.key === item.key ? { ...i, purchased: next } : i)) }));
    if (next) burst(el, ["🛒", "✅", getCategory(item.category).emoji]);
    try {
      await api("/api/shopping", { method: "PATCH", body: { key: item.key, purchased: next } });
      if (next) toast(pick(BOUGHT_LINES));
    } catch (err) {
      setData((d) => ({ ...d, items: d.items.map((i) => (i.key === item.key ? { ...i, purchased: !next } : i)) }));
      const status = (err as { status?: number }).status;
      if (status === 401) {
        setOrganizer(false);
        setPinOpen(true);
      }
      toast(err instanceof Error ? err.message : "That didn't save.", "bad");
    }
  };

  const listText = () => buildText(groups);

  const copy = async () => {
    const text = listText();
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    toast("Copied. Paste it into a text or your Notes app.");
  };

  const share = async () => {
    try {
      await navigator.share({ title: "Snack Attack shopping list", text: listText() });
    } catch {
      /* person closed the share sheet */
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4">
      <h1 className="heading mt-5 text-[clamp(2.4rem,10vw,3.4rem)]">The Shopping List</h1>
      <p className="mt-1 text-[16px] font-medium text-ink-soft">The Lord provides. But somebody still has to go to Publix.</p>

      {/* Organizer status */}
      <div
        className={`mt-5 flex items-center gap-3 rounded-[20px] border-2 p-3 ${
          organizer ? "border-cart bg-[#e3f6ea]" : "border-line bg-paper"
        }`}
      >
        <span aria-hidden className="text-[26px]">
          {organizer ? "🛒" : "👀"}
        </span>
        <p className="flex-1 text-[14.5px] font-medium leading-snug">
          {organizer
            ? "Shopping mode is on. Tap an item to check it off. Everyone sees your checkmarks."
            : "Anyone can look. Only the organizer can check items off."}
        </p>
        {organizerEnabled &&
          (organizer ? (
            <button
              type="button"
              onClick={async () => {
                await signOut();
                toast("Signed out of shopping mode.");
              }}
              className="min-h-[44px] shrink-0 rounded-xl px-3 text-[14px] font-bold underline underline-offset-2"
            >
              Sign out
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setPinOpen(true)}
              className="press sticker min-h-[44px] shrink-0 rounded-xl bg-paper px-3 text-[14px] font-bold"
            >
              🔐 Organizer
            </button>
          ))}
      </div>

      {items.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button type="button" onClick={copy} className="press sticker heading min-h-[50px] flex-1 rounded-2xl bg-brand px-4 text-[17px]">
            Copy list 📋
          </button>
          {canShare && (
            <button type="button" onClick={share} className="press sticker heading min-h-[50px] flex-1 rounded-2xl bg-paper px-4 text-[17px]">
              Share 💬
            </button>
          )}
          <button
            type="button"
            onClick={() => setHideBought((h) => !h)}
            aria-pressed={hideBought}
            className={`min-h-[50px] rounded-2xl border-2 px-4 text-[14.5px] font-bold ${
              hideBought ? "border-ink bg-ink text-white" : "border-line bg-paper"
            }`}
          >
            {hideBought ? "Show bought" : "Hide bought"}
          </button>
        </div>
      )}

      {/* The receipt */}
      <div className="receipt mt-5 px-4 pb-8 pt-7 sm:px-6">
        {items.length === 0 ? (
          <div className="py-8 text-center">
            <div className="text-[46px]" aria-hidden>
              🧾
            </div>
            <p className="heading mt-2 text-[22px]">Nothing to buy yet.</p>
            <p className="mt-1 text-[16px] text-ink-soft">Either everyone is fasting or nobody has opened the app.</p>
            <Link href="/snacks" className="press sticker heading mt-5 inline-flex min-h-[54px] items-center rounded-2xl bg-brand px-6 text-[18px]">
              Add a snack 🍿
            </Link>
          </div>
        ) : (
          <>
            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="heading text-[20px]">Snack Attack run</div>
                <div className="text-[14px] text-ink-soft">{SITE.retreatLabel}</div>
              </div>
              <div className="text-right">
                <div className="heading text-[20px] tabular-nums">
                  {bought}/{items.length}
                </div>
                <div className="text-[13px] text-ink-soft">in the cart</div>
              </div>
            </div>
            <div className="mt-3 h-3 overflow-hidden rounded-full border-2 border-ink bg-page" aria-hidden>
              <div className="h-full bg-cart transition-[width] duration-500" style={{ width: `${(bought / items.length) * 100}%` }} />
            </div>
            {bought === items.length && (
              <p className="mt-3 text-center text-[15px] font-bold">Everything&apos;s in the cart. Go home, hero. 🎉</p>
            )}

            {groups.map(({ c, list }) => {
              const visible = hideBought ? list.filter((i) => !i.purchased) : list;
              if (visible.length === 0) return null;
              return (
                <section key={c.id} className="mt-6">
                  <h2 className="flex items-center gap-2 border-b-2 border-dashed border-ink/25 pb-1.5">
                    <span aria-hidden className="text-[22px]">
                      {c.emoji}
                    </span>
                    <span className="heading flex-1 text-[19px]">{c.label}</span>
                    <span className="text-[13.5px] font-semibold text-ink-soft">
                      {list.filter((i) => !i.purchased).length} left
                    </span>
                  </h2>
                  <ul>
                    {visible.map((i) => (
                      <ShoppingRow key={i.key} item={i} organizer={organizer} onToggle={toggle} />
                    ))}
                  </ul>
                </section>
              );
            })}
          </>
        )}
      </div>

      <div className="mt-6 flex items-center justify-between gap-3 text-[13.5px] text-ink-soft">
        <span className="flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${offline ? "bg-[#e5484d]" : "bg-cart"}`} aria-hidden />
          {offline ? "Reconnecting…" : "Updates automatically"}
        </span>
        <Link href="/admin" className="font-bold text-ink underline underline-offset-2">
          Organizer tools
        </Link>
      </div>

      <Tagline className="mt-8" />

      <PinDialog
        open={pinOpen}
        onClose={() => setPinOpen(false)}
        onSubmit={async (pin) => {
          await signIn(pin);
          setPinOpen(false);
          toast("Shopping mode on. Go get 'em. 🛒");
        }}
      />
    </div>
  );
}

function ShoppingRow({
  item,
  organizer,
  onToggle,
}: {
  item: ShoppingItem;
  organizer: boolean;
  onToggle: (i: ShoppingItem, el: HTMLElement) => void;
}) {
  // One name per person, in the order they asked.
  const people = item.requesters.filter((r, idx, all) => all.findIndex((x) => x.staffId === r.staffId) === idx);
  // Each person's distinct notes (asking twice for the same thing doesn't repeat the note).
  const notes = item.requesters.filter(
    (r, idx, all) =>
      r.details && all.findIndex((x) => x.staffId === r.staffId && x.details?.toLowerCase() === r.details?.toLowerCase()) === idx,
  );
  return (
    <li className={`border-b border-dashed border-ink/15 last:border-b-0 ${item.purchased ? "opacity-55" : ""}`}>
      <button
        type="button"
        onClick={(e) => onToggle(item, e.currentTarget)}
        aria-pressed={item.purchased}
        aria-label={`${item.name}, requested by ${people.map((p) => p.firstName).join(", ")}. ${
          item.purchased ? "Bought." : "Not bought yet."
        }${organizer ? "" : " Organizer sign-in required to change."}`}
        className="flex w-full items-start gap-3 py-3 text-left"
      >
        <span
          aria-hidden
          className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-[10px] border-[2.5px] text-[18px] font-black transition-colors ${
            item.purchased ? "border-cart bg-cart text-white" : organizer ? "border-ink bg-paper" : "border-ink/30 bg-page"
          }`}
        >
          {item.purchased ? "✓" : organizer ? "" : <span className="text-[12px]">🔒</span>}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-baseline gap-x-2">
            <span className={`heading text-[19px] ${item.purchased ? "line-through decoration-2" : ""}`}>{item.name}</span>
            <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[13px] font-extrabold">
              ×{item.peopleCount} {item.peopleCount === 1 ? "person" : "people"}
            </span>
          </span>
          <span className="mt-1.5 flex items-center gap-2">
            <span className="flex -space-x-2">
              {people.slice(0, 6).map((p) => (
                <Avatar key={p.staffId} firstName={p.firstName} photo={p.photo} size={26} ring={false} className="ring-2 ring-paper" />
              ))}
            </span>
            <span className="text-[14.5px] font-semibold">{people.map((p) => p.firstName).join(", ")}</span>
          </span>
          {notes.length > 0 && (
            <span className="mt-1.5 block space-y-0.5">
              {notes.map((n) => (
                <span key={n.requestId} className="block text-[14px] text-ink-soft">
                  <span className="font-semibold text-ink">{n.firstName}:</span> {n.details}
                </span>
              ))}
            </span>
          )}
        </span>
      </button>
    </li>
  );
}

function buildText(groups: { c: { emoji: string; label: string }; list: ShoppingItem[] }[]): string {
  const lines: string[] = [`🍿 BEDROCK SNACK ATTACK shopping list`, `${SITE.retreatLabel}`, ""];
  for (const { c, list } of groups) {
    lines.push(`${c.emoji} ${c.label.toUpperCase()}`);
    for (const i of list) {
      const people = [...new Set(i.requesters.map((r) => r.firstName))].join(", ");
      lines.push(`${i.purchased ? "✅" : "⬜"} ${i.name} (x${i.peopleCount}: ${people})`);
      const seen = new Set<string>();
      for (const r of i.requesters) {
        const k = `${r.staffId}|${r.details?.toLowerCase()}`;
        if (r.details && !seen.has(k)) lines.push(`     ${r.firstName}: ${r.details}`);
        seen.add(k);
      }
    }
    lines.push("");
  }
  lines.push("The Lord provides. But somebody still has to go to Publix.");
  return lines.join("\n");
}
