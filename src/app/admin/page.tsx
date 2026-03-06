"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const AdminMap = dynamic(() => import("@/components/map/AdminMap"), { ssr: false });

interface StaffTask {
  id: string;
  staffId: string;
  staffName: string;
  areaName: string;
  status: string;
  deliveredCount: number;
  targetCount: number;
  currentSegment: number;
  totalSegments: number;
  startedAt: string | null;
  latestGps: { lat: number; lng: number } | null;
  gpsPath: { lat: number; lng: number; speed_m_per_min: number }[];
  speedMPerMin: number;
  minutesSinceLastGps: number;
}

export default function AdminDashboard() {
  const supabase = createClient();
  const [tasks, setTasks] = useState<StaffTask[]>([]);

  const loadTasks = async () => {
    const { data: activeTasks } = await supabase
      .from("tasks")
      .select("*, areas(prefecture, city, ward, district, chome), profiles!tasks_staff_id_fkey(name)")
      .in("status", ["in_progress", "paused"])
      .order("started_at", { ascending: false });

    if (!activeTasks) return;

    const enriched: StaffTask[] = await Promise.all(
      activeTasks.map(async (t: any) => {
        const { data: gps } = await supabase
          .from("gps_tracks")
          .select("lat, lng, speed_m_per_min, recorded_at")
          .eq("task_id", t.id)
          .order("recorded_at", { ascending: true });

        const area = Array.isArray(t.areas) ? t.areas[0] : t.areas;
        const profile = Array.isArray(t.profiles) ? t.profiles[0] : t.profiles;
        const latestGps = gps && gps.length > 0 ? gps[gps.length - 1] : null;
        const minutesSinceLastGps = latestGps
          ? (Date.now() - new Date(latestGps.recorded_at).getTime()) / 60000
          : 999;

        return {
          id: t.id,
          staffId: t.staff_id,
          staffName: profile?.name || "不明",
          areaName: area
            ? `${area.ward || area.city}${area.district}${area.chome}`
            : "",
          status: t.status,
          deliveredCount: t.delivered_count,
          targetCount: t.target_count,
          currentSegment: t.current_segment,
          totalSegments: t.total_segments,
          startedAt: t.started_at,
          latestGps: latestGps ? { lat: latestGps.lat, lng: latestGps.lng } : null,
          gpsPath: gps || [],
          speedMPerMin: latestGps?.speed_m_per_min || 0,
          minutesSinceLastGps,
        };
      })
    );

    setTasks(enriched);
  };

  const sendPhotoCommand = async (staffId: string, taskId: string) => {
    await supabase.from("admin_commands").insert({
      staff_id: staffId,
      task_id: taskId,
      command: "take_photo",
    });
    alert("撮影指示を送信しました");
  };

  useEffect(() => {
    loadTasks();

    const channel = supabase
      .channel("admin-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => loadTasks())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "gps_tracks" }, () => loadTasks())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const elapsedStr = (startedAt: string | null) => {
    if (!startedAt) return "--:--";
    const diff = Date.now() - new Date(startedAt).getTime();
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return `${h}h${m.toString().padStart(2, "0")}m`;
  };

  const staffPositions = tasks
    .filter((t) => t.latestGps)
    .map((t) => ({
      staffId: t.staffId,
      name: t.staffName,
      lat: t.latestGps!.lat,
      lng: t.latestGps!.lng,
      gpsPath: t.gpsPath,
    }));

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">管理者ダッシュボード</h2>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="py-3 text-center">
            <p className="text-2xl font-bold text-green-600">
              {tasks.filter((t) => t.status === "in_progress").length}
            </p>
            <p className="text-xs text-gray-500">配布中</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 text-center">
            <p className="text-2xl font-bold text-blue-600">
              {tasks.reduce((s, t) => s + t.deliveredCount, 0)}
            </p>
            <p className="text-xs text-gray-500">合計配布枚数</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 text-center">
            <p className="text-2xl font-bold text-orange-600">
              {tasks.filter((t) => t.minutesSinceLastGps > 30).length}
            </p>
            <p className="text-xs text-gray-500">30分以上停止</p>
          </CardContent>
        </Card>
      </div>

      {/* Map */}
      {staffPositions.length > 0 && (
        <Card>
          <CardHeader><CardTitle>スタッフ位置マップ</CardTitle></CardHeader>
          <CardContent>
            <AdminMap staffPositions={staffPositions} className="w-full h-[350px] rounded-lg" />
          </CardContent>
        </Card>
      )}

      {/* Staff cards */}
      <div className="space-y-3">
        {tasks.map((t) => (
          <Card
            key={t.id}
            className={t.minutesSinceLastGps > 30 ? "border-red-300 bg-red-50" : ""}
          >
            <CardContent className="py-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-bold">{t.staffName}</p>
                  <p className="text-xs text-gray-500">{t.areaName}</p>
                </div>
                <div className="text-right">
                  <Badge
                    className={
                      t.status === "in_progress"
                        ? "bg-green-100 text-green-800"
                        : "bg-orange-100 text-orange-800"
                    }
                  >
                    {t.status === "in_progress" ? "配布中" : "中断中"}
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div>
                  <p className="font-bold">{t.deliveredCount}/{t.targetCount}</p>
                  <p className="text-gray-400">枚数</p>
                </div>
                <div>
                  <p className="font-bold">
                    Seg {t.currentSegment + 1}/{t.totalSegments}
                  </p>
                  <p className="text-gray-400">セグメント</p>
                </div>
                <div>
                  <p className="font-bold">{elapsedStr(t.startedAt)}</p>
                  <p className="text-gray-400">経過</p>
                </div>
                <div>
                  <p className="font-bold">{t.speedMPerMin.toFixed(0)}m/分</p>
                  <p className="text-gray-400">分速</p>
                </div>
              </div>
              <div className="mt-2 flex justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => sendPhotoCommand(t.staffId, t.id)}
                >
                  📸 撮影指示
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {tasks.length === 0 && (
          <p className="text-gray-400 text-sm text-center py-8">
            現在アクティブなタスクはありません
          </p>
        )}
      </div>
    </div>
  );
}
