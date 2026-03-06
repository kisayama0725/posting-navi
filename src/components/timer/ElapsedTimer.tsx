"use client";

import { useEffect, useState } from "react";

interface ElapsedTimerProps {
  startedAt: string | null;
  pausedAt?: string | null;
}

export function ElapsedTimer({ startedAt, pausedAt }: ElapsedTimerProps) {
  const [elapsed, setElapsed] = useState("00:00:00");

  useEffect(() => {
    if (!startedAt) return;

    const update = () => {
      const start = new Date(startedAt).getTime();
      const end = pausedAt ? new Date(pausedAt).getTime() : Date.now();
      const diff = Math.max(0, end - start);
      const h = Math.floor(diff / 3600000).toString().padStart(2, "0");
      const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, "0");
      const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, "0");
      setElapsed(`${h}:${m}:${s}`);
    };

    update();
    if (!pausedAt) {
      const interval = setInterval(update, 1000);
      return () => clearInterval(interval);
    }
  }, [startedAt, pausedAt]);

  return <span className="text-lg font-mono">{elapsed}</span>;
}

export function useElapsedTime(startedAt: string | null, pausedAt?: string | null): string {
  const [elapsed, setElapsed] = useState("00:00:00");

  useEffect(() => {
    if (!startedAt) return;

    const update = () => {
      const start = new Date(startedAt).getTime();
      const end = pausedAt ? new Date(pausedAt).getTime() : Date.now();
      const diff = Math.max(0, end - start);
      const h = Math.floor(diff / 3600000).toString().padStart(2, "0");
      const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, "0");
      const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, "0");
      setElapsed(`${h}:${m}:${s}`);
    };

    update();
    if (!pausedAt) {
      const interval = setInterval(update, 1000);
      return () => clearInterval(interval);
    }
  }, [startedAt, pausedAt]);

  return elapsed;
}
