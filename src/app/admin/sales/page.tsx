"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function SalesPage() {
  const supabase = createClient();
  const [staffList, setStaffList] = useState<{ id: string; name: string }[]>([]);
  const [areaList, setAreaList] = useState<{ id: string; label: string }[]>([]);
  const [records, setRecords] = useState<any[]>([]);

  const [staffId, setStaffId] = useState("");
  const [areaId, setAreaId] = useState("");
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [orderCount, setOrderCount] = useState(0);
  const [avgOrderValue, setAvgOrderValue] = useState(2500);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: staff } = await supabase.from("profiles").select("id, name").eq("role", "staff");
      if (staff) setStaffList(staff);

      const { data: areas } = await supabase.from("areas").select("id, prefecture, city, ward, district, chome");
      if (areas) {
        setAreaList(areas.map((a: any) => ({
          id: a.id,
          label: `${a.ward || a.city}${a.district}${a.chome}`,
        })));
      }

      const { data: recs } = await supabase
        .from("staff_sales_records")
        .select("*, profiles!staff_sales_records_staff_id_fkey(name)")
        .order("month", { ascending: false })
        .limit(30);
      if (recs) setRecords(recs);
    };
    load();
  }, []);

  const handleSave = async () => {
    if (!staffId || !month) {
      alert("スタッフと月を選択してください");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/staff/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId,
          areaId: areaId || null,
          month,
          orderCount,
          avgOrderValue,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      alert("保存しました");

      // Reload records
      const { data: recs } = await supabase
        .from("staff_sales_records")
        .select("*, profiles!staff_sales_records_staff_id_fkey(name)")
        .order("month", { ascending: false })
        .limit(30);
      if (recs) setRecords(recs);
    } catch {
      alert("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const totalSales = orderCount * avgOrderValue;

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4">
      <h2 className="text-xl font-bold">売上入力</h2>

      <Card>
        <CardHeader><CardTitle className="text-base">売上データ入力</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>スタッフ</Label>
            <Select value={staffId} onValueChange={setStaffId}>
              <SelectTrigger><SelectValue placeholder="選択..." /></SelectTrigger>
              <SelectContent>
                {staffList.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name || s.id.slice(0, 8)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>エリア（任意）</Label>
            <Select value={areaId} onValueChange={setAreaId}>
              <SelectTrigger><SelectValue placeholder="全体" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全体</SelectItem>
                {areaList.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>対象月</Label>
            <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>注文件数</Label>
              <Input
                type="number"
                min={0}
                value={orderCount}
                onChange={(e) => setOrderCount(parseInt(e.target.value) || 0)}
              />
            </div>
            <div>
              <Label>客単価（円）</Label>
              <Input
                type="number"
                min={0}
                value={avgOrderValue}
                onChange={(e) => setAvgOrderValue(parseInt(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <p className="text-sm text-gray-500">売上</p>
            <p className="text-2xl font-bold text-blue-700">
              ¥{totalSales.toLocaleString()}
            </p>
            <p className="text-xs text-gray-400">{orderCount}件 x ¥{avgOrderValue.toLocaleString()}</p>
          </div>

          <Button className="w-full h-14" onClick={handleSave} disabled={saving}>
            {saving ? "保存中..." : "保存"}
          </Button>
        </CardContent>
      </Card>

      {/* Records list */}
      <Card>
        <CardHeader><CardTitle className="text-base">入力済みデータ</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {records.map((r) => {
              const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
              return (
                <div key={r.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">{profile?.name || "不明"}</p>
                    <p className="text-xs text-gray-500">{r.month}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">¥{(r.order_count * r.avg_order_value).toLocaleString()}</p>
                    <p className="text-xs text-gray-400">{r.order_count}件</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
