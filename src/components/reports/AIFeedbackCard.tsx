interface AIFeedbackCardProps {
  feedback: string;
  strengths: string[];
  improvements: string[];
  loading?: boolean;
}

export function AIFeedbackCard({ feedback, strengths, improvements, loading }: AIFeedbackCardProps) {
  if (loading) {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border p-6">
        <p className="text-sm text-gray-500 animate-pulse">AI分析中...</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border p-6 space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-lg">🤖</span>
        <h3 className="font-bold">AIフィードバック</h3>
      </div>

      <p className="text-sm text-gray-700">{feedback}</p>

      {strengths.length > 0 && (
        <div>
          <p className="text-sm font-medium text-green-700 mb-1">💪 強み</p>
          <ul className="space-y-1">
            {strengths.map((s, i) => (
              <li key={i} className="text-sm text-gray-600 flex items-start gap-1">
                <span className="text-green-500 mt-0.5">•</span>
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {improvements.length > 0 && (
        <div>
          <p className="text-sm font-medium text-orange-700 mb-1">📈 改善ポイント</p>
          <ul className="space-y-1">
            {improvements.map((s, i) => (
              <li key={i} className="text-sm text-gray-600 flex items-start gap-1">
                <span className="text-orange-500 mt-0.5">•</span>
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
