// 心理健康筛查 · PHQ-9 + GAD-7 ----------------------------------------------
//
// PHQ-9 (Kroenke et al. 2001) 抑郁筛查、9 题
// GAD-7 (Spitzer et al. 2006) 广泛性焦虑筛查、7 题
// 两者都是公开领域(public domain),全球验证、中文版心理测量学证据扎实
// (PHQ-9 中文版:Lee et al. 2008, Wang et al. 2014;
//  GAD-7 中文版:He et al. 2010,信效度均良好)。
//
// 重要的伦理边界:
//  - 这是 *筛查* 工具(screening),不是 *诊断* 工具(diagnosis)
//  - PHQ-9 第 9 题(自杀意念)得分 ≥1 必须自动转介
//  - moderate 及以上自动转介学校心理老师 / 12320 / 北京心理援助 010-82951332
// ----------------------------------------------------------------------------

import type { Item, HealthScale, HealthTier, LikertResponse, HealthResult, HealthScaleResult } from "./types";

// 注:用户作答用 1-5 Likert(我们的 UI 一致性),
// 在 scoring 里映射回 PHQ/GAD 标准的 0-3 频率:
//   1 几乎没有 → 0
//   2 偶尔几天 → 1
//   3 一半以上 → 2
//   4 几乎每天 → 3
//   5 几乎每天 → 3 (5-pt 上限折叠到 3)
// 这是合理的近似,失去一点细粒度但不影响 tier 判断。

export const HEALTH_ITEMS: Item[] = [
  // PHQ-9 抑郁(id 101–109)
  { id: 101, module: "health", healthScale: "phq9", text: "做事时缺乏兴趣或乐趣。" },
  { id: 102, module: "health", healthScale: "phq9", text: "感到沮丧、抑郁或绝望。" },
  { id: 103, module: "health", healthScale: "phq9", text: "睡眠出问题(入睡困难 / 睡不安稳 / 睡得太多)。" },
  { id: 104, module: "health", healthScale: "phq9", text: "感到疲倦或没有活力。" },
  { id: 105, module: "health", healthScale: "phq9", text: "食欲不振或暴饮暴食。" },
  { id: 106, module: "health", healthScale: "phq9", text: "觉得自己很差劲、让自己或家人失望。" },
  { id: 107, module: "health", healthScale: "phq9", text: "注意力难以集中(看书 / 上课 / 看电视)。" },
  { id: 108, module: "health", healthScale: "phq9", text: "动作或讲话明显变慢,或反过来烦躁不安、坐立难安。" },
  { id: 109, module: "health", healthScale: "phq9", text: "出现想伤害自己或不如死了的念头。" },

  // GAD-7 焦虑(id 110–116)
  { id: 110, module: "health", healthScale: "gad7", text: "感到紧张、焦虑或心烦。" },
  { id: 111, module: "health", healthScale: "gad7", text: "无法停止或控制担忧。" },
  { id: 112, module: "health", healthScale: "gad7", text: "对各种事情担心太多。" },
  { id: 113, module: "health", healthScale: "gad7", text: "难以放松下来。" },
  { id: 114, module: "health", healthScale: "gad7", text: "坐立不安以致难以静下来。" },
  { id: 115, module: "health", healthScale: "gad7", text: "容易烦躁或易怒。" },
  { id: 116, module: "health", healthScale: "gad7", text: "害怕将要发生可怕的事。" },
];

// Likert 1-5 → PHQ/GAD 频率分(0-3),5 折叠到 3
function likertToFreq(v: LikertResponse): number {
  return Math.min(3, v - 1);
}

// 标准切点(原文献 0-27 / 0-21);因为我们映射到 0-3 频率,总分上限同标准
function phq9Tier(total: number): HealthTier {
  if (total <= 4) return "minimal";
  if (total <= 9) return "mild";
  if (total <= 14) return "moderate";
  if (total <= 19) return "moderately-severe";
  return "severe";
}
function gad7Tier(total: number): HealthTier {
  if (total <= 4) return "minimal";
  if (total <= 9) return "mild";
  if (total <= 14) return "moderate";
  return "severe";
}

const TIER_RANK: Record<HealthTier, number> = {
  "minimal": 0, "mild": 1, "moderate": 2, "moderately-severe": 3, "severe": 4,
};

export function scoreHealth(responses: Record<number, LikertResponse>): HealthResult {
  const phq9Items = HEALTH_ITEMS.filter((i) => i.healthScale === "phq9");
  const gad7Items = HEALTH_ITEMS.filter((i) => i.healthScale === "gad7");

  const phq9Total = phq9Items.reduce((s, i) => s + likertToFreq(responses[i.id] ?? 1), 0);
  const gad7Total = gad7Items.reduce((s, i) => s + likertToFreq(responses[i.id] ?? 1), 0);

  // Item 109 = PHQ-9 自杀意念 — 任何 ≥1 即标记转介
  const flag_si = likertToFreq(responses[109] ?? 1) > 0;

  const phq9Result: HealthScaleResult = {
    scale: "phq9",
    total: phq9Total,
    tier: phq9Tier(phq9Total),
    flag_si,
  };
  const gad7Result: HealthScaleResult = {
    scale: "gad7",
    total: gad7Total,
    tier: gad7Tier(gad7Total),
  };

  const tiers = [phq9Result.tier, gad7Result.tier];
  const highestTier = tiers.reduce((a, b) =>
    TIER_RANK[b] > TIER_RANK[a] ? b : a
  ) as HealthTier;

  const needsTransferral =
    flag_si ||
    TIER_RANK[phq9Result.tier] >= 2 ||
    TIER_RANK[gad7Result.tier] >= 2;

  return {
    scales: [phq9Result, gad7Result],
    highestTier,
    needsTransferral,
  };
}

export const HEALTH_LABELS: Record<HealthScale, { cn: string; en: string; description: string }> = {
  phq9: { cn: "抑郁筛查", en: "PHQ-9", description: "过去两周内你感受到的症状" },
  gad7: { cn: "焦虑筛查", en: "GAD-7", description: "过去两周内你的紧张与担忧" },
};

export const TIER_LABELS: Record<HealthTier, { cn: string; en: string; cssClass: string }> = {
  "minimal":            { cn: "最低", en: "MINIMAL",         cssClass: "ok"      },
  "mild":               { cn: "轻度", en: "MILD",            cssClass: "ok"      },
  "moderate":           { cn: "中度", en: "MODERATE",        cssClass: "warn"    },
  "moderately-severe":  { cn: "中重度", en: "MOD-SEVERE",    cssClass: "warn"    },
  "severe":             { cn: "重度", en: "SEVERE",          cssClass: "alert"   },
};

// 转介资源(中国大陆)
export const CRISIS_RESOURCES = [
  { name: "北京心理危机研究与干预中心", phone: "010-82951332", note: "24 小时" },
  { name: "希望24热线",                  phone: "400-161-9995",  note: "24 小时" },
  { name: "全国心理援助",                phone: "12320转5",       note: "工作日" },
];
