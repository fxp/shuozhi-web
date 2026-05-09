"use client";

import type { LikertResponse } from "@/lib/types";

export type LikertScale = "agreement" | "frequency";

const AGREEMENT: { value: LikertResponse; cn: string; en: string }[] = [
  { value: 1, cn: "非常不符合", en: "Strongly disagree" },
  { value: 2, cn: "不太符合",   en: "Disagree" },
  { value: 3, cn: "中立",       en: "Neutral" },
  { value: 4, cn: "比较符合",   en: "Agree" },
  { value: 5, cn: "非常符合",   en: "Strongly agree" },
];

// PHQ-9 / GAD-7 标准是 0-3 频率,这里映射 1-5 (5 折叠为 "几乎每天")
const FREQUENCY: { value: LikertResponse; cn: string; en: string }[] = [
  { value: 1, cn: "几乎没有",   en: "Not at all" },
  { value: 2, cn: "偶尔几天",   en: "Several days" },
  { value: 3, cn: "一半时间",   en: "Half the days" },
  { value: 4, cn: "大多数天",   en: "Most days" },
  { value: 5, cn: "几乎每天",   en: "Nearly every day" },
];

interface Props {
  value: LikertResponse | undefined;
  onChange: (v: LikertResponse) => void;
  scale?: LikertScale;
}

export function Likert({ value, onChange, scale = "agreement" }: Props) {
  const OPTIONS = scale === "frequency" ? FREQUENCY : AGREEMENT;
  return (
    <div className="border border-ink" role="radiogroup" aria-label="作答">
      {OPTIONS.map((o, idx) => {
        const selected = value === o.value;
        const isLast = idx === OPTIONS.length - 1;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(o.value)}
            className={[
              "w-full grid grid-cols-[68px_1fr_120px] items-center gap-4 px-5 py-4 text-left",
              "transition-all duration-150",
              !isLast && "border-b border-frost",
              selected
                ? "bg-ink text-bg-soft"
                : "bg-bg-soft hover:bg-bg-deep text-ink",
            ].filter(Boolean).join(" ")}
          >
            <span
              className={`font-mono text-[28px] tnum ${selected ? "text-signal" : "text-ink"}`}
              style={{ fontFeatureSettings: '"tnum" 1', letterSpacing: "-0.02em" }}
            >
              {o.value}
            </span>
            <span className={`font-display text-[16px] ${selected ? "text-bg-soft" : "text-ink"}`}>
              {o.cn}
            </span>
            <span
              className={`label-mono text-right ${selected ? "text-signal" : "text-slate"}`}
            >
              {selected ? "▎ SELECTED" : `KEY·0${o.value}`}
            </span>
          </button>
        );
      })}
    </div>
  );
}
