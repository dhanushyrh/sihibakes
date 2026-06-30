import { Loader2 } from "lucide-react";

const SIZES = {
  sm: 14,
  md: 20,
  lg: 28,
} as const;

type SpinnerProps = {
  size?: keyof typeof SIZES;
  className?: string;
  label?: string;
};

export function Spinner({ size = "md", className = "", label }: SpinnerProps) {
  return (
    <>
      <Loader2
        size={SIZES[size]}
        className={`animate-spin text-chocolate/40 ${className}`.trim()}
        aria-hidden={!label}
      />
      {label ? <span className="sr-only">{label}</span> : null}
    </>
  );
}

export function SpinnerCentered({
  size = "lg",
  label = "Loading…",
}: {
  size?: keyof typeof SIZES;
  label?: string;
}) {
  return (
    <div className="flex items-center justify-center py-12" role="status">
      <Spinner size={size} label={label} />
    </div>
  );
}
