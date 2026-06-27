"use client";

import { useJsApiLoader } from "@react-google-maps/api";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { MapPin, Search, X } from "lucide-react";
import {
  getGoogleMapsApiKey,
  GOOGLE_MAPS_LOADER_OPTIONS,
} from "@/lib/google-maps-config";

export type PlaceAutocompleteSelection = {
  lat: number;
  lng: number;
  displayName: string | null;
  formattedAddress: string | null;
};

type PlaceAutocompleteInputProps = {
  placeholder?: string;
  value?: string;
  locationRestriction?: google.maps.LatLngBounds;
  onPlaceSelect: (selection: PlaceAutocompleteSelection) => void;
  /** Tailwind classes for the outer wrapper. */
  className?: string;
  iconClassName?: string;
};

type Suggestion = {
  placeId: string;
  mainText: string;
  mainMatches: { start: number; end: number }[];
  secondaryText: string;
  prediction: google.maps.places.PlacePrediction;
};

const DEBOUNCE_MS = 220;

function readLatLng(
  location: google.maps.LatLng | google.maps.LatLngLiteral
): { lat: number; lng: number } {
  if (typeof (location as google.maps.LatLng).lat === "function") {
    const ll = location as google.maps.LatLng;
    return { lat: ll.lat(), lng: ll.lng() };
  }
  const literal = location as google.maps.LatLngLiteral;
  return { lat: literal.lat, lng: literal.lng };
}

function highlightMatches(
  text: string,
  matches: { start: number; end: number }[]
) {
  if (matches.length === 0) return text;

  const nodes: React.ReactNode[] = [];
  let cursor = 0;

  matches.forEach((match, i) => {
    if (match.start > cursor) {
      nodes.push(text.slice(cursor, match.start));
    }
    nodes.push(
      <span key={i} className="font-semibold text-chocolate">
        {text.slice(match.start, match.end)}
      </span>
    );
    cursor = match.end;
  });

  if (cursor < text.length) {
    nodes.push(text.slice(cursor));
  }

  return nodes;
}

