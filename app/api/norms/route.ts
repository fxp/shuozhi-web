// /api/norms?grade=高一 — 拉取该年级的实证常模(均值 + 标准差)
//
// 当 N 足够大(≥30)时,客户端用这个常模代替默认硬编码常模,
// 让百分位换算反映**真实同龄人**而非我们 mock 的 2,481 样本。
//
// 客户端调用流程:
//   1. report 加载完成后,fetch /api/norms?grade=user.grade
//   2. 若 N >= 30 → 用 empirical norms 重新计算百分位
//   3. 若 N < 30 → 仍用默认,但报告里展示 "已收集 N 名 [年级] 数据"

import { NextResponse } from "next/server";
import { fetchGradeNorms, getSupabaseConfig } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!getSupabaseConfig()) {
    return NextResponse.json({ error: "supabase_not_configured" }, { status: 503 });
  }
  const url = new URL(req.url);
  const grade = url.searchParams.get("grade");
  const norms = await fetchGradeNorms(grade);
  if (!norms) {
    // 返回 null + n=0 这样客户端可以平滑处理"还没有数据"的情况
    return NextResponse.json({ norms: null, grade });
  }
  return NextResponse.json({ norms, grade });
}
