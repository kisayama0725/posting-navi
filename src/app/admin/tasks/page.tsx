"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface TaskRow {
  id: string;
  status: string;
  delivered_count: number;
  target_count: number;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  staffName: string;
  areaName: string;
}

const statusLabel: Record<string, string> = {
  pending: "未着手",
  in_progress: "配布中",
  paused: "中断中",
  completed: "完了",
};

const statusColor: Record<string, string> = {
  pending: "bg-gray-100 text-gray-800",
  in_progress: "bg-green-100 text-green-800",
  paused: "bg-orange-100 text-orange-800",
  completed: "bg-blue-100 text-blue-800",
};

export default function TasksPage() {
  const supabase = createClient();
  const [tasks, setTasks] = useState<TaskRow[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("tasks")
        .select("*, areas(prefecture, city, ward, district, chome), profiles!tasks_staff_id_fkey(name)")
        .order("created_at", { ascending: false })
        .limit(50);

      if (data) {
        setTasks(
          data.map((t: any) => {
            const area = Array.isArray(t.areas) ? t.areas[0] : t.areas;
            const profile = Array.isArray(t.profiles) ? t.profiles[0] : t.profiles;
            return {
              id: t.id,
              status: t.status,
              delivered_count: t.delivered_count,
              target_count: t.target_count,
              created_at: t.created_at,
              started_at: t.started_at,
              completed_at: t.completed_at,
              staffName: profile?.name || "未割当",
              areaName: area
                ? `${area.prefecture}${area.city}${area.ward}${area.district}${area.chome}`
                : "",
            };
          })
        );
      }
    };
    load();
  }, []);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">タスク一覧</h2>
        <Link href="/admin/tasks/new">
          <Button>+ 新規タスク</Button>
        </Link>
      </div>

      <div className="space-y-2">
        {tasks.map((t) => (
          <Card key={t.id}>
            <CardContent className="py-3 flex items-center justify-between">
              <div>
                <p className="font-medium">{t.areaName}</p>
                <p className="text-xs text-gray-500">
                  {t.staffName} / {new Date(t.created_at).toLocaleDateString("ja-JP")}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm">
                  {t.delivered_count}/{t.target_count}枚
                </span>
                <Badge className={statusColor[t.status]}>
                  {statusLabel[t.status]}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
        {tasks.length === 0 && (
          <p className="text-gray-400 text-sm text-center py-8">
            タスクがありません
          </p>
        )}
      </div>
    </div>
  );
}
