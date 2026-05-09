// 朔知 · /api/interpret —— LLM 解读层 (流式) ----------------------------------
//
// 服务端调用智谱 BigModel GLM (OpenAI 兼容接口) 生成 5 段个性化解读。
// **流式响应**: 把上游 LLM 的 token chunks 通过 SSE 实时转发给客户端,
// 让 Cloudflare Worker / 任何反向代理的连接保持有数据流动 —— 否则
// 80–120s 的整段等待会被边缘网关 (~100s) 切断。
//
// 协议(client ←→ server, server-sent events):
//   event: delta   data: {"text":"..."}        逐字增量 (用于保活 + 客户端进度)
//   event: complete data: {"readings":[...]}   全部完成 + 校验通过
//   event: error    data: {"reason":"..."}     校验失败或上游错误 → 客户端走模板
//
// 设计延续:
//  - System prompt 前缀稳定 (BigModel 服务端自动 prefix cache)
//  - JSON 强制输出: response_format: json_object
//  - 服务端二次验证: 黑名单短语 / meaning 段必须含具体得分
//  - 失败时客户端 fallback 到 lib/interpret.ts 模板
//
// 环境变量(Cloudflare secrets / .env.local / .dev.vars):
//   BIGMODEL_API_KEY=...
//   BIGMODEL_BASE_URL=...   默认 https://open.bigmodel.cn/api/paas/v4
//   BIGMODEL_MODEL=...      默认 glm-5.1
// ----------------------------------------------------------------------------

// Note: 不再用 openai SDK —— 它的 stream 迭代在 Cloudflare workerd 本地预览下兼容性
// 不稳定。直接用 fetch 调 BigModel 的 OpenAI 兼容 chat/completions 端点(stream:true),
// 在服务端解析其 SSE 响应,再以朔知协议转发给客户端。

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ─── system prompt ──────────────────────────────────────────────

