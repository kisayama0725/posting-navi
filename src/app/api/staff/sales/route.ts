import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const { staffId, areaId, month, orderCount, avgOrderValue } = await req.json();
    const supabase = createClient();

    const { data, error } = await supabase
      .from("staff_sales_records")
      .upsert(
        {
          staff_id: staffId,
          area_id: areaId || null,
          month,
          order_count: orderCount,
          avg_order_value: avgOrderValue,
        },
        { onConflict: "staff_id,area_id,month" }
      )
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    console.error("Sales upsert error:", err);
    return NextResponse.json({ error: "Failed to save sales" }, { status: 500 });
  }
}
