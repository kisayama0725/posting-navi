import { NextRequest, NextResponse } from "next/server";
import { computeRoute } from "@/lib/google-maps/routes";

export async function POST(req: NextRequest) {
  try {
    const { origin, destination, waypoints } = await req.json();

    const result = await computeRoute({
      origin,
      destination,
      intermediates: waypoints,
      travelMode: "WALK",
      optimizeWaypointOrder: true,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("Route optimization error:", err);
    return NextResponse.json({ error: "Route optimization failed" }, { status: 500 });
  }
}