const SYSTEM_PROMPT = `你是一名严肃的心理学解读助手,正在为基于 BFI-2 中文版 (Soto & John 2017; Zhang 2022) 的中学生人格测评生成报告解读。

你的任务: 对一名学生的 5 个 Big Five 维度 (开放性 O / 尽责性 C / 外向性 E / 宜人性 A / 情绪敏感性 N),分别生成三段解读 + 一个 30 天具体行动建议。

# 七条硬规则 (违反任何一条这次输出会被丢弃)

1. **数据先行**:每段开头必须出现具体得分,格式如 "你的开放性 78(同龄前 22%)" 或 "你的尽责性 facet '组织性' 45 分"。每个 reading 的 meaning 段必须至少出现一个数字得分。

2. **禁用以下短语黑名单**(任何形式的语义等价表达也禁止):
   - "你是一个 X 的人 / 你是一类 X 的人"
   - "你有时...有时..."(并列对立结构)
   - "你内心深处 / 你的内心 / 心灵深处"
   - "你具有...的潜力"
   - "你拥有...天赋"

3. **优势-限制对称、情境化**:meaning 段讲在什么情境下是资源,limit 段讲同一特质在什么情境下会成为消耗。两段长度相当(各 80–150 字),不偏向夸奖。

4. **限制只描述行为,不评判人格**:不说 "你抗压差","你不会管理时间","你不善于...",而要说 "在 3 个月以上长期不确定的场景里你比同龄人更早耗能","在没有显式系统的多任务并行场景下你容易丢分"。

5. **每个 action 给一件 30 天具体可执行的事**:不是 "试着自律一点",而是 "买一本 A5 周计划本,每周日花 10 分钟手写下周三件必做"。要有具体的工具 / 频率 / 时长 / 验证方式。

6. **协商语气**:用 "可以试一件事 / 一种可能是 / 如果...那么 / 你会发现"。禁用 "你应该 / 你必须 / 你不该 / 你需要 / 你最好"。

7. **专业克制**:不夸张("巨大""非凡""惊人")、不煽情("特别的你""独一无二")、不预测人生("你会成为...")。把测评写得像一份认真的、有限的观察记录。

# 风格示例(高开放性 + 高外向性学生)

**meaning(正例)**:
"你的开放性 78(同龄前 22%),其中 facet '想象力' 85 分最为突出 —— 你属于那种听到一个新概念就想立刻深入下去的人。结合外向性 75,'在讨论中产生想法' 是你最高效的学习方式之一。"

**limit(正例)**:
"同龄高开放性的学生中,约 63% 在长达 3 个月以上、规则清晰且重复性高的任务(如刷题中段)里报告动力下滑 —— 不是不够聪明,是这种任务给开放性提供的新输入太少。"

**action(正例)**:
- label: "接下来 30 天,可以试一件事"
- title: "把每周 5 天的刷题,切成 \\"3 天独立 + 2 天小组讨论复盘\\"。"
- body: "小组讨论复盘是给开放性'喂'新输入的合规方式:你不需要少做题,只需要让做完的题被讨论一次。一个月后再判断节奏是否需要调整。"

# 输入说明

用户消息是一个 JSON,包含:
- domains: 5 个维度的 percentile (0-100) 与 raw T 分
- facets: 15 个 facet 的 percentile
- reliability: 信度指数 alpha 与极性 polarity
- grade: 学生年级("初三"/"高一"/"高二"/"高三"等)
- name: 学生姓名/昵称(可选)

# 输出契约

严格 JSON,与下面的 schema 一致:

\`\`\`json
{
  "readings": [
    { "domain": "O|C|E|A|N",
      "meaning": "string",
      "limit": "string",
      "action": { "label": "string", "title": "string", "body": "string" } },
    ... 共 5 个,顺序固定 O / C / E / A / N
  ],
  "riasec_narrative": "string",
  "cognitive_narrative": "string",
  "career_narratives": ["string", "string", "string"]
}
\`\`\`

# 各字段长度与要求

## readings (Big Five 五段)
- meaning: 80–150 字
- limit: 80–150 字
- action.label: 5–15 字
- action.title: 12–28 字,一个完整的、有动词的句子
- action.body: 80–180 字

## riasec_narrative (RIASEC 兴趣三字码叙述,100–180 字)
**目的**:把学生的 Holland 三字码与 BFI 高分维度连接起来,讲一个具体的"为什么这个组合"。
**必须**:引用具体的 Holland 字母及其得分(如 "调研型 88")+ 至少一个 Big Five 维度得分。
**示例**:"你的三字码 ISA · 调研型 88 / 艺术型 75 / 社会型 63,与你的开放性 78 + 宜人性 62 是顺势而为的组合。这种剖面在科研类、心理咨询类、设计研究类岗位上很常见 —— 调研型让你愿意深入,艺术型让你不抗拒美感的细节,社会型让接触陌生人的场景不耗能。"

## cognitive_narrative (认知风格叙述,100–180 字)
**目的**:读 4 个能力得分的高低对比,连接到具体学习场景。
**必须**:引用至少 2 个能力得分(如 "Gf 88 / Gv 50") + 一个具体学科 / 题型场景。
**禁止**:把这当作 IQ 解读,不能说"你比同龄人聪明"或类似定性判断。
**示例**:"你的 Gf 88 + Gc 80 vs Gv 50 + Gs 70 这个剖面属于'语言-推理强、空间-速度弱'型。意味着抽象数学题、长文阅读、议论文这类题目你处理较快;但立体几何、空间想象、限时填空可能比同龄人更费力 —— 不是不会,是要多预留时间。"

## career_narratives (职业匹配叙述,3 条,顺序与输入 careers 数组一致,每条 100–180 字)
**目的**:为 TOP-3 每个职业,补一段"为什么这职业匹配你这种剖面 + 进入这个领域要注意什么"。
**必须**:引用至少 1 个 Big Five 得分 + 1 个 RIASEC 得分。补充内容,不要重复输入 careers 数组里 fitNotes 已经说过的话。
**示例**:"临床医学:你的尽责性 72 + 调研型 88 + 同情心 78 让你具备了基本三角:可靠 / 求真 / 关怀。但你的开放性 78 同时意味着 8-11 年规培 + 重复诊室工作里你可能比同龄医生更早疲倦 —— 选这条路径,提前考虑研究型方向(博士+科研)而非纯诊室,可以平衡这种张力。"

# 通用要求
所有 readings 和 narratives 都遵循开头的 7 条硬规则(数据先行 / 黑名单 / 优势-限制对称 / 协商语气 / 等)。
不要输出 markdown,不要 code fence 包裹,不要解释或前后缀文本 —— 只返回 JSON。`;

// ─── black list ──────────────────────────────────

