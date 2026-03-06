export interface FlyerCalcInput {
  totalHouseholds: number;
  historicalTasks: { delivered_count: number; target_count: number }[];
}

export interface FlyerCalcOutput {
  baseCount: number;
  bufferCount: number;
  recommendedCount: number;
  historicalRate: number;
  reasoning: string;
}

export async function calculateFlyers(input: FlyerCalcInput): Promise<FlyerCalcOutput> {
  const historicalRate =
    input.historicalTasks.length > 0
      ? input.historicalTasks.reduce((sum, t) => sum + (t.delivered_count / Math.max(t.target_count, 1)), 0) / input.historicalTasks.length
      : 0.85;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      system: "Respond only with valid JSON. No explanation, no markdown.",
      messages: [
        {
          role: "user",
          content: `あなたはポスティング業務の専門家です。以下の情報からチラシの推奨持参枚数を算出してください。

エリア世帯数: ${input.totalHouseholds}
過去の配布実績率: ${(historicalRate * 100).toFixed(1)}%
過去タスク数: ${input.historicalTasks.length}件

JSON形式で返してください:
{"baseCount": <世帯数ベースの基本枚数>, "bufferCount": <予備枚数>, "recommendedCount": <推奨合計枚数>, "historicalRate": <実績率(0-1)>, "reasoning": "<推奨理由を日本語50文字以内>"}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    return {
      baseCount: input.totalHouseholds,
      bufferCount: Math.ceil(input.totalHouseholds * 0.1),
      recommendedCount: Math.ceil(input.totalHouseholds * 1.1),
      historicalRate,
      reasoning: "API接続エラーのためデフォルト計算を使用",
    };
  }

  const result = await response.json();
  const text = result.content[0]?.text || "";
  try {
    return JSON.parse(text);
  } catch {
    return {
      baseCount: input.totalHouseholds,
      bufferCount: Math.ceil(input.totalHouseholds * 0.1),
      recommendedCount: Math.ceil(input.totalHouseholds * 1.1),
      historicalRate,
      reasoning: "AI応答のパースエラーのためデフォルト計算を使用",
    };
  }
}
