"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface DeliveryCounterProps {
  count: number;
  targetCount: number;
  elapsedTime: string;
  currentSegment: number;
  totalSegments: number;
  onCount: (amount: number) => void;
}

export function DeliveryCounter({
  count,
  targetCount,
  elapsedTime,
  currentSegment,
  totalSegments,
  onCount,
}: DeliveryCounterProps) {
  const [showMultiInput, setShowMultiInput] = useState(false);
  const [floors, setFloors] = useState(1);
  const [perFloor, setPerFloor] = useState(1);

  const progress = targetCount > 0 ? Math.min(100, (count / targetCount) * 100) : 0;

  const segmentColors = ["bg-red-500", "bg-yellow-500", "bg-blue-500"];

  const handleMultiAdd = () => {
    const total = floors * perFloor;
    onCount(total);
    setShowMultiInput(false);
    setFloors(1);
    setPerFloor(1);
  };

  return (
    <div className="sticky top-0 z-50 bg-white border-b shadow-sm px-4 py-3 space-y-2">
      {/* Count display */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-4xl font-bold text-blue-600">{count}</span>
          <span className="text-lg text-gray-400 ml-1">/ {targetCount}</span>
        </div>
        <div className="text-right">
          <p className="text-lg font-mono">{elapsedTime}</p>
          <Badge className={`${segmentColors[(currentSegment) % 3]} text-white`}>
            セグメント {currentSegment + 1}/{totalSegments}
          </Badge>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          className="h-14 flex-1 text-xl"
          onClick={() => onCount(-1)}
          disabled={count <= 0}
        >
          -1
        </Button>
        <Button
          className="h-14 flex-[2] text-xl bg-blue-600 hover:bg-blue-700"
          onClick={() => onCount(1)}
        >
          +1
        </Button>
        <Button
          variant="secondary"
          className="h-14 flex-1 text-sm"
          onClick={() => setShowMultiInput(!showMultiInput)}
        >
          +複数
        </Button>
      </div>

      {/* Multi-input dialog */}
      {showMultiInput && (
        <div className="bg-gray-50 rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-3">
            <label className="text-sm whitespace-nowrap">階数</label>
            <input
              type="number"
              min={1}
              value={floors}
              onChange={(e) => setFloors(parseInt(e.target.value) || 1)}
              className="w-16 h-10 border rounded text-center"
            />
            <span className="text-sm">x</span>
            <label className="text-sm whitespace-nowrap">枚/階</label>
            <input
              type="number"
              min={1}
              value={perFloor}
              onChange={(e) => setPerFloor(parseInt(e.target.value) || 1)}
              className="w-16 h-10 border rounded text-center"
            />
            <span className="text-sm font-bold">= {floors * perFloor}枚</span>
          </div>
          <Button onClick={handleMultiAdd} className="w-full h-12">
            {floors * perFloor}枚を追加
          </Button>
        </div>
      )}

      {/* Progress bar */}
      <Progress value={progress} className="h-2" />
    </div>
  );
}