const BANNED: RegExp[] = [
  /你是一[个类][^\n]{0,30}的人/,
  /你有时[^\n]{0,30}有时/,
  /(?:你的)?内心深处/,
  /心灵深处/,
  /你具有.{0,15}潜力/,
  /你拥有.{0,15}天赋/,
  /你应该/,
  /你必须/,
  /你不该/,
  /你最好/,
];
const HAS_DIGIT = /\d/;

interface Reading {
  domain: "O" | "C" | "E" | "A" | "N";
  meaning: string;
  limit: string;
  action: { label: string; title: string; body: string };
}

interface ExtendedOutput {
  readings: Reading[];
  riasec_narrative?: string;
  cognitive_narrative?: string;
  career_narratives?: string[];
}

function checkBanned(seg: string, label: string): string | null {
  for (const re of BANNED) if (re.test(seg)) return `${label}: banned phrase ${re.source}`;
  return null;
}

function validateOutput(parsed: unknown):
  { ok: true; data: ExtendedOutput } | { ok: false; reason: string }
{
  if (!parsed || typeof parsed !== "object") return { ok: false, reason: "not an object" };
  const obj = parsed as Record<string, unknown>;

  // ── readings (must have 5, ordered) ──
  const readings = obj.readings;
  if (!Array.isArray(readings) || readings.length !== 5) {
    return { ok: false, reason: `expected 5 readings, got ${Array.isArray(readings) ? readings.length : "n/a"}` };
  }
  const order = ["O", "C", "E", "A", "N"];
  for (let i = 0; i < 5; i++) {
    const r = readings[i];
    if (!r || typeof r !== "object") return { ok: false, reason: `reading[${i}] not object` };
    const reading = r as Reading;
    if (reading.domain !== order[i]) return { ok: false, reason: `reading[${i}] wrong domain ${reading.domain}` };
    const segs = [
      [reading.meaning, `reading[${i}].meaning`],
      [reading.limit, `reading[${i}].limit`],
      [reading.action?.title, `reading[${i}].action.title`],
      [reading.action?.body, `reading[${i}].action.body`],
    ] as const;
    for (const [seg, label] of segs) {
      if (typeof seg !== "string" || seg.length === 0) return { ok: false, reason: `${label} empty` };
      const b = checkBanned(seg, label);
      if (b) return { ok: false, reason: b };
    }
    if (!HAS_DIGIT.test(reading.meaning)) return { ok: false, reason: `reading[${i}] meaning has no score citation` };
  }

  // ── riasec_narrative ──
  const rn = obj.riasec_narrative;
  if (typeof rn !== "string" || rn.length < 40) return { ok: false, reason: "riasec_narrative too short or missing" };
  const rnBan = checkBanned(rn, "riasec_narrative");
  if (rnBan) return { ok: false, reason: rnBan };
  if (!HAS_DIGIT.test(rn)) return { ok: false, reason: "riasec_narrative no score citation" };

  // ── cognitive_narrative ──
  const cn = obj.cognitive_narrative;
  if (typeof cn !== "string" || cn.length < 40) return { ok: false, reason: "cognitive_narrative too short or missing" };
  const cnBan = checkBanned(cn, "cognitive_narrative");
  if (cnBan) return { ok: false, reason: cnBan };
  if (!HAS_DIGIT.test(cn)) return { ok: false, reason: "cognitive_narrative no score citation" };

  // ── career_narratives ──
  const cars = obj.career_narratives;
  if (!Array.isArray(cars) || cars.length !== 3) {
    return { ok: false, reason: `expected 3 career_narratives, got ${Array.isArray(cars) ? cars.length : "n/a"}` };
  }
  for (let i = 0; i < 3; i++) {
    const c = cars[i];
    if (typeof c !== "string" || c.length < 40) return { ok: false, reason: `career_narratives[${i}] too short` };
    const cBan = checkBanned(c, `career_narratives[${i}]`);
    if (cBan) return { ok: false, reason: cBan };
    if (!HAS_DIGIT.test(c)) return { ok: false, reason: `career_narratives[${i}] no score citation` };
  }

  return {
    ok: true,
    data: {
      readings: readings as Reading[],
      riasec_narrative: rn,
      cognitive_narrative: cn,
      career_narratives: cars as string[],
    },
  };
}

// ─── handler ──────────────────────────────────────────────────────

const BASE_URL = process.env.BIGMODEL_BASE_URL ?? "https://open.bigmodel.cn/api/paas/v4";
const MODEL    = process.env.BIGMODEL_MODEL    ?? "glm-5.1";

function sseEvent(event: string, payload: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
}

