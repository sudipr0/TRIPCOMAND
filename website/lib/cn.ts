/**
 * Minimal class-name joiner.
 *
 * The site has no conditional class conflicts to resolve, so a full
 * tailwind-merge dependency would be dead weight. Falsy values are dropped.
 */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
