// 朔知 · types ----------------------------------------------------------------

// ─── BFI-2 (existing core) ──────────────────────────────────────

export type Domain = "O" | "C" | "E" | "A" | "N";

export type Facet =
  // O · Open-Mindedness
  | "O.imagination" | "O.aesthetic" | "O.intellect"
  // C · Conscientiousness
  | "C.organization" | "C.discipline" | "C.responsibility"
  // E · Extraversion
  | "E.sociability" | "E.assertiveness" | "E.energy"
  // A · Agreeableness
  | "A.compassion" | "A.respect" | "A.trust"
  // N · Negative Emotionality
  | "N.anxiety" | "N.depression" | "N.volatility";

// ─── RIASEC ────────────────────────────────────────────────────

export type RiasecType = "R" | "I" | "A" | "S" | "E_riasec" | "C_riasec";
// 注: 后两个用 _riasec 后缀避免与 BFI-2 的 E/C 混淆

// ─── CHC 认知风格(自陈版 v0,非真正 IRT 测验)─────────────────

export type CogAbility = "Gf" | "Gc" | "Gv" | "Gs";
// Gf 流体推理 | Gc 晶体知识 | Gv 视觉空间 | Gs 加工速度

// ─── 心理健康筛查 ──────────────────────────────────────────────

export type HealthScale = "phq9" | "gad7";
export type HealthTier = "minimal" | "mild" | "moderate" | "moderately-severe" | "severe";

// ─── unified Item shape ───────────────────────────────────────

export type Module = "bfi2" | "riasec" | "cognitive" | "health";

export interface Item {
  id: number;            // unique across all modules (1..N)
  text: string;
  module: Module;
  reverse?: boolean;
  // bfi2 specific
  domain?: Domain;
  facet?: Facet;
  // riasec specific
  riasecType?: RiasecType;
  // cognitive specific
  cogAbility?: CogAbility;
  // health specific
  healthScale?: HealthScale;
  // health items always reverse-keyed = false; raw response 1-5 maps to symptom
  // frequency 0-4 (1="几乎没有" → 0; 5="几乎每天" → 4)
}

export type LikertResponse = 1 | 2 | 3 | 4 | 5;

// ─── session + scores ─────────────────────────────────────────

export interface AssessmentSession {
  id: string;
  startedAt: string;
  completedAt?: string;
  responses: Record<number, LikertResponse>;
  // First-time response latency per item (ms). Revisits don't overwrite — we
  // want the genuine first-instinct timing for nudge / reliability analysis.
  responseTimes?: Record<number, number>;
  meta: {
    grade?: string;
    name?: string;
  };
}

export interface FacetScore {
  facet: Facet;
  raw: number;
  t: number;
  percentile: number;
  normalized100: number;
}

export interface DomainScore {
  domain: Domain;
  raw: number;
  t: number;
  percentile: number;
  normalized100: number;
  facets: FacetScore[];
}

export interface RiasecScore {
  type: RiasecType;
  raw: number;          // mean of items, 1-5
  normalized100: number; // 0-100
}

export interface RiasecResult {
  scores: RiasecScore[];
  topThree: RiasecType[];   // 3-letter Holland code in priority
  hollandCode: string;      // e.g. "ISA"
}

export interface CogScore {
  ability: CogAbility;
  raw: number;
  normalized100: number;
}

export interface CognitiveResult {
  scores: CogScore[];
  // self-report only — explicit caveat
  caveat: string;
}

export interface HealthScaleResult {
  scale: HealthScale;
  total: number;        // sum on 0-N scale (PHQ: 0-36 / GAD: 0-28 in 5-pt remapped form)
  tier: HealthTier;
  flag_si?: boolean;    // PHQ-9 item 9 (suicidal ideation) > 0
}

export interface HealthResult {
  scales: HealthScaleResult[];
  highestTier: HealthTier;  // worst of the two for the cover
  needsTransferral: boolean; // moderate+ on either scale, OR si flag
}

export interface ReliabilityIndex {
  alpha: number;
  polarity: number;
  gradeLabel: "良好" | "一般" | "偏低";
}

// ─── career match ─────────────────────────────────────────────

export interface MajorRef {
  name: string;
  code: string;          // 教育部专业目录 6 位代码 + (K/T)
}

export interface CareerType {
  id: string;
  zh: string;            // 中文职业类型名(如 "临床医学")
  category: string;      // 11 大类(如 "健康服务型")
  hollandCode: string;   // 3 letters, e.g. "ISA"
  bigFiveFit: Partial<Record<Domain, "high" | "low">>;
  cognitiveFit?: Partial<Record<CogAbility, "high">>;
  majors: MajorRef[];
  // 选科要求(3+1+2 模式) — 必选 + 可选
  subjectsRequired: string[];        // 必选,如 ["物理","化学"]
  subjectsRecommended?: string[];    // 推荐
  description: string;
  fitNotes: string;      // 给学生看的,为什么这职业适合"你这种剖面"
}

export interface CareerMatch {
  career: CareerType;
  scoreTotal: number;     // 0-100 综合匹配度
  scoreRiasec: number;    // 0-100
  scoreBigFive: number;   // 0-100
  scoreCognitive: number; // 0-100 (或 0 如果未做 cognitive)
  rationale: string[];    // 显示用的理由列表
}

// ─── unified Report ──────────────────────────────────────────

export interface Report {
  id: string;
  sessionId: string;
  createdAt: string;
  meta: AssessmentSession["meta"];
  // BFI-2(必有,核心)
  domains: DomainScore[];
  reliability: ReliabilityIndex;
  // 扩展模块(可选,看 session 里答没答)
  riasec?: RiasecResult;
  cognitive?: CognitiveResult;
  health?: HealthResult;
  careers?: CareerMatch[];  // top-3
  // 答题时长统计(ms),来自 session.responseTimes 聚合
  timing?: {
    avgMs: number;
    medianMs: number;
    nItemsTimed: number;
  };
}

// ─── storage ─────────────────────────────────────────────────

export interface StorageAdapter {
  saveSession(s: AssessmentSession): Promise<void>;
  getSession(id: string): Promise<AssessmentSession | null>;
  saveReport(r: Report): Promise<void>;
  getReport(id: string): Promise<Report | null>;
  listReports(): Promise<Report[]>;
  saveDraft(s: AssessmentSession): Promise<void>;
  getDraft(): Promise<AssessmentSession | null>;
  clearDraft(): Promise<void>;
}
