import type { HTMLAttributes } from "react";

type SkeletonProps = HTMLAttributes<HTMLDivElement>;

export function Skeleton({ className = "", ...props }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-[#4B2C20]/10 ${className}`.trim()}
      aria-hidden
      {...props}
    />
  );
}
