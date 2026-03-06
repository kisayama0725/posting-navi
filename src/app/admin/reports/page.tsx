"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function ReportsPage() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/team/performance?month=${month}`);
      const json = await res.json();
      setData(json);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [month]);

  const areaResponseData =
    data?.staff?.map((s: any) => ({
      name: s.name || "不明",
      responseRate: parseFloat(s.responseRate?.toFixed(2) || "0"),
      reachRate: parseFloat(s.reachRate?.toFixed(1) || "0"),
    })) || [];

  const staffScoreData =
    data?.staff
      ?.map((s: any) => ({
        name: s.name || "不明",
        score: s.areaScore || 0,
      }))
      .sort((a: any, b: any) => b.score - a.score) || [];

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">月次レポート</h2>
        <div>
          <Label className="sr-only">月選択</Label>
          <Input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="w-40"
          />
        </div>
      </div>

      {loading && <p className="text-gray-400 text-center py-8">読み込み中...</p>}

      {data && !loading && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="py-3 text-center">
                <p className="text-2xl font-bold">{data.totalDelivered?.toLocaleString() || 0}</p>
                <p className="text-xs text-gray-500">総配布枚数</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-3 text-center">
                <p className="text-2xl font-bold">¥{data.teamTotalSales?.toLocaleString() || 0}</p>
                <p className="text-xs text-gray-500">総売上</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-3 text-center">
                <p className="text-2xl font-bold">{data.averages?.responseRate?.toFixed(2) || 0}%</p>
                <p className="text-xs text-gray-500">平均反響率</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-3 text-center">
                <p className="text-2xl font-bold">{data.averages?.deliveryEfficiency?.toFixed(1) || 0}</p>
                <p className="text-xs text-gray-500">平均配布効率(枚/分)</p>
              </CardContent>
            </Card>
          </div>

          {/* Response rate chart */}
          <Card>
            <CardHeader><CardTitle className="text-base">スタッフ別反響率</CardTitle></CardHeader>
            <CardContent>
              {areaResponseData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={areaResponseData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={60} />
                    <Tooltip />
                    <Bar dataKey="responseRate" fill="#3B82F6" name="反響率(%)" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-400 text-sm text-center py-4">データなし</p>
              )}
            </CardContent>
          </Card>

          {/* Staff score ranking */}
          <Card>
            <CardHeader><CardTitle className="text-base">スタッフ効率スコアランキング</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {staffScoreData.map((s: any, i: number) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-gray-400 w-6">{i + 1}</span>
                      <span className="font-medium">{s.name}</span>
                    </div>
                    <span className="text-lg font-bold">{s.score}点</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
