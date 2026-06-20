"use client";

import { ConfirmSwitch } from "@/components/admin/ConfirmSwitch";

interface AvailabilitySwitchProps {
  active: boolean;
  productTitle: string;
  onToggle: (next: boolean) => void;
  disabled?: boolean;
}

export function AvailabilitySwitch({
  active,
  productTitle,
  onToggle,
  disabled,
}: AvailabilitySwitchProps) {
  return (
    <ConfirmSwitch
      active={active}
      label="Available"
      description={active ? "Live on menu" : "Sold out on menu"}
      confirmOn={`Make "${productTitle}" available on the menu?`}
      confirmOff={`Mark "${productTitle}" as unavailable? It will show as sold out on the menu.`}
      onToggle={onToggle}
      disabled={disabled}
    />
  );
}
