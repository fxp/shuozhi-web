// 三维匹配引擎(Big Five × RIASEC × 认知)→ 职业 TOP-3 ----------------------
//
// 算法设计:
//  1. RIASEC 匹配:个人 Holland 三字码与职业 Holland 三字码计算字符重叠分(主权重)
//  2. Big Five 匹配:对每个 bigFiveFit 项,看个人对应维度是否符合 high/low 期望
//  3. 认知匹配(可选):cognitiveFit 项的能力得分加分
//  4. 综合 = riasec*0.5 + bigfive*0.35 + cognitive*0.15
//
// 这是 v0 的简单线性加权,不是机器学习。生产可以用学生纵向数据训练。
// ----------------------------------------------------------------------------

import type {
  CareerMatch, CareerType, CogScore, DomainScore, RiasecResult, RiasecType,
} from "./types";
import { CAREERS } from "./careers";

// ─── helpers ───────────────────────────────────────────

// Holland 字符串重叠 (考虑顺序权重)
// 个人 ISA 与 职业 ISA → 满分 100
// 个人 ISA 与 职业 IRA → 第 1、2 位匹配 = 高分
function hollandMatch(personal: string, career: string): number {
  // 转 RIASEC 字符串(用 R/I/A/S/E/C 6 字母,把 _riasec 后缀去掉)
  const norm = (s: string) => s.replace(/_riasec/g, "");
  const p = norm(personal);
  const c = norm(career);
  if (p.length < 3 || c.length < 3) return 0;

  // 位置加权:第 1 位 50%,第 2 位 30%,第 3 位 20%
  const weights = [0.5, 0.3, 0.2];
  let score = 0;
  for (let i = 0; i < 3; i++) {
    if (c.includes(p[i])) {
      // 在职业 code 里找位置
      const cIdx = c.indexOf(p[i]);
      const positionPenalty = 1 - Math.abs(i - cIdx) * 0.15;
      score += weights[i] * positionPenalty * 100;
    }
  }
  return Math.min(100, Math.round(score));
}

function bigFiveMatch(domains: DomainScore[], career: CareerType): number {
  const fit = career.bigFiveFit;
  const fitKeys = Object.keys(fit) as Array<keyof typeof fit>;
  if (fitKeys.length === 0) return 60; // neutral baseline

  let totalSignal = 0;
  let satisfied = 0;
  for (const k of fitKeys) {
    const expectation = fit[k]!;
    const dom = domains.find((d) => d.domain === k);
    if (!dom) continue;
    totalSignal += 1;
    const pct = dom.percentile;
    if (expectation === "high" && pct >= 60) satisfied += 1;
    else if (expectation === "high" && pct >= 40) satisfied += 0.5;
    else if (expectation === "low" && pct <= 40) satisfied += 1;
    else if (expectation === "low" && pct <= 60) satisfied += 0.5;
  }
  if (totalSignal === 0) return 60;
  return Math.round((satisfied / totalSignal) * 100);
}

function cognitiveMatch(scores: CogScore[] | null, career: CareerType): number {
  if (!scores || !career.cognitiveFit) return 60;
  const fitKeys = Object.keys(career.cognitiveFit) as Array<keyof typeof career.cognitiveFit>;
  if (fitKeys.length === 0) return 60;

  let satisfied = 0;
  for (const k of fitKeys) {
    const score = scores.find((s) => s.ability === k);
    if (!score) continue;
    if (score.normalized100 >= 70) satisfied += 1;
    else if (score.normalized100 >= 50) satisfied += 0.6;
    else if (score.normalized100 >= 30) satisfied += 0.3;
  }
  return Math.round((satisfied / fitKeys.length) * 100);
}

function buildRationale(
  career: CareerType,
  hollandScore: number,
  bigFiveScore: number,
  cognitiveScore: number,
  personalCode: string,
): string[] {
  const r: string[] = [];
  if (hollandScore >= 60) {
    r.push(`你的 Holland 三字码 ${personalCode} 与该职业要求(${career.hollandCode})吻合 — 兴趣方向匹配度高`);
  } else if (hollandScore >= 30) {
    r.push(`你的兴趣剖面与该职业部分重合(共享 ${career.hollandCode} 中的部分维度)`);
  }
  if (bigFiveScore >= 70) {
    const keys = Object.keys(career.bigFiveFit).join("/");
    r.push(`Big Five 在 ${keys} 上达到该职业偏好的水平`);
  }
  if (cognitiveScore >= 70 && career.cognitiveFit) {
    r.push(`认知风格在该职业核心能力(${Object.keys(career.cognitiveFit).join("/")})上有优势`);
  }
  if (career.subjectsRequired.length > 0) {
    r.push(`选科必选: ${career.subjectsRequired.join(" + ")}`);
  }
  return r;
}

// ─── public ────────────────────────────────────────────

export function matchCareers(args: {
  domains: DomainScore[];
  riasec: RiasecResult;
  cognitive?: CogScore[] | null;
  topN?: number;
}): CareerMatch[] {
  const { domains, riasec, cognitive = null, topN = 3 } = args;

  const matches: CareerMatch[] = CAREERS.map((career) => {
    const scoreRiasec = hollandMatch(riasec.hollandCode, career.hollandCode);
    const scoreBigFive = bigFiveMatch(domains, career);
    const scoreCognitive = cognitive ? cognitiveMatch(cognitive, career) : 60;
    const total = Math.round(
      scoreRiasec * 0.5 + scoreBigFive * 0.35 + scoreCognitive * 0.15
    );
    const rationale = buildRationale(career, scoreRiasec, scoreBigFive, scoreCognitive, riasec.hollandCode);
    return { career, scoreTotal: total, scoreRiasec, scoreBigFive, scoreCognitive, rationale };
  });

  matches.sort((a, b) => b.scoreTotal - a.scoreTotal);
  return matches.slice(0, topN);
}

// ─── 选科推荐 ──────────────────────────────────────────

export interface SubjectPlanRecommendation {
  primary: string[];        // 必须选的科目(基于 top 1-3 职业的并集)
  alternatives: string[];   // 推荐的补充科目
  notes: string[];          // 解释
}

export function recommendSubjectPlan(matches: CareerMatch[]): SubjectPlanRecommendation {
  const required = new Set<string>();
  const recommended = new Set<string>();
  const careersByCategory = new Map<string, string[]>();

  for (const m of matches.slice(0, 3)) {
    for (const s of m.career.subjectsRequired) required.add(s);
    for (const s of m.career.subjectsRecommended ?? []) recommended.add(s);
    if (!careersByCategory.has(m.career.category)) careersByCategory.set(m.career.category, []);
    careersByCategory.get(m.career.category)!.push(m.career.zh);
  }

  // recommended 中如果已在 required 里就移除
  for (const s of required) recommended.delete(s);

  const notes: string[] = [];
  if (required.has("物理") && required.has("化学")) {
    notes.push("物理 + 化学是你 TOP-3 中多数路径的硬门槛 — 这一组合也覆盖了 90%+ 的理工医专业,是最不锁路径的选择");
  } else if (required.has("物理")) {
    notes.push("物理是你 TOP-3 中多数路径的硬门槛");
  } else if (required.size === 0) {
    notes.push("你的 TOP-3 路径选科限制不严 —— 可以根据自己擅长来选,选科组合的灵活性高");
  }
  if (recommended.has("生物")) notes.push("加修生物会扩展健康/农林路径");
  if (recommended.has("历史") || recommended.has("政治")) notes.push("文史路径建议保留历史或政治");

  return {
    primary: Array.from(required),
    alternatives: Array.from(recommended),
    notes,
  };
}
