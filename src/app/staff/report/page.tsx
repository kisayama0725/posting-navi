"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/reports/MetricCard";
import { AIFeedbackCard } from "@/components/reports/AIFeedbackCard";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function StaffReportPage() {
  const supabase = createClient();
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [userId, setUserId] = useState<string | null>(null);
  const [perf, setPerf] = useState<any>(null);
  const [prevPerf, setPrevPerf] = useState<any>(null);
  const [teamAvg, setTeamAvg] = useState<any>(null);
  const [feedback, setFeedback] = useState<any>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
    };
    getUser();
  }, []);

  useEffect(() => {
    if (!userId) return;

    const load = async () => {
      const [perfRes, teamRes] = await Promise.all([
        fetch(`/api/staff/${userId}/performance?month=${month}`),
        fetch(`/api/team/performance?month=${month}`),
      ]);

      const perfData = await perfRes.json();
      const teamData = await teamRes.json();
      setPerf(perfData);
      setTeamAvg(teamData.averages);

      // Previous month
      const prevMonth = new Date(month + "-01");
      prevMonth.setMonth(prevMonth.getMonth() - 1);
      const prevMonthStr = prevMonth.toISOString().slice(0, 7);
      const prevRes = await fetch(`/api/staff/${userId}/performance?month=${prevMonthStr}`);
      setPrevPerf(await prevRes.json());

      // Load existing feedback
      const { data: fb } = await supabase
        .from("ai_feedbacks")
        .select("*")
        .eq("staff_id", userId)
        .eq("month", month)
        .single();
      if (fb) setFeedback(fb);
    };
    load();
  }, [userId, month]);

  if (!perf) return <div className="p-4 text-gray-400 text-center">読み込み中...</div>;

  const diff = (current: number, prev: number | undefined) =>
    prev !== undefined ? current - prev : undefined;

  // Area score chart data
  const areaScoreData =
    perf.tasks?.map((t: any) => ({
      name: `${t.areas?.district || ""}${t.areas?.chome || ""}`,
      score: Math.min(100, Math.round(
        (t.delivered_count / Math.max(t.areas?.total_households || 1, 1)) * 100 * 0.5 + 50
      )),
    })) || [];

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">自分の成績</h2>
        <div>
          <Label className="sr-only">月</Label>
          <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-40" />
        </div>
      </div>

      {/* Total score */}
      <Card className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
        <CardContent className="py-6 text-center">
          <p className="text-sm opacity-80">今月の総合スコア</p>
          <p className="text-6xl font-bold my-2">{perf.areaScore || 0}</p>
          <p className="text-sm opacity-80">/ 100点</p>
          {prevPerf?.areaScore !== undefined && (
            <p className="text-sm mt-2">
              先月比: {perf.areaScore - prevPerf.areaScore >= 0 ? "+" : ""}
              {(perf.areaScore - prevPerf.areaScore).toFixed(0)}点
            </p>
          )}
        </CardContent>
      </Card>

      {/* 5 metrics */}
      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          label="リーチ率"
          value={perf.reachRate?.toFixed(1)}
          unit="%"
          diff={diff(perf.reachRate, prevPerf?.reachRate)}
          teamAvg={teamAvg?.reachRate?.toFixed(1) + "%"}
        />
        <MetricCard
          label="反応率"
          value={perf.responseRate?.toFixed(2)}
          unit="%"
          diff={diff(perf.responseRate, prevPerf?.responseRate)}
          teamAvg={teamAvg?.responseRate?.toFixed(2) + "%"}
        />
        <MetricCard
          label="売上貢献率"
          value={perf.salesContribution?.toFixed(1)}
          unit="%"
          diff={diff(perf.salesContribution, prevPerf?.salesContribution)}
        />
        <MetricCard
          label="配布効率"
          value={perf.deliveryEfficiency?.toFixed(1)}
          unit="枚/分"
          diff={diff(perf.deliveryEfficiency, prevPerf?.deliveryEfficiency)}
          teamAvg={teamAvg?.deliveryEfficiency?.toFixed(1)}
        />
      </div>

      {/* Area score chart */}
      {areaScoreData.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">エリア別スコア</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={areaScoreData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="score" fill="#3B82F6" name="スコア" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* AI feedback */}
      {feedback ? (
        <AIFeedbackCard
          feedback={feedback.feedback}
          strengths={feedback.strengths || []}
          improvements={feedback.improvements || []}
        />
      ) : (
        <p className="text-gray-400 text-sm text-center py-4">
          AIフィードバックはまだ生成されていません
        </p>
      )}
    </div>
  );
}
