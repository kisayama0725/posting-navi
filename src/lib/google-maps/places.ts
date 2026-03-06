interface NearbyPlace {
  name: string;
  lat: number;
  lng: number;
  placeId: string;
  types: string[];
  vicinity: string;
}

export async function searchNearbyPlaces(
  lat: number,
  lng: number,
  radius: number = 500,
  types: string[] = ["park", "convenience_store", "parking"]
): Promise<NearbyPlace[]> {
  const allResults: NearbyPlace[] = [];

  for (const type of types) {
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=${type}&language=ja&key=${process.env.GOOGLE_MAPS_API_KEY!}`;

    const response = await fetch(url);
    if (!response.ok) continue;

    const data = await response.json();
    if (data.results) {
      for (const place of data.results) {
        allResults.push({
          name: place.name,
          lat: place.geometry.location.lat,
          lng: place.geometry.location.lng,
          placeId: place.place_id,
          types: place.types || [],
          vicinity: place.vicinity || "",
        });
      }
    }
  }

  return allResults;
}
