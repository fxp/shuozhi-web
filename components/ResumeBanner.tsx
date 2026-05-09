"use client";

// 客户端 island — 检测 localStorage 草稿,如有则显示恢复横幅。
// 服务端渲染时返回 null,hydration 后挂件出现。

import Link from "next/link";
import { useEffect, useState } from "react";
import { getStorage } from "@/lib/storage";
import { TOTAL_ITEMS } from "@/lib/scoring";
import type { AssessmentSession } from "@/lib/types";

export function ResumeBanner() {
  const [draft, setDraft] = useState<AssessmentSession | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const d = await getStorage().getDraft();
      if (alive) setDraft(d);
    })();
    return () => { alive = false; };
  }, []);

  if (!draft || hidden) return null;
  const answered = Object.keys(draft.responses).length;
  if (answered === 0) return null;
  const pct = Math.round((answered / TOTAL_ITEMS) * 100);

  async function discard() {
    if (typeof window !== "undefined" &&
        !window.confirm("确定丢弃吗?这份草稿会被清掉,无法恢复。")) return;
    await getStorage().clearDraft();
    setHidden(true);
  }

  return (
    <div className="border-b border-frost bg-bg-card">
      <div className="container-wide py-3 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-baseline gap-3 min-w-0">
          <span className="label-mono-signal">▌ DRAFT FOUND</span>
          <span className="font-serifcn text-[14px] text-ink truncate">
            你有一份未完成的草稿 ·{" "}
            <span className="font-mono text-signal" style={{ fontFeatureSettings: '"tnum" 1' }}>{pct}%</span>{" "}
            ({answered}/{TOTAL_ITEMS} 题)
            {draft.meta.name && draft.meta.name !== "你" && (
              <span className="label-mono ml-2">· {draft.meta.name}</span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={discard}
            className="label-mono hover:text-ink transition-colors"
          >
            丢弃
          </button>
          <Link href="/assessment" className="btn-primary" style={{ padding: "8px 14px", fontSize: 11 }}>
            CONTINUE
          </Link>
        </div>
      </div>
    </div>
  );
}
