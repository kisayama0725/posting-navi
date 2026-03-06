"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/reports/MetricCard";
import { PerformanceTrendChart } from "@/components/reports/PerformanceTrendChart";
import { AIFeedbackCard } from "@/components/reports/AIFeedbackCard";

export default function StaffReportPage() {
  const params = useParams();
  const staffId = params.id as string;
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [perf, setPerf] = useState<any>(null);
  const [prevPerf, setPrevPerf] = useState<any>(null);
  const [teamAvg, setTeamAvg] = useState<any>(null);
  const [feedback, setFeedback] = useState<any>(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  const loadData = async () => {
    const [perfRes, teamRes] = await Promise.all([
      fetch(`/api/staff/${staffId}/performance?month=${month}`),
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
    const prevRes = await fetch(`/api/staff/${staffId}/performance?month=${prevMonthStr}`);
    const prevData = await prevRes.json();
    setPrevPerf(prevData);
  };

  useEffect(() => {
    loadData();
  }, [month, staffId]);

  const generateFeedback = async () => {
    if (!perf || !teamAvg) return;
    setFeedbackLoading(true);
    try {
      const res = await fetch(`/api/staff/${staffId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month,
          metrics: {
            reachRate: perf.reachRate,
            responseRate: perf.responseRate,
            salesContribution: perf.salesContribution,
            deliveryEfficiency: perf.deliveryEfficiency,
            areaScore: perf.areaScore,
          },
          prevMetrics: prevPerf
            ? {
                reachRate: prevPerf.reachRate,
                responseRate: prevPerf.responseRate,
                salesContribution: prevPerf.salesContribution,
                deliveryEfficiency: prevPerf.deliveryEfficiency,
                areaScore: prevPerf.areaScore,
              }
            : null,
          teamAvg,
        }),
      });
      const data = await res.json();
      setFeedback(data);
    } catch {
      setFeedback({ feedback: "生成に失敗しました", strengths: [], improvements: [] });
    } finally {
      setFeedbackLoading(false);
    }
  };

  if (!perf) return <div className="p-4 text-gray-400">読み込み中...</div>;

  const diff = (current: number, prev: number | undefined) =>
    prev !== undefined ? current - prev : undefined;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">スタッフ振り返り</h2>
        <div>
          <Label className="sr-only">月</Label>
          <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-40" />
        </div>
      </div>

      {/* 5 Metric Cards */}
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
          teamAvg={teamAvg?.salesContribution?.toFixed(1) + "%"}
        />
        <MetricCard
          label="配布効率"
          value={perf.deliveryEfficiency?.toFixed(1)}
          unit="枚/分"
          diff={diff(perf.deliveryEfficiency, prevPerf?.deliveryEfficiency)}
          teamAvg={teamAvg?.deliveryEfficiency?.toFixed(1)}
        />
        <MetricCard
          label="エリアスコア"
          value={perf.areaScore?.toFixed(0)}
          unit="点"
          diff={diff(perf.areaScore, prevPerf?.areaScore)}
          teamAvg={teamAvg?.areaScore?.toFixed(0) + "点"}
        />
      </div>

      {/* Area breakdown */}
      {perf.tasks?.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">エリア別内訳</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {perf.tasks.map((t: any) => (
                <div key={t.id} className="flex justify-between py-1 border-b last:border-0 text-sm">
                  <span>{t.areas?.district || "不明"}{t.areas?.chome || ""}</span>
                  <span>{t.delivered_count}枚</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Trend chart placeholder */}
      <Card>
        <CardHeader><CardTitle className="text-base">月次推移</CardTitle></CardHeader>
        <CardContent>
          <PerformanceTrendChart
            data={
              prevPerf
                ? [
                    {
                      month: prevPerf.month || "先月",
                      reachRate: prevPerf.reachRate || 0,
                      responseRate: (prevPerf.responseRate || 0) * 100,
                      areaScore: prevPerf.areaScore || 0,
                    },
                    {
                      month: perf.month || "今月",
                      reachRate: perf.reachRate || 0,
                      responseRate: (perf.responseRate || 0) * 100,
                      areaScore: perf.areaScore || 0,
                    },
                  ]
                : []
            }
          />
        </CardContent>
      </Card>

      {/* AI Feedback */}
      {feedback ? (
        <AIFeedbackCard
          feedback={feedback.feedback}
          strengths={feedback.strengths}
          improvements={feedback.improvements}
        />
      ) : (
        <Button onClick={generateFeedback} disabled={feedbackLoading} className="w-full">
          {feedbackLoading ? "AI分析中..." : "AIフィードバックを生成"}
        </Button>
      )}
    </div>
  );
}
