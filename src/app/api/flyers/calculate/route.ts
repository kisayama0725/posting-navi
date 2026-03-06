import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { calculateFlyers } from "@/lib/ai/calculateFlyers";

export async function POST(req: NextRequest) {
  try {
    const { areaId } = await req.json();
    const supabase = createClient();

    const { data: area } = await supabase
      .from("areas")
      .select("total_households")
      .eq("id", areaId)
      .single();

    if (!area) {
      return NextResponse.json({ error: "Area not found" }, { status: 404 });
    }

    const { data: pastTasks } = await supabase
      .from("tasks")
      .select("delivered_count, target_count")
      .eq("area_id", areaId)
      .eq("status", "completed")
      .limit(10);

    const result = await calculateFlyers({
      totalHouseholds: area.total_households,
      historicalTasks: pastTasks || [],
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("Flyer calculation error:", err);
    return NextResponse.json({ error: "Calculation failed" }, { status: 500 });
  }
}
