# 朔知 · 开发日志与教训

> 从一份 PDF 样本到一个上线 116 题、4 模块、9 章报告 + LLM 解读 + 实证常模的中学生生涯测评 SaaS。
>
> 本文档记录决策路径、关键转弯、走过的弯路、和真正学到的东西。
>
> 完成于 2026-05-10 · v1 上线后。

---

## 0 · 项目简介

**朔知（SHUOZHI）** 是一个面向中国中学生的生涯测评 web 产品。

- **科学骨架**：BFI-2（大五人格）+ RIASEC（Holland 兴趣）+ CHC v0（认知风格自陈）+ PHQ-9 / GAD-7（心理健康筛查）
- **产出**：9 章 PDF-quality 报告 + LLM 个性化解读 + 教育部专业代码 + 3+1+2 选科建议
- **数据原则**：本地优先（localStorage）+ 匿名聚合（Supabase）+ 服务端 RLS
- **部署**：Cloudflare Workers via OpenNext，单一 Git 仓库 → CI 自动部署

**线上**：[shuozhi-web.fxp007.workers.dev](https://shuozhi-web.fxp007.workers.dev) · **代码**：[github.com/fxp/shuozhi-web](https://github.com/fxp/shuozhi-web)

---

## 1 · 时间线（决策的转弯）

### 起点 · 一份 PDF

用户发来一份学马生涯的中学生生涯报告样本（54 页）。诉求：「希望能够生成这样的测评报告，要有科学性。」

我做的第一件事不是写代码，而是**深度调研**：
- 委托研究 agent 跑学术文献（Pittenger 2005 关于 MBTI、Soto & John 2017 关于 BFI-2、Schneider & McGrew 2018 关于 CHC、Pashler 2008 关于学习风格迷思）
- 调研行业标杆产品（学马、北森、51选校等）
- 调研中国新高考政策（3+1+2 / 3+3 覆盖范围、教育部 2021 选考要求指引）
- 调研 LLM + 心理测量的最新进展

调研结论的核心：**PDF 样本里有大量内容是科学上不该做的**（MBTI 信度问题、12 项杂能力构念污染、17 页学习风格被多个综述否定）。如果照抄，朔知就是另一个穿了新外套的旧产品。

### `idea.md` 作为单一信息源

把所有决策、研究证据、参考文献写到一份 `idea.md`。这份文档贯穿整个开发过程：
- v1 是初版规划
- v2 经过深度调研重写
- 后期加了「决策 6：报告语言设计避免巴纳姆」「第七章：永远不做的事 + 学术依据」
- 最后变成产品的 single source of truth

**教训**：复杂产品的早期，写比码重要。`idea.md` 让我之后每次取舍都能回到原则。

### Mockups 在 Next.js 之前

调研之后，先用 `/frontend-design` skill 做了 4 个独立 HTML mockup（首页、答题、报告、历史）。完全静态，无逻辑，但视觉语言完整。

这一步证明了：用户喜欢的视觉方向（"Literary & Diagnostic" — 暖米纸 + 衬线 + 中文章节数字 + 信件式开场）。同时也让我提前发现一些设计陷阱（信件式开场太老气？文楷字体在中文标题上不够现代？）。

后来用户要求"完全不同的方向"，我重做了一遍 — 改成 "Telemetry"（控制台风、Cabinet Grotesk + Geist Mono + 单一 signal red、章节数字编码而非中文）。**第二版好得多**。

**教训**：第一次设计很容易过度遵循参考样本。第二次有了对产品的更深理解，会做出真正属于这个产品的东西。

### MVP-1 → MVP-3 的合并

原计划是 MVP-1（BFI-2 + 报告）→ MVP-2（RIASEC + 职业匹配）→ MVP-3（认知 + 心理筛查）三步走。实际过程中 MVP-2 + MVP-3 被一次性合并，因为：

- 用户判断"只有 BFI-2 + 报告"不构成生涯测评，**职业 + 选科推荐才是真正的付费动机**
- 一次性做完所有模块的 typing / scoring / 报告整合，比分阶段引入再 retrofit 简单
- 趁热打铁，决策连贯

最终 MVP-3 包含：BFI-2 + RIASEC + CHC + PHQ/GAD + 30 个职业类型 × 教育部专业代码 × 3+1+2 选科要求 + 三维匹配引擎。

### 数据策略的反转

最初规划里写了"Local-only"。后来用户要求"提交到 Supabase 做动态常模"。这个反转倒逼了一个**有意思的混合架构**：

- **数据本体（带姓名的报告）**：永远只在 localStorage
- **聚合数据（匿名得分）**：通过 `/api/submit` 推到 Supabase 的 `submissions` 表
- **常模查询**：通过 `SECURITY DEFINER` 的 `get_grade_norms()` RPC 从 anon 端查
- **RLS 保证**：anon 能 INSERT，但**不能 SELECT 单行**（实测过 `SELECT *` 返回 `[]`）

这个架构的好处是：用户看到的报告永远是本地的（隐私强）；同龄常模随提交量增长而准确（实证强）。

### 设计的两次进化

**第一版 · Literary & Diagnostic**：
- 暖米色纸面 `#f5f0e6`
- Fraunces 衬线 + LXGW 文楷
- 中文数字章节（壹/贰/叁）+ 信件式「致 [姓名]」开场

**第二版 · Telemetry**（用户要求"完全不同"）：
- 冷哑光底 `#f4f5f1`
- Cabinet Grotesk + Geist Mono + Instrument Serif（仅 italic 时刻）
- 章节用 `CH·02 / 05` 编码 + 拉丁全大写 dimension 名
- 单一 signal red `#ff3a1c` 贯穿
- 雷达图改为同心圆 + 十字准星（声呐感）

第二版更克制，更像数据读出，更适合中学生（不那么"长辈式")。

