"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { TAGLINES } from "@config/site";
import { Avatar } from "./Avatar";
import { useStaff } from "./StaffProvider";

const TABS = [
  { href: "/snacks", label: "My Snacks", emoji: "🍿", match: ["/", "/snacks"] },
  { href: "/wall", label: "Snack Wall", emoji: "🧱", match: ["/wall"] },
  { href: "/shopping", label: "Shopping List", emoji: "🛒", match: ["/shopping"] },
];

export function BottomNav() {
  const pathname = usePathname();
  const { me, ready } = useStaff();
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(10px,env(safe-area-inset-bottom))] pt-2 sm:pb-5"
    >
      <div className="sticker mx-auto flex max-w-md items-stretch gap-1 rounded-[22px] bg-paper p-1.5">
        {TABS.map((t) => {
          const active = t.match.includes(pathname);
          // Until someone picks their photo, "My Snacks" goes to the picker.
          const href = t.href === "/snacks" && ready && !me ? "/" : t.href;
          return (
            <Link
              key={t.href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-[54px] flex-1 flex-col items-center justify-center rounded-[16px] px-1 text-center transition-colors ${
                active ? "bg-ink text-white" : "text-ink hover:bg-brand-soft"
              }`}
            >
              <span aria-hidden className="text-[22px] leading-none">
                {t.emoji}
              </span>
              <span className="mt-1 text-[12.5px] font-bold leading-none">{t.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/** Slim header for inner pages: name of the app + who's using this phone. */
export function TopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { me, forgetMe } = useStaff();
  if (pathname === "/") return null;

  return (
    <header className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 pb-1 pt-[max(14px,env(safe-area-inset-top))]">
      <Link href={me ? "/snacks" : "/"} className="heading flex items-center gap-1.5 text-[17px] text-ink">
        <span aria-hidden className="grid h-8 w-8 place-items-center rounded-full bg-brand text-[17px] sticker !shadow-none">
          🍿
        </span>
        Snack Attack
      </Link>
      {me ? (
        <div className="flex items-center gap-2.5">
          <div className="text-right leading-tight">
            <div className="text-[15px] font-bold">{me.firstName}</div>
            <button
              type="button"
              onClick={() => {
                forgetMe();
                router.push("/");
              }}
              className="text-[12.5px] font-medium text-ink-soft underline decoration-dotted underline-offset-2 hover:text-ink"
            >
              Not you? Switch person
            </button>
          </div>
          <Avatar firstName={me.firstName} lastName={me.lastName} photo={me.photo} size={40} eager />
        </div>
      ) : (
        pathname !== "/admin" && (
          <Link href="/" className="rounded-full bg-paper px-3 py-1.5 text-[14px] font-bold sticker !shadow-none">
            Pick your photo
          </Link>
        )
      )}
    </header>
  );
}

/** A rotating joke at the bottom of pages. Picked after mount so server and phone agree. */
export function Tagline({ className = "" }: { className?: string }) {
  const [line, setLine] = useState(TAGLINES[0]);
  useEffect(() => setLine(TAGLINES[Math.floor(Math.random() * TAGLINES.length)]), []);
  return <p className={`text-center text-[14px] font-medium text-ink-soft ${className}`}>{line}</p>;
}
