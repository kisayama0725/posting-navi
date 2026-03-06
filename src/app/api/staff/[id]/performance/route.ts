import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const staffId = params.id;
    const month = req.nextUrl.searchParams.get("month") || new Date().toISOString().slice(0, 7);
    const supabase = createClient();

    // Get completed tasks for the month
    const { data: tasks } = await supabase
      .from("tasks")
      .select("*, areas(*)")
      .eq("staff_id", staffId)
      .eq("status", "completed")
      .gte("completed_at", `${month}-01`)
      .lt("completed_at", `${month}-31T23:59:59`);

    // Get sales records
    const { data: sales } = await supabase
      .from("staff_sales_records")
      .select("*")
      .eq("staff_id", staffId)
      .eq("month", month);

    const totalDelivered = tasks?.reduce((s, t) => s + t.delivered_count, 0) || 0;
    const totalHouseholds = tasks?.reduce((s, t) => s + (t.areas?.total_households || 0), 0) || 0;
    const totalOrderCount = sales?.reduce((s, r) => s + r.order_count, 0) || 0;
    const totalSales = sales?.reduce((s, r) => s + r.order_count * r.avg_order_value, 0) || 0;

    // Calculate working minutes from GPS tracks
    const taskIds = tasks?.map((t) => t.id) || [];
    let totalMinutes = 0;
    if (taskIds.length > 0) {
      for (const task of tasks || []) {
        if (task.started_at && task.completed_at) {
          const start = new Date(task.started_at).getTime();
          const end = new Date(task.completed_at).getTime();
          totalMinutes += (end - start) / 60000;
        }
      }
    }

    const reachRate = totalHouseholds > 0 ? (totalDelivered / totalHouseholds) * 100 : 0;
    const responseRate = totalDelivered > 0 ? (totalOrderCount / totalDelivered) * 100 : 0;
    const deliveryEfficiency = totalMinutes > 0 ? totalDelivered / totalMinutes : 0;

    // Get team totals for sales contribution
    const { data: allSales } = await supabase
      .from("staff_sales_records")
      .select("order_count, avg_order_value")
      .eq("month", month);

    const teamTotalSales = allSales?.reduce((s, r) => s + r.order_count * r.avg_order_value, 0) || 0;
    const salesContribution = teamTotalSales > 0 ? (totalSales / teamTotalSales) * 100 : 0;

    const areaScore = Math.min(100, Math.round(
      reachRate * 0.25 + responseRate * 100 * 0.25 + salesContribution * 0.2 + deliveryEfficiency * 10 * 0.15 + 50 * 0.15
    ));

    return NextResponse.json({
      staffId,
      month,
      totalDelivered,
      totalHouseholds,
      totalOrderCount,
      totalSales,
      totalMinutes: Math.round(totalMinutes),
      reachRate,
      responseRate,
      salesContribution,
      deliveryEfficiency,
      areaScore,
      tasks: tasks || [],
      sales: sales || [],
    });
  } catch (err) {
    console.error("Performance error:", err);
    return NextResponse.json({ error: "Failed to get performance" }, { status: 500 });
  }
}
