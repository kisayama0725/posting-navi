"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PlaceAutocomplete } from "@/components/maps/place-autocomplete";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StaffOption {
  id: string;
  name: string;
}

export default function NewTaskPage() {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [staffList, setStaffList] = useState<StaffOption[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<string[]>([]);
  const [totalHouseholds, setTotalHouseholds] = useState(200);
  const [routeEstimate, setRouteEstimate] = useState<string | null>(null);

  // Address from Places Autocomplete
  const [address, setAddress] = useState({
    formatted: "",
    prefecture: "",
    city: "",
    ward: "",
    district: "",
    chome: "",
    lat: 0,
    lng: 0,
    placeId: "",
  });

  useEffect(() => {
    const loadStaff = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, name")
        .eq("role", "staff");
      if (data) setStaffList(data);
    };
    loadStaff();
  }, []);

  const handlePlaceSelect = (place: { address: string; lat: number; lng: number; placeId: string }) => {
    // Parse address components from formatted address (Japanese format)
    const parts = place.address.replace(/日本、〒[\d-]+\s*/, "").split(/[　\s]/);
    let prefecture = "";
    let city = "";
    let ward = "";
    let district = "";
    let chome = "";

    // Simple parsing - extract prefecture and remaining parts
    const fullAddr = parts.join("");
    const prefectures = ["北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県", "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県", "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県", "岐阜県", "静岡県", "愛知県", "三重県", "滋賀県", "京都府", "大阪府", "兵庫県", "奈良県", "和歌山県", "鳥取県", "島根県", "岡山県", "広島県", "山口県", "徳島県", "香川県", "愛媛県", "高知県", "福岡県", "佐賀県", "長崎県", "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県"];

    for (const pref of prefectures) {
      if (fullAddr.startsWith(pref)) {
        prefecture = pref;
        const rest = fullAddr.slice(pref.length);
        // Extract city (ends with 市 or 郡)
        const cityMatch = rest.match(/^(.+?[市郡])/);
        if (cityMatch) {
          city = cityMatch[1];
          const afterCity = rest.slice(city.length);
          // Extract ward (ends with 区)
          const wardMatch = afterCity.match(/^(.+?区)/);
          if (wardMatch) {
            ward = wardMatch[1];
            const afterWard = afterCity.slice(ward.length);
            const distMatch = afterWard.match(/^(.+?\d*丁目?)/);
            if (distMatch) {
              const fullDist = distMatch[1];
              const chomeMatch = fullDist.match(/(\d+丁目?)$/);
              if (chomeMatch) {
                chome = chomeMatch[1];
                district = fullDist.slice(0, -chome.length);
              } else {
                district = fullDist;
              }
            } else {
              district = afterWard;
            }
          } else {
            const distMatch = afterCity.match(/^(.+?\d*丁目?)/);
            if (distMatch) {
              const fullDist = distMatch[1];
              const chomeMatch = fullDist.match(/(\d+丁目?)$/);
              if (chomeMatch) {
                chome = chomeMatch[1];
                district = fullDist.slice(0, -chome.length);
              } else {
                district = fullDist;
              }
            } else {
              district = afterCity;
            }
          }
        }
        break;
      }
    }

    setAddress({
      formatted: place.address,
      prefecture,
      city,
      ward,
      district,
      chome,
      lat: place.lat,
      lng: place.lng,
      placeId: place.placeId,
    });
  };

  const toggleStaff = (id: string) => {
    setSelectedStaff((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleOptimizeRoute = async () => {
    if (!address.lat) return;
    try {
      const res = await fetch("/api/route/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin: { lat: address.lat, lng: address.lng },
          destination: { lat: address.lat, lng: address.lng },
          waypoints: [],
        }),
      });
      const data = await res.json();
      if (data.routes?.[0]) {
        const dur = data.routes[0].duration;
        const secs = parseInt(dur.replace("s", ""));
        setRouteEstimate(`推定所要時間: ${Math.round(secs / 60)}分`);
      }
    } catch {
      setRouteEstimate("ルート計算に失敗しました");
    }
  };

  const handleCreate = async () => {
    if (!address.formatted || selectedStaff.length === 0) {
      alert("住所とスタッフを選択してください");
      return;
    }

    setLoading(true);
    try {
      // Create or find area
      const { data: area, error: areaErr } = await supabase
        .from("areas")
        .insert({
          prefecture: address.prefecture,
          city: address.city,
          ward: address.ward,
          district: address.district,
          chome: address.chome,
          total_households: totalHouseholds,
          lat: address.lat,
          lng: address.lng,
        })
        .select()
        .single();

      if (areaErr) throw areaErr;

      // Create tasks for each selected staff
      for (const staffId of selectedStaff) {
        const { error: taskErr } = await supabase.from("tasks").insert({
          area_id: area.id,
          staff_id: staffId,
          target_count: totalHouseholds,
          status: "pending",
        });
        if (taskErr) throw taskErr;
      }

      router.push("/admin/tasks");
    } catch (err) {
      console.error(err);
      alert("タスク作成に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4">
      <h2 className="text-xl font-bold">新規タスク作成</h2>

      {/* Address search */}
      <Card>
        <CardHeader><CardTitle className="text-base">エリア選択</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>住所検索</Label>
            <PlaceAutocomplete
              onSelect={handlePlaceSelect}
              placeholder="住所を入力..."
            />
          </div>
          {address.formatted && (
            <div className="text-sm bg-gray-50 p-3 rounded space-y-1">
              <p><span className="text-gray-500">住所:</span> {address.formatted}</p>
              <p><span className="text-gray-500">都道府県:</span> {address.prefecture}</p>
              <p><span className="text-gray-500">市:</span> {address.city}</p>
              {address.ward && <p><span className="text-gray-500">区:</span> {address.ward}</p>}
              <p><span className="text-gray-500">町域:</span> {address.district}{address.chome}</p>
            </div>
          )}
          <div>
            <Label htmlFor="households">世帯数</Label>
            <Input
              id="households"
              type="number"
              min={1}
              value={totalHouseholds}
              onChange={(e) => setTotalHouseholds(parseInt(e.target.value) || 0)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Staff selection */}
      <Card>
        <CardHeader><CardTitle className="text-base">スタッフ選択</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {staffList.map((s) => (
              <label
                key={s.id}
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer border ${
                  selectedStaff.includes(s.id)
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedStaff.includes(s.id)}
                  onChange={() => toggleStaff(s.id)}
                  className="w-5 h-5"
                />
                <span>{s.name || s.id.slice(0, 8)}</span>
              </label>
            ))}
            {staffList.length === 0 && (
              <p className="text-gray-400 text-sm">スタッフが登録されていません</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Route optimization */}
      {address.lat > 0 && (
        <Card>
          <CardContent className="py-4 space-y-2">
            <Button variant="outline" className="w-full" onClick={handleOptimizeRoute}>
              AIルート生成
            </Button>
            {routeEstimate && <p className="text-sm text-center text-gray-600">{routeEstimate}</p>}
          </CardContent>
        </Card>
      )}

      {/* Create */}
      <Button
        className="w-full h-14 text-lg"
        onClick={handleCreate}
        disabled={loading || !address.formatted || selectedStaff.length === 0}
      >
        {loading ? "作成中..." : "タスク作成"}
      </Button>
    </div>
  );
}
