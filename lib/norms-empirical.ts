// 基于实证(Supabase 聚合)常模重新换算 Report 的百分位 ----------------------
//
// 当我们累积了某年级 N >= MIN_N 名同学后,用他们的均值 + 标准差代替硬编码 mock,
// 让 "百分位 78" 这件事真实反映"比 78% 同龄人靠右",而不是与一个虚构的 2,481
// 样本对比。
//
// 客户端在报告页拿到 norms 后调用这个函数,得到一份"实证版" Report 替换默认。
// ----------------------------------------------------------------------------

import type { Domain, DomainScore, Report } from "./types";
import { tToPercentile } from "./norms";
import type { GradeNorms } from "./supabase";

export const MIN_N_FOR_EMPIRICAL = 20;
// 20 个同年级样本以上,我们认为开始有意义。<20 时仍用默认 mock。

const TINY_SD = 0.2;  // 防止 N 太小时 SD 接近 0 把 z 推到无穷

function safeSd(sd: number | null | undefined): number {
  if (!sd || isNaN(sd) || sd < TINY_SD) return TINY_SD;
  return sd;
}

function recomputeDomain(
  ds: DomainScore,
  empMean: number | null | undefined,
  empSd: number | null | undefined,
): DomainScore {
  if (empMean == null || isNaN(empMean)) return ds;
  const sd = safeSd(empSd);
  const t = 50 + 10 * (ds.raw - empMean) / sd;
  const percentile = tToPercentile(t);
  return {
    ...ds,
    t,
    percentile,
    normalized100: Math.round(percentile),
  };
}

const DOMAIN_KEY: Record<Domain, "o" | "c" | "e" | "a" | "n"> = {
  O: "o", C: "c", E: "e", A: "a", N: "n",
};

export function applyEmpiricalNorms(report: Report, norms: GradeNorms): Report {
  const newDomains = report.domains.map((d) => {
    const k = DOMAIN_KEY[d.domain];
    const mean = (norms as unknown as Record<string, number>)[`bfi_${k}_mean`];
    const sd   = (norms as unknown as Record<string, number>)[`bfi_${k}_sd`];
    return recomputeDomain(d, mean, sd);
  });
  return { ...report, domains: newDomains };
}

export interface EmpiricalNormsState {
  norms: GradeNorms | null;
  grade: string | null;
  used: boolean;        // 是否已应用到报告
}
