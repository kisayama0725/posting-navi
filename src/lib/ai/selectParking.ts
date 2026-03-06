interface POI {
  name: string;
  lat: number;
  lng: number;
  placeId: string;
  types: string[];
  vicinity: string;
}

interface SegmentInfo {
  index: number;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
}

export interface ParkingSuggestion {
  segmentIndex: number;
  name: string;
  lat: number;
  lng: number;
  placeId: string;
  reason: string;
}

export async function selectParking(
  pois: POI[],
  segments: SegmentInfo[]
): Promise<ParkingSuggestion[]> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: "Respond only with valid JSON. No explanation, no markdown.",
      messages: [
        {
          role: "user",
          content: `ポスティングの駐輪場所を選定してください。

セグメント情報:
${JSON.stringify(segments)}

周辺のPOI候補:
${JSON.stringify(pois.map((p) => ({ name: p.name, lat: p.lat, lng: p.lng, placeId: p.placeId, types: p.types, vicinity: p.vicinity })))}

各セグメントに最適な駐輪場所を1つずつ選び、以下のJSON配列で返してください:
[{"segmentIndex": <番号>, "name": "<場所名>", "lat": <緯度>, "lng": <経度>, "placeId": "<place_id>", "reason": "<推薦理由30文字以内>"}]`,
        },
      ],
    }),
  });

  if (!response.ok) {
    return segments.map((seg, i) => ({
      segmentIndex: i,
      name: pois[0]?.name || "駐輪場所未定",
      lat: pois[0]?.lat || seg.startLat,
      lng: pois[0]?.lng || seg.startLng,
      placeId: pois[0]?.placeId || "",
      reason: "自動選定",
    }));
  }

  const result = await response.json();
  const text = result.content[0]?.text || "";
  try {
    return JSON.parse(text);
  } catch {
    return segments.map((seg, i) => ({
      segmentIndex: i,
      name: pois[i % pois.length]?.name || "駐輪場所未定",
      lat: pois[i % pois.length]?.lat || seg.startLat,
      lng: pois[i % pois.length]?.lng || seg.startLng,
      placeId: pois[i % pois.length]?.placeId || "",
      reason: "自動選定",
    }));
  }
}