---

## 2 · 核心架构决策表

| 决策 | 选了什么 | 拒了什么 | 为什么 |
|---|---|---|---|
| 人格底层 | BFI-2 五维连续刻度 | MBTI 4 字母 | Pittenger 2005 复测 39%–76% 换类型；二分连续变量是测量学错误 |
| 兴趣 | Holland RIASEC 24 题 | 自造兴趣量表 | RIASEC 有 50+ 年验证，O\*NET CC0 题库可参照 |
| 认知 | CHC v0 自陈 16 题（明示非 IQ） | 12 项杂能力 | "美术能力""人际"不是认知，CHC 不承认这种归类 |
| 心理 | PHQ-9 + GAD-7（公开领域） | 自造焦虑/抑郁问卷 | 这两个量表全球标准 + 中文版心理测量学证据扎实 |
| 报告语言 | 模板兜底 + LLM 增强 + 服务端验证 | 纯 LLM 生成 | LLM 会幻觉，必须挂在具体得分上；模板保底 |
| LLM 提供商 | BigModel GLM-5.1 | Anthropic Claude | 中文优化更好 + 流式接口稳定 + 价格更友好 |
| LLM 调用 | 原生 fetch + 手解 SSE | OpenAI SDK | OpenAI SDK 的 async iter 在 Cloudflare workerd 下不稳定 |
| 字体 | Cabinet Grotesk + Geist Mono + Instrument Serif | Inter/Roboto/Arial | 系统字体太普通，要有性格但克制 |
| 部署 | Cloudflare Workers (OpenNext) | Vercel | 边缘 + Workers KV/Durable Objects 未来扩展性好 |
| 数据 | 本地报告 + 匿名 Supabase 聚合 | 中心化用户系统 | 隐私优先 + 不要登录注册流程 |
| 认证 | 0 注册流程 | OAuth / 邮箱 | 中学生不该被强迫注册；本地 + 匿名足够 |
| Admin | password-gated `/admin?key=` + service_role | 公开 dashboard | 简单够用；service_role 永不到客户端 |
| CI/CD | GitHub Actions → wrangler deploy | 手动部署 | 可重复 + 历史可追溯 |

---

## 3 · 设计哲学：决策 6 的语言系统

`idea.md` 决策 6 是整个产品的灵魂。它定义了报告的语言风格 7 条硬规则，**这些规则被翻译成 LLM prompt 的服务端验证器**：

### 7 条硬规则

