"use client";

import { useEffect, useRef } from "react";
import { useGoogleMap } from "@react-google-maps/api";

export type AdvancedMapMarkerVariant = "pin" | "kitchen";

type AdvancedMapMarkerProps = {
  lat: number;
  lng: number;
  title?: string;
  zIndex?: number;
  draggable?: boolean;
  variant?: AdvancedMapMarkerVariant;
  onDragEnd?: (lat: number, lng: number) => void;
};

function readPosition(
  position: google.maps.LatLng | google.maps.LatLngLiteral | google.maps.LatLngAltitudeLiteral
): { lat: number; lng: number } {
  if (typeof (position as google.maps.LatLng).lat === "function") {
    const latLng = position as google.maps.LatLng;
    return { lat: latLng.lat(), lng: latLng.lng() };
  }
  const literal = position as google.maps.LatLngLiteral;
  return { lat: literal.lat, lng: literal.lng };
}

function createKitchenContent(): HTMLDivElement {
  const el = document.createElement("div");
  el.style.width = "16px";
  el.style.height = "16px";
  el.style.borderRadius = "50%";
  el.style.background = "#4B2C20";
  el.style.opacity = "0.85";
  el.style.border = "2px solid white";
  el.style.boxShadow = "0 1px 4px rgba(0,0,0,0.25)";
  return el;
}

export function AdvancedMapMarker({
  lat,
  lng,
  title,
  zIndex,
  draggable = false,
  variant = "pin",
  onDragEnd,
}: AdvancedMapMarkerProps) {
  const map = useGoogleMap();
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const onDragEndRef = useRef(onDragEnd);
  onDragEndRef.current = onDragEnd;

  useEffect(() => {
    if (!map || typeof google === "undefined") return;

    let cancelled = false;
    let dragListener: google.maps.MapsEventListener | null = null;

    async function init() {
      const { AdvancedMarkerElement, PinElement } =
        (await google.maps.importLibrary("marker")) as google.maps.MarkerLibrary;

      if (cancelled) return;

      const content =
        variant === "kitchen"
          ? createKitchenContent()
          : new PinElement({
              background: "#4B2C20",
              borderColor: "#FFFFFF",
              glyphColor: "#FFFFFF",
              scale: 1.05,
            }).element;

      const marker = new AdvancedMarkerElement({
        map,
        position: { lat, lng },
        title: title ?? "",
        zIndex,
        gmpDraggable: draggable,
        content,
      });

      if (draggable) {
        dragListener = marker.addListener("dragend", () => {
          const position = marker.position;
          if (!position) return;
          const next = readPosition(position);
          onDragEndRef.current?.(next.lat, next.lng);
        });
      }

      markerRef.current = marker;
    }

    void init();

    return () => {
      cancelled = true;
      dragListener?.remove();
      if (markerRef.current) {
        markerRef.current.map = null;
        markerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- marker instance is updated via separate effects
  }, [map, variant, draggable]);

  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) return;
    marker.position = { lat, lng };
  }, [lat, lng]);

  useEffect(() => {
    const marker = markerRef.current;
    if (!marker || title === undefined) return;
    marker.title = title;
  }, [title]);

  useEffect(() => {
    const marker = markerRef.current;
    if (!marker || zIndex === undefined) return;
    marker.zIndex = zIndex;
  }, [zIndex]);

  return null;
}