export async function POST(req: Request) {
  if (!process.env.BIGMODEL_API_KEY) {
    return new Response(JSON.stringify({ error: "API key not configured" }), {
      status: 503, headers: { "content-type": "application/json" },
    });
  }

  let body: unknown;
  try { body = await req.json(); }
  catch { return new Response(JSON.stringify({ error: "invalid json" }), { status: 400 }); }

  const userInput = JSON.stringify(body, null, 2);
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, payload: unknown) => {
        try { controller.enqueue(encoder.encode(sseEvent(event, payload))); }
        catch { /* client gone */ }
      };

      send("status", { phase: "connected", model: MODEL });

      // ── 1. open upstream fetch to BigModel chat/completions (SSE stream) ──
      let upstream: Response;
      try {
        upstream = await fetch(`${BASE_URL}/chat/completions`, {
          method: "POST",
          headers: {
            "content-type":  "application/json",
            "authorization": `Bearer ${process.env.BIGMODEL_API_KEY}`,
            "accept":        "text/event-stream",
          },
          body: JSON.stringify({
            model:           MODEL,
            max_tokens:      16384,  // 扩展后 schema (5 readings + 3 narratives + 3 career narratives) 加上 GLM-5.1 的 reasoning tokens 需要更多预算
            temperature:     0.3,
            stream:          true,
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user",   content: `请为以下学生生成 5 段解读 (顺序 O/C/E/A/N),只返回 JSON:\n\n${userInput}` },
            ],
          }),
        });
      } catch (e) {
        console.error("[api/interpret] fetch failed:", e);
        send("error", { reason: "upstream_unreachable" });
        controller.close();
        return;
      }

      if (!upstream.ok || !upstream.body) {
        const errBody = await upstream.text().catch(() => "");
        console.error(`[api/interpret] upstream ${upstream.status}:`, errBody.slice(0, 400));
        const reason =
          upstream.status === 401 ? "auth_failed" :
          upstream.status === 429 ? "rate_limit"  :
          upstream.status === 529 ? "overloaded"  :
          `upstream_${upstream.status}`;
        send("error", { reason });
        controller.close();
        return;
      }

      // ── 2. read BigModel SSE, forward deltas, accumulate full text ──
      const reader = upstream.body.getReader();
      let buf = "";
      let fullText = "";
      let tokenCount = 0;
      let usage: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } | undefined;

      try {
        readLoop: while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });

          const lines = buf.split("\n");
          buf = lines.pop() ?? "";  // keep incomplete tail

          for (const raw of lines) {
            const line = raw.trim();
            if (!line || !line.startsWith("data:")) continue;
            const data = line.slice(5).trim();
            if (data === "[DONE]") break readLoop;

            let evt: { choices?: Array<{ delta?: { content?: string }; finish_reason?: string | null }>; usage?: typeof usage };
            try { evt = JSON.parse(data); } catch { continue; }

            const delta = evt.choices?.[0]?.delta?.content ?? "";
            if (delta) {
              fullText += delta;
              tokenCount += 1;
              send("delta", { text: delta, count: tokenCount });
            }
            if (evt.usage) usage = evt.usage;
          }
        }
      } catch (e) {
        console.error("[api/interpret] stream read error:", e);
        send("error", { reason: "stream_read_failed" });
        controller.close();
        return;
      }

      // ── 3. parse + validate the assembled JSON ──
      let parsed: unknown;
      try { parsed = JSON.parse(fullText); }
      catch {
        console.error("[api/interpret] invalid JSON. first 500 chars:\n", fullText.slice(0, 500));
        send("error", { reason: "model_returned_invalid_json" });
        controller.close();
        return;
      }

      const validation = validateOutput(parsed);
      if (!validation.ok) {
        console.error("[api/interpret] validation failed:", validation.reason);
        send("error", { reason: `validation_failed: ${validation.reason}` });
        controller.close();
        return;
      }

      send("complete", {
        readings: validation.data.readings,
        riasec_narrative: validation.data.riasec_narrative,
        cognitive_narrative: validation.data.cognitive_narrative,
        career_narratives: validation.data.career_narratives,
        usage,
        model: MODEL,
      });
      controller.close();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "content-type":     "text/event-stream; charset=utf-8",
      "cache-control":    "no-cache, no-transform",
      "connection":       "keep-alive",
      "x-accel-buffering": "no",  // disable Nginx/CDN response buffering
    },
  });
}