export function PlaceAutocompleteInput({
  placeholder = "Search area, street, or landmark",
  value,
  locationRestriction,
  onPlaceSelect,
  className = "",
  iconClassName = "text-chocolate/40",
}: PlaceAutocompleteInputProps) {
  const apiKey = getGoogleMapsApiKey();
  const { isLoaded } = useJsApiLoader(GOOGLE_MAPS_LOADER_OPTIONS);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sessionTokenRef =
    useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);
  const locationRestrictionRef = useRef(locationRestriction);
  const onPlaceSelectRef = useRef(onPlaceSelect);

  locationRestrictionRef.current = locationRestriction;
  onPlaceSelectRef.current = onPlaceSelect;

  const [inputValue, setInputValue] = useState(value ?? "");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [mounted, setMounted] = useState(false);
  const [menuRect, setMenuRect] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (value !== undefined) setInputValue(value);
  }, [value]);

  const ensureSessionToken = useCallback(() => {
    if (!sessionTokenRef.current && typeof google !== "undefined") {
      sessionTokenRef.current =
        new google.maps.places.AutocompleteSessionToken();
    }
    return sessionTokenRef.current ?? undefined;
  }, []);

  const runSearch = useCallback(
    async (text: string) => {
      if (
        typeof google === "undefined" ||
        !google.maps?.places?.AutocompleteSuggestion
      ) {
        return;
      }

      const trimmed = text.trim();
      if (trimmed.length < 2) {
        setSuggestions([]);
        setLoading(false);
        return;
      }

      const requestId = ++requestIdRef.current;
      setLoading(true);

      try {
        const { suggestions: results } =
          await google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions(
            {
              input: trimmed,
              includedRegionCodes: ["in"],
              locationRestriction: locationRestrictionRef.current ?? undefined,
              sessionToken: ensureSessionToken(),
            }
          );

        if (requestId !== requestIdRef.current) return;

        const mapped: Suggestion[] = results
          .map((result) => result.placePrediction)
          .filter((p): p is google.maps.places.PlacePrediction => p != null)
          .map((prediction) => ({
            placeId: prediction.placeId,
            mainText: prediction.mainText?.text ?? prediction.text.text,
            mainMatches: (prediction.mainText?.matches ?? []).map((m) => ({
              start: m.startOffset,
              end: m.endOffset,
            })),
            secondaryText: prediction.secondaryText?.text ?? "",
            prediction,
          }));

        setSuggestions(mapped);
        setOpen(true);
        setActiveIndex(-1);
      } catch {
        if (requestId === requestIdRef.current) setSuggestions([]);
      } finally {
        if (requestId === requestIdRef.current) setLoading(false);
      }
    },
    [ensureSessionToken]
  );

  const handleChange = (next: string) => {
    setInputValue(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (next.trim().length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(() => runSearch(next), DEBOUNCE_MS);
  };

  const handleSelect = useCallback(async (item: Suggestion) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    requestIdRef.current += 1;
    setOpen(false);
    setLoading(true);

    try {
      const place = item.prediction.toPlace();
      await place.fetchFields({
        fields: ["displayName", "formattedAddress", "location"],
      });

      // Session ends once a place is selected; reset for the next search.
      sessionTokenRef.current = null;

      if (!place.location) return;
      const { lat, lng } = readLatLng(place.location);

      setInputValue(place.displayName ?? place.formattedAddress ?? item.mainText);
      onPlaceSelectRef.current({
        lat,
        lng,
        displayName: place.displayName ?? null,
        formattedAddress: place.formattedAddress ?? null,
      });
    } catch {
      // ignore selection failures
    } finally {
      setLoading(false);
    }
  }, []);

  const clearInput = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setInputValue("");
    setSuggestions([]);
    setOpen(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) {
      if (event.key === "ArrowDown" && inputValue.trim().length >= 2) {
        runSearch(inputValue);
      }
      return;
    }

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActiveIndex((prev) => (prev + 1) % suggestions.length);
        break;
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex((prev) =>
          prev <= 0 ? suggestions.length - 1 : prev - 1
        );
        break;
      case "Enter":
        if (activeIndex >= 0 && activeIndex < suggestions.length) {
          event.preventDefault();
          void handleSelect(suggestions[activeIndex]);
        }
        break;
      case "Escape":
        setOpen(false);
        setActiveIndex(-1);
        break;
      default:
        break;
    }
  };

  const updateMenuRect = useCallback(() => {
    if (!wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    setMenuRect({
      top: rect.bottom + 8,
      left: rect.left,
      width: rect.width,
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updateMenuRect();

    const handle = () => updateMenuRect();
    window.addEventListener("scroll", handle, true);
    window.addEventListener("resize", handle);
    return () => {
      window.removeEventListener("scroll", handle, true);
      window.removeEventListener("resize", handle);
    };
  }, [open, suggestions.length, loading, updateMenuRect]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (wrapperRef.current?.contains(target)) return;
      const menu = document.getElementById("place-autocomplete-menu");
      if (menu?.contains(target)) return;
      setOpen(false);
      setActiveIndex(-1);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const showMenu =
    open && menuRect != null && (loading || suggestions.length > 0);

  const menu = useMemo(() => {
    if (!showMenu || !menuRect) return null;

    return createPortal(
      <div
        id="place-autocomplete-menu"
        className="fixed z-[1000] overflow-hidden rounded-2xl border border-chocolate/10 bg-white shadow-xl"
        style={{
          top: menuRect.top,
          left: menuRect.left,
          width: menuRect.width,
        }}
      >
        {loading && suggestions.length === 0 ? (
          <div className="px-4 py-3 text-sm text-chocolate/50">Searching…</div>
        ) : (
          <ul className="max-h-72 overflow-y-auto py-1">
            {suggestions.map((item, index) => (
              <li key={item.placeId}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    void handleSelect(item);
                  }}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={`flex w-full items-start gap-3 px-4 py-2.5 text-left transition ${
                    index === activeIndex ? "bg-cream" : "hover:bg-cream/60"
                  }`}
                >
                  <MapPin
                    size={16}
                    className="mt-0.5 shrink-0 text-chocolate/40"
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm text-chocolate/80">
                      {highlightMatches(item.mainText, item.mainMatches)}
                    </span>
                    {item.secondaryText && (
                      <span className="block truncate text-xs text-chocolate/45">
                        {item.secondaryText}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>,
      document.body
    );
  }, [showMenu, menuRect, loading, suggestions, activeIndex, handleSelect]);

  if (!apiKey) {
    return (
      <input
        type="search"
        disabled
        placeholder="Maps search unavailable"
        className={`w-full rounded-2xl border border-chocolate/15 bg-white py-3 px-4 text-base text-chocolate/40 ${className}`}
      />
    );
  }

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <Search
        size={16}
        className={`pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 ${iconClassName}`}
      />
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        autoComplete="off"
        spellCheck={false}
        disabled={!isLoaded}
        value={inputValue}
        placeholder={isLoaded ? placeholder : "Loading search…"}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (suggestions.length > 0) setOpen(true);
        }}
        className="w-full rounded-2xl border border-chocolate/15 bg-white py-3 pl-10 pr-10 text-base text-chocolate shadow-[0_0_0_1px_rgba(75,44,32,0.05)] outline-none transition placeholder:text-chocolate/40 focus:border-chocolate/30 focus:shadow-[0_0_0_2px_rgba(75,44,32,0.1)] disabled:text-chocolate/40"
      />
      {inputValue.length > 0 && isLoaded && (
        <button
          type="button"
          onClick={clearInput}
          aria-label="Clear search"
          className="absolute right-3 top-1/2 z-10 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-chocolate/40 transition hover:bg-cream hover:text-chocolate/70"
        >
          <X size={15} />
        </button>
      )}
      {mounted && menu}
    </div>
  );
}
