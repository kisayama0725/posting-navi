"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface TrendData {
  month: string;
  reachRate: number;
  responseRate: number;
  areaScore: number;
}

interface PerformanceTrendChartProps {
  data: TrendData[];
}

export function PerformanceTrendChart({ data }: PerformanceTrendChartProps) {
  if (data.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-8">データがありません</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="reachRate" name="リーチ率" stroke="#3B82F6" strokeWidth={2} />
        <Line type="monotone" dataKey="responseRate" name="反応率" stroke="#10B981" strokeWidth={2} />
        <Line type="monotone" dataKey="areaScore" name="スコア" stroke="#F59E0B" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  );
}
