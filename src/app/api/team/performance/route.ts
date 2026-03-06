import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const month = req.nextUrl.searchParams.get("month") || new Date().toISOString().slice(0, 7);
    const supabase = createClient();

    const { data: staff } = await supabase
      .from("profiles")
      .select("id, name")
      .eq("role", "staff");

    if (!staff || staff.length === 0) {
      return NextResponse.json({ staff: [], averages: {} });
    }

    const staffPerformances = [];

    for (const s of staff) {
      const { data: tasks } = await supabase
        .from("tasks")
        .select("*, areas(total_households)")
        .eq("staff_id", s.id)
        .eq("status", "completed")
        .gte("completed_at", `${month}-01`)
        .lt("completed_at", `${month}-31T23:59:59`);

      const { data: sales } = await supabase
        .from("staff_sales_records")
        .select("*")
        .eq("staff_id", s.id)
        .eq("month", month);

      const totalDelivered = tasks?.reduce((sum, t) => sum + t.delivered_count, 0) || 0;
      const totalHouseholds = tasks?.reduce((sum, t) => sum + (t.areas?.total_households || 0), 0) || 0;
      const totalOrderCount = sales?.reduce((sum, r) => sum + r.order_count, 0) || 0;
      const totalSalesAmount = sales?.reduce((sum, r) => sum + r.order_count * r.avg_order_value, 0) || 0;

      let totalMinutes = 0;
      for (const task of tasks || []) {
        if (task.started_at && task.completed_at) {
          totalMinutes += (new Date(task.completed_at).getTime() - new Date(task.started_at).getTime()) / 60000;
        }
      }

      const reachRate = totalHouseholds > 0 ? (totalDelivered / totalHouseholds) * 100 : 0;
      const responseRate = totalDelivered > 0 ? (totalOrderCount / totalDelivered) * 100 : 0;
      const deliveryEfficiency = totalMinutes > 0 ? totalDelivered / totalMinutes : 0;

      staffPerformances.push({
        staffId: s.id,
        name: s.name,
        totalDelivered,
        totalHouseholds,
        totalOrderCount,
        totalSales: totalSalesAmount,
        totalMinutes: Math.round(totalMinutes),
        reachRate,
        responseRate,
        deliveryEfficiency,
      });
    }

    // Calculate team totals
    const teamTotalSales = staffPerformances.reduce((s, p) => s + p.totalSales, 0);
    const staffWithScores = staffPerformances.map((p) => ({
      ...p,
      salesContribution: teamTotalSales > 0 ? (p.totalSales / teamTotalSales) * 100 : 0,
      areaScore: Math.min(100, Math.round(
        p.reachRate * 0.25 + p.responseRate * 100 * 0.25 + (teamTotalSales > 0 ? (p.totalSales / teamTotalSales) * 100 : 0) * 0.2 + p.deliveryEfficiency * 10 * 0.15 + 50 * 0.15
      )),
    }));

    const count = staffWithScores.length || 1;
    const averages = {
      reachRate: staffWithScores.reduce((s, p) => s + p.reachRate, 0) / count,
      responseRate: staffWithScores.reduce((s, p) => s + p.responseRate, 0) / count,
      salesContribution: 100 / count,
      deliveryEfficiency: staffWithScores.reduce((s, p) => s + p.deliveryEfficiency, 0) / count,
      areaScore: staffWithScores.reduce((s, p) => s + p.areaScore, 0) / count,
    };

    return NextResponse.json({
      month,
      staff: staffWithScores,
      averages,
      teamTotalSales,
      totalDelivered: staffWithScores.reduce((s, p) => s + p.totalDelivered, 0),
    });
  } catch (err) {
    console.error("Team performance error:", err);
    return NextResponse.json({ error: "Failed to get team performance" }, { status: 500 });
  }
}
