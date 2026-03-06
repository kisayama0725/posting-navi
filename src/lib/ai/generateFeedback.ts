export interface FeedbackInput {
  staffName: string;
  month: string;
  metrics: {
    reachRate: number;
    responseRate: number;
    salesContribution: number;
    deliveryEfficiency: number;
    areaScore: number;
  };
  prevMetrics?: {
    reachRate: number;
    responseRate: number;
    salesContribution: number;
    deliveryEfficiency: number;
    areaScore: number;
  };
  teamAvg: {
    reachRate: number;
    responseRate: number;
    salesContribution: number;
    deliveryEfficiency: number;
    areaScore: number;
  };
}

export interface FeedbackOutput {
  feedback: string;
  strengths: string[];
  improvements: string[];
}

export async function generateFeedback(input: FeedbackInput): Promise<FeedbackOutput> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 800,
      system: "Respond only with valid JSON. No explanation, no markdown.",
      messages: [
        {
          role: "user",
          content: `ポスティングスタッフの月次振り返りコメントを生成してください。

スタッフ名: ${input.staffName}
対象月: ${input.month}

今月の指標:
- リーチ率: ${input.metrics.reachRate.toFixed(1)}%
- 反応率: ${input.metrics.responseRate.toFixed(2)}%
- 売上貢献率: ${input.metrics.salesContribution.toFixed(1)}%
- 配布効率: ${input.metrics.deliveryEfficiency.toFixed(1)} 枚/分
- エリアスコア: ${input.metrics.areaScore.toFixed(0)}点

${input.prevMetrics ? `先月の指標:
- リーチ率: ${input.prevMetrics.reachRate.toFixed(1)}%
- 反応率: ${input.prevMetrics.responseRate.toFixed(2)}%
- 売上貢献率: ${input.prevMetrics.salesContribution.toFixed(1)}%
- 配布効率: ${input.prevMetrics.deliveryEfficiency.toFixed(1)} 枚/分
- エリアスコア: ${input.prevMetrics.areaScore.toFixed(0)}点` : "先月データなし"}

チーム平均:
- リーチ率: ${input.teamAvg.reachRate.toFixed(1)}%
- 反応率: ${input.teamAvg.responseRate.toFixed(2)}%
- 売上貢献率: ${input.teamAvg.salesContribution.toFixed(1)}%
- 配布効率: ${input.teamAvg.deliveryEfficiency.toFixed(1)} 枚/分
- エリアスコア: ${input.teamAvg.areaScore.toFixed(0)}点

以下のJSON形式で返してください:
{"feedback": "<全体コメント100文字以内>", "strengths": ["<強み1>", "<強み2>"], "improvements": ["<改善点1>", "<改善点2>"]}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    return {
      feedback: "フィードバックの生成に失敗しました。",
      strengths: [],
      improvements: [],
    };
  }

  const result = await response.json();
  const text = result.content[0]?.text || "";
  try {
    return JSON.parse(text);
  } catch {
    return {
      feedback: "フィードバックの解析に失敗しました。",
      strengths: [],
      improvements: [],
    };
  }
}
