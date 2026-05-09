"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Brand } from "@/components/Brand";
import { Likert, type LikertScale } from "@/components/Likert";
import { ProgressStrip } from "@/components/ProgressStrip";
import { PreviewModal } from "@/components/PreviewModal";
import { DOMAIN_LABELS } from "@/lib/bfi2-items";
import type { AssessmentSession, LikertResponse } from "@/lib/types";
import { getStorage, newId } from "@/lib/storage";
import { ALL_ITEMS, isComplete, isMinimallyComplete, scoreSession, findPhase, PHASES, TOTAL_ITEMS, type PhaseInfo } from "@/lib/scoring";

export default function AssessmentPage() {
  const router = useRouter();
  const [session, setSession] = useState<AssessmentSession | null>(null);
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [hydrated, setHydrated] = useState(false);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Phase boundary intercept
  const [phaseIntercept, setPhaseIntercept] = useState<{ completed: PhaseInfo; next: PhaseInfo } | null>(null);

  // Response time tracking
  const itemSeenAtRef = useRef<number>(Date.now());
  const NUDGE_DELAY_MS = 7000;
  const [showOverthinkNudge, setShowOverthinkNudge] = useState(false);
  const nudgeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Preview modal toggle
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => () => {
    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    if (nudgeTimerRef.current) clearTimeout(nudgeTimerRef.current);
  }, []);

  // Reset overthink nudge + record "seen at" each time the visible item changes
  useEffect(() => {
    itemSeenAtRef.current = Date.now();
    setShowOverthinkNudge(false);
    if (nudgeTimerRef.current) clearTimeout(nudgeTimerRef.current);
    nudgeTimerRef.current = setTimeout(() => {
      setShowOverthinkNudge(true);
    }, NUDGE_DELAY_MS);
    return () => {
      if (nudgeTimerRef.current) clearTimeout(nudgeTimerRef.current);
    };
  }, [currentIdx]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const storage = getStorage();
      const draft = await storage.getDraft();
      if (!alive) return;
      if (draft) {
        setSession(draft);
        const firstMissing = ALL_ITEMS.findIndex((i) => draft.responses[i.id] === undefined);
        setCurrentIdx(firstMissing === -1 ? TOTAL_ITEMS - 1 : firstMissing);
      } else {
        const fresh: AssessmentSession = {
          id: newId("s"),
          startedAt: new Date().toISOString(),
          responses: {},
          meta: {},
        };
        setSession(fresh);
        await storage.saveDraft(fresh);
      }
      setHydrated(true);
    })();
    return () => { alive = false; };
  }, []);

  const currentItem = useMemo(() => ALL_ITEMS[currentIdx], [currentIdx]);
  const currentValue = session?.responses[currentItem?.id ?? -1];
  const currentPhase = currentItem ? findPhase(currentItem.id) : PHASES[0];
  const itemInPhase = currentItem ? currentItem.id - currentPhase.range[0] + 1 : 1;
  const phaseTotal = currentPhase ? currentPhase.range[1] - currentPhase.range[0] + 1 : 1;
  const isPhaseStart = itemInPhase === 1;
  const scale: LikertScale = currentItem?.module === "health" ? "frequency" : "agreement";

  async function handleAnswer(v: LikertResponse) {
    if (!session || !currentItem) return;
    // 只在第一次作答记录响应时长(避免回看修改污染数据)
    const elapsed = Date.now() - itemSeenAtRef.current;
    const alreadyTimed = session.responseTimes?.[currentItem.id] !== undefined;
    const newTimes = alreadyTimed
      ? session.responseTimes
      : { ...(session.responseTimes ?? {}), [currentItem.id]: elapsed };

    const next: AssessmentSession = {
      ...session,
      responses: { ...session.responses, [currentItem.id]: v },
      responseTimes: newTimes,
    };
    setSession(next);
    await getStorage().saveDraft(next);

    // 关掉 nudge timer + 隐藏当前 nudge
    if (nudgeTimerRef.current) clearTimeout(nudgeTimerRef.current);
    setShowOverthinkNudge(false);

    let nextIdx = -1;
    for (let i = currentIdx + 1; i < TOTAL_ITEMS; i++) {
      if (next.responses[ALL_ITEMS[i].id] === undefined) { nextIdx = i; break; }
    }
    if (nextIdx === -1) {
      for (let i = 0; i < currentIdx; i++) {
        if (next.responses[ALL_ITEMS[i].id] === undefined) { nextIdx = i; break; }
      }
    }

    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }

    if (nextIdx === -1) {
      await finalize(next);
      return;
    }

    // 阶段边界检测:刚答完是当前阶段最后一题 + BFI-2 已全部完成 → 弹 intercept
    const curPhase = findPhase(currentItem.id);
    const nxtPhase = findPhase(ALL_ITEMS[nextIdx].id);
    const justFinishedLastOfPhase = currentItem.id === curPhase.range[1];
    const isPhaseBoundary = curPhase.module !== nxtPhase.module && justFinishedLastOfPhase;
    const canFinalizePartial = isMinimallyComplete(next);

    if (isPhaseBoundary && canFinalizePartial) {
      setPhaseIntercept({ completed: curPhase, next: nxtPhase });
      return;
    }

    if (nextIdx !== currentIdx) {
      advanceTimerRef.current = setTimeout(() => {
        setCurrentIdx(nextIdx);
        advanceTimerRef.current = null;
      }, 220);
    }
  }

  function continueToNextPhase() {
    if (!phaseIntercept) return;
    const firstIdOfNext = phaseIntercept.next.range[0];
    const idx = ALL_ITEMS.findIndex((i) => i.id === firstIdOfNext);
    setPhaseIntercept(null);
    setCurrentIdx(idx);
  }

  async function finalize(s: AssessmentSession, partial = false) {
    if (!partial && !isComplete(s)) {
      const miss = ALL_ITEMS.findIndex((i) => s.responses[i.id] === undefined);
      setCurrentIdx(miss);
      return;
    }
    if (partial && !isMinimallyComplete(s)) {
      const miss = ALL_ITEMS.findIndex((i) => s.responses[i.id] === undefined);
      setCurrentIdx(miss);
      return;
    }
    const completed: AssessmentSession = { ...s, completedAt: new Date().toISOString() };
    const report = scoreSession(completed);
    const storage = getStorage();
    await storage.saveSession(completed);
    await storage.saveReport(report);
    await storage.clearDraft();
    router.push(`/report/${encodeURIComponent(report.id)}`);
  }

  async function handleStartWithMeta(name: string, grade: string) {
    if (!session) return;
    const next: AssessmentSession = {
      ...session,
      meta: { ...session.meta, name: name.trim() || "你", grade },
    };
    setSession(next);
    await getStorage().saveDraft(next);
  }

  if (!hydrated || !session) {
    return <div className="container-wide py-20 text-center label-mono">LOADING…</div>;
  }
  if (!session.meta.name) {
    return <IntroScreen onStart={handleStartWithMeta} />;
  }
  if (phaseIntercept) {
    const phaseIdx = PHASES.findIndex((p) => p.module === phaseIntercept.completed.module);
    return (
      <PhaseInterceptScreen
        completed={phaseIntercept.completed}
        next={phaseIntercept.next}
        completedIdx={phaseIdx}
        onContinue={continueToNextPhase}
        onFinalizeNow={() => finalize(session, true)}
      />
    );
  }

  const startedAtMs = new Date(session.startedAt).getTime();
  // 选 caption:bfi2 用 DOMAIN_LABELS;其他模块用 PHASE.sub
  let sectionCaption = currentPhase.sub;
  if (currentItem.module === "bfi2" && currentItem.domain) {
    sectionCaption = DOMAIN_LABELS[currentItem.domain].sub;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="border-b border-frost">
        <div className="container-wide py-4 flex items-center justify-between">
          <Brand />
          <Link href="/" className="label-mono hover:text-ink transition-colors">
            ← EXIT · STATE SAVED
          </Link>
        </div>
      </nav>

      <ProgressStrip current={currentItem.id} total={TOTAL_ITEMS} startedAtMs={startedAtMs} />

      <main className="flex-1 flex items-center py-16 lg:py-20">
        <div className="container-page w-full">
          <div className="grid grid-cols-12 gap-4 items-start">
            {/* left rail: phase identity */}
            <div className="hidden lg:block lg:col-span-2 sticky top-32">
              <div className="label-mono mb-2">PHASE·{(PHASES.findIndex(p => p.module === currentPhase.module) + 1).toString().padStart(2, "0")}</div>
              <div className="font-mono text-[11px] text-ink leading-[1.6] tracking-[0.05em]">
                {currentPhase.enLabel}
              </div>
              <div className="hr-line my-3" />
              <div className="label-mono">{currentPhase.label}</div>
              <div className="font-mono text-[11px] text-ink-soft mt-3 tnum">
                {itemInPhase}/{phaseTotal}
              </div>
            </div>

            {/* main column */}
            <div className="col-span-12 lg:col-span-10" key={currentItem.id}>
              {/* phase entry banner — only on first item of each phase */}
              {isPhaseStart && (
                <div className="mb-8 pb-5 border-b border-ink fade-up">
                  <div className="label-mono-signal mb-2">▌ ENTERING PHASE · {currentPhase.enLabel}</div>
                  <h3
                    className="font-display font-medium tracking-[-0.02em] leading-[1.1] mb-3"
                    style={{ fontSize: "clamp(22px, 3.5vw, 32px)" }}
                  >
                    {currentPhase.label}
                  </h3>
                  <p className="font-serifcn text-[14px] leading-[1.7] text-ink-soft max-w-[600px]">
                    {currentPhase.sub}
                  </p>
                </div>
              )}

              <div className="flex items-baseline gap-4 mb-2 fade-up">
                <span
                  className="font-mono text-signal tnum"
                  style={{ fontSize: 14, letterSpacing: "0.04em", fontFeatureSettings: '"tnum" 1' }}
                >
                  ITEM·{currentItem.id.toString().padStart(3, "0")}/{TOTAL_ITEMS}
                </span>
                <span className="label-mono">
                  ↦ {currentPhase.module.toUpperCase()}{currentItem.reverse ? " · REV-KEY" : ""}
                </span>
              </div>

              {/* section caption */}
              <p className="text-[14px] text-slate leading-[1.6] mb-6 mt-2 fade-up max-w-[640px]" style={{ animationDelay: "0.04s" }}>
                <span className="italic-moment text-ink">这一节在测的:</span>{" "}
                {sectionCaption}
              </p>

              <h2
                className="font-display font-medium tracking-[-0.02em] leading-[1.15] mb-10 fade-up"
                style={{ fontSize: "clamp(26px, 4.5vw, 48px)", animationDelay: "0.08s" }}
              >
                {currentItem.text}
              </h2>

              <p className="label-mono mb-5 fade-up" style={{ animationDelay: "0.16s" }}>
                {currentPhase.scaleHint}
              </p>

              {/* overthinking nudge — fades in after 7s of inaction */}
              {showOverthinkNudge && (
                <div className="mb-5 px-4 py-3 border-l-2 border-signal bg-bg-card max-w-[640px] nudge-fade-in">
                  <div className="label-mono-signal mb-1">▌ 凭直觉作答</div>
                  <p className="font-serifcn text-[14px] leading-[1.65] text-ink-soft">
                    人格题想得越久,答出来的越像"理想中的自己"而非"真实的自己" ——
                    <span className="italic-moment text-ink"> 第一反应的答案最准</span>。点一个就好。
                  </p>
                </div>
              )}

              <div className="fade-up" style={{ animationDelay: "0.2s" }}>
                <Likert value={currentValue} onChange={handleAnswer} scale={scale} />
              </div>

              <div className="mt-10 pt-5 border-t border-frost grid grid-cols-3 items-center gap-4">
                <button
                  type="button"
                  onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
                  disabled={currentIdx === 0}
                  className="label-mono text-left hover:text-ink transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  ← PREV ITEM
                </button>
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setPreviewOpen(true)}
                    className="label-mono hover:text-signal transition-colors"
                    title="预览当前进度"
                  >
                    ▶ PREVIEW
                  </button>
                </div>
                <div className="text-right">
                  <span className="label-mono inline-flex items-center gap-2">
                    <span className="live-dot" aria-hidden /> SAVED · LOCAL
                  </span>
                </div>
              </div>

              {Object.keys(session.responses).length === TOTAL_ITEMS && (
                <div className="mt-10 text-center">
                  <button onClick={() => finalize(session)} className="btn-primary">
                    GENERATE READOUT
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {previewOpen && (
        <PreviewModal
          session={session}
          onClose={() => setPreviewOpen(false)}
          onFinalizeNow={() => { setPreviewOpen(false); finalize(session, true); }}
        />
      )}
    </div>
  );
}

