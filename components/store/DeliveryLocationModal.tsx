"use client";

import { X } from "lucide-react";
import { MapPicker } from "@/components/store/MapPicker";
import type { DeliveryFenceKm } from "@/lib/types";

type DeliveryLocationModalProps = {
  kitchenLat: number;
  kitchenLng: number;
  deliveryFence: DeliveryFenceKm;
  lat: number;
  lng: number;
  searchLabel?: string;
  onChange: (lat: number, lng: number) => void;
  onSearchLabelChange?: (label: string) => void;
  onConfirm: () => void;
  onClose: () => void;
};

export function DeliveryLocationModal({
  kitchenLat,
  kitchenLng,
  deliveryFence,
  lat,
  lng,
  searchLabel,
  onChange,
  onSearchLabelChange,
  onConfirm,
  onClose,
}: DeliveryLocationModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-label="Close"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delivery-location-modal-title"
        className="relative z-10 flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-cream sm:rounded-3xl"
      >
        <div className="flex items-center justify-between border-b border-chocolate/10 px-5 py-4">
          <h3
            id="delivery-location-modal-title"
            className="font-display text-lg font-semibold text-chocolate"
          >
            Set delivery location
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-chocolate ring-1 ring-chocolate/10"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <p className="mb-4 text-sm text-chocolate/60">
            Search your area, drag the pin, or tap the map to set your spot.
          </p>

          <MapPicker
            kitchenLat={kitchenLat}
            kitchenLng={kitchenLng}
            lat={lat}
            lng={lng}
            deliveryFence={deliveryFence}
            searchLabel={searchLabel}
            onChange={onChange}
            onSearchLabelChange={onSearchLabelChange}
          />

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-full border border-chocolate/20 py-3.5 text-sm text-chocolate"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="flex-1 rounded-full bg-chocolate py-3.5 text-sm font-medium text-cream"
            >
              Confirm location
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
