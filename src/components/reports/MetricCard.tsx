interface MetricCardProps {
  label: string;
  value: string;
  unit?: string;
  diff?: number;
  teamAvg?: string;
}

export function MetricCard({ label, value, unit, diff, teamAvg }: MetricCardProps) {
  return (
    <div className="bg-white rounded-lg border p-4 space-y-1">
      <p className="text-sm text-gray-500">{label}</p>
      <div className="flex items-end gap-1">
        <span className="text-2xl font-bold">{value}</span>
        {unit && <span className="text-sm text-gray-400 mb-1">{unit}</span>}
      </div>
      <div className="flex items-center gap-3 text-xs">
        {diff !== undefined && (
          <span className={diff >= 0 ? "text-green-600" : "text-red-600"}>
            {diff >= 0 ? "+" : ""}{diff.toFixed(1)}%
          </span>
        )}
        {teamAvg && (
          <span className="text-gray-400">チーム平均: {teamAvg}</span>
        )}
      </div>
    </div>
  );
}
