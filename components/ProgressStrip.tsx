"use client";

import { useEffect, useState } from "react";
import { PHASES, findPhase } from "@/lib/scoring";

interface Props {
  current: number;       // current item id
  total: number;
  startedAtMs?: number;
}

export function ProgressStrip({ current, total, startedAtMs }: Props) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  const phase = findPhase(current);
  const phaseIdx = PHASES.findIndex((p) => p.module === phase.module);
  const pct = ((current - 1) / total) * 100;

  const elapsed = now && startedAtMs ? Math.max(0, Math.floor((now - startedAtMs) / 60000)) : null;
  const totalEstimate = 22;
  const remain = elapsed != null ? Math.max(1, totalEstimate - elapsed) : null;

  return (
    <div className="sticky top-0 z-10 bg-bg border-b border-frost">
      <div className="container-wide py-4">
        <div className="grid grid-cols-12 gap-4 items-center">
          <div className="col-span-12 sm:col-span-5">
            <div className="label-mono">
              PHASE·{phaseIdx + 1} / {PHASES.length} — {phase.enLabel}
            </div>
          </div>
          <div className="col-span-7 sm:col-span-4 flex items-baseline gap-2">
            <span
              className="font-mono text-[18px] text-signal tnum"
              style={{ fontFeatureSettings: '"tnum" 1' }}
            >
              {current.toString().padStart(3, "0")}
            </span>
            <span className="label-mono">
              / {total.toString().padStart(3, "0")} ITEMS
            </span>
          </div>
          <div className="col-span-5 sm:col-span-3 flex items-baseline justify-end gap-2">
            <span className="live-dot" aria-hidden />
            <span className="label-mono">
              {remain != null ? `T-${String(remain).padStart(2, "0")} MIN` : `EST 22 MIN`}
            </span>
          </div>
        </div>

        <div className="relative w-full h-[2px] bg-frost-soft mt-3">
          <div
            className="absolute left-0 top-0 h-full bg-signal transition-[width] duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="grid gap-[2px] mt-2 max-w-[640px]"
             style={{ gridTemplateColumns: PHASES.map(p => `${p.range[1] - p.range[0] + 1}fr`).join(" ") }}>
          {PHASES.map((p, i) => {
            const done = i < phaseIdx;
            const cur = i === phaseIdx;
            return (
              <div
                key={p.module}
                className={[
                  "h-[3px]",
                  done ? "bg-ink" : cur ? "bg-signal" : "bg-frost-soft",
                ].join(" ")}
                title={p.label}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
