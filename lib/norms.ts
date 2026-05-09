// 朔知 · 常模 ----------------------------------------------------------------
//
// ⚠️  开发用模拟常模 (DEVELOPMENT MOCK NORMS)
// 数值参照 BFI-2 英文常模 (Soto & John, 2017) + Zhang 等 (2022) 中文样本
// 公开统计的近似中位数与标准差。生产环境必须替换为本项目自采的中国高中生
// 分层抽样常模 (目标 N ≥ 1,000; 年级 × 性别 × 城乡)。
//
// 计分单位: 1–5 Likert 均值
// ----------------------------------------------------------------------------

import type { Domain, Facet } from "./types";

export interface NormStat { mean: number; sd: number }

export const DOMAIN_NORMS: Record<Domain, NormStat> = {
  O: { mean: 3.55, sd: 0.62 },
  C: { mean: 3.40, sd: 0.66 },
  E: { mean: 3.30, sd: 0.70 },
  A: { mean: 3.65, sd: 0.58 },
  N: { mean: 3.10, sd: 0.78 },
};

export const FACET_NORMS: Record<Facet, NormStat> = {
  "O.imagination":    { mean: 3.50, sd: 0.78 },
  "O.aesthetic":      { mean: 3.55, sd: 0.82 },
  "O.intellect":      { mean: 3.60, sd: 0.75 },
  "C.organization":   { mean: 3.30, sd: 0.85 },
  "C.discipline":     { mean: 3.35, sd: 0.80 },
  "C.responsibility": { mean: 3.65, sd: 0.72 },
  "E.sociability":    { mean: 3.25, sd: 0.86 },
  "E.assertiveness":  { mean: 3.30, sd: 0.80 },
  "E.energy":         { mean: 3.40, sd: 0.78 },
  "A.compassion":     { mean: 3.80, sd: 0.70 },
  "A.respect":        { mean: 3.70, sd: 0.66 },
  "A.trust":          { mean: 3.45, sd: 0.74 },
  "N.anxiety":        { mean: 3.20, sd: 0.85 },
  "N.depression":     { mean: 2.85, sd: 0.88 },
  "N.volatility":     { mean: 3.15, sd: 0.86 },
};

export const NORM_SAMPLE_SIZE = 2481; // mock; show in report cover

// normal CDF approximation (Abramowitz & Stegun) -----------------
function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const a1 =  0.254829592;
  const a2 = -0.284496736;
  const a3 =  1.421413741;
  const a4 = -1.453152027;
  const a5 =  1.061405429;
  const p  =  0.3275911;
  const t  = 1 / (1 + p * ax);
  const y  = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax);
  return sign * y;
}

export function tToPercentile(tScore: number): number {
  const z = (tScore - 50) / 10;
  return 0.5 * (1 + erf(z / Math.SQRT2)) * 100;
}

export function rawToT(raw: number, norm: NormStat): number {
  const z = (raw - norm.mean) / norm.sd;
  return 50 + 10 * z;
}
