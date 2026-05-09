"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Brand } from "@/components/Brand";
import { getStorage } from "@/lib/storage";
import type { Report } from "@/lib/types";

const MONTHS_EN = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];

export default function HistoryPage() {
  const [reports, setReports] = useState<Report[] | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const list = await getStorage().listReports();
      if (alive) setReports(list);
    })();
    return () => { alive = false; };
  }, []);

  if (reports === null) {
    return <div className="container-page py-24 text-center label-mono">LOADING ARCHIVE…</div>;
  }

  const empty = reports.length === 0;
  const newest = reports[0];

  return (
    <>
      <nav className="border-b border-frost">
        <div className="container-wide py-4 flex items-baseline justify-between">
          <Brand />
          <div className="flex items-baseline gap-6">
            <Link href="/assessment" className="label-mono hover:text-ink transition-colors">START ASSESSMENT</Link>
          </div>
        </div>
      </nav>

      {/* hero */}
      <section className="border-b border-frost">
        <div className="container-wide py-16 lg:py-24 fade-up">
          <div className="grid grid-cols-12 gap-4 mb-8">
            <div className="col-span-12 sm:col-span-2 label-mono">ARCHIVE</div>
            <div className="col-span-12 sm:col-span-10">
              <h1
                className="font-display font-medium tracking-[-0.02em] leading-[1.0] max-w-[16ch]"
                style={{ fontSize: "clamp(36px, 6vw, 72px)" }}
              >
                {empty
                  ? <>没有记录<span className="italic-moment text-signal">。</span></>
                  : <><span className="num-display text-signal mr-2 tnum" style={{ fontFeatureSettings: '"tnum" 1' }}>
                        {reports.length.toString().padStart(2, "0")}
                      </span>
                      次自我观察。</>
                }
              </h1>
              <p className="text-[16px] sm:text-[18px] leading-[1.6] text-ink-soft max-w-[640px] mt-6">
                {empty
                  ? "完成一次 BFI-2 测评后，所有报告会出现在这里。所有数据存在你这台设备的浏览器里。"
                  : <>人格在青春期会持续漂移；单次测评只是一张快照。
                      下面是<span className="italic-moment"> 你与自己之间的对照</span> ——
                      偏移的部分比稳定的部分更值得读。</>}
              </p>
            </div>
          </div>

          {!empty && (
            <div className="grid grid-cols-12 gap-4 mt-12 pt-8 border-t border-frost">
              <Stat label="TOTAL READOUTS" value={reports.length.toString().padStart(2, "0")} />
              <Stat label="LATEST" value={fmtDate(newest.createdAt)} />
              <Stat label="LATEST α" value={newest.reliability.alpha.toFixed(2)} />
              <Stat label="LATEST POL" value={newest.reliability.polarity.toString().padStart(2, "0")} />
            </div>
          )}
        </div>
      </section>

      {/* archive list */}
      {!empty && (
        <section className="border-b border-frost">
          <div className="container-wide py-12 lg:py-16">
            <div className="label-mono mb-6">REVERSE CHRONOLOGICAL · NEWEST FIRST</div>

            <div className="border-t border-ink">
              {reports.map((r, i) => {
                const dt = new Date(r.createdAt);
                const day = String(dt.getDate()).padStart(2, "0");
                const my = `${MONTHS_EN[dt.getMonth()]} ${dt.getFullYear()}`;
                const isLatest = i === 0;
                return (
                  <Link
                    href={`/report/${encodeURIComponent(r.id)}`}
                    key={r.id}
                    className="grid grid-cols-12 gap-4 py-6 border-b border-frost hover:bg-bg-soft transition-colors group items-baseline"
                  >
                    {/* date */}
                    <div className="col-span-3 sm:col-span-2">
                      <div
                        className="font-display text-ink leading-none tnum"
                        style={{ fontSize: 36, fontFeatureSettings: '"tnum" 1', letterSpacing: "-0.04em" }}
                      >
                        {day}
                      </div>
                      <div className="label-mono mt-1">{my}</div>
                      {isLatest && <div className="label-mono-signal mt-1">LATEST</div>}
                    </div>

                    {/* meta */}
                    <div className="col-span-9 sm:col-span-4 lg:col-span-3">
                      <div className="font-display text-[16px] mb-1.5">
                        REPORT/{r.id.slice(-8).toUpperCase()}
                      </div>
                      <div className="label-mono">
                        {r.meta.name ?? "—"} · {r.meta.grade ?? "—"}
                      </div>
                      <div className="label-mono mt-1">
                        α {r.reliability.alpha.toFixed(2)} · {r.reliability.gradeLabel}
                      </div>
                    </div>

                    {/* score strip */}
                    <div className="col-span-12 sm:col-span-5 lg:col-span-6">
                      <div className="flex items-baseline gap-3 sm:gap-5 flex-wrap">
                        {r.domains.map((d) => (
                          <div key={d.domain} className="flex flex-col">
                            <span className="label-mono">{d.domain}</span>
                            <span
                              className="font-mono text-[18px] tnum text-ink"
                              style={{ fontFeatureSettings: '"tnum" 1', letterSpacing: "-0.02em" }}
                            >
                              {d.normalized100.toString().padStart(2, "0")}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* arrow */}
                    <div className="hidden lg:flex lg:col-span-1 justify-end items-center">
                      <span className="label-mono group-hover:text-signal transition-colors">OPEN →</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section>
        <div className="container-wide py-16 lg:py-20">
          <div className="grid grid-cols-12 gap-4 items-end">
            <div className="col-span-12 lg:col-span-8">
              <div className="label-mono mb-3">RETEST</div>
              <h2 className="font-display text-[clamp(28px,5vw,48px)] leading-[1.05] font-medium tracking-[-0.02em]">
                {empty
                  ? <>从你的<span className="italic-moment text-signal"> 第一次自我观察 </span>开始。</>
                  : <>距离推荐复测还有 <span className="num-display text-signal">83</span> 天。<br /> 更频繁不会更准。</>}
              </h2>
            </div>
            <div className="col-span-12 lg:col-span-4 lg:text-right mt-6 lg:mt-0">
              <Link href="/assessment" className="btn-primary">
                {empty ? "START ASSESSMENT" : "RUN ASSESSMENT AGAIN"}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-frost">
        <div className="container-wide py-6 grid grid-cols-12 gap-4 items-baseline">
          <div className="col-span-12 sm:col-span-6 label-mono">© SHUOZHI · 2026</div>
          <div className="col-span-12 sm:col-span-6 label-mono sm:text-right">
            ALL DATA STORED LOCALLY ON THIS DEVICE
          </div>
        </div>
      </footer>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="col-span-6 md:col-span-3">
      <div className="label-mono mb-2">{label}</div>
      <div
        className="font-display text-ink leading-none tnum"
        style={{ fontSize: 32, fontWeight: 500, fontFeatureSettings: '"tnum" 1', letterSpacing: "-0.03em" }}
      >
        {value}
      </div>
    </div>
  );
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}
