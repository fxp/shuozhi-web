// /api/submit — 把一份匿名化的得分提交到 Supabase
//
// 客户端在报告生成后调用一次。失败不影响用户体验:报告本地仍在 localStorage,
// 我们只是失去了这一份数据进入聚合常模的机会。
//
// 服务端做最后一次匿名化净化(strip name / 任何可能的 PII),只接受需要的字段。

import { NextResponse } from "next/server";
import { submitToSupabase, buildAnonymousSubmission, getSupabaseConfig } from "@/lib/supabase";
import type { Report } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!getSupabaseConfig()) {
    return NextResponse.json({ error: "supabase_not_configured" }, { status: 503 });
  }
  let body: { report?: Report };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }
  if (!body.report) {
    return NextResponse.json({ error: "missing_report" }, { status: 400 });
  }
  // 客户端可能传 name,服务端再 strip 一次:只取我们关心的字段
  const sanitized = { ...body.report, meta: { grade: body.report.meta?.grade } };
  const result = await submitToSupabase(sanitized as Report);
  if (!result.ok) {
    console.error("[api/submit] supabase rejected:", result.status);
    return NextResponse.json({ error: "supabase_failed", status: result.status }, { status: 502 });
  }
  // 不返回任何可识别信息,只返回 OK + 提交的字段(用于客户端确认)
  const echo = buildAnonymousSubmission(sanitized as Report);
  return NextResponse.json({ ok: true, submitted: echo });
}
