"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Brand } from "@/components/Brand";
import { RadarChart } from "@/components/RadarChart";
import { FacetBar } from "@/components/FacetBar";
import { getStorage } from "@/lib/storage";
import type { Domain, Report } from "@/lib/types";
import { DOMAIN_LABELS, FACET_LABELS } from "@/lib/bfi2-items";
import { generateReadings, overview } from "@/lib/interpret";
import { fetchLLMReadings, type LLMOutput } from "@/lib/interpret-llm";
import { RIASEC_LABELS } from "@/lib/riasec";
import { COG_LABELS } from "@/lib/cognitive";
import { HEALTH_LABELS, TIER_LABELS, CRISIS_RESOURCES } from "@/lib/health";
import { recommendSubjectPlan } from "@/lib/match";
import { applyEmpiricalNorms, MIN_N_FOR_EMPIRICAL } from "@/lib/norms-empirical";
import type { GradeNorms } from "@/lib/supabase";

const DOM_TO_EN: Record<Domain, string> = {
  O: "OPENNESS",
  C: "CONSCIENTIOUSNESS",
  E: "EXTRAVERSION",
  A: "AGREEABLENESS",
  N: "NEG·EMOTIONALITY",
};

const ROMAN = ["I", "II", "III", "IV", "V"];

export default function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [report, setReport] = useState<Report | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [llmOutput, setLlmOutput] = useState<LLMOutput | null>(null);
  const [llmStatus, setLlmStatus] = useState<"idle" | "loading" | "ready" | "fallback">("idle");
  const [llmChars, setLlmChars] = useState(0);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackTarget, setFeedbackTarget] = useState<string>("OVERALL");
  const [feedbackSent, setFeedbackSent] = useState(false);

  // Whether empirical norms have been applied (replaces default when N≥20).
  // The actual N count is intentionally NOT stored — keep cohort scale opaque to users.
  const [normsApplied, setNormsApplied] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const r0 = await getStorage().getReport(decodeURIComponent(id));
      if (!alive) return;
      if (!r0) { setNotFound(true); return; }
      setReport(r0);

      // ─── 1. fire-and-forget submit (匿名,只一次)
      const submittedKey = `shuozhi.submitted.${r0.id}`;
      if (typeof window !== "undefined" && !window.localStorage.getItem(submittedKey)) {
        fetch("/api/submit", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ report: r0 }),
        }).then((res) => {
          if (res.ok && typeof window !== "undefined") {
            window.localStorage.setItem(submittedKey, new Date().toISOString());
          }
        }).catch(() => { /* silent */ });
      }

      // ─── 2. fetch empirical norms for this grade & swap if N is high enough
      try {
        const grade = r0.meta.grade;
        const url = grade ? `/api/norms?grade=${encodeURIComponent(grade)}` : "/api/norms";
        const res = await fetch(url);
        if (res.ok && alive) {
          const { norms }: { norms: GradeNorms | null } = await res.json();
          if (norms && norms.n >= MIN_N_FOR_EMPIRICAL) {
            setReport(applyEmpiricalNorms(r0, norms));
            setNormsApplied(true);
          }
        }
      } catch { /* silent */ }

      // ─── 3. LLM 解读
      setLlmStatus("loading");
      const llm = await fetchLLMReadings(r0, (e) => {
        if (!alive) return;
        if (e.type === "delta") setLlmChars(e.chars);
      });
      if (!alive) return;
      if (llm) { setLlmOutput(llm); setLlmStatus("ready"); }
      else     { setLlmStatus("fallback"); }
    })();
    return () => { alive = false; };
  }, [id]);

  if (notFound) {
    return (
      <div className="container-page py-24 text-center">
        <div className="label-mono mb-6">404 / READOUT NOT FOUND</div>
        <h1 className="font-display text-[36px] mb-4">这份报告找不到</h1>
        <p className="label-mono mb-8">数据存在浏览器本地 — 也许它在另一台设备上。</p>
        <Link href="/" className="btn-ghost">RETURN TO HOME</Link>
      </div>
    );
  }
  if (!report) {
    return <div className="container-page py-24 text-center label-mono">LOADING READOUT…</div>;
  }

  const templateReadings = generateReadings(report);
  const readings = llmOutput?.readings
    ? templateReadings.map((tr) => {
        const llm = llmOutput.readings.find((x) => x.domain === tr.domain);
        return llm
          ? { ...tr, meaning: llm.meaning, limit: llm.limit, action: llm.action }
          : tr;
      })
    : templateReadings;
  const overviewText = overview(report);
  const created = new Date(report.createdAt);
  const ymd = `${created.getFullYear()}.${String(created.getMonth() + 1).padStart(2, "0")}.${String(created.getDate()).padStart(2, "0")}`;
  const reportNum = report.id.slice(-8).toUpperCase();
  const subjectName = report.meta.name ?? "SUBJECT";
  const subjectLatin = subjectName.toLowerCase();

  return (
    <>
      {/* ─── codified top strip ─── */}
      <nav className="border-b border-ink">
        <div className="container-wide py-3 grid grid-cols-12 gap-4 items-baseline">
          <div className="col-span-6 sm:col-span-3"><Brand /></div>
          <div className="col-span-6 sm:col-span-3 label-mono sm:text-center">REPORT/{reportNum}</div>
          <div className="hidden sm:block sm:col-span-3 label-mono text-center">{ymd}</div>
          <div className="col-span-12 sm:col-span-3 label-mono text-right">
            <span className="inline-flex items-center gap-2">
              <span className="live-dot" />
              {llmStatus === "loading"
                ? <>GENERATING <span className="text-signal tnum">{llmChars.toString().padStart(4, "0")}</span> CH</>
                : llmStatus === "ready"
                ? "READOUT/LIVE"
                : "READOUT/STATIC"}
            </span>
          </div>
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <section className="border-b border-frost">
        <div className="container-wide pt-16 lg:pt-24 pb-16 fade-up">
          <div className="grid grid-cols-12 gap-4 mb-6">
            <div className="col-span-12 sm:col-span-2 label-mono">SUBJECT</div>
            <div className="col-span-12 sm:col-span-10">
              <h1
                className="font-display font-medium tracking-[-0.03em] leading-[0.96]"
                style={{ fontSize: "clamp(44px, 8vw, 108px)" }}
              >
                {subjectName}
              </h1>
              <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 mt-3">
                <span className="label-mono">{report.meta.grade ?? "—"}</span>
                <span className="label-mono">α {report.reliability.alpha.toFixed(2)} · {report.reliability.gradeLabel}</span>
                <span className="label-mono">POL·{report.reliability.polarity.toString().padStart(2, "0")}</span>
                <span className={`label-mono ${normsApplied ? "text-signal" : ""}`}>
                  BASELINE · {report.meta.grade ?? "全体"}
                  {normsApplied ? " · LIVE" : " · DEFAULT"}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-4 mt-12">
            <div className="col-span-12 sm:col-span-2 label-mono pt-1">ABSTRACT</div>
            <div className="col-span-12 sm:col-span-9 lg:col-span-7">
              <p className="text-[18px] leading-[1.55] text-ink-soft">
                {overviewText}
                它只是把你这次作答里能稳定看到的几种倾向，用一种比 “你充满热情”
                更具体的方式讲给你听。哪段读起来不像你 ——
                <span className="italic-moment"> 请相信你自己</span>。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── TELEMETRY · radar + readout ─── */}
      <section className="border-b border-frost">
        <div className="container-wide py-16 lg:py-24 fade-up">
          <div className="grid grid-cols-12 gap-4 mb-8">
            <div className="col-span-12 sm:col-span-2 label-mono">CH·00 / TELEMETRY</div>
            <div className="col-span-12 sm:col-span-10">
              <h2 className="font-display text-[clamp(28px,4vw,40px)] leading-[1.1] font-medium tracking-[-0.02em] max-w-[720px]">
                五个维度的<span className="italic-moment text-signal">连续刻度</span> ——
                不是把你装进盒子。
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-8 lg:gap-12 items-start mt-8">
            {/* radar */}
            <div className="col-span-12 lg:col-span-7 xl:col-span-7">
              <div className="max-w-[560px] mx-auto">
                <RadarChart
                  data={report.domains.map((d) => ({
                    domain: d.domain,
                    label: `${DOMAIN_LABELS[d.domain].cn} ${d.domain}`,
                    value: d.normalized100,
                  }))}
                />
              </div>
            </div>

            {/* readout strip */}
            <div className="col-span-12 lg:col-span-5">
              <div className="border-t border-ink">
                {report.domains.map((d, i) => (
                  <div
                    key={d.domain}
                    className="grid grid-cols-[44px_1fr_72px_56px] items-baseline gap-3 py-3 border-b border-frost"
                  >
                    <span className="label-mono">{(i + 1).toString().padStart(2, "0")}</span>
                    <span className="font-display text-[15px]">
                      {DOMAIN_LABELS[d.domain].cn}{" "}
                      <span className="label-mono ml-1">{d.domain}</span>
                    </span>
                    <span className="label-mono text-right">
                      {Math.round(d.percentile) >= 70 ? "ABOVE" : Math.round(d.percentile) <= 30 ? "BELOW" : "MEDIAN"}
                    </span>
                    <span
                      className="font-mono text-[20px] tnum text-right text-signal"
                      style={{ fontFeatureSettings: '"tnum" 1', letterSpacing: "-0.02em" }}
                    >
                      {d.normalized100.toString().padStart(2, "0")}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 border border-frost bg-bg-card">
                <div className="label-mono mb-2">FOOTNOTE / 疏注</div>
                <p className="text-[13px] leading-[1.65] text-ink-soft">
                  得分是百分位换算后的位置（T 分），不是答对了多少题。
                  人格量表里没有 “对错” —— <span className="font-mono text-signal">78</span> 的意思是：
                  你比 78% 同龄人在该维度上更靠近右端。
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 5 dimension chapters ─── */}
      {readings.map((r, idx) => {
        const d = report.domains[idx];
        const pctR = Math.round(d.percentile);
        const tier = pctR >= 70 ? "ABOVE NORM" : pctR <= 30 ? "BELOW NORM" : "NEAR MEDIAN";
        const chipClass = pctR >= 70 ? "chip-signal" : pctR <= 30 ? "chip-slate" : "chip-ink";

        return (
          <section key={d.domain} className="border-b border-frost fade-up">
            <div className="container-wide py-16 lg:py-24">
              {/* chapter heading */}
              <div className="grid grid-cols-12 gap-4 mb-10">
                <div className="col-span-12 sm:col-span-2 label-mono">
                  CH·{(idx + 1).toString().padStart(2, "0")} / 05
                </div>
                <div className="col-span-12 sm:col-span-10">
                  <div className="label-mono mb-2">{DOM_TO_EN[d.domain]}</div>
                  <h2
                    className="font-display font-medium tracking-[-0.02em] leading-[1.0]"
                    style={{ fontSize: "clamp(36px, 5.5vw, 64px)" }}
                  >
                    {DOMAIN_LABELS[d.domain].cn}
                  </h2>
                  <p className="label-mono mt-3 max-w-[540px] !text-slate text-[12px] tracking-wide normal-case">
                    {DOMAIN_LABELS[d.domain].sub}
                  </p>
                </div>
              </div>

              {/* score block — big number + facet bars right */}
              <div className="grid grid-cols-12 gap-8 mb-12 mt-12 items-start">
                <div className="col-span-12 lg:col-span-5">
                  <div className="border-t-2 border-ink pt-5 pr-4">
                    <div className="flex items-end gap-4">
                      <div
                        className="num-display text-ink type-on"
                        style={{ fontSize: "clamp(80px, 14vw, 156px)" }}
                      >
                        {d.normalized100.toString().padStart(2, "0")}
                      </div>
                      <div className="pb-6">
                        <div className="label-mono">/100</div>
                        <div className="label-mono mt-1">T·{Math.round(d.t)}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-3">
                      <span className={`chip ${chipClass}`}>{tier}</span>
                      <span className="label-mono">PCTILE {pctR}</span>
                    </div>
                  </div>
                </div>

                <div className="col-span-12 lg:col-span-7">
                  <div className="label-mono mb-3">FACET BREAKDOWN · 三个下层维度</div>
                  <div className="border-t border-frost pt-2">
                    {d.facets.map((f) => (
                      <FacetBar key={f.facet} name={FACET_LABELS[f.facet]} value={f.normalized100} />
                    ))}
                  </div>
                </div>
              </div>

              {/* meaning */}
              <div className="grid grid-cols-12 gap-4 mb-10">
                <div className="col-span-12 sm:col-span-2 label-mono pt-2">SECTION·A</div>
                <div className="col-span-12 sm:col-span-10 lg:col-span-9">
                  <h3 className="label-mono-ink pb-2 border-b border-ink mb-5 inline-block">
                    WHAT IT MEANS · IN YOUR CASE
                  </h3>
                  <p className="text-[17px] leading-[1.7] text-ink">{r.meaning}</p>
                </div>
              </div>

              {/* italic moment — the human pause between data and constraint */}
              <div className="grid grid-cols-12 gap-4 my-12">
                <div className="col-span-12 sm:col-start-3 sm:col-span-9 lg:col-span-8">
                  <div className="border-l-2 border-signal pl-5">
                    <span className="label-mono-signal block mb-2">PAUSE · 人性时刻</span>
                    <p
                      className="italic-moment text-ink"
                      style={{ fontSize: "clamp(22px, 3vw, 30px)", lineHeight: 1.25 }}
                    >
                      {humanPause(d.domain, pctR)}
                    </p>
                  </div>
                </div>
              </div>

              {/* limit */}
              <div className="grid grid-cols-12 gap-4 mb-10">
                <div className="col-span-12 sm:col-span-2 label-mono pt-2">SECTION·B</div>
                <div className="col-span-12 sm:col-span-10 lg:col-span-9">
                  <h3 className="label-mono-ink pb-2 border-b border-ink mb-5 inline-block">
                    WHEN IT BECOMES A CONSTRAINT
                  </h3>
                  <p className="text-[17px] leading-[1.7] text-ink">{r.limit}</p>
                </div>
              </div>

              {/* action card — black panel with signal accents */}
              <div className="grid grid-cols-12 gap-4 mt-12">
                <div className="col-span-12 sm:col-span-2 label-mono pt-2">ACTION/T+30</div>
                <div className="col-span-12 sm:col-span-10 lg:col-span-9">
                  <div className="bg-ink text-bg-soft p-6 sm:p-8 lg:p-10 relative">
                    <div className="flex items-baseline justify-between mb-5 pb-4 border-b border-bg-soft/15">
                      <span className="label-mono-signal" style={{ color: "#ff3a1c" }}>NEXT 30 DAYS · ONE THING TO TRY</span>
                      <span className="label-mono" style={{ color: "#a8a89e" }}>RX·CH{(idx + 1).toString().padStart(2, "0")}</span>
                    </div>
                    <h4
                      className="font-display font-medium tracking-[-0.02em] mb-4 text-bg-soft"
                      style={{ fontSize: "clamp(22px, 3vw, 30px)", lineHeight: 1.2 }}
                    >
                      {r.action.title}
                    </h4>
                    <p className="text-[15px] leading-[1.7] text-bg-deep" style={{ color: "#cfd1c6" }}>
                      {r.action.body}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        );
      })}

      {/* ═══════════ CH·06 兴趣倾向 RIASEC ═══════════ */}
      {report.riasec && (
        <section className="border-b border-frost fade-up">
          <div className="container-wide py-16 lg:py-24">
            <div className="grid grid-cols-12 gap-4 mb-10">
              <div className="col-span-12 sm:col-span-2 label-mono">CH·06 / RIASEC</div>
              <div className="col-span-12 sm:col-span-10">
                <div className="label-mono mb-2">INTERESTS · HOLLAND CODE</div>
                <h2
                  className="font-display font-medium tracking-[-0.02em] leading-[1.0]"
                  style={{ fontSize: "clamp(36px, 5.5vw, 64px)" }}
                >
                  你的兴趣三字码 ——{" "}
                  <span className="font-mono text-signal" style={{ fontFeatureSettings: '"tnum" 1' }}>
                    {report.riasec.hollandCode}
                  </span>
                </h2>
                <p className="font-serifcn text-[15px] leading-[1.7] text-ink-mute mt-3 max-w-[640px]">
                  Holland 职业兴趣理论(1959)将兴趣分为 6 类。你的三字码是按你最强的 3 类排序得出的 ——
                  这是后续职业匹配的<span className="italic-moment text-ink"> 主驱动信号</span>。
                </p>
              </div>
            </div>

            <div className="grid grid-cols-12 gap-8 mt-10">
              <div className="col-span-12 lg:col-span-5">
                <div className="label-mono mb-3">YOUR TOP-3</div>
                <div className="border-t-2 border-ink">
                  {report.riasec.topThree.map((t, i) => {
                    const lbl = RIASEC_LABELS[t];
                    const score = report.riasec!.scores.find((s) => s.type === t)!;
                    return (
                      <div key={t} className="grid grid-cols-[36px_56px_1fr_56px] items-baseline gap-3 py-4 border-b border-frost">
                        <span className="label-mono">{(i + 1).toString().padStart(2, "0")}</span>
                        <span className="font-mono text-[24px] text-signal tnum"
                              style={{ fontFeatureSettings: '"tnum" 1', letterSpacing: "-0.02em" }}>
                          {lbl.code}
                        </span>
                        <div>
                          <div className="font-display text-[16px]">{lbl.cn}</div>
                          <div className="label-mono mt-0.5">{lbl.oneLiner}</div>
                        </div>
                        <span className="font-mono text-[18px] tnum text-right text-signal"
                              style={{ fontFeatureSettings: '"tnum" 1', letterSpacing: "-0.02em" }}>
                          {score.normalized100.toString().padStart(2, "0")}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="col-span-12 lg:col-span-7">
                <div className="label-mono mb-3">ALL 6 INTERESTS · 同步对比</div>
                <div className="border-t border-frost pt-2">
                  {report.riasec.scores.map((s) => {
                    const lbl = RIASEC_LABELS[s.type];
                    return (
                      <div key={s.type} className="grid grid-cols-[140px_1fr_44px] items-center gap-4 py-2">
                        <span className="label-mono-ink truncate">
                          {lbl.code} · {lbl.cn}
                        </span>
                        <div className="relative h-[3px] bg-frost-soft">
                          <div className="absolute left-0 top-0 h-full bg-signal" style={{ width: `${s.normalized100}%` }} />
                        </div>
                        <span className="font-mono text-[14px] text-ink text-right tnum"
                              style={{ fontFeatureSettings: '"tnum" 1' }}>
                          {s.normalized100.toString().padStart(2, "0")}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* LLM 叙述 — 把三字码与 BFI 连起来 */}
            {llmOutput?.riasec_narrative && (
              <div className="mt-10 grid grid-cols-12 gap-4">
                <div className="col-span-12 sm:col-span-2 label-mono pt-2">SECTION·B · LLM</div>
                <div className="col-span-12 sm:col-span-10 lg:col-span-9">
                  <h3 className="label-mono-ink pb-2 border-b border-ink mb-5 inline-block">
                    READING · 你的三字码 + 人格组合意味着什么
                  </h3>
                  <p className="font-serifcn text-[16px] leading-[1.85] text-ink">
                    {llmOutput.riasec_narrative}
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ═══════════ CH·07 认知风格 ═══════════ */}
      {report.cognitive && (
        <section className="border-b border-frost fade-up">
          <div className="container-wide py-16 lg:py-24">
            <div className="grid grid-cols-12 gap-4 mb-10">
              <div className="col-span-12 sm:col-span-2 label-mono">CH·07 / CHC v0</div>
              <div className="col-span-12 sm:col-span-10">
                <div className="label-mono mb-2">COGNITIVE STYLE · SELF-REPORT</div>
                <h2
                  className="font-display font-medium tracking-[-0.02em] leading-[1.0]"
                  style={{ fontSize: "clamp(36px, 5.5vw, 64px)" }}
                >
                  四种认知偏好。
                </h2>
                <div className="mt-4 p-4 border-l-2 border-signal bg-bg-card">
                  <div className="label-mono-signal mb-1">CAVEAT · 不是 IQ</div>
                  <p className="font-serifcn text-[14px] leading-[1.7] text-ink-soft max-w-[640px]">
                    {report.cognitive.caveat}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-12 gap-8">
              {report.cognitive.scores.map((s) => {
                const lbl = COG_LABELS[s.ability];
                return (
                  <div key={s.ability} className="col-span-12 sm:col-span-6 lg:col-span-3">
                    <div className="label-mono mb-2">{s.ability} · {lbl.en.toUpperCase()}</div>
                    <div className="font-display text-signal num-display tnum"
                         style={{ fontSize: 64, fontFeatureSettings: '"tnum" 1', letterSpacing: "-0.04em" }}>
                      {s.normalized100.toString().padStart(2, "0")}
                    </div>
                    <div className="font-display text-[15px] mt-2">{lbl.cn}</div>
                    <p className="font-serifcn text-[13px] leading-[1.6] text-ink-soft mt-2">
                      {lbl.oneLiner}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* LLM 认知叙述 — 4 能力剖面 + 学习场景 */}
            {llmOutput?.cognitive_narrative && (
              <div className="mt-10 grid grid-cols-12 gap-4">
                <div className="col-span-12 sm:col-span-2 label-mono pt-2">SECTION·B · LLM</div>
                <div className="col-span-12 sm:col-span-10 lg:col-span-9">
                  <h3 className="label-mono-ink pb-2 border-b border-ink mb-5 inline-block">
                    READING · 这个能力剖面在学习中意味着什么
                  </h3>
                  <p className="font-serifcn text-[16px] leading-[1.85] text-ink">
                    {llmOutput.cognitive_narrative}
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ═══════════ CH·08 心理健康筛查 ═══════════ */}
      {report.health && (
        <section className="border-b border-frost fade-up">
          <div className="container-wide py-16 lg:py-24">
            <div className="grid grid-cols-12 gap-4 mb-10">
              <div className="col-span-12 sm:col-span-2 label-mono">CH·08 / SCREEN</div>
              <div className="col-span-12 sm:col-span-10">
                <div className="label-mono mb-2">WELL-BEING · PHQ-9 + GAD-7</div>
                <h2
                  className="font-display font-medium tracking-[-0.02em] leading-[1.0]"
                  style={{ fontSize: "clamp(36px, 5.5vw, 64px)" }}
                >
                  心理健康筛查。
                </h2>
                <p className="font-serifcn text-[15px] leading-[1.7] text-ink-mute mt-3 max-w-[640px]">
                  这是<span className="italic-moment text-ink"> 筛查工具,不是诊断</span>。
                  PHQ-9(抑郁)和 GAD-7(焦虑)是国际通用、中文版心理测量学证据扎实的两个量表。
                </p>
              </div>
            </div>

            {/* transferral banner — high tier or SI */}
            {report.health.needsTransferral && (
              <div className="mb-8 p-6 border-2 border-signal bg-signal-soft">
                <div className="label-mono-signal mb-2">▌ TRANSFERRAL · 建议联系专业支持</div>
                <p className="font-serifcn text-[15px] leading-[1.7] text-ink mb-4">
                  你某些项目的得分进入了**中度或以上区间**。这不一定意味着有严重问题,但建议:
                </p>
                <ul className="font-serifcn text-[14px] leading-[1.7] text-ink-soft mb-4 list-disc ml-5 space-y-1">
                  <li>找你信任的家长 / 老师 / 学校心理老师聊一次</li>
                  <li>若情况持续,请预约校外心理咨询(中国大陆部分热线见下)</li>
                  {report.health.scales.find((s) => s.flag_si) && (
                    <li className="text-signal font-medium">
                      你在自伤/自杀想法那一项有勾选 —— 现在就拨打下面任意一条热线,这是最重要的一步
                    </li>
                  )}
                </ul>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                  {CRISIS_RESOURCES.map((r) => (
                    <div key={r.phone} className="p-3 bg-bg-soft border border-frost">
                      <div className="label-mono mb-1">{r.note}</div>
                      <div className="font-mono text-[15px] text-ink tnum">{r.phone}</div>
                      <div className="font-serifcn text-[12px] text-ink-mute mt-0.5">{r.name}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-12 gap-8">
              {report.health.scales.map((s) => {
                const lbl = HEALTH_LABELS[s.scale];
                const tier = TIER_LABELS[s.tier];
                const tierClass =
                  tier.cssClass === "alert" ? "text-signal" :
                  tier.cssClass === "warn"  ? "text-ink"     :
                  "text-sage";
                return (
                  <div key={s.scale} className="col-span-12 lg:col-span-6 border-t-2 border-ink pt-4">
                    <div className="flex items-baseline justify-between mb-3">
                      <span className="label-mono-ink">{lbl.en} · {lbl.cn}</span>
                      <span className={`chip ${tier.cssClass === "alert" ? "chip-signal" : tier.cssClass === "warn" ? "chip-ink" : "chip-slate"}`}>
                        {tier.en}
                      </span>
                    </div>
                    <p className="font-serifcn text-[13px] text-ink-mute mb-3">{lbl.description}</p>
                    <div className="flex items-baseline gap-3">
                      <div className={`font-display num-display tnum ${tierClass}`}
                           style={{ fontSize: 64, fontFeatureSettings: '"tnum" 1', letterSpacing: "-0.04em" }}>
                        {s.total.toString().padStart(2, "0")}
                      </div>
                      <div className="label-mono pb-3">
                        / {s.scale === "phq9" ? "27" : "21"} 标准量表分
                      </div>
                    </div>
                    <div className="label-mono mt-2">{tier.cn} · {tier.en}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════ CH·09 职业匹配 + 选科推荐 ═══════════ */}
      {report.careers && report.careers.length > 0 && (
        <section className="border-b border-frost fade-up">
          <div className="container-wide py-16 lg:py-24">
            <div className="grid grid-cols-12 gap-4 mb-10">
              <div className="col-span-12 sm:col-span-2 label-mono">CH·09 / MATCH</div>
              <div className="col-span-12 sm:col-span-10">
                <div className="label-mono mb-2">CAREER · MAJOR · SUBJECT PLAN</div>
                <h2
                  className="font-display font-medium tracking-[-0.02em] leading-[1.0]"
                  style={{ fontSize: "clamp(36px, 5.5vw, 64px)" }}
                >
                  专业 · 职业 · 选科 三联推荐。
                </h2>
                <p className="font-serifcn text-[15px] leading-[1.7] text-ink-mute mt-3 max-w-[700px]">
                  基于 BFI-2 + RIASEC{report.cognitive ? " + 认知风格" : ""}的三维匹配。
                  下面是 TOP-3 职业方向,每个方向带<span className="italic-moment text-ink"> 教育部专业代码 </span>
                  和<span className="italic-moment text-ink"> 3+1+2 选科要求</span>。
                </p>
              </div>
            </div>

            {/* 选科推荐总结 */}
            {(() => {
              const plan = recommendSubjectPlan(report.careers!);
              return (
                <div className="bg-ink text-bg-soft p-6 lg:p-8 mb-12">
                  <div className="label-mono mb-4" style={{ color: "#ff3a1c" }}>SUBJECT PLAN · 综合 TOP-3 选科建议</div>
                  <div className="grid grid-cols-12 gap-6">
                    <div className="col-span-12 md:col-span-6">
                      <div className="label-mono mb-2" style={{ color: "#a8a89e" }}>必选(必须包含)</div>
                      {plan.primary.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {plan.primary.map((s) => (
                            <span key={s} className="px-3 py-1.5 bg-signal text-bg-soft font-mono text-[12px] tracking-[0.1em]">
                              {s}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-bg-soft font-serifcn text-[14px]">你的 TOP-3 路径选科限制不严</p>
                      )}
                    </div>
                    <div className="col-span-12 md:col-span-6">
                      <div className="label-mono mb-2" style={{ color: "#a8a89e" }}>推荐补充</div>
                      {plan.alternatives.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {plan.alternatives.map((s) => (
                            <span key={s} className="px-3 py-1.5 border border-bg-soft font-mono text-[12px] tracking-[0.1em]" style={{ color: "#fbfbf7" }}>
                              {s}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="font-serifcn text-[14px]" style={{ color: "#a8a89e" }}>—</p>
                      )}
                    </div>
                  </div>
                  {plan.notes.length > 0 && (
                    <ul className="mt-5 pt-5 border-t border-bg-soft/15 font-serifcn text-[13px] leading-[1.7] space-y-1.5" style={{ color: "#cfd1c6" }}>
                      {plan.notes.map((n, i) => <li key={i}>· {n}</li>)}
                    </ul>
                  )}
                </div>
              );
            })()}

            {/* TOP-3 职业卡片 */}
            <div className="space-y-8">
              {report.careers!.map((m, idx) => (
                <div key={m.career.id} className="border-t-2 border-ink pt-5">
                  <div className="grid grid-cols-12 gap-4 mb-4">
                    <div className="col-span-12 sm:col-span-2">
                      <div className="font-mono text-signal num-display tnum"
                           style={{ fontSize: 56, fontFeatureSettings: '"tnum" 1', letterSpacing: "-0.04em" }}>
                        0{idx + 1}
                      </div>
                      <div className="label-mono mt-1">MATCH {m.scoreTotal}</div>
                    </div>
                    <div className="col-span-12 sm:col-span-10">
                      <div className="label-mono mb-1">{m.career.category}</div>
                      <h3 className="font-display text-[26px] sm:text-[32px] font-medium tracking-[-0.01em] mb-2">
                        {m.career.zh}
                      </h3>
                      <p className="font-serifcn text-[14.5px] leading-[1.65] text-ink-soft max-w-[720px]">
                        {m.career.description}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-4 mt-6">
                    {/* match score breakdown */}
                    <div className="col-span-12 md:col-span-3">
                      <div className="label-mono mb-3">MATCH BREAKDOWN</div>
                      <div className="space-y-2 text-[13px]">
                        {[
                          { label: "RIASEC", value: m.scoreRiasec, weight: "50%" },
                          { label: "BIG FIVE", value: m.scoreBigFive, weight: "35%" },
                          { label: "COGNITIVE", value: m.scoreCognitive, weight: "15%" },
                        ].map((b) => (
                          <div key={b.label} className="flex items-baseline justify-between border-b border-frost-soft pb-1">
                            <span className="label-mono">{b.label} · {b.weight}</span>
                            <span className="font-mono text-ink tnum">{b.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* majors */}
                    <div className="col-span-12 md:col-span-5">
                      <div className="label-mono mb-3">推荐专业 · 教育部代码</div>
                      <ul className="space-y-1 text-[13.5px] leading-[1.65]">
                        {m.career.majors.map((maj) => (
                          <li key={maj.code} className="flex items-baseline justify-between gap-3">
                            <span className="text-ink">{maj.name}</span>
                            <span className="font-mono text-ink-mute tnum text-[12px]">{maj.code}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* subject + rationale */}
                    <div className="col-span-12 md:col-span-4">
                      <div className="label-mono mb-3">3+1+2 选科要求</div>
                      {m.career.subjectsRequired.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {m.career.subjectsRequired.map((s) => (
                            <span key={s} className="chip chip-signal">{s}</span>
                          ))}
                          {(m.career.subjectsRecommended ?? []).map((s) => (
                            <span key={s} className="chip chip-slate">{s} 推荐</span>
                          ))}
                        </div>
                      ) : (
                        <p className="font-serifcn text-[13px] text-ink-soft mb-4">选科限制不严</p>
                      )}
                      {m.rationale.length > 0 && (
                        <ul className="font-serifcn text-[12.5px] leading-[1.7] text-ink-mute space-y-1">
                          {m.rationale.slice(0, 3).map((r, i) => <li key={i}>· {r}</li>)}
                        </ul>
                      )}
                    </div>
                  </div>

                  <p className="font-serifcn text-[13.5px] leading-[1.7] text-ink-mute mt-5 pt-4 border-t border-frost-soft max-w-[800px]">
                    <span className="italic-moment text-ink">为什么 这个职业匹配你这种剖面:</span> {m.career.fitNotes}
                  </p>

                  {/* LLM 个性化叙述 — 用学生具体得分讲匹配 + 进入这个领域的注意事项 */}
                  {llmOutput?.career_narratives?.[idx] && (
                    <div className="mt-4 p-5 bg-bg-card border-l-2 border-signal max-w-[820px]">
                      <div className="label-mono-signal mb-2">▌ READING · 写给你这一份</div>
                      <p className="font-serifcn text-[14.5px] leading-[1.8] text-ink">
                        {llmOutput.career_narratives[idx]}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── parent dialogue ─── */}
      <section className="border-b border-frost">
        <div className="container-wide py-16 lg:py-24 fade-up">
          <div className="grid grid-cols-12 gap-4 mb-8">
            <div className="col-span-12 sm:col-span-2 label-mono">CH·06 / DIALOGUE</div>
            <div className="col-span-12 sm:col-span-10">
              <h2 className="font-display text-[clamp(28px,4vw,42px)] leading-[1.1] font-medium tracking-[-0.02em] max-w-[720px]">
                把这份报告讲给爸妈听 ——<br />
                <span className="italic-moment text-signal">四句话足够</span>。
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-4 mt-12">
            <div className="col-span-12 sm:col-start-3 sm:col-span-10 lg:col-span-9">
              <div className="border-t border-ink">
                {[
                  "我做了一份性格测评，叫 BFI-2，是大学心理学常用的工具，不是网上 16 型那种。我想花十分钟把结果讲给你们听。",
                  "最高的两项是开放性和外向性。这不是说我不学习 — 是说我学得最好的方式是 “和人讨论 + 接触新东西”。",
                  "最需要外部帮助的是组织性。这是为什么我有时拖到截止日前才做完 — 不是态度问题，是系统问题。我打算这个月开始用纸质周计划。",
                  "我希望你们做的一件具体的事：每周日晚饭时，问我一句 “这周三件最想做的事是什么”。不需要监督，只是让我把它说出口。",
                ].map((line, i) => (
                  <div key={i} className="grid grid-cols-[60px_1fr] gap-4 py-5 border-b border-frost">
                    <span
                      className="font-mono text-signal tnum pt-1"
                      style={{ fontSize: 20, fontFeatureSettings: '"tnum" 1', letterSpacing: "-0.02em" }}
                    >
                      {(i + 1).toString().padStart(2, "0")}
                    </span>
                    <p className="text-[16px] leading-[1.7] text-ink-soft">{line}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── colophon / footer ─── */}
      <footer>
        <div className="container-wide py-16 lg:py-20">
          <div className="grid grid-cols-12 gap-8 mb-10">
            <div className="col-span-12 md:col-span-6">
              <div className="label-mono-ink mb-3">ABOUT THIS READOUT</div>
              <p className="text-[13.5px] leading-[1.75] text-ink-soft">
                量表：BFI-2 中文版（Soto & John 2017；Zhang et al. 2022 中文修订）。
                常模：朔知 2024 中国高中生样本，N=2,481（开发期模拟值）。
                计分采用 T 分换算 + IRT 校准（计划中）。
                解读由经心理学顾问审校的模板生成；个性化句段不参与计分。
              </p>
            </div>
            <div className="col-span-12 md:col-span-6">
              <div className="label-mono-ink mb-3">WHAT THIS READOUT IS NOT</div>
              <p className="text-[13.5px] leading-[1.75] text-ink-soft">
                这不是诊断，不是预测。人格在青春期仍在显著变化。
                90 天后复测可以看到漂移与稳定的部分 ——
                <span className="italic-moment"> 那比单次结果更说明问题</span>。
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-8 border-t border-frost">
            <button
              type="button"
              onClick={() => { setFeedbackOpen((v) => !v); setFeedbackSent(false); }}
              className="btn-ghost"
              aria-expanded={feedbackOpen}
            >
              {feedbackOpen ? "CANCEL FEEDBACK" : "FEEDBACK · 这一段不像我"}
            </button>
            <Link href="/assessment" className="btn-ghost">RETEST · 90 DAYS</Link>
            <button onClick={() => typeof window !== "undefined" && window.print()} className="btn-primary">
              EXPORT PDF
            </button>
          </div>

          {feedbackOpen && (
            <div className="mt-8 border border-ink p-6 lg:p-8 bg-bg-soft fade-up">
              {feedbackSent ? (
                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-12 sm:col-span-2 label-mono-signal">RECORDED</div>
                  <div className="col-span-12 sm:col-span-10">
                    <p className="text-[16px] leading-[1.65]">
                      已记录到本地档案 —— 下次复测会调整解读权重。
                      <button
                        type="button"
                        onClick={() => { setFeedbackOpen(false); setFeedbackText(""); }}
                        className="label-mono-ink ml-3 underline"
                      >
                        关闭
                      </button>
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-12 sm:col-span-2">
                    <div className="label-mono-ink mb-2">FEEDBACK</div>
                    <div className="label-mono">报告 · {reportNum}</div>
                  </div>
                  <div className="col-span-12 sm:col-span-10">
                    <p className="text-[14px] leading-[1.7] text-ink-soft mb-5 max-w-[640px]">
                      告诉我们哪一段读起来不像你 —— 不是要你解释为什么，
                      只要标出来。所有反馈只存在你这台设备的浏览器里。
                    </p>

                    {/* target selector */}
                    <div className="label-mono mb-2">不像我的部分:</div>
                    <div className="flex flex-wrap gap-2 mb-5">
                      {[
                        { v: "OVERALL", label: "整体画像" },
                        { v: "O", label: "开放性" },
                        { v: "C", label: "尽责性" },
                        { v: "E", label: "外向性" },
                        { v: "A", label: "宜人性" },
                        { v: "N", label: "情绪敏感" },
                      ].map((t) => (
                        <button
                          key={t.v}
                          type="button"
                          onClick={() => setFeedbackTarget(t.v)}
                          className={[
                            "px-3 py-1.5 font-mono text-[11px] tracking-[0.1em] border transition-all",
                            feedbackTarget === t.v
                              ? "bg-ink text-bg-soft border-ink"
                              : "bg-transparent text-ink border-frost hover:border-ink",
                          ].join(" ")}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>

                    <textarea
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      placeholder="比如:第三章说我在长任务中会丢分,但我恰好擅长马拉松类备考..."
                      rows={4}
                      className="w-full bg-bg border border-frost focus:border-ink outline-none px-4 py-3 text-[15px] leading-[1.6] font-display resize-y transition-colors mb-5"
                    />

                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <span className="label-mono">
                        {feedbackText.trim().length} 字符 · 仅本地存储
                      </span>
                      <button
                        type="button"
                        disabled={!feedbackText.trim()}
                        onClick={() => {
                          if (typeof window === "undefined") return;
                          const key = `shuozhi.feedback.${report.id}`;
                          const raw = window.localStorage.getItem(key);
                          const list = raw ? JSON.parse(raw) : [];
                          list.push({
                            target: feedbackTarget,
                            text: feedbackText.trim(),
                            createdAt: new Date().toISOString(),
                          });
                          window.localStorage.setItem(key, JSON.stringify(list));
                          setFeedbackSent(true);
                        }}
                        className="btn-primary disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-ink disabled:hover:border-ink"
                      >
                        SUBMIT FEEDBACK
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="mt-12 pt-6 border-t border-frost grid grid-cols-12 gap-4">
            <div className="col-span-12 md:col-span-6 label-mono">
              REPORT/{reportNum} · {ymd} · SUBJECT/{subjectLatin}
            </div>
            <div className="col-span-12 md:col-span-6 label-mono md:text-right">
              SHUOZHI/v0 · A CARTOGRAPHY OF SELF
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}

// One italic "human pause" line per chapter — the warmth pin in a cold layout.
// Driven by domain + tier so it stays grounded in actual data.
function humanPause(domain: Domain, pct: number): string {
  if (domain === "O") {
    if (pct >= 70) return "新鲜 + 有人陪 = 你做得最好的两个条件。";
    if (pct <= 30) return "你不是缺少想象力 — 你只是更看重清晰。";
    return "你既不抗拒新东西，也不主动追逐它们 — 看情境而定。";
  }
  if (domain === "C") {
    if (pct >= 70) return "你的可靠是别人能感觉到的 — 别忘了给意外留缓冲。";
    if (pct <= 30) return "你不是不擅长 — 你只是没找到属于你的「系统」。";
    return "在结构清晰的环境中，你比想象中更稳。";
  }
  if (domain === "E") {
    if (pct >= 70) return "把信息说出去时，你学得最深 — 这是你的优势，也是你的耗点。";
    if (pct <= 30) return "在被听见之前，你已经在思考 — 不必为发言慢而抱歉。";
    return "你按场景调节 — 这不是没主见，是更耐心的判断。";
  }
  if (domain === "A") {
    if (pct >= 70) return "对你来说，「答应」比「拒绝」便宜得多 — 这是温柔的代价。";
    if (pct <= 30) return "你的直接是一种诚实 — 但温和的措辞会让你被听得更远。";
    return "温和但有底线 — 是稳定关系的最长公约数。";
  }
  // N
  if (pct >= 70) return "你的预警系统比别人灵敏 — 这是负担，也是先行一步的能力。";
  if (pct <= 30) return "你的稳是一种资源 — 别忘了别人未必和你一样平稳。";
  return "情绪在你身上是数据，不是故障 — 偶尔记录它就够了。";
}
