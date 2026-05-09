// 朔知 · 计分(扩展版,4 模块联合) -----------------------------------------

import type {
  AssessmentSession, Domain, DomainScore, Facet, FacetScore,
  LikertResponse, Report, ReliabilityIndex, Item,
} from "./types";
import { ITEMS as BFI2_ITEMS, DOMAIN_LABELS } from "./bfi2-items";
import { DOMAIN_NORMS, FACET_NORMS, rawToT, tToPercentile } from "./norms";
import { RIASEC_ITEMS, scoreRiasec } from "./riasec";
import { COGNITIVE_ITEMS, scoreCognitive } from "./cognitive";
import { HEALTH_ITEMS, scoreHealth } from "./health";
import { matchCareers } from "./match";

const DOMAIN_LIST: Domain[] = ["O", "C", "E", "A", "N"];

// 116 题全集(BFI 60 + RIASEC 24 + Cognitive 16 + Health 16)
export const ALL_ITEMS: Item[] = [
  ...BFI2_ITEMS,
  ...RIASEC_ITEMS,
  ...COGNITIVE_ITEMS,
  ...HEALTH_ITEMS,
];

// 模块阶段元数据(供 UI 章节切换用)
export interface PhaseInfo {
  module: "bfi2" | "riasec" | "cognitive" | "health";
  label: string;
  enLabel: string;
  sub: string;
  range: [number, number];   // item id 起止(包含)
  scaleHint: string;         // 该模块作答时的提示
}

export const PHASES: PhaseInfo[] = [
  {
    module: "bfi2",
    label: "人格特性",
    enLabel: "PERSONALITY · BFI-2",
    sub: "五大维度(开放性 / 尽责性 / 外向性 / 宜人性 / 情绪敏感性)",
    range: [1, 60],
    scaleHint: "凭第一直觉 · 没有对错",
  },
  {
    module: "riasec",
    label: "兴趣倾向",
    enLabel: "INTERESTS · RIASEC",
    sub: "六类型职业兴趣(R 实际 / I 调研 / A 艺术 / S 社会 / E 企业 / C 常规)",
    range: [61, 84],
    scaleHint: "凭你做这件事的真实感受 · 不必想职业",
  },
  {
    module: "cognitive",
    label: "认知风格",
    enLabel: "COGNITIVE STYLE · CHC v0",
    sub: "自陈式认知偏好 · 非 IQ 测验",
    range: [85, 100],
    scaleHint: "和同龄人比较 · 凭你的真实自我感知",
  },
  {
    module: "health",
    label: "心理健康筛查",
    enLabel: "WELL-BEING · PHQ-9 + GAD-7",
    sub: "过去两周内你感受到的频率 · 这是筛查不是诊断",
    range: [101, 116],
    scaleHint: "回想最近两周的频率 · 全部答完才会触发任何转介",
  },
];

export function findPhase(itemId: number): PhaseInfo {
  return PHASES.find((p) => itemId >= p.range[0] && itemId <= p.range[1]) ?? PHASES[0];
}

// ─── BFI-2 计分 ───────────────────────────────────────

function itemContribution(itemId: number, raw: LikertResponse): number {
  const item = BFI2_ITEMS.find((i) => i.id === itemId);
  if (!item) throw new Error(`Unknown BFI-2 item id ${itemId}`);
  return item.reverse ? 6 - raw : raw;
}

function computeFacetScore(facet: Facet, responses: Record<number, LikertResponse>): FacetScore {
  const facetItems = BFI2_ITEMS.filter((i) => i.facet === facet);
  const contribs = facetItems.map((i) => itemContribution(i.id, responses[i.id] ?? 3));
  const raw = contribs.reduce((s, x) => s + x, 0) / contribs.length;
  const norm = FACET_NORMS[facet];
  const t = rawToT(raw, norm);
  const percentile = tToPercentile(t);
  return { facet, raw, t, percentile, normalized100: Math.round(percentile) };
}

function computeDomainScore(domain: Domain, responses: Record<number, LikertResponse>): DomainScore {
  const domItems = BFI2_ITEMS.filter((i) => i.domain === domain);
  const contribs = domItems.map((i) => itemContribution(i.id, responses[i.id] ?? 3));
  const raw = contribs.reduce((s, x) => s + x, 0) / contribs.length;
  const norm = DOMAIN_NORMS[domain];
  const t = rawToT(raw, norm);
  const percentile = tToPercentile(t);
  const facetIds = Array.from(new Set(domItems.map((i) => i.facet))) as Facet[];
  const facets = facetIds.map((f) => computeFacetScore(f, responses));
  return { domain, raw, t, percentile, normalized100: Math.round(percentile), facets };
}

