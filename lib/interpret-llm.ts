// 朔知 · LLM 解读 · 客户端 SSE 读取器 ----------------------------------------
//
// 调用 /api/interpret(SSE 流式),把结构化分数交给 LLM 生成更个性化的解读。
// 缓存到 localStorage(reportId 是 key),所以同一份报告只调一次 LLM。
//
// 协议:
//   event: status   data: {phase, model}            连接已建立
//   event: delta    data: {text, count}             token 增量(可用于进度 UI)
//   event: complete data: {readings, usage, model}  全部成功 + 校验通过
//   event: error    data: {reason}                  失败 → 客户端走模板兜底
//
// 任何异常(网络/HTTP 非 2xx/error 事件)→ 返回 null。
// ----------------------------------------------------------------------------

import type { Domain, Report } from "./types";

export interface LLMReading {
  domain: Domain;
  meaning: string;
  limit: string;
  action: { label: string; title: string; body: string };
}

export interface LLMOutput {
  readings: LLMReading[];
  riasec_narrative?: string;
  cognitive_narrative?: string;
  career_narratives?: string[];
}

export type LLMProgressEvent =
  | { type: "status"; phase: string; model?: string }
  | { type: "delta"; chars: number; tokenCount: number }
  | { type: "complete"; output: LLMOutput }
  | { type: "error"; reason: string };

// Note: cache key bumped to v2 because shape changed (LLMOutput vs LLMReading[]).
// Old v1 cache entries are simply ignored — first revisit re-fetches.
const KEY = (reportId: string) => `shuozhi.llm-output.${reportId}.v2`;

function readCache(reportId: string): LLMOutput | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY(reportId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // legacy guard: must have readings array
    if (!parsed?.readings || !Array.isArray(parsed.readings)) return null;
    return parsed as LLMOutput;
  } catch { return null; }
}

function writeCache(reportId: string, output: LLMOutput) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY(reportId), JSON.stringify(output));
  } catch { /* quota or disabled — silently skip */ }
}

function buildPayload(report: Report) {
  return {
    grade: report.meta.grade ?? null,
    name:  report.meta.name  ?? null,
    reliability: {
      alpha:    report.reliability.alpha,
      polarity: report.reliability.polarity,
      grade:    report.reliability.gradeLabel,
    },
    domains: report.domains.map((d) => ({
      domain:     d.domain,
      percentile: Math.round(d.percentile),
      t_score:    Math.round(d.t),
      facets: d.facets.map((f) => ({
        facet:      f.facet,
        percentile: Math.round(f.percentile),
        t_score:    Math.round(f.t),
      })),
    })),
    riasec: report.riasec ? {
      hollandCode: report.riasec.hollandCode,
      topThree:    report.riasec.topThree,
      scores:      report.riasec.scores.map((s) => ({
        type: s.type, percentile: s.normalized100,
      })),
    } : null,
    cognitive: report.cognitive ? {
      scores: report.cognitive.scores.map((s) => ({
        ability: s.ability, percentile: s.normalized100,
      })),
    } : null,
    careers: report.careers ? report.careers.map((m) => ({
      zh:           m.career.zh,
      category:     m.career.category,
      hollandCode:  m.career.hollandCode,
      score_total:  m.scoreTotal,
      majors:       m.career.majors.slice(0, 3).map((mj) => mj.name),
      fitNotes:     m.career.fitNotes,
    })) : null,
  };
}

/**
 * Stream-based reader of /api/interpret. 可选地 emit 进度事件给 UI。
 * @returns 5 个 readings(顺序 O/C/E/A/N) 或 null(任何失败)
 */
export async function fetchLLMReadings(
  report: Report,
  onProgress?: (e: LLMProgressEvent) => void
): Promise<LLMOutput | null> {
  // 1. cache hit
  const cached = readCache(report.id);
  if (cached && cached.readings.length === 5) {
    onProgress?.({ type: "complete", output: cached });
    return cached;
  }

  // 2. fetch + read SSE
  try {
    const res = await fetch("/api/interpret", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "text/event-stream" },
      body: JSON.stringify(buildPayload(report)),
    });
    if (!res.ok || !res.body) {
      onProgress?.({ type: "error", reason: `http_${res.status}` });
      return null;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    let charsAccumulated = 0;
    let tokenAccumulated = 0;
    let result: LLMOutput | null = null;
    let errored = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buf += decoder.decode(value, { stream: true });
      const blocks = buf.split("\n\n");
      buf = blocks.pop() ?? "";

      for (const block of blocks) {
        const trimmed = block.trim();
        if (!trimmed) continue;

        let event = "message";
        let dataLine = "";
        for (const line of trimmed.split("\n")) {
          if (line.startsWith("event:")) event = line.slice(6).trim();
          else if (line.startsWith("data:")) dataLine += line.slice(5).trim();
        }
        if (!dataLine) continue;

        let payload: {
          text?: string; count?: number;
          readings?: LLMReading[];
          riasec_narrative?: string;
          cognitive_narrative?: string;
          career_narratives?: string[];
          reason?: string; phase?: string; model?: string;
        };
        try { payload = JSON.parse(dataLine); }
        catch { continue; }

        switch (event) {
          case "status":
            onProgress?.({ type: "status", phase: payload.phase ?? "", model: payload.model });
            break;
          case "delta":
            if (typeof payload.text === "string") {
              charsAccumulated += payload.text.length;
              tokenAccumulated = payload.count ?? tokenAccumulated + 1;
              onProgress?.({ type: "delta", chars: charsAccumulated, tokenCount: tokenAccumulated });
            }
            break;
          case "complete":
            if (Array.isArray(payload.readings) && payload.readings.length === 5) {
              result = {
                readings: payload.readings,
                riasec_narrative: payload.riasec_narrative,
                cognitive_narrative: payload.cognitive_narrative,
                career_narratives: payload.career_narratives,
              };
              onProgress?.({ type: "complete", output: result });
            }
            break;
          case "error":
            errored = true;
            onProgress?.({ type: "error", reason: payload.reason ?? "unknown" });
            break;
        }
      }
    }

    if (errored || !result) return null;
    writeCache(report.id, result);
    return result;
  } catch {
    onProgress?.({ type: "error", reason: "network" });
    return null;
  }
}
