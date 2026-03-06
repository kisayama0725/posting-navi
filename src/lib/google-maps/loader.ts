import { setOptions, importLibrary } from "@googlemaps/js-api-loader";

let initialized = false;

export async function loadGoogleMaps() {
  if (!initialized) {
    setOptions({
      key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
      v: "weekly",
      language: "ja",
      region: "JP",
    });
    initialized = true;
  }
  await importLibrary("maps");
  await importLibrary("places");
  await importLibrary("marker");
}
