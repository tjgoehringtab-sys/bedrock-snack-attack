"use client";

import { useMounted } from "./hooks";

/** "Today 3:42 PM", "Yesterday 9:05 AM", or "Nov 14, 2:10 PM", in the viewer's time zone. */
export function When({ iso, className = "" }: { iso: string; className?: string }) {
  const mounted = useMounted();
  if (!mounted) return <span className={className}>&nbsp;</span>;
  return (
    <time dateTime={iso} className={className} title={new Date(iso).toLocaleString()}>
      {formatWhen(iso)}
    </time>
  );
}

export function formatWhen(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOfDay(now) - startOfDay(d)) / 86_400_000);
  if (days === 0) {
    const mins = Math.floor((now.getTime() - d.getTime()) / 60_000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins} min ago`;
    return `Today ${time}`;
  }
  if (days === 1) return `Yesterday ${time}`;
  return `${d.toLocaleDateString([], { month: "short", day: "numeric" })}, ${time}`;
}
