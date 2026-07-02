"use client";

import { ConfirmSwitch } from "@/components/admin/ConfirmSwitch";

interface SoldOutSwitchProps {
  soldOut: boolean;
  productTitle: string;
  onToggle: (next: boolean) => void;
  disabled?: boolean;
}

export function SoldOutSwitch({
  soldOut,
  productTitle,
  onToggle,
  disabled,
}: SoldOutSwitchProps) {
  return (
    <ConfirmSwitch
      active={!soldOut}
      label="Available to order"
      description={
        soldOut
          ? "Marked sold out on same-day and pre-order menus"
          : "Customers can add this item to cart"
      }
      confirmOn={`Make "${productTitle}" available to order again?`}
      confirmOff={`Mark "${productTitle}" as sold out on the menu? This applies to same-day and pre-order.`}
      onToggle={(next) => onToggle(!next)}
      disabled={disabled}
    />
  );
}
