"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";

type HorizontalMarqueeProps = {
  children: ReactNode;
  direction?: "left" | "right";
  durationSeconds?: number;
  className?: string;
};

export function HorizontalMarquee({
  children,
  direction = "left",
  durationSeconds = 35,
  className = "",
}: HorizontalMarqueeProps) {
  const [showDuplicate, setShowDuplicate] = useState(false);
  const animationClass =
    direction === "left" ? "animate-marquee-left" : "animate-marquee-right";

  useEffect(() => {
    setShowDuplicate(true);
  }, []);

  return (
    <div
      className={`marquee-fade relative overflow-hidden ${className}`}
      style={
        {
          "--marquee-duration": `${durationSeconds}s`,
        } as CSSProperties
      }
    >
      <div className={`marquee-track flex w-max ${animationClass}`}>
        <div className="flex shrink-0 items-stretch gap-3 pr-3">{children}</div>
        {showDuplicate ? (
          <div className="flex shrink-0 items-stretch gap-3 pr-3" aria-hidden>
            {children}
          </div>
        ) : null}
      </div>
    </div>
  );
}
