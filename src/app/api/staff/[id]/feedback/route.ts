import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateFeedback } from "@/lib/ai/generateFeedback";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const staffId = params.id;
    const { month, metrics, prevMetrics, teamAvg } = await req.json();
    const supabase = createClient();

    const { data: profile } = await supabase
      .from("profiles")
      .select("name")
      .eq("id", staffId)
      .single();

    const result = await generateFeedback({
      staffName: profile?.name || "スタッフ",
      month,
      metrics,
      prevMetrics: prevMetrics || undefined,
      teamAvg,
    });

    // Save to ai_feedbacks
    await supabase.from("ai_feedbacks").upsert(
      {
        staff_id: staffId,
        month,
        feedback: result.feedback,
        strengths: result.strengths,
        improvements: result.improvements,
      },
      { onConflict: "staff_id,month" }
    );

    return NextResponse.json(result);
  } catch (err) {
    console.error("Feedback error:", err);
    return NextResponse.json({ error: "Failed to generate feedback" }, { status: 500 });
  }
}
