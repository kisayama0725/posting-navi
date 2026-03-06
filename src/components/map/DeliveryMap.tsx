"use client";

import { useEffect, useRef } from "react";
import { loadGoogleMaps } from "@/lib/google-maps/loader";

interface Waypoint {
  lat: number;
  lng: number;
  label: string;
  status: "visited" | "current" | "unvisited";
}

interface DeliveryMapProps {
  center?: { lat: number; lng: number };
  zoom?: number;
  className?: string;
  waypoints?: Waypoint[];
  gpsPath?: { lat: number; lng: number }[];
  currentPosition?: { lat: number; lng: number } | null;
  routePolylines?: { path: { lat: number; lng: number }[]; color: string }[];
  onMapReady?: (map: google.maps.Map) => void;
}

export default function DeliveryMap({
  center = { lat: 33.8631, lng: 130.7978 },
  zoom = 15,
  className = "w-full h-full",
  waypoints = [],
  gpsPath = [],
  currentPosition,
  routePolylines = [],
  onMapReady,
}: DeliveryMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const polylinesRef = useRef<google.maps.Polyline[]>([]);
  const gpsPolylineRef = useRef<google.maps.Polyline | null>(null);
  const currentMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);

  useEffect(() => {
    loadGoogleMaps().then(() => {
      if (!mapRef.current || mapInstanceRef.current) return;
      const map = new google.maps.Map(mapRef.current, {
        center,
        zoom,
        mapId: process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || "DEMO_MAP_ID",
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
      });
      mapInstanceRef.current = map;
      onMapReady?.(map);
    });
  }, []);

  // Waypoint markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => (m.map = null));
    markersRef.current = [];

    waypoints.forEach((wp) => {
      const pin = document.createElement("div");
      pin.className = "flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold shadow-md";
      if (wp.status === "visited") {
        pin.className += " bg-green-500 text-white";
        pin.textContent = "✓";
      } else if (wp.status === "current") {
        pin.className += " bg-yellow-400 text-black border-2 border-yellow-600";
        pin.textContent = wp.label;
      } else {
        pin.className += " bg-white text-gray-700 border border-gray-300";
        pin.textContent = wp.label;
      }

      const marker = new google.maps.marker.AdvancedMarkerElement({
        map,
        position: { lat: wp.lat, lng: wp.lng },
        content: pin,
      });
      markersRef.current.push(marker);
    });
  }, [waypoints]);

  // Route polylines
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];

    routePolylines.forEach((rp) => {
      const polyline = new google.maps.Polyline({
        path: rp.path,
        geodesic: true,
        strokeColor: rp.color,
        strokeOpacity: 0.8,
        strokeWeight: 4,
        map,
      });
      polylinesRef.current.push(polyline);
    });
  }, [routePolylines]);

  // GPS trail
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (gpsPolylineRef.current) {
      gpsPolylineRef.current.setMap(null);
    }

    if (gpsPath.length > 0) {
      gpsPolylineRef.current = new google.maps.Polyline({
        path: gpsPath,
        geodesic: true,
        strokeColor: "#EF4444",
        strokeOpacity: 0.7,
        strokeWeight: 3,
        map,
      });
    }
  }, [gpsPath]);

  // Current position marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (currentMarkerRef.current) {
      currentMarkerRef.current.map = null;
    }

    if (currentPosition) {
      const dot = document.createElement("div");
      dot.className = "w-4 h-4 bg-blue-500 border-2 border-white rounded-full shadow-lg";

      currentMarkerRef.current = new google.maps.marker.AdvancedMarkerElement({
        map,
        position: currentPosition,
        content: dot,
      });

      map.panTo(currentPosition);
    }
  }, [currentPosition]);

  return <div ref={mapRef} className={className} style={{ minHeight: "300px" }} />;
}