// ─── intro screen ────────────────────────────────────────

const GRADES = ["初一", "初二", "初三", "高一", "高二", "高三"];

function IntroScreen({ onStart }: { onStart: (name: string, grade: string) => void }) {
  const [name, setName] = useState("");
  const [grade, setGrade] = useState("");

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="border-b border-frost">
        <div className="container-wide py-4 flex items-center justify-between">
          <Brand />
          <Link href="/" className="label-mono hover:text-ink transition-colors">← EXIT</Link>
        </div>
      </nav>

      <main className="flex-1 flex items-center py-16">
        <div className="container-page w-full">
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 lg:col-span-2 lg:pt-3 fade-up">
              <div className="label-mono">PREFLIGHT</div>
            </div>

            <div className="col-span-12 lg:col-span-10">
              <h1
                className="font-display font-medium leading-[1.05] tracking-[-0.03em] mb-6 fade-up"
                style={{ fontSize: "clamp(36px, 6vw, 64px)", animationDelay: "0.05s" }}
              >
                我们想用一个名字称呼你 ——<br />
                <span className="italic-moment text-signal">不一定是真名</span>。
              </h1>

              <p className="text-[16px] sm:text-[17px] leading-[1.65] text-ink-soft max-w-[620px] mb-10 fade-up"
                 style={{ animationDelay: "0.15s" }}>
                整个测评有 <span className="font-mono text-signal">116</span> 道题、4 个阶段:
                人格 / 兴趣 / 认知风格 / 心理健康筛查。约 20–25 分钟,可中途保存。
                所有数据只存在<span className="border-b border-ink"> 你这台设备的浏览器里</span>。
              </p>

              <div className="space-y-10 fade-up" style={{ animationDelay: "0.25s" }}>
                <div>
                  <label className="label-mono-ink block mb-3">FIELD·01 / NAME OR HANDLE</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Type a name…"
                    className="w-full max-w-md bg-transparent border-b border-frost focus:border-ink outline-none py-3 text-[22px] sm:text-[28px] font-display tracking-tight transition-colors placeholder:text-frost"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="label-mono-ink block mb-3">FIELD·02 / GRADE LEVEL</label>
                  <div className="flex flex-wrap gap-2">
                    {GRADES.map((g, i) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setGrade(g)}
                        className={[
                          "px-4 py-2 font-mono text-[12px] tracking-[0.1em] transition-all border",
                          grade === g
                            ? "bg-ink text-bg-soft border-ink"
                            : "bg-transparent text-ink border-frost hover:border-ink",
                        ].join(" ")}
                      >
                        <span className="text-signal mr-1.5">{(i + 1).toString().padStart(2, "0")}</span>
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-8 border-t border-frost flex items-center justify-between gap-4 flex-wrap">
                  <span className="label-mono">116 ITEMS · 4 PHASES · ≈ 22 MIN</span>
                  <button
                    type="button"
                    disabled={!name.trim() || !grade}
                    onClick={() => onStart(name, grade)}
                    className="btn-primary disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-ink disabled:hover:border-ink"
                  >
                    BEGIN ITEM·001
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// ─── phase intercept screen ─────────────────────────────────

function PhaseInterceptScreen({
  completed, next, completedIdx, onContinue, onFinalizeNow,
}: {
  completed: PhaseInfo;
  next: PhaseInfo;
  completedIdx: number;
  onContinue: () => void;
  onFinalizeNow: () => void;
}) {
  const completedRoman = ["I","II","III","IV","V"][completedIdx];
  const nextRoman = ["I","II","III","IV","V"][completedIdx + 1];
  const totalChapters = completedIdx + 1 + 5;  // 5 BFI chapters + (completedIdx+1) extra modules' chapters
  // After phase 1 (BFI):  5 chapters base
  // After phase 2 (RIASEC): +1 = 6 chapters
  // After phase 3 (Cog):    +1 = 7 chapters
  // (health doesn't pop intercept since it's the last; user just completes it)

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="border-b border-frost">
        <div className="container-wide py-4 flex items-center justify-between">
          <Brand />
          <Link href="/" className="label-mono hover:text-ink">← EXIT · STATE SAVED</Link>
        </div>
      </nav>

      <main className="flex-1 flex items-center py-16 lg:py-24">
        <div className="container-page w-full">
          <div className="grid grid-cols-12 gap-4 fade-up">
            <div className="col-span-12 lg:col-span-2">
              <div className="label-mono-signal mb-2">▌ PHASE·{completedRoman} COMPLETE</div>
            </div>
            <div className="col-span-12 lg:col-span-10">
              <h1
                className="font-display font-medium tracking-[-0.02em] leading-[1.05] mb-5"
                style={{ fontSize: "clamp(36px, 6vw, 64px)" }}
              >
                你已完成 <span className="italic-moment text-signal">{completed.label}</span>。
              </h1>
              <p className="font-serifcn text-[16px] sm:text-[17px] leading-[1.7] text-ink-soft max-w-[680px] mb-12">
                到这里你已经可以拿一份初版报告 ——
                <span className="italic-moment text-ink"> 包含{completedIdx + 1 === 1 ? "五大人格维度的完整解读" : `前 ${completedIdx + 1} 个阶段(${PHASES.slice(0, completedIdx + 1).map(p => p.label).join(" + ")})`}</span>。
                继续下一阶段(<span className="italic-moment text-ink">{next.label}</span>)能解锁更多章节,但不是必须的。可以现在停,也可以以后再回来补。
              </p>

              {/* TWO CTAs */}
              <div className="grid grid-cols-12 gap-4 fade-up" style={{ animationDelay: "0.15s" }}>
                {/* Continue (primary, larger) */}
                <button
                  type="button"
                  onClick={onContinue}
                  className="col-span-12 lg:col-span-7 group block border-2 border-ink hover:border-signal transition-colors p-5 lg:p-6 bg-bg-soft text-left"
                >
                  <div className="flex items-baseline justify-between mb-2">
                    <span className="label-mono-ink group-hover:text-signal transition-colors">▶ CONTINUE · PHASE·{nextRoman}</span>
                    <span className="label-mono-signal">~ {Math.round((next.range[1] - next.range[0] + 1) * 0.18)} MIN</span>
                  </div>
                  <div
                    className="font-display font-medium leading-[1.1] tracking-[-0.02em]"
                    style={{ fontSize: "clamp(20px, 3vw, 28px)" }}
                  >
                    进入 {next.label} ·{" "}
                    <span className="italic-moment text-signal">{next.range[1] - next.range[0] + 1} 题</span>
                  </div>
                  <p className="font-serifcn text-[13.5px] leading-[1.6] text-ink-mute mt-2.5">
                    {next.sub}
                  </p>
                </button>

                {/* Finalize early (secondary) */}
                <button
                  type="button"
                  onClick={onFinalizeNow}
                  className="col-span-12 lg:col-span-5 group block border border-frost hover:border-ink transition-colors p-5 lg:p-6 bg-transparent text-left"
                >
                  <div className="flex items-baseline justify-between mb-2">
                    <span className="label-mono group-hover:text-ink transition-colors">▢ STOP HERE</span>
                    <span className="label-mono">{totalChapters} 章</span>
                  </div>
                  <div
                    className="font-display font-medium leading-[1.1] tracking-[-0.02em]"
                    style={{ fontSize: "clamp(18px, 2.6vw, 24px)" }}
                  >
                    现在生成报告
                  </div>
                  <p className="font-serifcn text-[13.5px] leading-[1.6] text-ink-mute mt-2.5">
                    草稿仍然保存,以后回来补 {PHASES.length - completedIdx - 1} 个阶段
                  </p>
                </button>
              </div>

              <div className="mt-12 pt-6 border-t border-frost grid grid-cols-12 gap-4 items-baseline">
                <div className="col-span-12 sm:col-span-6 label-mono">PROGRESS · {((completedIdx + 1) * 25)}% / 100%</div>
                <div className="col-span-12 sm:col-span-6 label-mono sm:text-right">
                  {PHASES.slice(0, completedIdx + 1).map((p) => "■").join("")}
                  {PHASES.slice(completedIdx + 1).map((p) => "□").join("")}
                  <span className="ml-2">
                    {PHASES.map((p) => p.label).join(" / ")}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
