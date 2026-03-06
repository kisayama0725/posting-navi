"use client";

import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps } from "@/lib/google-maps/loader";
import { Input } from "@/components/ui/input";

interface PlaceResult {
  address: string;
  lat: number;
  lng: number;
  placeId: string;
}

interface PlaceAutocompleteProps {
  onSelect: (place: PlaceResult) => void;
  placeholder?: string;
}

export function PlaceAutocomplete({
  onSelect,
  placeholder = "住所を検索...",
}: PlaceAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadGoogleMaps().then(() => {
      if (!inputRef.current) return;
      const autocomplete = new google.maps.places.Autocomplete(
        inputRef.current,
        {
          types: ["address"],
          componentRestrictions: { country: "jp" },
          fields: ["formatted_address", "geometry", "place_id", "address_components"],
        }
      );

      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        if (place.geometry?.location) {
          onSelect({
            address: place.formatted_address || "",
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
            placeId: place.place_id || "",
          });
        }
      });

      setLoaded(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Input
      ref={inputRef}
      type="text"
      placeholder={loaded ? placeholder : "読み込み中..."}
      className="w-full"
    />
  );
}
