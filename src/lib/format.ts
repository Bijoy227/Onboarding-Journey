/** Small presentation helpers shared across screens. */

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * "2 minutes ago" style timestamps.
 *
 * Only ever rendered on the client (the whole app waits for hydration before
 * painting), so there is no risk of a server/client mismatch.
 */
export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";

  const diffMs = Date.now() - then;
  const future = diffMs < 0;
  const seconds = Math.floor(Math.abs(diffMs) / 1000);

  const format = (value: number, unit: string) => {
    const plural = value === 1 ? unit : `${unit}s`;
    return future ? `in ${value} ${plural}` : `${value} ${plural} ago`;
  };

  if (seconds < 45) return future ? "shortly" : "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return format(Math.max(minutes, 1), "minute");
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return format(hours, "hour");
  const days = Math.floor(hours / 24);
  if (days < 30) return format(days, "day");
  const months = Math.floor(days / 30);
  if (months < 12) return format(months, "month");
  return format(Math.floor(months / 12), "year");
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Whole-dollar prices, e.g. $1,234. Cents are shown only when present. */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function pluralize(count: number, singular: string, plural?: string) {
  return `${count} ${count === 1 ? singular : (plural ?? `${singular}s`)}`;
}

/** Turns a color seed into one of the palette classes used for org avatars. */
export function organizationAccent(id: string): string {
  const palette = [
    "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
  ];
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) >>> 0;
  }
  return palette[hash % palette.length];
}
