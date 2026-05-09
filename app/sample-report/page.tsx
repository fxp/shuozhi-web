"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { AssessmentSession, LikertResponse } from "@/lib/types";
import { ALL_ITEMS, scoreSession } from "@/lib/scoring";
import { getStorage, newId } from "@/lib/storage";

// 给 116 道题构造一个有特征的剖面:
//   - 高 O + 高 E + 中 C + 中 A + 中 N
//   - RIASEC: 高 I + 高 A + 中 S
//   - 认知: 高 Gf + 高 Gc + 中 Gv + 中 Gs
//   - 心理: 中度焦虑 / 轻度抑郁 (示范转介触发)
function preset(itemId: number, item: typeof ALL_ITEMS[number]): LikertResponse {
  if (item.module === "bfi2") {
    const baseByFacet: Record<string, number> = {
      "O.imagination": 5, "O.aesthetic": 4, "O.intellect": 4,
      "C.organization": 2, "C.discipline": 3, "C.responsibility": 4,
      "E.sociability": 5, "E.assertiveness": 4, "E.energy": 4,
      "A.compassion": 4, "A.respect": 3, "A.trust": 3,
      "N.anxiety": 4, "N.depression": 3, "N.volatility": 3,
    };
    const base = baseByFacet[item.facet ?? ""] ?? 3;
    return (item.reverse ? 6 - base : base) as LikertResponse;
  }
  if (item.module === "riasec") {
    const byType: Record<string, number> = {
      R: 2, I: 5, A: 4, S: 4, E_riasec: 3, C_riasec: 2,
    };
    return (byType[item.riasecType ?? ""] ?? 3) as LikertResponse;
  }
  if (item.module === "cognitive") {
    const byAbility: Record<string, number> = {
      Gf: 5, Gc: 5, Gv: 3, Gs: 4,
    };
    return (byAbility[item.cogAbility ?? ""] ?? 3) as LikertResponse;
  }
  if (item.module === "health") {
    // 演示用:抑郁项均轻度,焦虑项中度,自伤(item 109)= 1 不触发 SI
    if (item.healthScale === "phq9") {
      if (item.id === 109) return 1; // 几乎没有 → 不触发 SI flag
      return 2; // 偶尔 → 轻度
    }
    if (item.healthScale === "gad7") {
      return 3; // 一半时间 → 中度焦虑(触发转介横幅)
    }
  }
  return 3;
}

function buildSampleSession(): AssessmentSession {
  const responses: Record<number, LikertResponse> = {};
  for (const item of ALL_ITEMS) responses[item.id] = preset(item.id, item);
  return {
    id: newId("sample"),
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    responses,
    meta: { name: "示例 · 高一同学", grade: "高一" },
  };
}

export default function SampleReportPage() {
  const router = useRouter();
  useEffect(() => {
    (async () => {
      const session = buildSampleSession();
      const report = scoreSession(session);
      const storage = getStorage();
      await storage.saveSession(session);
      await storage.saveReport(report);
      router.replace(`/report/${encodeURIComponent(report.id)}`);
    })();
  }, [router]);
  return (
    <div className="container-page py-24 text-center label-mono">
      GENERATING SAMPLE READOUT…
    </div>
  );
}
