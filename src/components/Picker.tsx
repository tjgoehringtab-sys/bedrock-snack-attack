"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { SITE } from "@config/site";
import { Avatar } from "./Avatar";
import { Tagline } from "./Chrome";
import { useMounted } from "./hooks";
import { useStaff } from "./StaffProvider";
import { useToast } from "./Toast";

export function Picker() {
  const router = useRouter();
  const { staff, me, ready, chooseMe } = useStaff();
  const { burst } = useToast();
  const [chomped, setChomped] = useState<string | null>(null);
  const leaving = useRef(false);

  // Returning on this phone? Skip straight to snacks.
  useEffect(() => {
    if (ready && me && !leaving.current) router.replace("/snacks");
  }, [ready, me, router]);

  useEffect(() => {
    router.prefetch("/snacks");
  }, [router]);

  const pick = (id: string, el: HTMLElement) => {
    if (leaving.current) return;
    leaving.current = true;
    setChomped(id);
    burst(el);
    chooseMe(id);
    window.setTimeout(() => router.push("/snacks"), 650);
  };

  const showGrid = ready && !(me && !leaving.current);

  return (
    <div>
      <section className="relative overflow-hidden bg-brand px-5 pb-16 pt-[max(28px,env(safe-area-inset-top))] text-ink">
        <div className="mx-auto max-w-3xl">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[14.5px] font-semibold">
            <span className="flex items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/bedrock-logo.png" alt="Bedrock Church" width={29} height={34} className="h-[34px] w-auto" />
              {SITE.church}
            </span>
            <Countdown />
          </div>
          <h1 className="display mt-6 text-[clamp(3.6rem,19vw,8.5rem)]" aria-label={`${SITE.title} 🍿`}>
            <span className="block">BEDROCK</span>
            <span className="block">SNACK</span>
            <span className="block">
              ATTACK{" "}
              <span aria-hidden className="inline-block translate-y-[-0.04em] text-[0.8em]">
                🍿
              </span>
            </span>
          </h1>
          <p className="mt-5 max-w-[30ch] text-[clamp(1.15rem,4.6vw,1.45rem)] font-semibold leading-snug">{SITE.subtitle}</p>
        </div>
      </section>

      {/* Negative bottom margin cancels <main>'s nav padding so the white sheet runs to the bottom. */}
      <section className="relative -mb-[calc(96px+env(safe-area-inset-bottom))] -mt-8 min-h-[55vh] rounded-t-[36px] bg-paper px-4 pb-[calc(120px+env(safe-area-inset-bottom))] pt-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="heading text-center text-[clamp(2rem,8vw,2.6rem)]">Who&apos;s hungry?</h2>
          <p className="mt-1.5 text-center text-[16.5px] text-ink-soft">Tap your photo.</p>

          <ul className="mt-7 grid grid-cols-3 gap-x-2 gap-y-6 sm:grid-cols-4 md:grid-cols-5">
            {staff.map((s, i) => {
              const isChomped = chomped === s.id;
              return (
                <li key={s.id} className="flex justify-center">
                  <button
                    type="button"
                    onClick={(e) => pick(s.id, e.currentTarget)}
                    disabled={!showGrid}
                    aria-label={`I'm ${s.firstName}`}
                    style={{ animationDelay: `${i * 45}ms` }}
                    className={`group flex w-full flex-col items-center gap-2 rounded-3xl p-1 outline-offset-4 ${
                      showGrid ? "animate-pop-in" : "opacity-0"
                    } ${chomped && !isChomped ? "opacity-40 transition-opacity duration-300" : ""}`}
                  >
                    <span
                      className={`relative block rounded-full transition-transform duration-200 ease-out group-hover:-translate-y-1 group-hover:-rotate-3 group-active:scale-95 ${
                        isChomped ? "scale-105" : ""
                      }`}
                    >
                      <Avatar
                        firstName={s.firstName}
                        lastName={s.lastName}
                        photo={s.photo}
                        eager
                        fluid
                        size={112}
                        className="h-[clamp(84px,25vw,112px)] w-[clamp(84px,25vw,112px)] shadow-sticker group-hover:shadow-sticker-lg transition-shadow"
                      />
                      {isChomped && <Bite />}
                    </span>
                    <span className="heading text-[17px]">{isChomped ? `Hi, ${s.firstName}!` : s.firstName}</span>
                  </button>
                </li>
              );
            })}
          </ul>

          {ready && staff.length === 0 && (
            <p className="mt-6 rounded-2xl bg-brand-soft p-4 text-center text-[16px]">
              Nobody&apos;s on the roster yet. Add people in <code>config/staff.mjs</code> and redeploy.
            </p>
          )}

          <Tagline className="mt-10" />
        </div>
      </section>
    </div>
  );
}

/** A cartoon bite taken out of the photo: three white circles over the top-right edge. */
function Bite() {
  return (
    <span aria-hidden className="pointer-events-none absolute -right-[6%] -top-[6%] h-[48%] w-[48%]">
      <span className="animate-chomp absolute right-[8%] top-[0%] h-[52%] w-[52%] rounded-full bg-paper" />
      <span className="animate-chomp absolute right-[34%] top-[6%] h-[40%] w-[40%] rounded-full bg-paper [animation-delay:40ms]" />
      <span className="animate-chomp absolute right-[2%] top-[30%] h-[42%] w-[42%] rounded-full bg-paper [animation-delay:80ms]" />
    </span>
  );
}

function Countdown() {
  const mounted = useMounted();
  if (!mounted) return <span className="rounded-full bg-ink px-3 py-1 text-white">{SITE.retreatLabel}</span>;
  const [y, m, d] = SITE.retreatStart.split("-").map(Number);
  const [ey, em, ed] = SITE.retreatEnd.split("-").map(Number);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const start = new Date(y, m - 1, d).getTime();
  const end = new Date(ey, em - 1, ed).getTime();
  const days = Math.round((start - today) / 86_400_000);
  let text = SITE.retreatLabel;
  if (days > 1) text = `${SITE.retreatLabel}, ${days} days away`;
  else if (days === 1) text = "Retreat starts tomorrow. Last call!";
  else if (today >= start && today <= end) text = "It's retreat time. Snacks are a ministry.";
  return <span className="rounded-full bg-ink px-3 py-1 text-white">{text}</span>;
}
