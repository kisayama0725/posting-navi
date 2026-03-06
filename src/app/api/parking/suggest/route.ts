import { NextRequest, NextResponse } from "next/server";
import { searchNearbyPlaces } from "@/lib/google-maps/places";
import { selectParking } from "@/lib/ai/selectParking";

export async function POST(req: NextRequest) {
  try {
    const { segments } = await req.json();

    if (!segments || segments.length === 0) {
      return NextResponse.json({ error: "No segments provided" }, { status: 400 });
    }

    const centerLat = segments.reduce((s: number, seg: any) => s + seg.startLat, 0) / segments.length;
    const centerLng = segments.reduce((s: number, seg: any) => s + seg.startLng, 0) / segments.length;

    const pois = await searchNearbyPlaces(centerLat, centerLng, 500);

    const suggestions = await selectParking(pois, segments);

    return NextResponse.json({ suggestions, pois });
  } catch (err) {
    console.error("Parking suggestion error:", err);
    return NextResponse.json({ error: "Suggestion failed" }, { status: 500 });
  }
}
