# 朔知 · SHUOZHI

> 一份基于 BFI-2 + RIASEC + CHC + PHQ/GAD 的中学生生涯测评。

**生产环境**：https://shuozhi-web.fxp007.workers.dev

## 是什么

- 4 个独立心理学模块,共 **116 题**,约 22 分钟
- 覆盖人格 / 兴趣 / 认知风格 / 心理健康筛查
- 输出 9 章报告 + LLM 个性化解读 + **教育部专业代码** + 3+1+2 选科建议
- 支持中途保存 / 阶段提前出报告 / 实证常模动态适配

## 设计哲学

每段解读必须挂在具体得分上(无巴纳姆),协商语气(无"应该 / 必须"),
优势-限制对称呈现,30 天可执行动作。详见 [`../idea.md`](../idea.md)。

我们**拒绝**做的事(科学依据见 idea.md 第七章):

- × MBTI 4 字母标签作为底层(Pittenger 2005 复测信度问题)
- × 12 项杂能力(把人格 / 兴趣装进"能力"维度,CHC 不承认)
- × 17 页学习风格自陈(Pashler 2008 / Kirschner 2017 已推翻)

## 技术栈

- **Next.js 15** App Router · React 19 · TypeScript
- **Tailwind 3** + Cabinet Grotesk + Geist Mono + Instrument Serif
- **Cloudflare Workers** via [`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare)
- **Supabase** 匿名提交 + 实证常模聚合(SECURITY DEFINER 函数)
- **GLM-5.1** via BigModel OpenAI 兼容接口,流式 SSE

## 本地开发

```bash
pnpm install
cp .env.example .dev.vars
# 填入 BIGMODEL_API_KEY / SUPABASE_URL / SUPABASE_ANON_KEY 等
pnpm dev          # Next.js dev (localhost:3000)
pnpm cf:preview   # Cloudflare workerd 本地预览(更接近生产)
pnpm typecheck
pnpm cf:build     # OpenNext 构建
pnpm cf:deploy    # 推到 Cloudflare Workers
```

## CI/CD

每次 push 到 `main` 会自动触发 [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml):
typecheck → cf:build → cf:deploy。Worker secrets(BIGMODEL_API_KEY 等)
已在 Cloudflare 端配置,持久存在。

需要 GitHub secrets:
- `CLOUDFLARE_API_TOKEN` — 创建于 [Cloudflare Dashboard → My Profile → API Tokens](https://dash.cloudflare.com/profile/api-tokens),用 "Edit Cloudflare Workers" 模板
- `CLOUDFLARE_ACCOUNT_ID` — 在 Workers dashboard 右侧能看到

## 路由

| 路径 | 内容 |
|---|---|
| `/` | 首页 + 永远不做的事 essence + 示例 CTA + RESUME 检测 |
| `/sample-report` | 一键生成 ENFP-ish 高一同学示例报告 |
| `/assessment` | 4 阶段、checkpointed 答题流;每阶段可提前出报告;7s 直觉提醒 |
| `/report/[id]` | 9 章报告 + LLM 个性化叙述(BFI 5 段 + RIASEC + 认知 + 3 职业) |
| `/history` | 仅本设备的历史档案(localStorage) |
| `/admin?key=…` | 服务端 dashboard(累积量、年级分布、健康阳性数) |
| `/api/submit` | 匿名提交到 Supabase |
| `/api/norms?grade=高一` | 实证常模(N≥20 时报告自动切 LIVE baseline) |
| `/api/interpret` | GLM-5.1 流式解读 |

## License

WIP — 内部项目。BFI-2 量表生产部署前需取得 Soto & John 团队中文版授权。