1. **数据先行**：每段开头必须出现具体得分（如 "你的开放性 78（同龄前 22%）"）
2. **禁用巴纳姆短语**：黑名单包括 "你是一个 X 的人"、"你有时...有时..."、"内心深处"、"具有...潜力"、"应该 / 必须 / 不该 / 最好"
3. **优势-限制对称**：每个维度同时讲"在什么场景是资源 + 在什么场景成为消耗"
4. **行为而非人格**：不说"你抗压差"，说"在 3 个月以上长期不确定场景里你比同龄人更早耗能"
5. **30 天可执行**：不是"试着自律"，而是"买 A5 周计划本 + 每周日 10 分钟手写"
6. **协商语气**：用"可以试一件事 / 一种可能是"，禁用"应该 / 必须 / 你需要"
7. **专业克制**：不夸张、不煽情、不预测人生

### 服务端落实

`/api/interpret` 路由有：
- **输入**：结构化得分 + grade
- **prompt cache**：固定的 system prompt 包含 7 条规则 + few-shot 正例 + 黑名单
- **JSON schema 强制**：response_format json_object
- **服务端二次验证**：黑名单短语正则、`HAS_DIGIT` 必含数字、长度下限
- **失败兜底**：任一不通过 → SSE error → 客户端 fallback 到模板

LLM 不参与计分，只生成"解读层"。这个分层是关键。

### 实测有效

GLM-5.1 跑出来的内容真的遵守了：
- 「你的开放性 78（同龄前 22%），其中 facet '想象力' 85 分最为突出」（数据先行✓）
- 「在长达 3 个月以上、规则清晰且重复性高的任务里报告动力下滑」（情境化✓）
- 「**可以试一件事**：把每周 5 天的刷题，切成 3 天独立 + 2 天小组讨论复盘」（30 天可执行✓）
- 整段没有一处"你应该"或"你是一个 X 的人"（黑名单✓）

---

## 4 · 技术教训（撞过的坑）

### 4.1 iCloud + 构建产物 = 灾难

项目最初放在 iCloud Drive 路径下（`~/Library/Mobile Documents/iCloud~md~obsidian/...`）。第一次出问题是半途修改代码后 `pnpm dev` 报：

```
Error: Cannot find module './741.js'
Require stack:
- /.../web/.next/server/webpack-runtime.js
```

webpack chunk 文件名是基于内容哈希生成的，dev 模式每次代码变更会重新生成 chunks。**iCloud 在你保存文件时会同步 `.next/` 目录的旧版本**，导致 runtime 引用的 chunk 已被 iCloud 撤回 / 重命名为 `.icloud` 占位符。

**临时方案**：`rm -rf .next` 重启
**正解**：把代码搬出 iCloud 路径，文档（`idea.md`、mockups）留在 iCloud
**实际选择**：项目继续在 iCloud，依赖一个 `.gitignore` + 经常清 `.next` 的工作流。妥协。

### 4.2 OpenAI SDK 在 Cloudflare workerd 下不工作

最早 `/api/interpret` 用了 OpenAI SDK（OpenAI-compatible 调用 BigModel）。Node 下完美：

```
elapsed: 140s, 1298 deltas, complete=1, error=0
```

切到 `pnpm cf:preview`（workerd 本地）就只跑 106ms 后退出，没有任何 delta。不是 BigModel 的问题（我对照 Node 跑过同一份请求成功），是 SDK 在 workerd 下的 async iter 兼容问题。

**解决**：抛掉 SDK，直接 `fetch` 调 BigModel 的 SSE 端点，自己解 `data:` 行。代码多了 30 行，但**workerd 上 115s 完整流式跑通**。

**教训**：Cloudflare Workers 的 nodejs_compat 不等于"什么 Node 包都能跑"。流相关的 API 尤其要测。raw fetch 是最可靠的兜底。

### 4.3 GLM-5.1 vs 4.6：max_tokens 预算

GLM-4.6 跑 5 段 BFI 解读用 4096 max_tokens 够。切到 5.1 后同样 prompt 在 4096 下被截断，提到 8192 通过。

后来扩展 schema（加 RIASEC narrative + Cognitive narrative + 3 career narratives）时，**GLM-5.1 在 8192 又被截断**：返回了 3 个 readings 后输出停了。

```bash
elapsed: 162s
events: status=1 delta=0 complete=0 error=1
error.reason: model_returned_invalid_json
```

