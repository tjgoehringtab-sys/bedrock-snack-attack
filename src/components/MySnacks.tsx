"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { CATEGORIES, DETAIL_CHIPS, chooseCategory, getCategory } from "@config/snacks";
import { ADD_CONFIRMATIONS, REMOVE_CONFIRMATIONS, pick } from "@config/site";
import type { SnackRequest } from "@/lib/types";
import { Tagline } from "./Chrome";
import { api, usePolling } from "./hooks";
import { useStaff } from "./StaffProvider";
import { useToast } from "./Toast";
import { When } from "./When";

export function MySnacks({ initialRequests }: { initialRequests: SnackRequest[] }) {
  const router = useRouter();
  const { me, ready } = useStaff();
  const { toast, burst } = useToast();
  const { data, setData } = usePolling<{ requests: SnackRequest[] }>("/api/requests", { requests: initialRequests }, 20000);

  const [category, setCategory] = useState<string | null>(null);
  const [item, setItem] = useState("");
  const [details, setDetails] = useState("");
  const [saving, setSaving] = useState(false);
  const composerRef = useRef<HTMLDivElement>(null);
  const addRef = useRef<HTMLButtonElement>(null);
  const floatRef = useRef<HTMLButtonElement>(null);
  // When the in-page Add button is off screen (or hidden behind the nav), float one above the nav.
  const [inlineVisible, setInlineVisible] = useState(true);
  useEffect(() => {
    const el = addRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setInlineVisible(e.isIntersecting), { rootMargin: "0px 0px -110px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [ready, me]);

  useEffect(() => {
    if (ready && !me) router.replace("/");
  }, [ready, me, router]);

  const mine = useMemo(() => (me ? data.requests.filter((r) => r.staffId === me.id) : []), [data.requests, me]);
  const cat = category ? getCategory(category) : null;
  const trimmed = item.trim();

  if (!ready || !me) return <div className="h-[60vh]" aria-busy="true" />;

  const toggleCategory = (id: string) => {
    setCategory((cur) => (cur === id ? null : id));
    // Bring the chips into view on phones.
    window.requestAnimationFrame(() => {
      const el = composerRef.current;
      if (el && el.getBoundingClientRect().top > window.innerHeight * 0.55) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  };

  const add = async (from?: HTMLElement | null) => {
    if (!trimmed || saving) return;
    setSaving(true);
    const finalCategory = chooseCategory(trimmed, category);
    try {
      const res = await api<{ request: SnackRequest; duplicate: boolean }>("/api/requests", {
        method: "POST",
        body: { staffId: me.id, category: finalCategory, item: trimmed, details: details.trim() },
      });
      if (res.duplicate) {
        toast("Already got that one. No double-dipping. 😉");
      } else {
        setData((d) => ({ requests: [res.request, ...d.requests.filter((r) => r.id !== res.request.id)] }));
        burst(from ?? addRef.current, [getCategory(finalCategory).emoji, "✨", "🎉", getCategory(finalCategory).emoji]);
        toast(pick(ADD_CONFIRMATIONS));
      }
      setItem("");
      setDetails("");
    } catch (err) {
      toast(err instanceof Error ? err.message : "That didn't save. Try again?", "bad");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (r: SnackRequest) => {
    try {
      await api(`/api/requests/${r.id}`, { method: "DELETE", body: { staffId: me.id } });
      setData((d) => ({ requests: d.requests.filter((x) => x.id !== r.id) }));
      toast(pick(REMOVE_CONFIRMATIONS));
    } catch (err) {
      toast(err instanceof Error ? err.message : "Couldn't remove that.", "bad");
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4">
      <h1 className="heading mt-5 text-[clamp(2rem,8.5vw,3rem)]">
        Alright, {me.firstName}, what are we stocking up on?
      </h1>

      {/* Categories */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4" role="group" aria-label="Categories">
        {CATEGORIES.map((c) => {
          const active = category === c.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => toggleCategory(c.id)}
              aria-pressed={active}
              style={{ background: c.color }}
              className={`press sticker relative flex min-h-[112px] flex-col items-start justify-between rounded-[22px] p-3.5 text-left ${
                active ? "!shadow-sticker-lg -translate-x-0.5 -translate-y-0.5 ring-[3px] ring-ink ring-offset-2 ring-offset-page" : ""
              }`}
            >
              <span aria-hidden className={`text-[36px] leading-none ${active ? "animate-wiggle" : ""}`}>
                {c.emoji}
              </span>
              <span>
                <span className="heading block text-[18px]">{c.label}</span>
                <span className="mt-0.5 block text-[12.5px] font-medium leading-tight text-ink/70">{c.quip}</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Composer */}
      <div ref={composerRef} className="scroll-mt-4">
        <div className="sticker mt-6 rounded-[28px] bg-paper p-4 sm:p-5">
          {cat ? (
            <div key={cat.id} className="animate-slide-up">
              <h2 className="heading flex items-center gap-2 text-[22px]">
                <span aria-hidden>{cat.emoji}</span> {cat.label}
              </h2>
              <p className="mt-0.5 text-[14.5px] text-ink-soft">Tap one, or type your own below.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {cat.presets.map((p) => {
                  const on = trimmed.toLowerCase() === p.toLowerCase();
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setItem(on ? "" : p)}
                      aria-pressed={on}
                      className={`press min-h-[48px] rounded-full border-[2.5px] border-ink px-4 text-[16.5px] font-semibold ${
                        on ? "bg-ink text-white" : "bg-page hover:bg-brand-soft"
                      }`}
                    >
                      {on && <span aria-hidden>✓ </span>}
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-[16px] font-medium text-ink-soft">
              Tap a category above for ideas, or just type whatever you want.
            </p>
          )}

          <form
            className="mt-5 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              add();
            }}
          >
            <label className="block">
              <span className="mb-1.5 block text-[15px] font-bold">What do you want?</span>
              <input
                value={item}
                onChange={(e) => setItem(e.target.value)}
                maxLength={60}
                placeholder="Type any snack, drink, or food"
                enterKeyHint="done"
                autoComplete="off"
                className="w-full rounded-2xl border-[2.5px] border-ink bg-page px-4 py-3.5 text-[18px] font-semibold outline-none placeholder:font-normal placeholder:text-ink-soft/70 focus:bg-brand-soft"
              />
            </label>

            {trimmed && (
              <div className="animate-slide-up">
                <p className="-mt-1 mb-3 text-[13.5px] font-semibold text-ink-soft">
                  Goes on the list under {getCategory(chooseCategory(trimmed, category)).emoji}{" "}
                  {getCategory(chooseCategory(trimmed, category)).label}
                </p>
                <label className="block">
                  <span className="mb-1.5 block text-[15px] font-bold">
                    Brand, flavor, how many, or a note <span className="font-medium text-ink-soft">(optional)</span>
                  </span>
                  <input
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    maxLength={140}
                    placeholder="Dr Pepper: the real stuff, not diet"
                    enterKeyHint="done"
                    autoComplete="off"
                    className="w-full rounded-2xl border-2 border-line bg-paper px-4 py-3 text-[17px] outline-none focus:border-ink"
                  />
                </label>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {DETAIL_CHIPS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDetails((cur) => (cur.trim() ? `${cur.trim()}, ${d}` : d).slice(0, 140))}
                      className="min-h-[38px] rounded-full border-2 border-line bg-paper px-3 text-[14px] font-semibold hover:border-ink"
                    >
                      + {d}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2">
              <button
                ref={addRef}
                type="submit"
                disabled={!trimmed || saving}
                className="press sticker heading min-h-[60px] w-full rounded-2xl bg-brand px-4 text-[20px] disabled:bg-[#f3e3cc] disabled:text-ink/50 disabled:shadow-none"
              >
                {saving ? "Adding…" : trimmed ? `Add ${trimmed.length > 22 ? "it" : trimmed} to Snack Attack 🍿` : "Add to Snack Attack 🍿"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* My list */}
      <section className="mt-9" aria-labelledby="mine-heading">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="mine-heading" className="heading text-[24px]">
            Your requests {mine.length > 0 && <span className="text-ink-soft">({mine.length})</span>}
          </h2>
          <Link href="/wall" className="shrink-0 text-[15px] font-bold underline underline-offset-4">
            See everyone&apos;s
          </Link>
        </div>
        {mine.length === 0 ? (
          <p className="mt-3 rounded-2xl border-2 border-dashed border-line px-4 py-6 text-center text-[16px] text-ink-soft">
            Nothing yet. Your coworkers are waiting to judge your choices.
          </p>
        ) : (
          <>
            <p className="mt-1 text-[14px] text-ink-soft">Warning: your coworkers can see these.</p>
            <ul className="mt-3 space-y-2">
              {mine.map((r) => (
                <MyRow key={r.id} r={r} onRemove={() => remove(r)} />
              ))}
            </ul>
          </>
        )}
      </section>

      <Tagline className="mt-10" />

      {trimmed && !inlineVisible && (
        <div className="fixed inset-x-0 bottom-[calc(90px+env(safe-area-inset-bottom))] z-30 px-4 sm:bottom-[calc(102px+env(safe-area-inset-bottom))]">
          <div className="mx-auto max-w-3xl">
            <button
              ref={floatRef}
              type="button"
              onClick={() => add(floatRef.current)}
              disabled={saving}
              className="press sticker heading animate-slide-up min-h-[60px] w-full rounded-2xl bg-brand px-4 text-[20px] !shadow-sticker-lg"
            >
              {saving ? "Adding…" : `Add ${trimmed.length > 22 ? "it" : trimmed} to Snack Attack 🍿`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MyRow({ r, onRemove }: { r: SnackRequest; onRemove: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const c = getCategory(r.category);
  useEffect(() => {
    if (!confirming) return;
    const t = window.setTimeout(() => setConfirming(false), 3500);
    return () => window.clearTimeout(t);
  }, [confirming]);

  return (
    <li className="flex items-center gap-3 rounded-2xl border-2 border-line bg-paper p-2.5 pl-3">
      <span aria-hidden className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-[22px]" style={{ background: c.color }}>
        {c.emoji}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[17px] font-bold">{r.item}</div>
        {r.details && <div className="truncate text-[14.5px] text-ink-soft">{r.details}</div>}
        <When iso={r.createdAt} className="text-[12.5px] text-ink-soft" />
      </div>
      <button
        type="button"
        onClick={() => (confirming ? onRemove() : setConfirming(true))}
        aria-label={confirming ? `Confirm removing ${r.item}` : `Remove ${r.item}`}
        className={`min-h-[44px] shrink-0 rounded-xl px-3 text-[14px] font-bold ${
          confirming ? "bg-[#e5484d] text-white" : "bg-page text-ink-soft hover:text-ink"
        }`}
      >
        {confirming ? "Remove?" : "✕"}
      </button>
    </li>
  );
}
