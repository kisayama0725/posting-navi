interface RouteRequest {
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  intermediates?: { lat: number; lng: number }[];
  travelMode?: string;
  optimizeWaypointOrder?: boolean;
}

interface RouteResponse {
  routes: {
    duration: string;
    distanceMeters: number;
    polyline: { encodedPolyline: string };
    optimizedIntermediateWaypointIndex?: number[];
    legs: {
      duration: string;
      distanceMeters: number;
      startLocation: { latLng: { latitude: number; longitude: number } };
      endLocation: { latLng: { latitude: number; longitude: number } };
    }[];
  }[];
}

export async function computeRoute(req: RouteRequest): Promise<RouteResponse> {
  const body: any = {
    origin: {
      location: { latLng: { latitude: req.origin.lat, longitude: req.origin.lng } },
    },
    destination: {
      location: { latLng: { latitude: req.destination.lat, longitude: req.destination.lng } },
    },
    travelMode: req.travelMode || "WALK",
    computeAlternativeRoutes: false,
    routeModifiers: { avoidTolls: false, avoidHighways: false, avoidFerries: false },
  };

  if (req.intermediates && req.intermediates.length > 0) {
    body.intermediates = req.intermediates.map((p) => ({
      location: { latLng: { latitude: p.lat, longitude: p.lng } },
    }));
    if (req.optimizeWaypointOrder) {
      body.optimizeWaypointOrder = true;
    }
  }

  const fieldMask = [
    "routes.duration",
    "routes.distanceMeters",
    "routes.polyline.encodedPolyline",
    "routes.optimizedIntermediateWaypointIndex",
    "routes.legs.duration",
    "routes.legs.distanceMeters",
    "routes.legs.startLocation",
    "routes.legs.endLocation",
  ].join(",");

  const response = await fetch(
    "https://routes.googleapis.com/directions/v2:computeRoutes",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": process.env.GOOGLE_MAPS_API_KEY!,
        "X-Goog-FieldMask": fieldMask,
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Routes API error: ${response.status} ${errText}`);
  }

  return response.json();
}