bump 到 16384 后通过。GLM-5.1 内部 reasoning_tokens（链式推理消耗）算在 max_tokens 预算里，**所以"见到的输出大小" + "看不见的推理大小"都要预留**。

**教训**：JSON 模式 ≠ 完美 JSON 保证。max_tokens 截断会导致返回不完整 JSON。验证器必须 defensive，错误处理必须 graceful（fallback 到模板）。

### 4.4 Cloudflare 100s 边缘超时 vs 长 LLM 调用

GLM-5.1 一次完整调用 100-235 秒。Cloudflare 边缘 gateway 有约 100 秒首字节超时 — 如果 Worker 等 100 秒还没开始返回数据，连接会被切断。

**解决**：流式响应。LLM 一边生成一边吐 token，Worker 把每个 token 转 SSE 转发给客户端，连接持续有数据流过 → gateway 不切。

代码模式：
```ts
const stream = new ReadableStream({
  async start(controller) {
    const upstreamRes = await fetch(BASE_URL, { stream: true });
    const reader = upstreamRes.body!.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      // 解析 SSE,转发 delta 到客户端
      controller.enqueue(encoder.encode(sseEvent("delta", { text })));
    }
    // 累积完整后做服务端验证
    if (validateOutput(fullText).ok) send("complete", ...);
    else send("error", { reason });
    controller.close();
  }
});
return new Response(stream, { headers: { "content-type": "text/event-stream" } });
```

**教训**：边缘函数 + 慢 LLM = 必须流式。设计阶段就要考虑。

### 4.5 React Hydration: `Date.now()` 是诅咒

第一版 `ProgressStrip` 在渲染期直接调 `Date.now()`：

```tsx
const elapsed = startedAtMs ? Math.round((Date.now() - startedAtMs) / 60000) : null;
```

SSR 在服务器跑出一个值，客户端 hydration 时跑出另一个 → React hydration mismatch warning。

**解决**：用 `useEffect` mount 后再 setState：

```tsx
const [now, setNow] = useState<number | null>(null);
useEffect(() => {
  setNow(Date.now());
  const t = setInterval(() => setNow(Date.now()), 30000);
  return () => clearInterval(t);
}, []);
const elapsed = now && startedAtMs ? Math.floor((now - startedAtMs) / 60000) : null;
```

SSR 时 `now=null`，elapsed 也 null，UI 占位。客户端 mount 后才填充。

**教训**：任何浏览器特有 API（Date.now、Math.random、localStorage、window.\*）在客户端组件渲染期调用都会引发 hydration 问题。统一规则：用 useEffect 后置赋值。

### 4.6 中文 ASCII 引号撞车 TypeScript 解析

写解读模板时，把 `"周复盘"` 这种中文短语放进了 TS 字符串字面量：

```ts
title: "在每周日晚上花 8 分钟做"周复盘"，写三句话即可。",
```

TS 解析器把 `"周复盘"` 看成字符串结束 + 新字符串开始 → 13 处错误。

**解决**：要么转义 `\"周复盘\"`，要么用中文双引号 `"周复盘"`。我用 `perl -i -pe` 批量替换。

**教训**：写中文字符串字面量时，遇到引号必须用中文「」或转义。建议 lint 规则。

### 4.7 PostgREST + Chinese URL params

`/api/norms?grade=高一` 第一次 curl 直接传中文，PostgREST 没解析出来：

```
GET /api/norms?grade=高一 → empty body
```

URL 标准要求非 ASCII 字符必须百分号编码。Browser 自动做，但 curl 不会：

```bash
curl "$URL/api/norms?grade=$(python3 -c 'import urllib.parse; print(urllib.parse.quote("高一"))')"
# → /api/norms?grade=%E9%AB%98%E4%B8%80 ✓
```

客户端 fetch 用 `encodeURIComponent` 在 React 代码里也做了。

**教训**：所有 URL 含非 ASCII 时都要 encode。测试也要 encode。

### 4.8 Supabase RLS 的优雅模式

需求：anon 能匿名提交得分，**不能读单行**，但可以读聚合（用于动态常模）。

直觉路径：直接给 anon 一个 `SELECT` policy 但限制返回什么 → 复杂、容易写错。

**优雅解**：`SECURITY DEFINER` 函数。

