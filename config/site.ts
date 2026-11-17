/**
 * SITE TEXT + JOKES
 * Change the retreat dates or add jokes here.
 */
export const SITE = {
  title: "BEDROCK SNACK ATTACK",
  subtitle: "The most important decisions of staff retreat start here.",
  church: "Bedrock Church Sarasota",
  // Dates are local calendar days (YYYY-MM-DD).
  retreatStart: "2027-01-03",
  retreatEnd: "2027-01-06",
  retreatLabel: "Staff retreat, Jan 3–6",
};

/** Shown after someone adds a request. One is picked at random. */
export const ADD_CONFIRMATIONS = [
  "Your questionable food choices have been documented.",
  "Your snack request has been heard.",
  "Noted. Somebody's going to Publix because of you.",
  "Logged. Staff unity begins with snacks.",
  "Bold choice. Respect.",
  "Recorded for all eternity. Or at least until January 6.",
  "Done. Your coworkers can now see this. 👀",
  "Added. The shopping cart trembles.",
  "Received with gladness and sincerity of heart.",
  "Loaves and fishes? We'll start with Goldfish.",
];

export const REMOVE_CONFIRMATIONS = [
  "Removed. We'll pretend that never happened.",
  "Gone. Nobody saw anything.",
  "Deleted. A moment of silence for that snack.",
];

/** Rotating footer lines. */
export const TAGLINES = [
  "The Lord provides. But somebody still has to go to Publix.",
  "Healthy choices are technically allowed.",
  "Staff unity begins with snacks.",
  "Warning: your coworkers can see your food choices.",
  "Man shall not live by bread alone. He also needs chips.",
  "Blessed are the snack-bringers.",
];

export function pick<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}
