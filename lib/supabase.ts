// Supabase REST client (raw fetch, Workers-compatible) -----------------------
//
// 我们不用 @supabase/supabase-js — 它在 Workers 里有时会有兼容问题(类似
// openai SDK 的 stream 迭代问题)。直接调 PostgREST 反而更稳。
//
// 数据存储原则:
//  - 不存姓名 / IP / 设备指纹
//  - 只存得分 + 年级 + 时间戳
//  - 用于聚合常模,提升报告对照精度
// ----------------------------------------------------------------------------

import type { Report } from "./types";

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export function getSupabaseConfig(): SupabaseConfig | null {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

// 从 Report 提取**匿名化**的提交载荷 — 完全去掉 name / id 关联
export function buildAnonymousSubmission(report: Report) {
  const dom = (k: string) => report.domains.find((d) => d.domain === k)?.raw ?? null;

  // 把 15 facets 的 raw 拍成 jsonb 友好的对象
  const facets: Record<string, number> = {};
  for (const d of report.domains) {
    for (const f of d.facets) {
      facets[f.facet] = Number(f.raw.toFixed(2));
    }
  }

  const riasec = report.riasec;
  const cog = report.cognitive;
  const health = report.health;

  return {
    grade: report.meta.grade ?? null,
    bfi_o: dom("O"),
    bfi_c: dom("C"),
    bfi_e: dom("E"),
    bfi_a: dom("A"),
    bfi_n: dom("N"),
    facets,
    riasec_r: riasec?.scores.find((s) => s.type === "R")?.raw ?? null,
    riasec_i: riasec?.scores.find((s) => s.type === "I")?.raw ?? null,
    riasec_a: riasec?.scores.find((s) => s.type === "A")?.raw ?? null,
    riasec_s: riasec?.scores.find((s) => s.type === "S")?.raw ?? null,
    riasec_e: riasec?.scores.find((s) => s.type === "E_riasec")?.raw ?? null,
    riasec_c: riasec?.scores.find((s) => s.type === "C_riasec")?.raw ?? null,
    cog_gf: cog?.scores.find((s) => s.ability === "Gf")?.raw ?? null,
    cog_gc: cog?.scores.find((s) => s.ability === "Gc")?.raw ?? null,
    cog_gv: cog?.scores.find((s) => s.ability === "Gv")?.raw ?? null,
    cog_gs: cog?.scores.find((s) => s.ability === "Gs")?.raw ?? null,
    phq9_total: health?.scales.find((s) => s.scale === "phq9")?.total ?? null,
    gad7_total: health?.scales.find((s) => s.scale === "gad7")?.total ?? null,
    alpha: report.reliability.alpha,
    polarity: report.reliability.polarity,
    avg_response_ms: report.timing?.avgMs ?? null,
    median_response_ms: report.timing?.medianMs ?? null,
  };
}

// ─── server-side helpers ──────────────────────────

export async function submitToSupabase(report: Report): Promise<{ ok: boolean; status: number }> {
  const cfg = getSupabaseConfig();
  if (!cfg) return { ok: false, status: 503 };
  const payload = buildAnonymousSubmission(report);
  const res = await fetch(`${cfg.url}/rest/v1/submissions`, {
    method: "POST",
    headers: {
      "apikey":         cfg.anonKey,
      "authorization":  `Bearer ${cfg.anonKey}`,
      "content-type":   "application/json",
      "prefer":         "return=minimal",
    },
    body: JSON.stringify(payload),
  });
  return { ok: res.ok, status: res.status };
}

export interface GradeNorms {
  grade: string | null;
  n: number;
  bfi_o_mean: number; bfi_o_sd: number;
  bfi_c_mean: number; bfi_c_sd: number;
  bfi_e_mean: number; bfi_e_sd: number;
  bfi_a_mean: number; bfi_a_sd: number;
  bfi_n_mean: number; bfi_n_sd: number;
  riasec_r_mean: number; riasec_i_mean: number; riasec_a_mean: number;
  riasec_s_mean: number; riasec_e_mean: number; riasec_c_mean: number;
  cog_gf_mean: number; cog_gc_mean: number; cog_gv_mean: number; cog_gs_mean: number;
  phq9_mean: number; gad7_mean: number;
  avg_response_ms_mean?: number;
}

export async function fetchGradeNorms(grade: string | null): Promise<GradeNorms | null> {
  const cfg = getSupabaseConfig();
  if (!cfg) return null;
  const res = await fetch(`${cfg.url}/rest/v1/rpc/get_grade_norms`, {
    method: "POST",
    headers: {
      "apikey":         cfg.anonKey,
      "authorization":  `Bearer ${cfg.anonKey}`,
      "content-type":   "application/json",
    },
    body: JSON.stringify({ p_grade: grade }),
  });
  if (!res.ok) return null;
  const rows = (await res.json()) as GradeNorms[];
  // 找匹配 grade 的那一行(若 grade=null,聚合可能返回多行)
  if (!rows || rows.length === 0) return null;
  const match = grade ? rows.find((r) => r.grade === grade) : rows[0];
  return match ?? null;
}
