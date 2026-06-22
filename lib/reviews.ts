import { format, parseISO } from "date-fns";

export function formatReviewDate(date: string): string {
  try {
    return format(parseISO(date), "d MMM yyyy");
  } catch {
    return date;
  }
}

export function reviewImageSrc(path: string | null): string {
  const trimmed = path?.trim();
  return trimmed || "/landing/hero-scoop.png";
}