```sql
alter table submissions enable row level security;
create policy "anon insert" on submissions for insert to anon with check (true);
-- 不给 anon SELECT policy → anon 拿不到原始行

create or replace function get_grade_norms(p_grade text)
returns table (...) language sql security definer set search_path = public as $$
  select grade, count(*), avg(bfi_o), ... from submissions where ...
$$;
grant execute on function get_grade_norms to anon;
```

`SECURITY DEFINER` 让函数以创建者（postgres 超级用户）权限运行，**绕过 RLS 读 submissions 全表**，但 anon 只能调用函数（受函数体内逻辑约束），永远拿不到单行。

实测：
- 直接 `SELECT *` from submissions with anon key → `[]`（RLS 阻挡）
- POST `/rpc/get_grade_norms` with anon key → 返回聚合数据 ✓

**教训**：SECURITY DEFINER 函数 + RLS = 干净的"匿名提交 + 公开聚合"模式。

### 4.9 wrangler secret put 的语法陷阱

我做的 stupid mistake：

```bash
echo "shuozhi-61efa6ccf657" >> .dev.vars
```

应该是 `ADMIN_PASS=shuozhi-...` 但我忘了写 `KEY=`。结果 `.dev.vars` 多了一行只有 value 没有 key。本地 wrangler preview 启动时报：

```
Invalid env var format: shuozhi-61efa6ccf657
```

**教训**：`.env` 类文件的格式严格 `KEY=VALUE`，写脚本时记得带 `=`。

### 4.10 Hand-built JSON validator 的力量

LLM 永远会"差不多但不完全"。做了三层防御：

1. **JSON schema 强制** (`response_format: json_object`) — 保证不返回 plain text
2. **JSON.parse** — 保证语法合法
3. **自定义 validator** — 保证业务逻辑
   - 5 个 readings、顺序 O/C/E/A/N
   - 每段必含数字（防止纯叙述无数据）
   - 黑名单短语正则匹配
   - 长度下限（防止"略"或空字符串）
   - 命中任何不通过 → 整个回应丢弃，客户端走模板

```ts
function validateOutput(parsed: unknown): { ok: true; data } | { ok: false; reason: string } {
  // ... 70 行严格校验
}
```

实测有效次数：每 10 次 LLM 调用约 1 次因校验不过被拒（典型问题：limit 段没数字 / 用了"应该"等禁用词）。客户端无声 fallback，用户感知不到。

**教训**：让 LLM 生成 JSON 时，三层防御是最低标准。最严的那层是业务规则验证器。

---

## 5 · 产品教训

### 5.1 巴纳姆效应是行业默认值

研究学马 PDF 时，最大的发现是**整个行业的报告本质上都是巴纳姆**。「ENFP 型的人充满热情和新思想」这样的句子放谁身上看都"挺准"，因为足够模糊。

朔知做的最有价值的事不是新加什么，而是**移除**这种语言。决策 6 的 7 条规则都是"什么不能写"。每段必须挂在这位学生的具体得分上。

实测的对比威力大：
- 模板 + LLM 都遵守规则
- 用户报告打开率应该会显著高于"模板化"竞品
- 这是产品的护城河

### 5.2 永远不做的事 = 真正的差异化

`idea.md` 第七章「永远不做的事」最后一刻才加上。三件：
- 不做 12 项杂能力（CHC 不承认这种归类）
- 不做 17 页学习风格（Pashler 2008 已推翻）
- 不把 MBTI 作为底层（5 周复测信度 39%–76%）

每条都附学术参考。**这一章后来成了首页的核心 selling point**。在用户看的页面用对照三栏：

> **× MBTI 标签** | WHY: Pittenger 2005... | → **我们用 BFI-2 替代**

这是真正的市场定位 — "我们少做几件事，所以做的那几件更准"。

### 5.3 长表的退出礼仪

116 题 22 分钟对中学生是劝退的。第一版没有"中途出口" — 要么硬撑要么放弃。

后来加了**阶段检查点**（phase intercept）：
- 60 BFI 题完成 → 弹一个 intercept screen，可以选「现在出报告」（5 章版）或「继续 RIASEC」
- 84 题完成 → 同样的 intercept，选「现在出报告」（7 章版）或继续
- 100 题完成 → 同上

