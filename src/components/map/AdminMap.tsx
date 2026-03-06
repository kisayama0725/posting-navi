"use client";

import { useEffect, useRef } from "react";
import { loadGoogleMaps } from "@/lib/google-maps/loader";

interface StaffPosition {
  staffId: string;
  name: string;
  lat: number;
  lng: number;
  gpsPath?: { lat: number; lng: number; speed_m_per_min: number }[];
}

interface AdminMapProps {
  staffPositions: StaffPosition[];
  className?: string;
}

export default function AdminMap({ staffPositions, className = "w-full h-[400px]" }: AdminMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const polylinesRef = useRef<google.maps.Polyline[]>([]);

  useEffect(() => {
    loadGoogleMaps().then(() => {
      if (!mapRef.current || mapInstanceRef.current) return;
      const map = new google.maps.Map(mapRef.current, {
        center: { lat: 33.8631, lng: 130.7978 },
        zoom: 13,
        mapId: process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || "DEMO_MAP_ID",
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
      });
      mapInstanceRef.current = map;
    });
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear old markers
    markersRef.current.forEach((m) => (m.map = null));
    markersRef.current = [];
    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];

    staffPositions.forEach((sp) => {
      // Staff name badge marker
      const badge = document.createElement("div");
      badge.className = "px-2 py-1 bg-blue-600 text-white text-xs font-bold rounded-full shadow-lg whitespace-nowrap";
      badge.textContent = sp.name || "?";

      const marker = new google.maps.marker.AdvancedMarkerElement({
        map,
        position: { lat: sp.lat, lng: sp.lng },
        content: badge,
      });
      markersRef.current.push(marker);

      // GPS trail with speed-based coloring
      if (sp.gpsPath && sp.gpsPath.length > 1) {
        for (let i = 1; i < sp.gpsPath.length; i++) {
          const speed = sp.gpsPath[i].speed_m_per_min;
          let color = "#FBBF24"; // yellow = normal
          if (speed < 30) color = "#EF4444"; // red = slow
          else if (speed > 80) color = "#3B82F6"; // blue = fast

          const polyline = new google.maps.Polyline({
            path: [
              { lat: sp.gpsPath[i - 1].lat, lng: sp.gpsPath[i - 1].lng },
              { lat: sp.gpsPath[i].lat, lng: sp.gpsPath[i].lng },
            ],
            strokeColor: color,
            strokeWeight: 3,
            strokeOpacity: 0.8,
            map,
          });
          polylinesRef.current.push(polyline);
        }
      }
    });

    // Fit bounds
    if (staffPositions.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      staffPositions.forEach((sp) => bounds.extend({ lat: sp.lat, lng: sp.lng }));
      map.fitBounds(bounds);
    }
  }, [staffPositions]);

  return <div ref={mapRef} className={className} style={{ minHeight: "300px" }} />;
}
