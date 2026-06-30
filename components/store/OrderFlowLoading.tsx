import { Spinner } from "@/components/ui/Spinner";

export function OrderFlowLoading({ label = "Loading…" }: { label?: string }) {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center bg-cream px-6 text-center"
      role="status"
    >
      <Spinner size="lg" label={label} />
      <p className="mt-3 text-sm text-chocolate/50">{label}</p>
    </div>
  );
}
