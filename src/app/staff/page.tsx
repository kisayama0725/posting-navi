import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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

export default async function StaffPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: tasks } = await supabase
    .from("tasks")
    .select("*, areas(prefecture, city, ward, district, chome, total_households)")
    .eq("staff_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const activeTasks = tasks?.filter((t) => t.status === "in_progress" || t.status === "paused") || [];
  const pendingTasks = tasks?.filter((t) => t.status === "pending") || [];
  const completedTasks = tasks?.filter((t) => t.status === "completed") || [];

  const getAreaName = (t: any) => {
    const area = Array.isArray(t.areas) ? t.areas[0] : t.areas;
    if (!area) return "不明";
    return `${area.ward || area.city}${area.district}${area.chome}`;
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">今日のタスク</h2>

      {/* Active task */}
      {activeTasks.map((t) => (
        <Card key={t.id} className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-800">
              {t.status === "in_progress" ? "配布中" : "中断中"}
            </CardTitle>
            <CardDescription>{getAreaName(t)}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm">
              配布: {t.delivered_count}/{t.target_count}枚
            </p>
            <Link href={`/staff/tasks/${t.id}`}>
              <Button className="w-full h-14 text-lg">配布画面に戻る</Button>
            </Link>
          </CardContent>
        </Card>
      ))}

      {/* Pending tasks */}
      {pendingTasks.length > 0 && (
        <div>
          <h3 className="text-base font-semibold mb-2">未着手タスク</h3>
          <div className="space-y-2">
            {pendingTasks.map((t) => (
              <Card key={t.id}>
                <CardContent className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{getAreaName(t)}</p>
                    <p className="text-xs text-gray-500">
                      目標 {t.target_count}枚 / {new Date(t.created_at).toLocaleDateString("ja-JP")}
                    </p>
                  </div>
                  <Link href={`/staff/tasks/${t.id}/setup`}>
                    <Button size="sm">セットアップ</Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Completed tasks */}
      {completedTasks.length > 0 && (
        <div>
          <h3 className="text-base font-semibold mb-2">完了タスク</h3>
          <div className="space-y-2">
            {completedTasks.map((t) => (
              <Card key={t.id}>
                <CardContent className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{getAreaName(t)}</p>
                    <p className="text-xs text-gray-500">
                      {t.delivered_count}枚 / {t.completed_at ? new Date(t.completed_at).toLocaleDateString("ja-JP") : ""}
                    </p>
                  </div>
                  <Badge className={statusColor[t.status]}>
                    {statusLabel[t.status]}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {(!tasks || tasks.length === 0) && (
        <p className="text-gray-400 text-sm text-center py-8">
          タスクがありません。管理者からの割り当てをお待ちください。
        </p>
      )}
    </div>
  );
}
