// RIASEC 兴趣测评 · Holland 六类型自陈 ----------------------------------------
//
// 24 题(每类型 4 题),5 点 Likert 同意度。
// 参照 O*NET Interest Profiler (CC0 公开)与 SDS 短型的中文化结构,
// 题目自撰为中学生情境。生产前可参考 Zhao 等(2022)中文 SDS 修订做计量验证。
//
// ----------------------------------------------------------------------------

import type { Item, RiasecType, LikertResponse, RiasecResult, RiasecScore } from "./types";

// 24 题,id 范围 61–84(BFI-2 占 1–60)
// 没有反向题(自陈式兴趣强度,反向意义不大)。
export const RIASEC_ITEMS: Item[] = [
  // R · 实际型(Realistic)动手 / 工具 / 户外 / 机械
  { id: 61, module: "riasec", text: "我喜欢拆开机器、设备看里面的零件怎么运作。",     riasecType: "R" },
  { id: 62, module: "riasec", text: "我愿意花一下午时间修理坏掉的东西。",             riasecType: "R" },
  { id: 63, module: "riasec", text: "户外活动比室内课堂让我更有精神。",               riasecType: "R" },
  { id: 64, module: "riasec", text: "我对手工 / DIY / 装配 / 木工类活动有兴趣。",     riasecType: "R" },

  // I · 调研型(Investigative)思考 / 研究 / 解谜 / 科学
  { id: 65, module: "riasec", text: "我喜欢思考“为什么是这样”这一类问题。",            riasecType: "I" },
  { id: 66, module: "riasec", text: "看科普文章或纪录片对我来说是放松。",             riasecType: "I" },
  { id: 67, module: "riasec", text: "我享受花时间解开一道难题的过程。",               riasecType: "I" },
  { id: 68, module: "riasec", text: "我希望弄清事情背后的原理,而不是只知道结论。",    riasecType: "I" },

  // A · 艺术型(Artistic)创作 / 表达 / 美感 / 自由
  { id: 69, module: "riasec", text: "我经常有创作冲动(写作 / 绘画 / 音乐 / 视频)。",  riasecType: "A" },
  { id: 70, module: "riasec", text: "我对美感很敏锐,在意配色 / 排版 / 节奏。",        riasecType: "A" },
  { id: 71, module: "riasec", text: "我抗拒被规则束缚的工作方式,更想要自由表达。",    riasecType: "A" },
  { id: 72, module: "riasec", text: "我有比较独特的审美和表达,与主流不太一样。",      riasecType: "A" },

  // S · 社会型(Social)帮助 / 教导 / 合作 / 关怀
  { id: 73, module: "riasec", text: "看见同学有困难,我会主动想去帮忙。",             riasecType: "S" },
  { id: 74, module: "riasec", text: "我喜欢倾听别人的烦恼并尝试给出建议。",           riasecType: "S" },
  { id: 75, module: "riasec", text: "教别人懂一件事会让我有成就感。",                 riasecType: "S" },
  { id: 76, module: "riasec", text: "我比较在意身边人的情绪状态,会主动关心。",        riasecType: "S" },

  // E · 企业型(Enterprising)领导 / 说服 / 竞争 / 目标
  { id: 77, module: "riasec", text: "我愿意在小组里担任组织 / 带头的角色。",          riasecType: "E_riasec" },
  { id: 78, module: "riasec", text: "我享受说服别人接受我观点的过程。",               riasecType: "E_riasec" },
  { id: 79, module: "riasec", text: "竞争(比赛 / 排名)能激发我的状态。",              riasecType: "E_riasec" },
  { id: 80, module: "riasec", text: "我对“怎么做能更有效率”比较敏感,愿意优化流程。",  riasecType: "E_riasec" },

  // C · 常规型(Conventional)整理 / 规则 / 数据 / 流程
  { id: 81, module: "riasec", text: "我喜欢把信息整理成有结构的笔记 / 表格。",        riasecType: "C_riasec" },
  { id: 82, module: "riasec", text: "明确的规则和流程让我做事更安心。",               riasecType: "C_riasec" },
  { id: 83, module: "riasec", text: "我习惯按计划 / 列表逐项完成任务。",              riasecType: "C_riasec" },
  { id: 84, module: "riasec", text: "我对数字和数据的准确性很在意。",                 riasecType: "C_riasec" },
];

export const RIASEC_LABELS: Record<RiasecType, { code: string; cn: string; en: string; oneLiner: string }> = {
  R:         { code: "R", cn: "实际型",   en: "Realistic",     oneLiner: "动手、工具、户外、具体可触" },
  I:         { code: "I", cn: "调研型",   en: "Investigative", oneLiner: "思考、研究、原理、解谜" },
  A:         { code: "A", cn: "艺术型",   en: "Artistic",      oneLiner: "创作、表达、美感、自由" },
  S:         { code: "S", cn: "社会型",   en: "Social",        oneLiner: "帮助、教导、合作、关怀" },
  E_riasec:  { code: "E", cn: "企业型",   en: "Enterprising",  oneLiner: "领导、说服、竞争、目标" },
  C_riasec:  { code: "C", cn: "常规型",   en: "Conventional",  oneLiner: "整理、规则、数据、流程" },
};

const TYPE_ORDER: RiasecType[] = ["R", "I", "A", "S", "E_riasec", "C_riasec"];

export function scoreRiasec(responses: Record<number, LikertResponse>): RiasecResult {
  const scores: RiasecScore[] = TYPE_ORDER.map((t) => {
    const items = RIASEC_ITEMS.filter((i) => i.riasecType === t);
    const vals = items.map((i) => responses[i.id] ?? 3);
    const raw = vals.reduce((s, v) => s + v, 0) / vals.length;
    // map raw 1-5 to 0-100
    const normalized100 = Math.round(((raw - 1) / 4) * 100);
    return { type: t, raw, normalized100 };
  });

  // top-3 by score (tie-break by canonical order R/I/A/S/E/C)
  const sorted = [...scores].sort((a, b) =>
    b.normalized100 - a.normalized100 ||
    TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type)
  );
  const topThree = sorted.slice(0, 3).map((s) => s.type);
  const hollandCode = topThree.map((t) => RIASEC_LABELS[t].code).join("");

  return { scores, topThree, hollandCode };
}
