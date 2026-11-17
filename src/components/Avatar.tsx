/* eslint-disable @next/next/no-img-element */

const INITIAL_COLORS = ["#FFD95C", "#FFA3B5", "#8FD3FF", "#FF9A76", "#A8E39A", "#CDBFFF", "#FFC982", "#D9B48F"];

function colorFor(name: string): string {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return INITIAL_COLORS[h % INITIAL_COLORS.length];
}

export function initials(first: string, last?: string): string {
  return ((first?.[0] ?? "") + (last?.[0] ?? "")).toUpperCase() || "?";
}

/**
 * A round staff photo, or their initials on a colored circle when no photo exists.
 */
export function Avatar({
  firstName,
  lastName,
  photo,
  size = 44,
  className = "",
  ring = true,
  eager = false,
  fluid = false,
}: {
  firstName: string;
  lastName?: string;
  photo: string | null;
  size?: number;
  className?: string;
  ring?: boolean;
  eager?: boolean;
  /** When true, width/height come from className instead of `size`. */
  fluid?: boolean;
}) {
  const border = ring ? "border-[2.5px] border-ink" : "";
  const style = fluid ? {} : { width: size, height: size };
  if (photo) {
    return (
      <img
        src={photo}
        alt={firstName}
        width={size}
        height={size}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        draggable={false}
        className={`shrink-0 select-none rounded-full bg-brand-soft object-cover ${border} ${className}`}
        style={style}
      />
    );
  }
  return (
    <span
      role="img"
      aria-label={firstName}
      className={`heading inline-flex shrink-0 select-none items-center justify-center rounded-full text-ink ${border} ${className}`}
      style={{ ...style, background: colorFor(firstName + (lastName ?? "")), fontSize: Math.max(12, size * 0.38) }}
    >
      {initials(firstName, lastName)}
    </span>
  );
}
