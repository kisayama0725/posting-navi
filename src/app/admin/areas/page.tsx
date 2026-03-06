"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Area {
  id: string;
  prefecture: string;
  city: string;
  ward: string;
  district: string;
  chome: string;
  total_households: number;
  created_at: string;
}

export default function AreasPage() {
  const supabase = createClient();
  const [areas, setAreas] = useState<Area[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    prefecture: "福岡県",
    city: "北九州市",
    ward: "",
    district: "",
    chome: "",
    total_households: 200,
  });

  const loadAreas = async () => {
    const { data } = await supabase
      .from("areas")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setAreas(data);
  };

  useEffect(() => {
    loadAreas();
  }, []);

  const handleAdd = async () => {
    const { error } = await supabase.from("areas").insert(form);
    if (error) {
      alert("エリア追加に失敗しました");
      return;
    }
    setShowForm(false);
    setForm({ ...form, ward: "", district: "", chome: "", total_households: 200 });
    loadAreas();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("このエリアを削除しますか？")) return;
    await supabase.from("areas").delete().eq("id", id);
    loadAreas();
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">エリア管理</h2>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? "閉じる" : "+ エリア追加"}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle className="text-base">エリア追加</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>都道府県</Label>
                <Input value={form.prefecture} onChange={(e) => setForm({ ...form, prefecture: e.target.value })} />
              </div>
              <div>
                <Label>市</Label>
                <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </div>
              <div>
                <Label>区</Label>
                <Input value={form.ward} onChange={(e) => setForm({ ...form, ward: e.target.value })} placeholder="八幡西区" />
              </div>
              <div>
                <Label>町域</Label>
                <Input value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} placeholder="香月中央" />
              </div>
              <div>
                <Label>丁目</Label>
                <Input value={form.chome} onChange={(e) => setForm({ ...form, chome: e.target.value })} placeholder="3丁目" />
              </div>
              <div>
                <Label>世帯数</Label>
                <Input
                  type="number"
                  value={form.total_households}
                  onChange={(e) => setForm({ ...form, total_households: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <Button className="w-full" onClick={handleAdd}>追加</Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {areas.map((a) => (
          <Card key={a.id}>
            <CardContent className="py-3 flex items-center justify-between">
              <div>
                <p className="font-medium">
                  {a.prefecture}{a.city}{a.ward}{a.district}{a.chome}
                </p>
                <p className="text-xs text-gray-500">
                  世帯数: {a.total_households} / {new Date(a.created_at).toLocaleDateString("ja-JP")}
                </p>
              </div>
              <Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleDelete(a.id)}>
                削除
              </Button>
            </CardContent>
          </Card>
        ))}
        {areas.length === 0 && (
          <p className="text-gray-400 text-sm text-center py-8">エリアが登録されていません</p>
        )}
      </div>
    </div>
  );
}
