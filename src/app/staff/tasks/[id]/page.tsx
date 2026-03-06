"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { DeliveryCounter } from "@/components/counter/DeliveryCounter";
import { useElapsedTime } from "@/components/timer/ElapsedTimer";

const DeliveryMap = dynamic(() => import("@/components/map/DeliveryMap"), { ssr: false });

interface GpsPoint {
  lat: number;
  lng: number;
}

export default function TaskDeliveryPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params.id as string;
  const supabase = createClient();

  const [task, setTask] = useState<any>(null);
  const [area, setArea] = useState<any>(null);
  const [count, setCount] = useState(0);
  const [gpsPath, setGpsPath] = useState<GpsPoint[]>([]);
  const [currentPos, setCurrentPos] = useState<GpsPoint | null>(null);
  const [showSegmentModal, setShowSegmentModal] = useState(false);

  const watchIdRef = useRef<number | null>(null);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const photoTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastGpsSaveRef = useRef<number>(0);
  const prevPosRef = useRef<GpsPoint | null>(null);

  const elapsedTime = useElapsedTime(task?.started_at, task?.paused_at);

  // Load task
  useEffect(() => {
    const load = async () => {
      const { data: t } = await supabase
        .from("tasks")
        .select("*, areas(*)")
        .eq("id", taskId)
        .single();
      if (t) {
        setTask(t);
        setCount(t.delivered_count || 0);
        const a = Array.isArray(t.areas) ? t.areas[0] : t.areas;
        setArea(a);
      }

      // Load GPS history
      const { data: gps } = await supabase
        .from("gps_tracks")
        .select("lat, lng")
        .eq("task_id", taskId)
        .order("recorded_at", { ascending: true });
      if (gps) setGpsPath(gps);
    };
    load();
  }, [taskId]);

  // GPS tracking - save every 30 seconds
  useEffect(() => {
    if (!navigator.geolocation || task?.status !== "in_progress") return;

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const point = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCurrentPos(point);
        setGpsPath((prev) => [...prev, point]);

        const now = Date.now();
        if (now - lastGpsSaveRef.current >= 30000) {
          lastGpsSaveRef.current = now;

          // Calculate speed (m/min)
          let speedMPerMin = 0;
          if (prevPosRef.current) {
            const R = 6371000;
            const dLat = ((point.lat - prevPosRef.current.lat) * Math.PI) / 180;
            const dLng = ((point.lng - prevPosRef.current.lng) * Math.PI) / 180;
            const a =
              Math.sin(dLat / 2) ** 2 +
              Math.cos((prevPosRef.current.lat * Math.PI) / 180) *
                Math.cos((point.lat * Math.PI) / 180) *
                Math.sin(dLng / 2) ** 2;
            const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            speedMPerMin = (dist / 30) * 60; // 30 seconds interval
          }
          prevPosRef.current = point;

          supabase.from("gps_tracks").insert({
            task_id: taskId,
            lat: point.lat,
            lng: point.lng,
            speed_m_per_min: speedMPerMin,
          });
        }
      },
      (err) => console.error("GPS error:", err),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [taskId, task?.status]);

  // Sync count to DB every 5 seconds
  useEffect(() => {
    if (task?.status !== "in_progress") return;

    syncIntervalRef.current = setInterval(() => {
      supabase.from("tasks").update({ delivered_count: count }).eq("id", taskId);
    }, 5000);

    return () => {
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
    };
  }, [count, taskId, task?.status]);

  // Photo timer - prompt every 30 minutes
  useEffect(() => {
    if (task?.status !== "in_progress") return;

    photoTimerRef.current = setInterval(() => {
      triggerCamera("timer");
    }, 30 * 60 * 1000);

    return () => {
      if (photoTimerRef.current) clearInterval(photoTimerRef.current);
    };
  }, [task?.status]);

  // Listen for admin commands (Realtime)
  useEffect(() => {
    if (!task) return;

    const channel = supabase
      .channel(`commands-${taskId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "admin_commands",
          filter: `staff_id=eq.${task.staff_id}`,
        },
        (payload: any) => {
          if (payload.new.command === "take_photo" && payload.new.status === "pending") {
            triggerCamera("admin");
            supabase
              .from("admin_commands")
              .update({ status: "acknowledged" })
              .eq("id", payload.new.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [task?.staff_id, taskId]);

  const triggerCamera = useCallback(
    (triggeredBy: string) => {
      const confirmed = triggeredBy === "admin"
        ? confirm("管理者から撮影指示が来ています。写真を撮影しますか？")
        : triggeredBy === "timer"
        ? confirm("30分経過しました。投函状況の写真を撮影しましょう。")
        : true;

      if (!confirmed && triggeredBy !== "manual") return;

      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.capture = "environment";
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;

        const fileName = `${taskId}/${Date.now()}.jpg`;
        const { data: uploaded } = await supabase.storage
          .from("delivery-photos")
          .upload(fileName, file);

        if (uploaded) {
          const { data: urlData } = supabase.storage
            .from("delivery-photos")
            .getPublicUrl(fileName);

          await supabase.from("delivery_photos").insert({
            task_id: taskId,
            staff_id: task.staff_id,
            photo_url: urlData.publicUrl,
            triggered_by: triggeredBy,
            lat: currentPos?.lat || null,
            lng: currentPos?.lng || null,
          });
        }
      };
      input.click();
    },
    [taskId, task?.staff_id, currentPos]
  );

  const handleCount = useCallback(
    (amount: number) => {
      setCount((prev) => Math.max(0, prev + amount));
    },
    []
  );

  const handlePause = async () => {
    if (!confirm("配布を中断しますか？")) return;

    await supabase
      .from("tasks")
      .update({
        status: "paused",
        paused_at: new Date().toISOString(),
        delivered_count: count,
        last_location: currentPos,
        resume_from_index: task.resume_from_index,
        total_distance_m: task.total_distance_m,
      })
      .eq("id", taskId);

    router.push("/staff");
  };

  const handleSegmentComplete = () => {
    setShowSegmentModal(true);
  };

  const advanceSegment = async () => {
    const nextSeg = (task.current_segment || 0) + 1;
    if (nextSeg >= (task.total_segments || 3)) {
      // All done
      await supabase
        .from("tasks")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          delivered_count: count,
          current_segment: nextSeg,
        })
        .eq("id", taskId);
      router.push("/staff");
    } else {
      await supabase
        .from("tasks")
        .update({ current_segment: nextSeg, delivered_count: count })
        .eq("id", taskId);
      setTask({ ...task, current_segment: nextSeg });
    }
    setShowSegmentModal(false);
  };

  if (!task || !area) {
    return <div className="p-4 text-gray-400 text-center">読み込み中...</div>;
  }

  const isLastSegment = (task.current_segment || 0) >= (task.total_segments || 3) - 1;

  return (
    <div className="flex flex-col h-screen">
      {/* Sticky counter header */}
      <DeliveryCounter
        count={count}
        targetCount={task.target_count}
        elapsedTime={elapsedTime}
        currentSegment={task.current_segment || 0}
        totalSegments={task.total_segments || 3}
        onCount={handleCount}
      />

      {/* Map - fills remaining space */}
      <div className="flex-1 relative">
        <DeliveryMap
          center={currentPos || (area.lat ? { lat: area.lat, lng: area.lng } : undefined)}
          zoom={16}
          className="w-full h-full"
          currentPosition={currentPos}
          gpsPath={gpsPath}
        />
      </div>

      {/* Bottom fixed footer */}
      <div className="sticky bottom-0 z-50 bg-white border-t p-3 flex gap-2">
        <Button
          variant="outline"
          className="flex-1 h-14"
          onClick={() => triggerCamera("manual")}
        >
          📸 投函写真
        </Button>
        <Button
          variant="outline"
          className="flex-1 h-14"
          onClick={handlePause}
        >
          ⏸️ 中断
        </Button>
        <Button
          className="flex-1 h-14 bg-green-600 hover:bg-green-700"
          onClick={handleSegmentComplete}
        >
          {isLastSegment ? "✅ 全完了" : "✅ セグメント完了"}
        </Button>
      </div>

      {/* Segment complete modal */}
      {showSegmentModal && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4">
            <h3 className="text-lg font-bold text-center">
              {isLastSegment
                ? "🎉 全セグメント完了！"
                : `✅ セグメント${(task.current_segment || 0) + 1}完了！`}
            </h3>
            <div className="grid grid-cols-3 gap-2 text-center text-sm">
              <div>
                <p className="font-bold">{count}枚</p>
                <p className="text-xs text-gray-500">配布枚数</p>
              </div>
              <div>
                <p className="font-bold">{elapsedTime}</p>
                <p className="text-xs text-gray-500">所要時間</p>
              </div>
              <div>
                <p className="font-bold">
                  {task.current_segment + 1}/{task.total_segments}
                </p>
                <p className="text-xs text-gray-500">セグメント</p>
              </div>
            </div>
            <Button className="w-full h-14" onClick={advanceSegment}>
              {isLastSegment ? "配布完了" : "次のセグメントへ"}
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => setShowSegmentModal(false)}>
              キャンセル
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
