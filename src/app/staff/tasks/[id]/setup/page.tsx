"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";

const DeliveryMap = dynamic(() => import("@/components/map/DeliveryMap"), { ssr: false });

const STEPS = ["エリア確認", "AI推奨枚数", "駐輪場所提案", "ルート分割確認", "出発確認"];

export default function SetupWizard() {
  const params = useParams();
  const router = useRouter();
  const taskId = params.id as string;
  const supabase = createClient();

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [task, setTask] = useState<any>(null);
  const [area, setArea] = useState<any>(null);

  // Step 2: Flyer calculation
  const [flyerCalc, setFlyerCalc] = useState<any>(null);
  const [manualCount, setManualCount] = useState<number | null>(null);

  // Step 3: Parking
  const [parkingSuggestions, setParkingSuggestions] = useState<any[]>([]);

  // Step 4: Route segments
  const [segments, setSegments] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data: t } = await supabase
        .from("tasks")
        .select("*, areas(*)")
        .eq("id", taskId)
        .single();
      if (t) {
        setTask(t);
        const a = Array.isArray(t.areas) ? t.areas[0] : t.areas;
        setArea(a);
      }
    };
    load();
  }, [taskId]);

  const progress = ((step + 1) / STEPS.length) * 100;

  // Step 2: Calculate flyers
  const calcFlyers = async () => {
    if (!area) return;
    setLoading(true);
    try {
      const res = await fetch("/api/flyers/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ areaId: area.id }),
      });
      const data = await res.json();
      setFlyerCalc(data);
      setManualCount(data.recommendedCount);
    } catch {
      setFlyerCalc({ recommendedCount: area.total_households, reasoning: "計算できませんでした" });
      setManualCount(area.total_households);
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Suggest parking
  const suggestParking = async () => {
    if (!area) return;
    setLoading(true);
    try {
      const seg = [
        { index: 0, startLat: area.lat || 33.86, startLng: area.lng || 130.79, endLat: area.lat || 33.86, endLng: area.lng || 130.80 },
        { index: 1, startLat: area.lat || 33.86, startLng: area.lng || 130.80, endLat: area.lat || 33.87, endLng: area.lng || 130.79 },
        { index: 2, startLat: area.lat || 33.87, startLng: area.lng || 130.79, endLat: area.lat || 33.86, endLng: area.lng || 130.79 },
      ];
      const res = await fetch("/api/parking/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ segments: seg }),
      });
      const data = await res.json();
      setParkingSuggestions(data.suggestions || []);
    } catch {
      setParkingSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  // Step 4: Generate route segments
  const generateSegments = async () => {
    setLoading(true);
    try {
      const households = area?.total_households || 200;
      setSegments([
        { index: 0, distanceM: 800, households: Math.round(households * 0.35), estimatedMinutes: 16 },
        { index: 1, distanceM: 750, households: Math.round(households * 0.35), estimatedMinutes: 15 },
        { index: 2, distanceM: 700, households: Math.round(households * 0.30), estimatedMinutes: 14 },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Step 5: Start
  const handleStart = async () => {
    setLoading(true);
    try {
      const targetCount = manualCount || flyerCalc?.recommendedCount || area?.total_households || 200;

      await supabase
        .from("tasks")
        .update({
          status: "in_progress",
          target_count: targetCount,
          started_at: new Date().toISOString(),
          total_segments: segments.length || 3,
          current_segment: 0,
        })
        .eq("id", taskId);

      router.push(`/staff/tasks/${taskId}`);
    } catch {
      alert("開始に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (step === 1 && !flyerCalc) calcFlyers();
    if (step === 2 && parkingSuggestions.length === 0) suggestParking();
    if (step === 3 && segments.length === 0) generateSegments();
  }, [step]);

  if (!task || !area) {
    return <div className="p-4 text-gray-400 text-center">読み込み中...</div>;
  }

  const areaName = `${area.ward || area.city}${area.district}${area.chome}`;

  return (
    <div className="p-4 max-w-lg mx-auto">
      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-500 mb-2">
          <span>ステップ {step + 1}/{STEPS.length}</span>
          <span>{STEPS[step]}</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <Card>
        <CardHeader><CardTitle>{STEPS[step]}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {/* Step 1: Area confirmation */}
          {step === 0 && (
            <div className="space-y-3">
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <p className="text-lg font-bold">{areaName}</p>
                <p className="text-sm text-gray-500">世帯数: {area.total_households}世帯</p>
                <p className="text-sm text-gray-500">都道府県: {area.prefecture}</p>
              </div>
              {area.lat && (
                <DeliveryMap
                  center={{ lat: area.lat, lng: area.lng }}
                  zoom={16}
                  className="w-full h-[250px] rounded-lg"
                />
              )}
            </div>
          )}

          {/* Step 2: AI flyer recommendation */}
          {step === 1 && (
            <div className="space-y-3">
              {flyerCalc ? (
                <>
                  <div className="text-center bg-blue-50 rounded-lg p-6">
                    <p className="text-sm text-gray-500 mb-1">AI推奨枚数</p>
                    <p className="text-5xl font-bold text-blue-600">
                      {flyerCalc.recommendedCount}
                    </p>
                    <p className="text-sm text-blue-600 mt-1">枚</p>
                  </div>
                  <p className="text-sm text-gray-600">{flyerCalc.reasoning}</p>
                  <div className="text-xs text-gray-400">
                    基本: {flyerCalc.baseCount}枚 + 予備: {flyerCalc.bufferCount}枚
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">手動で変更</p>
                    <Input
                      type="number"
                      min={1}
                      value={manualCount || ""}
                      onChange={(e) => setManualCount(parseInt(e.target.value) || null)}
                    />
                  </div>
                </>
              ) : (
                <p className="text-center text-gray-400 py-8">計算中...</p>
              )}
            </div>
          )}

          {/* Step 3: Parking suggestions */}
          {step === 2 && (
            <div className="space-y-3">
              {parkingSuggestions.length > 0 ? (
                parkingSuggestions.map((ps, i) => (
                  <div key={i} className="bg-gray-50 rounded-lg p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm">セグメント {ps.segmentIndex + 1}</p>
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${ps.lat},${ps.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 underline"
                      >
                        地図で開く
                      </a>
                    </div>
                    <p className="text-sm">{ps.name}</p>
                    <p className="text-xs text-gray-500">{ps.reason}</p>
                  </div>
                ))
              ) : loading ? (
                <p className="text-center text-gray-400 py-8">検索中...</p>
              ) : (
                <p className="text-center text-gray-400 py-8">駐輪場所が見つかりませんでした</p>
              )}
              {area.lat && (
                <DeliveryMap
                  center={{ lat: area.lat, lng: area.lng }}
                  zoom={15}
                  className="w-full h-[200px] rounded-lg"
                  waypoints={parkingSuggestions.map((ps) => ({
                    lat: ps.lat,
                    lng: ps.lng,
                    label: `P${ps.segmentIndex + 1}`,
                    status: "unvisited" as const,
                  }))}
                />
              )}
            </div>
          )}

          {/* Step 4: Route segments */}
          {step === 3 && (
            <div className="space-y-3">
              {segments.map((seg, i) => {
                const colors = ["border-red-300 bg-red-50", "border-yellow-300 bg-yellow-50", "border-blue-300 bg-blue-50"];
                return (
                  <div key={i} className={`rounded-lg p-3 border ${colors[i % 3]}`}>
                    <p className="font-medium text-sm">セグメント {seg.index + 1}</p>
                    <div className="grid grid-cols-3 gap-2 text-xs text-gray-600 mt-1">
                      <div>
                        <p className="font-bold">{seg.households}</p>
                        <p>世帯</p>
                      </div>
                      <div>
                        <p className="font-bold">{seg.estimatedMinutes}分</p>
                        <p>推定時間</p>
                      </div>
                      <div>
                        <p className="font-bold">
                          {Math.round((manualCount || flyerCalc?.recommendedCount || area.total_households) * (seg.households / area.total_households))}
                        </p>
                        <p>持参枚数</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Step 5: Departure confirmation */}
          {step === 4 && (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-500">エリア</span>
                <span className="font-medium">{areaName}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-500">持参枚数</span>
                <span className="font-medium">{manualCount || flyerCalc?.recommendedCount || area.total_households}枚</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-500">セグメント数</span>
                <span className="font-medium">{segments.length || 3}</span>
              </div>
              {parkingSuggestions[0] && (
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${parkingSuggestions[0].lat},${parkingSuggestions[0].lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-center text-blue-600 underline py-2"
                >
                  Googleマップで最初の駐輪場所を開く
                </a>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between mt-4">
        <Button variant="outline" onClick={() => setStep(step - 1)} disabled={step === 0}>
          戻る
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep(step + 1)} disabled={loading}>
            次へ
          </Button>
        ) : (
          <Button onClick={handleStart} disabled={loading} className="bg-green-600 hover:bg-green-700">
            {loading ? "開始中..." : "出発する！"}
          </Button>
        )}
      </div>
    </div>
  );
}