// ─── 信度(只看 BFI-2 内部一致性,其他模块单独题量太少) ───

function computePolarity(responses: Record<number, LikertResponse>): number {
  // 只用 BFI-2 的回答评估极性(其他模块本身不期望极化)
  const vals = BFI2_ITEMS
    .map((i) => responses[i.id])
    .filter((v): v is LikertResponse => v !== undefined);
  if (vals.length === 0) return 0;
  const nonNeutral = vals.filter((v) => v !== 3).length;
  return Math.round((nonNeutral / vals.length) * 100);
}

function approxAlpha(responses: Record<number, LikertResponse>): number {
  const facetIds = Array.from(new Set(BFI2_ITEMS.map((i) => i.facet)));
  const sds: number[] = [];
  for (const f of facetIds) {
    const items = BFI2_ITEMS.filter((i) => i.facet === f);
    const xs = items.map((i) => itemContribution(i.id, responses[i.id] ?? 3));
    const m = xs.reduce((s, x) => s + x, 0) / xs.length;
    const v = xs.reduce((s, x) => s + (x - m) * (x - m), 0) / xs.length;
    sds.push(Math.sqrt(v));
  }
  const meanSd = sds.reduce((s, x) => s + x, 0) / sds.length;
  const alpha = Math.max(0.4, Math.min(0.95, 0.95 - (meanSd / 1.5) * 0.4));
  return Number(alpha.toFixed(2));
}

function reliability(responses: Record<number, LikertResponse>): ReliabilityIndex {
  const alpha = approxAlpha(responses);
  const polarity = computePolarity(responses);
  const grade: ReliabilityIndex["gradeLabel"] =
    alpha >= 0.80 && polarity >= 60 ? "良好" : polarity >= 40 ? "一般" : "偏低";
  return { alpha, polarity, gradeLabel: grade };
}

// ─── 模块完成度判断 ──────────────────────────────────

function moduleAnswered(responses: Record<number, LikertResponse>, items: Item[]): boolean {
  return items.every((i) => responses[i.id] !== undefined);
}

// ─── public ─────────────────────────────────────────

function computeTiming(session: AssessmentSession): Report["timing"] {
  const times = Object.values(session.responseTimes ?? {});
  if (times.length === 0) return undefined;
  const sorted = [...times].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const avg = Math.round(sorted.reduce((a, b) => a + b, 0) / sorted.length);
  return { avgMs: avg, medianMs: median, nItemsTimed: times.length };
}

export function scoreSession(session: AssessmentSession): Report {
  const responses = session.responses;
  const domains = DOMAIN_LIST.map((d) => computeDomainScore(d, responses));
  const rel = reliability(responses);
  const timing = computeTiming(session);

  const report: Report = {
    id: `r_${session.id}`,
    sessionId: session.id,
    createdAt: new Date().toISOString(),
    meta: session.meta,
    domains,
    reliability: rel,
    timing,
  };

  // RIASEC(若全部答完)
  if (moduleAnswered(responses, RIASEC_ITEMS)) {
    report.riasec = scoreRiasec(responses);
  }

  // Cognitive(若全部答完)
  if (moduleAnswered(responses, COGNITIVE_ITEMS)) {
    report.cognitive = scoreCognitive(responses);
  }

  // Health(若全部答完)
  if (moduleAnswered(responses, HEALTH_ITEMS)) {
    report.health = scoreHealth(responses);
  }

  // 三维匹配(需要至少 BFI-2 + RIASEC)
  if (report.riasec) {
    report.careers = matchCareers({
      domains,
      riasec: report.riasec,
      cognitive: report.cognitive?.scores ?? null,
      topN: 3,
    });
  }

  return report;
}

export function isComplete(session: AssessmentSession): boolean {
  // 完整流程要求所有模块都答完
  return ALL_ITEMS.every((i) => session.responses[i.id] !== undefined);
}

// 部分完成也允许 finalize:至少 BFI-2 全答完
export function isMinimallyComplete(session: AssessmentSession): boolean {
  return BFI2_ITEMS.every((i) => session.responses[i.id] !== undefined);
}

export function answeredCount(session: AssessmentSession): number {
  return Object.keys(session.responses).length;
}

export const TOTAL_ITEMS = ALL_ITEMS.length;
export const TOTAL_BFI2 = BFI2_ITEMS.length;
export const DOMAIN_OF = (d: Domain) => DOMAIN_LABELS[d];
