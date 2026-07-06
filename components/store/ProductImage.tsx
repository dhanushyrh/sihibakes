"use client";

import { useState } from "react";
import Image from "next/image";
import { Skeleton } from "@/components/ui/Skeleton";

const FALLBACK_IMAGE = "/hero-tiramisu.png";

type ProductImageProps = {
  src?: string | null;
  alt: string;
  fill?: boolean;
  priority?: boolean;
  sizes?: string;
  className?: string;
};

export function ProductImage({
  src,
  alt,
  fill = true,
  priority = false,
  sizes,
  className = "object-cover",
}: ProductImageProps) {
  const [loaded, setLoaded] = useState(false);
  const resolvedSrc = src || FALLBACK_IMAGE;

  return (
    <>
      {!loaded && (
        <Skeleton
          className="absolute inset-0 h-full w-full rounded-none"
          aria-label={`Loading ${alt}`}
        />
      )}
      <Image
        src={resolvedSrc}
        alt={alt}
        fill={fill}
        priority={priority}
        sizes={sizes}
        onLoad={() => setLoaded(true)}
        className={`${className} transition-opacity duration-300 ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
      />
    </>
  );
}
