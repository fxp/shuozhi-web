import Link from "next/link";
import { Brand } from "@/components/Brand";
import { ResumeBanner } from "@/components/ResumeBanner";

export default function HomePage() {
  return (
    <>
      <ResumeBanner />
      {/* ───────────── codified header ───────────── */}
      <nav className="border-b border-frost">
        <div className="container-wide py-4 flex items-baseline justify-between">
          <Brand />
          <div className="flex items-baseline gap-6">
            <Link href="/sample-report" className="label-mono-signal hover:text-ink transition-colors">SAMPLE/READOUT →</Link>
            <Link href="/history" className="label-mono hover:text-ink transition-colors">MY ARCHIVE</Link>
          </div>
        </div>
      </nav>

      {/* ───────────── hero ───────────── */}
      <section className="border-b border-frost">
        <div className="container-wide pt-14 pb-16 lg:pt-20 lg:pb-24">
          <div className="grid grid-cols-12 gap-4 mb-10 fade-up">
            <div className="col-span-6 sm:col-span-3 label-mono">BFI-2 · RIASEC · CHC · PHQ/GAD</div>
            <div className="col-span-6 sm:col-span-3 label-mono">SUBJECT/HIGH-SCHOOL</div>
            <div className="col-span-6 sm:col-span-3 label-mono">CHECKPOINTED · 22 MIN</div>
            <div className="col-span-6 sm:col-span-3 label-mono sm:text-right">DATA · LOCAL+ANON</div>
          </div>

          <div className="grid grid-cols-12 gap-x-4 gap-y-10">
            <div className="col-span-12 lg:col-span-8 fade-up" style={{ animationDelay: "0.08s" }}>
              <h1
                className="font-display font-medium tracking-[-0.03em] leading-[1.02] max-w-[14ch]"
                style={{ fontSize: "clamp(34px, 6.4vw, 76px)" }}
              >
                不要四个字母。<br />
                要五条<span className="italic-moment text-signal">连续刻度</span>。
              </h1>
            </div>

            <div className="col-span-12 lg:col-span-4 fade-up" style={{ animationDelay: "0.16s" }}>
              <div className="label-mono mb-3 lg:mb-4">ABOUT</div>
              <p className="text-[15.5px] sm:text-[16px] leading-[1.65] text-ink-soft max-w-[420px]">
                朔知是一份覆盖人格 / 兴趣 / 认知风格 / 心理筛查的中学生生涯测评。它不会给你
                4 个字母的标签 —— 而是把你的<span className="italic-moment text-signal"> 116 道作答 </span>
                映射到具体得分,再换算成专业 + 选科建议。
              </p>
              <p className="text-[13px] leading-[1.6] text-ink-mute max-w-[420px] mt-4 font-mono">
                朔（shuò）— 农历初一,新月,起始。知（zhī）— 认知,了解自己。
                <br />在人生第一个重要岔口认识自己。
              </p>
            </div>
          </div>

          {/* TWO CTAs — sample first, then start */}
          <div className="mt-14 pt-8 border-t border-frost grid grid-cols-12 gap-4 items-end fade-up"
               style={{ animationDelay: "0.24s" }}>
            <div className="col-span-12 lg:col-span-7">
              <div className="label-mono mb-2 text-signal">▶ START HERE</div>
              <Link
                href="/sample-report"
                className="group block border-2 border-ink hover:border-signal transition-colors p-5 lg:p-6 bg-bg-soft"
              >
                <div className="flex items-baseline justify-between mb-2">
                  <span className="label-mono-ink group-hover:text-signal transition-colors">先看一份示例报告</span>
                  <span className="label-mono-signal">~ 30 秒</span>
                </div>
                <div className="font-display font-medium leading-[1.1] tracking-[-0.02em]"
                     style={{ fontSize: "clamp(22px, 3.5vw, 32px)" }}>
                  ENFP-ish · 高一同学 ·{" "}
                  <span className="italic-moment text-signal">完整 9 章读出</span>
                </div>
                <p className="font-serifcn text-[14px] leading-[1.6] text-ink-mute mt-3">
                  不必填表 · 不会留痕 · 含 BFI-2 五维 + Holland 兴趣三字码 + 认知风格 + PHQ/GAD 筛查 + 30+ 职业匹配 + 教育部专业代码 + 3+1+2 选科建议
                </p>
              </Link>
            </div>
            <div className="col-span-12 lg:col-span-5 lg:text-right">
              <div className="label-mono mb-2">OR</div>
              <Link href="/assessment" className="btn-primary">
                START YOUR OWN
              </Link>
              <div className="label-mono mt-3">116 ITEMS · CHECKPOINTED</div>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────── side-by-side comparison ───────────── */}
      <section className="border-b border-frost">
        <div className="container-wide py-20 lg:py-28">
          <div className="grid grid-cols-12 gap-4 mb-10">
            <div className="col-span-12 sm:col-span-3 label-mono">A/B · SAMPLE</div>
            <div className="col-span-12 sm:col-span-9">
              <h2 className="font-display text-[clamp(28px,4vw,42px)] leading-[1.1] font-medium tracking-[-0.02em] max-w-[700px]">
                市面大多数测评,给所有人写的是
                <span className="italic-moment text-signal"> 同一句话</span>。
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-4 lg:gap-8 mt-12">
            <div className="col-span-12 lg:col-span-6">
              <div className="flex items-center justify-between pb-3 border-b border-frost mb-5">
                <span className="label-mono">SAMPLE·A · LEGACY</span>
                <span className="chip chip-slate">[BARNUM]</span>
              </div>
              <blockquote className="text-[16px] leading-[1.65] text-slate mb-6">
                ENFP 型的人充满热情和新思想。他们乐观、自然、富有创造性和自信。
                有时他们不善于把握事情的轻重,难以决定该优先处理哪些事。
              </blockquote>
              <p className="text-[14px] leading-[1.7] text-ink-soft">
                没有该学生的<span className="border-b border-ink">任何具体数据</span>。
                同一句话在所有 ENFP 上都成立 —— 这是巴纳姆效应(Forer 1949)。
              </p>
            </div>

            <div className="col-span-12 lg:col-span-6 lg:border-l lg:border-frost lg:pl-8">
              <div className="flex items-center justify-between pb-3 border-b border-ink mb-5">
                <span className="label-mono-signal">SAMPLE·B · SHUOZHI</span>
                <span className="chip chip-signal">[DATA·ANCHORED]</span>
              </div>
              <blockquote className="text-[16px] leading-[1.65] text-ink mb-6">
                你的 BFI-2 外向性 <span className="font-mono text-signal">75</span>(同龄前 25%)+ 开放性 <span className="font-mono text-signal">78</span>(前 22%),
                facet 「社交活力」 <span className="font-mono text-signal">82</span> 最突出 —— 你在课堂讨论中大概率是发起者。
                但同样的特质在 3 个月以上独立刷题的场景里会比同龄人更早耗能。
              </blockquote>
              <p className="text-[14px] leading-[1.7] text-ink-soft">
                每个判断都<span className="border-b border-signal">挂在你的具体得分上</span>。
                读起来不像我?每节末尾都可以告诉系统 「这不准」。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═════════════ NEW: 永远不做的事 essence ═════════════ */}
      <section className="border-b border-frost bg-bg-card">
        <div className="container-wide py-20 lg:py-28">
          <div className="grid grid-cols-12 gap-4 mb-10">
            <div className="col-span-12 sm:col-span-3 label-mono text-signal">— THREE THINGS WE WON'T DO —</div>
            <div className="col-span-12 sm:col-span-9">
              <h2 className="font-display text-[clamp(28px,4.5vw,52px)] leading-[1.05] font-medium tracking-[-0.02em] max-w-[800px]">
                与同行不同 ——<br />
                我们<span className="italic-moment text-signal">克制</span>地少做几件事。
              </h2>
              <p className="text-[15px] leading-[1.7] text-ink-soft max-w-[640px] mt-5">
                行业普遍的 50–60 页报告里,有大量内容**科学证据已被推翻**或**与 Big Five 高度重叠**。
                朔知拒绝靠"模块通胀"营造全面感 —— 宁可少做几章,也不让数据失真。
              </p>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-x-4 gap-y-10 mt-12">
            {[
              {
                n: "01",
                code: "× MBTI 标签",
                h: "不把 4 字母类型作为人格底层",
                why: "Pittenger (2005):MBTI 5 周复测 39%–76% 的人换类型。把连续维度强行二分是测量学错误。Myers-Briggs 公司自己声明 MBTI 不应用于人才选拔。",
                use: "用 BFI-2(Soto & John 2017,中文版 Zhang 2022)替代 —— 5 维度连续刻度,APA / SIOP 推荐。",
              },
              {
                n: "02",
                code: "× 12 项杂能力",
                h: "不把人格 / 兴趣误装进\"能力\"维度",
                why: "「美术能力」「人际交往能力」「组织管理能力」实际上分别是兴趣 (Holland A) / 人格 (外向 + 宜人) / 人格 (尽责性) —— 当代认知能力研究 (CHC; Schneider & McGrew 2018) 不承认这种归类。",
                use: "如果做认知,就只测 CHC 共识的 4 个核心因子(Gf / Gc / Gv / Gs),并明示自陈版不是 IQ。",
              },
              {
                n: "03",
                code: "× 17 页学习风格",
                h: "不重测一遍尽责性",
                why: "学习态度 / 学习计划 / 学习自律等所有 facet 与 Big Five 尽责性相关 r > .60 (Poropat 2009 元分析,N=70k)。学习风格理论本身已被 APA 旗舰刊推翻 (Pashler 2008;Kirschner 2017)。",
                use: "尽责性已经覆盖。30 天行动建议直接挂在 Big Five 维度后面。",
              },
            ].map((it) => (
              <div key={it.n} className="col-span-12 md:col-span-4">
                <div className="border-t-2 border-ink pt-5">
                  <div className="flex items-baseline justify-between mb-3">
                    <span
                      className="font-mono text-signal tnum"
                      style={{ fontSize: 28, letterSpacing: "-0.02em", fontFeatureSettings: '"tnum" 1' }}
                    >
                      {it.n}
                    </span>
                    <span className="label-mono">{it.code}</span>
                  </div>
                  <h3 className="font-display text-[18px] sm:text-[20px] font-medium tracking-[-0.01em] mb-3 leading-[1.25]">
                    {it.h}
                  </h3>
                  <p className="font-serifcn text-[13.5px] leading-[1.7] text-ink-soft mb-3">
                    <span className="label-mono-signal">WHY</span>{" "}{it.why}
                  </p>
                  <p className="font-serifcn text-[13.5px] leading-[1.7] text-ink">
                    <span className="label-mono-ink">→ 我们怎么做</span>
                  </p>
                  <p className="font-serifcn text-[13.5px] leading-[1.7] text-ink mt-3">
                    {it.use}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-14 pt-6 border-t border-frost text-center">
            <p className="font-serifcn text-[15px] leading-[1.65] text-ink max-w-[640px] mx-auto italic-moment">
              「能用一个有信效度证据的 Big Five 模型回答的问题,就不再单独造一个新量表去答。」
            </p>
            <p className="label-mono mt-3">— 朔知设计原则</p>
          </div>
        </div>
      </section>

      {/* ───────────── 4 principles (existing) ───────────── */}
      <section className="border-b border-frost">
        <div className="container-wide py-20 lg:py-28">
          <div className="grid grid-cols-12 gap-4 mb-12">
            <div className="col-span-12 sm:col-span-3 label-mono">METHOD/v1</div>
            <div className="col-span-12 sm:col-span-9">
              <h2 className="font-display text-[clamp(28px,4vw,42px)] leading-[1.1] font-medium tracking-[-0.02em]">
                四条不让步的准则。
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-x-4 gap-y-12 mt-12">
            {[
              {
                n: "01", code: "INSTRUMENT",
                h: "用 BFI-2,不用 MBTI。",
                p: "BFI-2 中文版(Zhang 2022)在 4 个中国样本上验证结构、信度、效度均达标。",
              },
              {
                n: "02", code: "DATA·ANCHORED",
                h: "每段解读必须挂在具体得分上。",
                p: "出现 「你是一个……的人」 即视为巴纳姆。LLM 解读层有黑名单 + 服务端二次校验。",
              },
              {
                n: "03", code: "CONSTRAINT·AWARE",
                h: "优势与限制对称呈现。",
                p: "高分维度也是某些情境下的消耗。我们不夸你,但也不评判你。",
              },
              {
                n: "04", code: "ACTIONABLE",
                h: "每条限制配 30 天可执行动作。",
                p: "情绪价值不来自夸奖,来自掌控感。每节末尾给一件你这周就能开始的事。",
              },
            ].map((it) => (
              <div key={it.n} className="col-span-12 md:col-span-6">
                <div className="grid grid-cols-[64px_1fr] gap-5">
                  <span
                    className="font-mono text-signal pt-1 tnum"
                    style={{ fontSize: 36, letterSpacing: "-0.02em", fontFeatureSettings: '"tnum" 1', lineHeight: 1 }}
                  >
                    {it.n}
                  </span>
                  <div>
                    <div className="label-mono mb-3">{it.code}</div>
                    <h3 className="font-display text-[20px] sm:text-[22px] font-medium tracking-[-0.01em] mb-3 leading-[1.2]">
                      {it.h}
                    </h3>
                    <p className="text-[14.5px] leading-[1.7] text-ink-soft">{it.p}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────── bottom CTA ───────────── */}
      <section>
        <div className="container-wide py-16 lg:py-24">
          <div className="grid grid-cols-12 gap-4 items-end">
            <div className="col-span-12 lg:col-span-8">
              <div className="label-mono mb-4">START</div>
              <h2
                className="font-display leading-[1.05] font-medium tracking-[-0.02em] max-w-[16ch]"
                style={{ fontSize: "clamp(28px, 4.5vw, 56px)" }}
              >
                先看示例,再决定要不要做你自己的 <span className="italic-moment text-signal">。</span>
              </h2>
              <p className="text-[15.5px] leading-[1.65] text-ink-soft max-w-[480px] mt-5">
                所有数据都匿名:报告本体存在你浏览器里(不上传),
                只有得分聚合用于改进同龄常模。可以中途保存。可以反悔说 「这不像我」。
              </p>
            </div>
            <div className="col-span-12 lg:col-span-4 lg:text-right mt-6 lg:mt-0 flex flex-col gap-3 lg:items-stretch">
              <Link href="/sample-report" className="btn-primary w-full justify-center">SEE A SAMPLE</Link>
              <Link href="/assessment" className="btn-ghost w-full justify-center">START YOUR OWN</Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-frost">
        <div className="container-wide py-6 grid grid-cols-12 gap-4 items-baseline">
          <div className="col-span-12 sm:col-span-6 label-mono">© SHUOZHI · 2026 · 非商业项目 · 仅用于演示 AI 技术能力</div>
          <div className="col-span-12 sm:col-span-6 label-mono sm:text-right">
            未成年人个人信息处理规则 · 隐私 · 联系
          </div>
        </div>
      </footer>
    </>
  );
}