这让 22 分钟变成 4 个阶梯，每个阶梯都有 reward（更丰富的报告）。bouncer 可以拿初版报告离开，引导他们以后回来补 — 草稿仍在 localStorage。

**教训**：长表必须有出口礼仪。不只是"保存继续"，要有"现在出货"的实际收益。

### 5.4 隐藏数字 = 增加信任

用户的"不要在页面透露具体有多少份调查结果"反直觉但对。原因：

- 早期 N=12 → 显示「N=12 同龄高一」会让用户觉得"这是几个人攒的，不准"
- 显示 N=2,481 → 用户怀疑数字真假
- **不显示** → 给信任留 benefit-of-doubt 的空间

我把 cover 上的 `N=X` 改成 `BASELINE · 高一 · LIVE / DEFAULT`。LIVE 状态时（N≥20）报告自动用实证常模换算，但**用户不知道是基于多少人**。

admin dashboard 仍然能看到精确 N（service_role 只在服务端读取）。两个渠道，两套披露。

**教训**：UI 的"诚实"和"过度透明"是两件事。该隐藏的隐藏，反而更诚实。

### 5.5 LLM 解读 ≠ LLM 计分

最重要的架构边界：**LLM 永远不参与计分**。
- 计分是确定性的：BFI 题目得分 → 反向键 → 维度均值 → T 分 → 百分位
- LLM 只能读结构化得分写解读，不能修改得分
- 服务端验证器进一步保证 LLM 写的内容**必须引用具体得分**（否则丢弃）

这个分层让产品有"LLM 的温度 + 心理测量学的严谨"两面，互不污染。如果 LLM 出错（API 挂、JSON 截断、生成不合规），客户端无声切到规则模板，用户拿到的报告还是完整的、科学的。

### 5.6 直觉提醒 ≠ 焦虑制造

「7 秒未答出现 ▌ 凭直觉作答 提醒」这个想法第一次提出时我担心会让用户更焦虑。实际实现：
- 缓慢淡入（0.9s 动画）
- 信息克制（"想得越久反而不准"）
- 答题后立即消失
- 不阻塞、不干扰

UX 上是"轻轻的旁注"而非"催促"。

**教训**：互动设计的"提醒"和"催促"差别在动画时长 + 文案语气 + 视觉权重。

---

## 6 · 流程教训

### 6.1 idea.md 是 single source of truth

整个项目期间，idea.md 反复被引用：
- 写代码前查"决策 N 怎么说"
- 写 LLM prompt 时挂在"决策 6 的 7 条规则"
- 写产品文案时引用"永远不做的事"
- 用户提需求时确认"是否符合 idea.md 第 X 章"

这个文档本身经过：v1（粗）→ 调研后 v2（重写）→ 加决策 6 → 加第七章。**每次重大决策后立即更新文档**。

**教训**：复杂产品的脚手架不是代码，是文档。

### 6.2 mockup → next.js → 生产

工作流：
1. /frontend-design 出 4 个 HTML mockup
2. 验证视觉方向
3. 把 mockup 翻译成 React + Tailwind 组件
4. 加业务逻辑
5. 部署

中途用户要求"另一种风格"，我用同样流程做了第二版（telemetry）。第二版 70% 的代码是新的，但 idea.md 决策没改。**视觉是表层，业务逻辑是核心**。

### 6.3 验证有阶梯

每次部署前的检查阶梯：
1. `pnpm typecheck` (TypeScript 类型)
2. `pnpm build` (Next.js 静态构建)
3. `pnpm cf:build` (OpenNext bundle for Workers)
4. `pnpm cf:preview` (workerd 本地模拟)
5. `pnpm cf:deploy` (生产)
6. `curl smoke test` (live route 200 检查)
7. `curl /api/* live test` (实际 LLM / Supabase 调用)

每一步都可能挂在不同地方。我犯过的错：
- 跳过 typecheck 直接 build → 上 prod 才发现 ts 错
- 跳过 cf:preview 直接 deploy → workerd 兼容问题上线才暴露
- 跳过 smoke test → "Deployed" 不等于"能用"

**教训**：所有阶梯都要走，尤其涉及 Workers / 流式 / LLM 时。

### 6.4 Skill > raw SDK reach

