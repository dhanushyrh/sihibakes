"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { scrollPageToTop } from "@/lib/scroll";

/** Resets scroll position on every client-side route change. */
export function ScrollToTop() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    scrollPageToTop();
    const id = requestAnimationFrame(() => {
      scrollPageToTop();
    });
    return () => cancelAnimationFrame(id);
  }, [pathname, searchParams]);

  return null;
}

/** Call when a wizard step or similar view key changes. */
export function useScrollToTopOnChange(dependency: unknown) {
  useEffect(() => {
    scrollPageToTop();
    const id = requestAnimationFrame(() => {
      scrollPageToTop();
    });
    return () => cancelAnimationFrame(id);
  }, [dependency]);
}
