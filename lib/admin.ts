// 管理端数据查询(用 service_role key,绕开 RLS 直接读 submissions 全表)
//
// 这层只在 /admin server-side 调用,客户端永远拿不到 service key。
// 所有函数返回**聚合或最小化的**数据(连 timestamps 也只到分钟,
// 不返回单条原始记录)。
// ----------------------------------------------------------------------------

const SUPABASE_URL = () => process.env.SUPABASE_URL!;
const SERVICE_KEY  = () => process.env.SUPABASE_SERVICE_KEY!;

function svcHeaders() {
  return {
    "apikey":         SERVICE_KEY(),
    "authorization":  `Bearer ${SERVICE_KEY()}`,
    "content-type":   "application/json",
  };
}

export interface AdminTotals {
  total: number;
  last7d: number;
  last24h: number;
}

async function postgrestCount(filter = ""): Promise<number> {
  const url = `${SUPABASE_URL()}/rest/v1/submissions?select=*${filter}`;
  const res = await fetch(url, {
    method: "HEAD",
    headers: { ...svcHeaders(), "prefer": "count=exact" },
  });
  // PostgREST returns count via Content-Range: 0-N/total
  const range = res.headers.get("content-range");
  if (!range) return 0;
  const total = range.split("/")[1];
  return total === "*" ? 0 : parseInt(total, 10);
}

export async function getAdminTotals(): Promise<AdminTotals> {
  const now = new Date();
  const d7 = new Date(now.getTime() - 7 * 86400_000).toISOString();
  const d1 = new Date(now.getTime() - 1 * 86400_000).toISOString();
  const [total, last7d, last24h] = await Promise.all([
    postgrestCount(),
    postgrestCount(`&created_at=gte.${d7}`),
    postgrestCount(`&created_at=gte.${d1}`),
  ]);
  return { total, last7d, last24h };
}

export interface GradeRow {
  grade: string | null;
  n: number;
  bfi_o: number;
  bfi_c: number;
  bfi_e: number;
  bfi_a: number;
  bfi_n: number;
  phq9_mean: number | null;
  gad7_mean: number | null;
}

export async function getGradeBreakdown(): Promise<GradeRow[]> {
  // 用 RPC,服务端依然走 SECURITY DEFINER
  const url = `${SUPABASE_URL()}/rest/v1/rpc/get_grade_norms`;
  const res = await fetch(url, {
    method: "POST",
    headers: svcHeaders(),
    body: JSON.stringify({ p_grade: null }),
  });
  if (!res.ok) return [];
  const rows = (await res.json()) as Array<Record<string, unknown>>;
  return rows.map((r) => ({
    grade: (r.grade as string) ?? null,
    n: Number(r.n),
    bfi_o: Number(r.bfi_o_mean),
    bfi_c: Number(r.bfi_c_mean),
    bfi_e: Number(r.bfi_e_mean),
    bfi_a: Number(r.bfi_a_mean),
    bfi_n: Number(r.bfi_n_mean),
    phq9_mean: r.phq9_mean != null ? Number(r.phq9_mean) : null,
    gad7_mean: r.gad7_mean != null ? Number(r.gad7_mean) : null,
  })).sort((a, b) => b.n - a.n);
}

export interface HealthFlags {
  phq9_moderate_plus: number;  // PHQ-9 ≥ 10
  gad7_moderate_plus: number;  // GAD-7 ≥ 10
  total_with_health: number;
}

export async function getHealthFlags(): Promise<HealthFlags> {
  const [phq, gad, totalH] = await Promise.all([
    postgrestCount("&phq9_total=gte.10"),
    postgrestCount("&gad7_total=gte.10"),
    postgrestCount("&phq9_total=not.is.null"),
  ]);
  return {
    phq9_moderate_plus: phq,
    gad7_moderate_plus: gad,
    total_with_health: totalH,
  };
}

export interface RecentRow {
  created_at: string;
  grade: string | null;
}

// 最近提交(只返回时间 + 年级,不返回任何得分)
export async function getRecentSubmissions(limit = 30): Promise<RecentRow[]> {
  const url = `${SUPABASE_URL()}/rest/v1/submissions?select=created_at,grade&order=created_at.desc&limit=${limit}`;
  const res = await fetch(url, { headers: svcHeaders() });
  if (!res.ok) return [];
  return (await res.json()) as RecentRow[];
}
