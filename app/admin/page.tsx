// /admin · 内部仪表盘 · 用 query param key 简单门控
//
// 服务端渲染 — service_role key 永不暴露到客户端。
// 数据全部为聚合 / 最小化字段(无 PII,无原始得分单条)。

import Link from "next/link";
import { Brand } from "@/components/Brand";
import {
  getAdminTotals,
  getGradeBreakdown,
  getHealthFlags,
  getRecentSubmissions,
} from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GRADE_ORDER = ["初一", "初二", "初三", "高一", "高二", "高三"];

interface PageProps {
  searchParams: Promise<{ key?: string }>;
}

export default async function AdminPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const expected = process.env.ADMIN_PASS;

  if (!expected) {
    return (
      <Layout>
        <h1 className="font-display text-[32px] mb-4">ADMIN_PASS not configured</h1>
        <p className="font-serifcn text-ink-mute">
          Set the <code>ADMIN_PASS</code> Worker secret first:
          <br /><code className="font-mono">npx wrangler secret put ADMIN_PASS</code>
        </p>
      </Layout>
    );
  }

  if (sp.key !== expected) {
    return (
      <Layout>
        <div className="label-mono mb-4">401 / NO ACCESS</div>
        <h1 className="font-display text-[32px] mb-4">需要管理密码</h1>
        <p className="font-serifcn text-ink-mute">
          访问方式:<code className="font-mono">/admin?key=&lt;ADMIN_PASS&gt;</code>
        </p>
      </Layout>
    );
  }

  // ── parallel fetch all aggregates ──
  const [totals, grades, health, recent] = await Promise.all([
    getAdminTotals(),
    getGradeBreakdown(),
    getHealthFlags(),
    getRecentSubmissions(40),
  ]);

  // bar scale
  const maxGradeN = Math.max(1, ...grades.map((g) => g.n));

  return (
    <Layout>
      <div className="grid grid-cols-12 gap-4 mb-12">
        <div className="col-span-12 sm:col-span-3 label-mono">DASHBOARD/v0</div>
        <div className="col-span-12 sm:col-span-9">
          <h1 className="font-display font-medium tracking-[-0.02em] leading-[1.0]"
              style={{ fontSize: "clamp(36px, 5.5vw, 64px)" }}>
            朔知 · 累积观测台
          </h1>
          <p className="font-serifcn text-[15px] text-ink-mute mt-3 max-w-[640px]">
            匿名聚合数据 · service_role 服务端读取 · 客户端永不暴露
          </p>
        </div>
      </div>

      {/* TOTALS */}
      <Section title="TOTALS · 累积量">
        <div className="grid grid-cols-12 gap-6">
          <Stat label="累积提交" value={totals.total} />
          <Stat label="过去 7 日" value={totals.last7d} />
          <Stat label="过去 24 小时" value={totals.last24h} />
        </div>
      </Section>

      {/* BY GRADE */}
      <Section title="BY GRADE · 年级分布">
        {grades.length === 0 ? (
          <p className="font-serifcn text-ink-mute">还没有提交</p>
        ) : (
          <div className="space-y-3">
            {GRADE_ORDER.map((g) => {
              const row = grades.find((x) => x.grade === g);
              const n = row?.n ?? 0;
              const pct = (n / maxGradeN) * 100;
              return (
                <div key={g} className="grid grid-cols-[64px_1fr_44px] items-center gap-4">
                  <span className="label-mono-ink">{g}</span>
                  <div className="relative h-[10px] bg-frost-soft">
                    <div className="absolute left-0 top-0 h-full bg-signal" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="font-mono text-[14px] text-ink text-right tnum"
                        style={{ fontFeatureSettings: '"tnum" 1' }}>
                    {n}
                  </span>
                </div>
              );
            })}
            {grades.filter((g) => !GRADE_ORDER.includes(g.grade ?? "")).map((g) => (
              <div key={g.grade ?? "null"} className="grid grid-cols-[64px_1fr_44px] items-center gap-4 opacity-60">
                <span className="label-mono">{g.grade ?? "(无年级)"}</span>
                <div className="relative h-[10px] bg-frost-soft">
                  <div className="absolute left-0 top-0 h-full bg-frost" style={{ width: `${(g.n / maxGradeN) * 100}%` }} />
                </div>
                <span className="font-mono text-[14px] text-ink text-right tnum">{g.n}</span>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* BFI MEANS BY GRADE */}
      <Section title="BFI · 各年级均值(原始 1-5)">
        {grades.length === 0 ? (
          <p className="font-serifcn text-ink-mute">—</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] tnum" style={{ fontFeatureSettings: '"tnum" 1' }}>
              <thead className="text-left">
                <tr className="border-b-2 border-ink">
                  {["年级", "N", "O 开放", "C 尽责", "E 外向", "A 宜人", "N 情绪"].map((h) => (
                    <th key={h} className="label-mono py-2 pr-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="font-mono">
                {grades.map((g) => (
                  <tr key={g.grade ?? "null"} className="border-b border-frost">
                    <td className="py-2 pr-4 font-display text-[14px]">{g.grade ?? "(无)"}</td>
                    <td className="py-2 pr-4">{g.n}</td>
                    <td className="py-2 pr-4">{g.bfi_o.toFixed(2)}</td>
                    <td className="py-2 pr-4">{g.bfi_c.toFixed(2)}</td>
                    <td className="py-2 pr-4">{g.bfi_e.toFixed(2)}</td>
                    <td className="py-2 pr-4">{g.bfi_a.toFixed(2)}</td>
                    <td className="py-2 pr-4">{g.bfi_n.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* HEALTH FLAGS */}
      <Section title="HEALTH FLAGS · 心理健康筛查阳性">
        <div className="grid grid-cols-12 gap-6">
          <Stat label="PHQ-9 ≥ 10" value={health.phq9_moderate_plus} hint="抑郁中度+" />
          <Stat label="GAD-7 ≥ 10" value={health.gad7_moderate_plus} hint="焦虑中度+" />
          <Stat label="完成 health 模块" value={health.total_with_health} hint="分母" />
        </div>
        {(health.phq9_moderate_plus > 0 || health.gad7_moderate_plus > 0) && (
          <p className="font-serifcn text-[13px] text-ink-mute mt-5 max-w-[680px]">
            注意:报告页对这些用户已自动展示了转介横幅 + 危机热线。
            数据完全匿名,无法追溯到具体个人。
          </p>
        )}
      </Section>

      {/* RECENT */}
      <Section title="RECENT · 近期提交时间(无得分)">
        {recent.length === 0 ? (
          <p className="font-serifcn text-ink-mute">—</p>
        ) : (
          <div className="font-mono text-[12px] tnum max-h-[400px] overflow-y-auto"
               style={{ fontFeatureSettings: '"tnum" 1' }}>
            {recent.map((r, i) => (
              <div key={i} className="grid grid-cols-[1fr_72px] gap-4 py-1 border-b border-frost-soft">
                <span className="text-ink-mute">{new Date(r.created_at).toISOString().replace("T", " ").slice(0, 19)}</span>
                <span className="text-ink text-right">{r.grade ?? "—"}</span>
              </div>
            ))}
          </div>
        )}
      </Section>
    </Layout>
  );
}

// ─── helper components ──────────────────────────────

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <nav className="border-b border-frost">
        <div className="container-wide py-4 flex items-baseline justify-between">
          <Brand />
          <Link href="/" className="label-mono hover:text-ink">← BACK</Link>
        </div>
      </nav>
      <main className="container-wide py-12 lg:py-16">{children}</main>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-12 pb-12 border-b border-frost">
      <h2 className="label-mono-ink mb-6">{title}</h2>
      {children}
    </section>
  );
}

function Stat({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="col-span-6 md:col-span-3">
      <div className="label-mono mb-2">{label}</div>
      <div
        className="font-display text-ink leading-none tnum"
        style={{ fontSize: 48, fontWeight: 500, fontFeatureSettings: '"tnum" 1', letterSpacing: "-0.03em" }}
      >
        {value.toString().padStart(2, "0")}
      </div>
      {hint && <div className="label-mono mt-2">{hint}</div>}
    </div>
  );
}
