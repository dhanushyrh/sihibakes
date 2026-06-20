"use client";

interface ConfirmSwitchProps {
  active: boolean;
  label: string;
  description?: string;
  confirmOn: string;
  confirmOff: string;
  onToggle: (next: boolean) => void;
  disabled?: boolean;
  compact?: boolean;
}

export function ConfirmSwitch({
  active,
  label,
  description,
  confirmOn,
  confirmOff,
  onToggle,
  disabled,
  compact,
}: ConfirmSwitchProps) {
  const handleClick = () => {
    const next = !active;
    if (!confirm(next ? confirmOn : confirmOff)) return;
    onToggle(next);
  };

  if (compact) {
    return (
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-[#4B2C20]">{label}</p>
        <button
          type="button"
          role="switch"
          aria-checked={active}
          aria-label={label}
          disabled={disabled}
          onClick={handleClick}
          className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
            active ? "bg-emerald-500" : "bg-[#4B2C20]/20"
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
              active ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-[#F5E6D3]/40 px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-xs font-medium text-[#4B2C20]">{label}</p>
        {description && (
          <p className="text-[10px] text-[#4B2C20]/50">{description}</p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={active}
        aria-label={label}
        disabled={disabled}
        onClick={handleClick}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
          active ? "bg-emerald-500" : "bg-[#4B2C20]/20"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
            active ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}
