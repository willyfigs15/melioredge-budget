"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { monthLabel } from "@/lib/utils";

type Props = {
  year: number;
  month: number;
  onChange: (year: number, month: number) => void;
};

export function MonthSelector({ year, month, onChange }: Props) {
  const step = (delta: number) => {
    const total = year * 12 + (month - 1) + delta;
    const y = Math.floor(total / 12);
    const m = (total % 12) + 1;
    onChange(y, m);
  };
  return (
    <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-card/50 p-1">
      <button
        onClick={() => step(-1)}
        className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground"
        aria-label="Previous month"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <span className="px-2 text-sm font-medium tabular-nums min-w-[140px] text-center">
        {monthLabel(year, month)}
      </span>
      <button
        onClick={() => step(1)}
        className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground"
        aria-label="Next month"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
