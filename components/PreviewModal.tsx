"use client";

// Mid-assessment progress preview — 弹出当前进度的 partial radar + 分数
// 不导航,模态层。Cancel 关回原 item。
//
// 只渲染**已完成**的模块(scoreSession 已经做了 module-gating)。
// BFI 60 题答完前,radar 用 default 3 填充 → 数据无意义,所以这种情况下
// 我们 fallback 到一个 "还需 X 题才能看初版" 提示。

import { useEffect } from "react";
import { RadarChart } from "@/components/RadarChart";
import { DOMAIN_LABELS } from "@/lib/bfi2-items";
import type { AssessmentSession } from "@/lib/types";
import { scoreSession, ALL_ITEMS, PHASES } from "@/lib/scoring";

interface Props {
  session: AssessmentSession;
  onClose: () => void;
  onFinalizeNow: () => void;
}

export function PreviewModal({ session, onClose, onFinalizeNow }: Props) {
  // ESC to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const answeredCount = Object.keys(session.responses).length;
  const remaining = ALL_ITEMS.length - answeredCount;
  const bfiAnswered = ALL_ITEMS.filter(
    (i) => i.module === "bfi2" && session.responses[i.id] !== undefined,
  ).length;
  const bfiComplete = bfiAnswered === 60;

  // 只有 BFI 全答完才渲染雷达图;否则只展示一个 "继续" hint
  const partialReport = bfiComplete ? scoreSession(session) : null;

  return (
    <div
      className="fixed inset-0 z-50 bg-ink/85 flex items-start justify-center overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative bg-bg w-full max-w-[920px] my-8 sm:my-12 mx-4 border-2 border-ink"
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="flex items-baseline justify-between border-b border-frost px-6 lg:px-8 py-4">
          <div>
            <div className="label-mono-signal">▌ PROGRESS PREVIEW</div>
            <div className="font-display text-[20px] sm:text-[24px] mt-1 font-medium tracking-[-0.02em]">
              当前已答 {answeredCount}/{ALL_ITEMS.length} 题
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="label-mono hover:text-signal transition-colors"
            aria-label="关闭预览"
          >
            ESC · 关闭
          </button>
        </div>

        {/* body */}
        <div className="px-6 lg:px-8 py-6 lg:py-8 max-h-[70vh] overflow-y-auto">
          {!partialReport ? (
            <div className="text-center py-8">
              <div className="label-mono mb-3">还不能预览</div>
              <p className="font-display text-[20px] sm:text-[24px] font-medium tracking-[-0.01em] leading-[1.3] mb-4 max-w-[520px] mx-auto">
                还需<span className="font-mono text-signal mx-1">{60 - bfiAnswered}</span>题完成 BFI-2 后,
                你才能看初版剖面。
              </p>
              <p className="font-serifcn text-[14px] text-ink-mute max-w-[480px] mx-auto leading-[1.65]">
                Big Five 五维度是其他模块的基础。在它完成之前预览没有意义 —— 数字会被默认值填满,误导多过有用。
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-12 gap-6 lg:gap-8 items-start">
              {/* radar */}
              <div className="col-span-12 lg:col-span-7">
                <div className="label-mono mb-3">CURRENT BFI · 五维度</div>
                <div className="max-w-[480px] mx-auto">
                  <RadarChart
                    data={partialReport.domains.map((d) => ({
                      domain: d.domain,
                      label: `${DOMAIN_LABELS[d.domain].cn} ${d.domain}`,
                      value: d.normalized100,
                    }))}
                  />
                </div>
              </div>

              {/* readout */}
              <div className="col-span-12 lg:col-span-5">
                <div className="label-mono mb-3">SCORES</div>
                <div className="border-t-2 border-ink mb-6">
                  {partialReport.domains.map((d) => (
                    <div
                      key={d.domain}
                      className="grid grid-cols-[28px_1fr_44px] items-baseline gap-2 py-2 border-b border-frost"
                    >
                      <span className="label-mono">{d.domain}</span>
                      <span className="font-display text-[14px]">{DOMAIN_LABELS[d.domain].cn}</span>
                      <span
                        className="font-mono text-[18px] tnum text-right text-signal"
                        style={{ fontFeatureSettings: '"tnum" 1', letterSpacing: "-0.02em" }}
                      >
                        {d.normalized100.toString().padStart(2, "0")}
                      </span>
                    </div>
                  ))}
                </div>

                {/* unlocked modules */}
                {partialReport.riasec && (
                  <div className="mb-5">
                    <div className="label-mono mb-2">UNLOCKED · 兴趣三字码</div>
                    <div className="font-mono text-[20px] text-signal" style={{ fontFeatureSettings: '"tnum" 1' }}>
                      {partialReport.riasec.hollandCode}
                    </div>
                  </div>
                )}

                {partialReport.cognitive && (
                  <div className="mb-5">
                    <div className="label-mono mb-2">UNLOCKED · 认知风格</div>
                    <div className="flex gap-3 text-[13px] tnum" style={{ fontFeatureSettings: '"tnum" 1' }}>
                      {partialReport.cognitive.scores.map((s) => (
                        <span key={s.ability}>
                          <span className="label-mono">{s.ability}</span>{" "}
                          <span className="font-mono text-ink">{s.normalized100}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {partialReport.careers && (
                  <div className="mb-5">
                    <div className="label-mono mb-2">UNLOCKED · TOP-3 职业方向</div>
                    <ul className="text-[13px] leading-[1.7] space-y-0.5">
                      {partialReport.careers.slice(0, 3).map((m, i) => (
                        <li key={m.career.id} className="flex justify-between gap-3">
                          <span className="font-display text-ink">{i + 1}. {m.career.zh}</span>
                          <span className="label-mono">{m.scoreTotal}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* footer CTAs */}
        <div className="border-t border-frost px-6 lg:px-8 py-4 flex flex-wrap items-center justify-between gap-3">
          <span className="label-mono">
            还有 <span className="text-signal">{remaining}</span> 题 · {PHASES.length - PHASES.findIndex(p => session.responses[p.range[0]] === undefined)} 个阶段未做完
          </span>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-ghost">
              CONTINUE QUIZ
            </button>
            {bfiComplete && (
              <button type="button" onClick={onFinalizeNow} className="btn-primary">
                FINALIZE NOW
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
