"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Staff {
  id: string;
  name: string;
  email: string | null;
  taskCount: number;
  activeTask: boolean;
}

export default function StaffListPage() {
  const supabase = createClient();
  const [staffList, setStaffList] = useState<Staff[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, email")
        .eq("role", "staff");

      if (!profiles) return;

      const enriched: Staff[] = await Promise.all(
        profiles.map(async (p) => {
          const { count: taskCount } = await supabase
            .from("tasks")
            .select("*", { count: "exact", head: true })
            .eq("staff_id", p.id);

          const { data: active } = await supabase
            .from("tasks")
            .select("id")
            .eq("staff_id", p.id)
            .eq("status", "in_progress")
            .limit(1);

          return {
            id: p.id,
            name: p.name || "未設定",
            email: p.email,
            taskCount: taskCount || 0,
            activeTask: (active?.length || 0) > 0,
          };
        })
      );

      setStaffList(enriched);
    };
    load();
  }, []);

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">スタッフ一覧</h2>

      <div className="space-y-2">
        {staffList.map((s) => (
          <Card key={s.id}>
            <CardContent className="py-3 flex items-center justify-between">
              <div>
                <p className="font-medium">{s.name}</p>
                <p className="text-xs text-gray-500">
                  {s.email || "メール未設定"} / タスク {s.taskCount}件
                </p>
              </div>
              <div className="flex items-center gap-2">
                {s.activeTask && (
                  <Badge className="bg-green-100 text-green-800">配布中</Badge>
                )}
                <Link href={`/admin/staff/${s.id}/report`}>
                  <Button variant="outline" size="sm">成績</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
        {staffList.length === 0 && (
          <p className="text-gray-400 text-sm text-center py-8">スタッフが登録されていません</p>
        )}
      </div>
    </div>
  );
}
