/** Join class names, skipping falsy values (shadcn/ui's `cn`, without Tailwind merging). */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}