`/frontend-design` 和 `/claude-api` skill 都帮我节省了大量时间：
- /frontend-design 给了一套完整的"设计思考 + 不要做的反模式 + 实现复杂度匹配审美意图"框架。一次思考能输出可用产品。
- /claude-api 给了"模型 ID + 推荐参数 + 错误处理 + prompt caching 最佳实践"。从 OpenAI 切到 BigModel 时，prompt caching 和验证逻辑 1:1 可移植。

**教训**：skill 是结构化的"如何做这件事"。能跳过自己摸索的弯路。

### 6.5 GitHub Actions ≠ free deploy

CI 配 deploy.yml 简单：
```yaml
on: push: branches: [main]
jobs: deploy: ...
  - uses: pnpm/action-setup@v4
  - run: pnpm install --frozen-lockfile
  - run: pnpm typecheck
  - run: pnpm cf:build
  - run: pnpm cf:deploy
    env:
      CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

但 CLOUDFLARE_API_TOKEN 必须**用户手动创建**（Cloudflare 不给 API 创建 token，安全设计）。我搞定了 ACCOUNT_ID 自动设，TOKEN 部分把指令写在 README 给用户跑。

**教训**：CI 自动化能做到 80%，剩下 20% 是用户必须的手动步骤。文档化清楚 > 全自动梦想。

---

## 7 · 数字结算

| 项目 | 量 |
|---|---|
| 总开发时间（按用户对话回合估算） | 约 30 个对话回合 |
| 代码行数 | ~ 4500（lib/ + app/ + components/） |
| 测试题量 | 116 道（4 模块） |
| 报告章节数 | 9 章 |
| 职业数据库 | 30+ 职业类型 × 教育部专业代码 × 3+1+2 选科要求 |
| LLM 模型 | GLM-5.1 via BigModel OpenAI 兼容 |
| 单次 LLM 调用 | 100-235 秒（流式输出，连接保活） |
| LLM 输出 token | ~5300 visible + ~4000 reasoning |
| 部署平台 | Cloudflare Workers (OpenNext) |
| 数据库 | Supabase PostgreSQL + RLS |
| 字体加载 | Cabinet Grotesk (Fontshare) + Geist Mono / Instrument Serif / Noto Sans SC (Google Fonts) |

---

## 8 · 现状 + 真正的下一步

### 已上线

✅ 4 模块 116 题 / 9 章报告 / 30+ 职业 + 选科建议
✅ LLM 流式解读（5 BFI + 1 RIASEC + 1 认知 + 3 职业 narratives）
✅ 服务端验证器（黑名单 + 数字引用 + 长度下限）
✅ Supabase 匿名提交 + 实证常模 + 服务端 dashboard
✅ 阶段检查点 / 中途预览 / 退出恢复
✅ 答题时长记录 + 直觉提醒
✅ GitHub repo + CI/CD（CF API token 待用户配置）
✅ Cloudflare Workers 边缘部署

### 待做（按 ROI 排序）

🔴 **生产化的硬要求**：
- BFI-2 中文版 Soto & John 团队授权（现在用占位题面，明示 placeholder）
- 真实中国高中生分层抽样常模建设（N≥1000，年级 × 性别 × 城乡）
- IRT 校准的 CHC 题库（非自陈版，需要 6-12 个月专项工作）

🟡 **立刻能做的体验提升**：
- LLM 流式按段渲染（每段一完成就替换模板，不是整体 swap）
- 答题时长百分位 → 极性指数计算（用真实样本均值校正）
- PDF 导出（服务端 puppeteer，不依赖浏览器 print）
- Mobile UX polish round（雷达图在小屏 layout）

🟢 **品类拓展**：
- 家长版 / 教师版报告（同一份数据，不同视角）
- 90 天复测的"漂移图"（首次报告数据已存 localStorage，可生成纵向对照）
- 学校 B 端 deployment（多租户）

---

## 9 · 一句话总结

> **少做几件事，让做的那几件准。**

这是产品哲学，也是开发哲学。MBTI 的 13 页换成 BFI-2 的 5 章；12 项杂能力换成 4 个 CHC 因子；17 页学习风格直接删掉。每次"删"都让"留"的部分更可信。

这份开发日志写在 v1 上线日。下一份会在 N≥1000 真实样本到位、有了真实复测数据之后再写。

---

*Written by 朔知 build crew · 2026-05-10*
