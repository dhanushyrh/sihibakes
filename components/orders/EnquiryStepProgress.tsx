export function EnquiryStepProgress({
  step,
  total,
}: {
  step: number;
  total: number;
}) {
  return (
    <div className="mt-4 flex flex-col items-center gap-2">
      <div className="flex items-center gap-2">
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={`h-2 w-2 rounded-full transition ${
              i < step ? "bg-chocolate" : i === step ? "bg-gold" : "bg-chocolate/15"
            }`}
          />
        ))}
      </div>
      <p className="text-xs text-chocolate/50">
        Step {step + 1} of {total}
      </p>
    </div>
  );
}
