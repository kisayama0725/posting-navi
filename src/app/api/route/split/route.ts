import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { legs, totalHouseholds, segmentCount = 3 } = await req.json();

    if (!legs || legs.length === 0) {
      return NextResponse.json({ error: "No legs provided" }, { status: 400 });
    }

    const totalDistance = legs.reduce((sum: number, leg: any) => sum + leg.distanceMeters, 0);
    const segmentDistance = totalDistance / segmentCount;

    const segments: any[] = [];
    let currentSegment: any = {
      index: 0,
      legs: [],
      distanceM: 0,
      households: 0,
      estimatedMinutes: 0,
    };

    const householdsPerMeter = totalHouseholds / totalDistance;

    for (const leg of legs) {
      currentSegment.legs.push(leg);
      currentSegment.distanceM += leg.distanceMeters;
      currentSegment.households = Math.round(currentSegment.distanceM * householdsPerMeter);
      currentSegment.estimatedMinutes = Math.round(currentSegment.distanceM / 50);

      if (currentSegment.distanceM >= segmentDistance && segments.length < segmentCount - 1) {
        segments.push(currentSegment);
        currentSegment = {
          index: segments.length,
          legs: [],
          distanceM: 0,
          households: 0,
          estimatedMinutes: 0,
        };
      }
    }

    if (currentSegment.legs.length > 0) {
      segments.push(currentSegment);
    }

    return NextResponse.json({ segments });
  } catch (err) {
    console.error("Route split error:", err);
    return NextResponse.json({ error: "Route split failed" }, { status: 500 });
  }
}
