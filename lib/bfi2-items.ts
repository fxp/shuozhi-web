// BFI-2 中文版 · 60 题 -------------------------------------------------------
//
// ⚠️  开发用占位题库 (DEVELOPMENT PLACEHOLDER)
// 题面遵循 BFI-2 (Soto & John, 2017) 的 5 域 × 3 facet × 4 题结构与反向计分
// 比例，但具体题面由本项目自撰，不直接复用授权量表的中文修订版
// (Zhang et al. 2022)。生产部署前需向 Soto & John 团队取得 BFI-2 中文版
// 授权，并替换为标准题面。
//
// 计分约定: 1=非常不符合, 2=不太符合, 3=说不太清, 4=比较符合, 5=非常符合
// 反向题: scoreContribution = 6 - rawResponse
//
// ----------------------------------------------------------------------------

import type { Item } from "./types";

export const ITEMS: Item[] = [
  // ── O · Open-Mindedness ─────────────────────────────────────────
  // O.imagination 想象力
  { id:  1, module: "bfi2", text: "我是一个充满创造性、能想到新点子的人。",            domain:"O", facet:"O.imagination",   reverse:false },
  { id:  2, module: "bfi2", text: "我经常做白日梦，让想象力天马行空。",                domain:"O", facet:"O.imagination",   reverse:false },
  { id:  3, module: "bfi2", text: "我的想象力一般，想不出什么新奇的东西。",            domain:"O", facet:"O.imagination",   reverse:true  },
  { id:  4, module: "bfi2", text: "我不太擅长把想到的事情扩展成完整的故事。",          domain:"O", facet:"O.imagination",   reverse:true  },

  // O.aesthetic 审美感受
  { id:  5, module: "bfi2", text: "我对艺术、音乐或文学有强烈的感受。",                domain:"O", facet:"O.aesthetic",     reverse:false },
  { id:  6, module: "bfi2", text: "我经常被一个好看的画面、声音或文字打动。",          domain:"O", facet:"O.aesthetic",     reverse:false },
  { id:  7, module: "bfi2", text: "我对艺术作品的感受不是很深。",                      domain:"O", facet:"O.aesthetic",     reverse:true  },
  { id:  8, module: "bfi2", text: "我很少注意身边的美感。",                            domain:"O", facet:"O.aesthetic",     reverse:true  },

  // O.intellect 智识好奇
  { id:  9, module: "bfi2", text: "我喜欢思考抽象的问题。",                            domain:"O", facet:"O.intellect",     reverse:false },
  { id: 10, module: "bfi2", text: "我在课外也喜欢看一些与考试无关但有趣的书。",        domain:"O", facet:"O.intellect",     reverse:false },
  { id: 11, module: "bfi2", text: "抽象的理论对我来说很难有兴趣。",                    domain:"O", facet:"O.intellect",     reverse:true  },
  { id: 12, module: "bfi2", text: "我不太喜欢花时间想没什么实际用处的问题。",          domain:"O", facet:"O.intellect",     reverse:true  },

  // ── C · Conscientiousness ───────────────────────────────────────
  // C.organization 组织性
  { id: 13, module: "bfi2", text: "我习惯把东西摆放得井井有条。",                      domain:"C", facet:"C.organization",  reverse:false },
  { id: 14, module: "bfi2", text: "做事之前我会先列计划。",                            domain:"C", facet:"C.organization",  reverse:false },
  { id: 15, module: "bfi2", text: "我的书桌或房间常常很乱。",                          domain:"C", facet:"C.organization",  reverse:true  },
  { id: 16, module: "bfi2", text: "我做事经常缺乏系统、想到哪做到哪。",                domain:"C", facet:"C.organization",  reverse:true  },

  // C.discipline 自律性 / 行动力
  { id: 17, module: "bfi2", text: "我能坚持把开始的任务做完。",                        domain:"C", facet:"C.discipline",    reverse:false },
  { id: 18, module: "bfi2", text: "我能让自己专注于该做的事。",                        domain:"C", facet:"C.discipline",    reverse:false },
  { id: 19, module: "bfi2", text: "我容易拖延，总把事情推到截止日前。",                domain:"C", facet:"C.discipline",    reverse:true  },
  { id: 20, module: "bfi2", text: "我做事容易半途而废。",                              domain:"C", facet:"C.discipline",    reverse:true  },

  // C.responsibility 责任感
  { id: 21, module: "bfi2", text: "我答应的事情会努力做到。",                          domain:"C", facet:"C.responsibility",reverse:false },
  { id: 22, module: "bfi2", text: "我是一个值得信赖、说到做到的人。",                  domain:"C", facet:"C.responsibility",reverse:false },
  { id: 23, module: "bfi2", text: "我有时会忘记自己答应别人的事。",                    domain:"C", facet:"C.responsibility",reverse:true  },
  { id: 24, module: "bfi2", text: "我有时会为了方便而不太守约定。",                    domain:"C", facet:"C.responsibility",reverse:true  },

  // ── E · Extraversion ────────────────────────────────────────────
  // E.sociability 社交活力
  { id: 25, module: "bfi2", text: "我喜欢和很多人在一起。",                            domain:"E", facet:"E.sociability",   reverse:false },
  { id: 26, module: "bfi2", text: "在聚会中我会主动认识新朋友。",                      domain:"E", facet:"E.sociability",   reverse:false },
  { id: 27, module: "bfi2", text: "我更喜欢一个人待着。",                              domain:"E", facet:"E.sociability",   reverse:true  },
  { id: 28, module: "bfi2", text: "在陌生人多的场合我会感到不适。",                    domain:"E", facet:"E.sociability",   reverse:true  },

  // E.assertiveness 自信主张
  { id: 29, module: "bfi2", text: "我会在小组里主动表达自己的看法。",                  domain:"E", facet:"E.assertiveness", reverse:false },
  { id: 30, module: "bfi2", text: "我在团体中常常起带头作用。",                        domain:"E", facet:"E.assertiveness", reverse:false },
  { id: 31, module: "bfi2", text: "我不太喜欢做主导的人。",                            domain:"E", facet:"E.assertiveness", reverse:true  },
  { id: 32, module: "bfi2", text: "我很少在公共场合发言。",                            domain:"E", facet:"E.assertiveness", reverse:true  },

  // E.energy 积极情绪 / 活力
  { id: 33, module: "bfi2", text: "我是一个充满活力、喜欢身边热闹起来的人。",          domain:"E", facet:"E.energy",        reverse:false },
  { id: 34, module: "bfi2", text: "我大多数时候情绪饱满、精力旺盛。",                  domain:"E", facet:"E.energy",        reverse:false },
  { id: 35, module: "bfi2", text: "我经常感到没什么劲头。",                            domain:"E", facet:"E.energy",        reverse:true  },
  { id: 36, module: "bfi2", text: "大部分时间我都比较安静、节奏慢。",                  domain:"E", facet:"E.energy",        reverse:true  },

  // ── A · Agreeableness ───────────────────────────────────────────
  // A.compassion 同情心
  { id: 37, module: "bfi2", text: "当别人遇到困难时我会真心想去帮忙。",                domain:"A", facet:"A.compassion",    reverse:false },
  { id: 38, module: "bfi2", text: "我能感受到别人的情绪并被影响。",                    domain:"A", facet:"A.compassion",    reverse:false },
  { id: 39, module: "bfi2", text: "我对别人的烦恼不太容易共情。",                      domain:"A", facet:"A.compassion",    reverse:true  },
  { id: 40, module: "bfi2", text: "别人难过时我有时不知道该怎么回应。",                domain:"A", facet:"A.compassion",    reverse:true  },

  // A.respect 尊重
  { id: 41, module: "bfi2", text: "我说话会注意不伤害别人。",                          domain:"A", facet:"A.respect",       reverse:false },
  { id: 42, module: "bfi2", text: "我能在意见不同时仍然尊重对方。",                    domain:"A", facet:"A.respect",       reverse:false },
  { id: 43, module: "bfi2", text: "我有时说话比较直，不太顾及别人感受。",              domain:"A", facet:"A.respect",       reverse:true  },
  { id: 44, module: "bfi2", text: "我在争论中会比较强硬。",                            domain:"A", facet:"A.respect",       reverse:true  },

  // A.trust 信任
  { id: 45, module: "bfi2", text: "我倾向于相信别人是出于善意。",                      domain:"A", facet:"A.trust",         reverse:false },
  { id: 46, module: "bfi2", text: "我比较容易信任新认识的人。",                        domain:"A", facet:"A.trust",         reverse:false },
  { id: 47, module: "bfi2", text: "我对陌生人保持戒心。",                              domain:"A", facet:"A.trust",         reverse:true  },
  { id: 48, module: "bfi2", text: "我觉得很多人会为了利益不诚实。",                    domain:"A", facet:"A.trust",         reverse:true  },

  // ── N · Negative Emotionality ───────────────────────────────────
  // N.anxiety 焦虑
  { id: 49, module: "bfi2", text: "重要的事情之前我会很紧张。",                        domain:"N", facet:"N.anxiety",       reverse:false },
  { id: 50, module: "bfi2", text: "我经常担心未来会出问题。",                          domain:"N", facet:"N.anxiety",       reverse:false },
  { id: 51, module: "bfi2", text: "我大多时候比较放松、不容易焦虑。",                  domain:"N", facet:"N.anxiety",       reverse:true  },
  { id: 52, module: "bfi2", text: "即使有压力我也能保持平静。",                        domain:"N", facet:"N.anxiety",       reverse:true  },

  // N.depression 抑郁
  { id: 53, module: "bfi2", text: "我有时会感到心情低落、提不起兴趣。",                domain:"N", facet:"N.depression",    reverse:false },
  { id: 54, module: "bfi2", text: "我有时觉得做什么都没意思。",                        domain:"N", facet:"N.depression",    reverse:false },
  { id: 55, module: "bfi2", text: "我很少长时间感到沮丧。",                            domain:"N", facet:"N.depression",    reverse:true  },
  { id: 56, module: "bfi2", text: "我大多时候心情还是稳定的。",                        domain:"N", facet:"N.depression",    reverse:true  },

  // N.volatility 情绪不稳定
  { id: 57, module: "bfi2", text: "我的情绪起伏比较大。",                              domain:"N", facet:"N.volatility",    reverse:false },
  { id: 58, module: "bfi2", text: "一件小事可能让我心情大幅波动。",                    domain:"N", facet:"N.volatility",    reverse:false },
  { id: 59, module: "bfi2", text: "我的情绪比较稳定、不容易大起大落。",                domain:"N", facet:"N.volatility",    reverse:true  },
  { id: 60, module: "bfi2", text: "即使遇到事情我也能很快平复。",                      domain:"N", facet:"N.volatility",    reverse:true  },
];

export const SECTIONS: { domain: import("./types").Domain; label: string; range: [number, number] }[] = [
  { domain: "O", label: "开放性",   range: [1, 12] },
  { domain: "C", label: "尽责性",   range: [13, 24] },
  { domain: "E", label: "外向性",   range: [25, 36] },
  { domain: "A", label: "宜人性",   range: [37, 48] },
  { domain: "N", label: "情绪敏感", range: [49, 60] },
];

export const FACET_LABELS: Record<import("./types").Facet, string> = {
  "O.imagination":     "想象力",
  "O.aesthetic":       "审美感受",
  "O.intellect":       "智识好奇",
  "C.organization":    "组织性",
  "C.discipline":      "自律性",
  "C.responsibility":  "责任感",
  "E.sociability":     "社交活力",
  "E.assertiveness":   "自信主张",
  "E.energy":          "积极情绪",
  "A.compassion":      "同情心",
  "A.respect":         "尊重",
  "A.trust":           "信任",
  "N.anxiety":         "焦虑",
  "N.depression":      "抑郁",
  "N.volatility":      "情绪波动",
};

export const DOMAIN_LABELS: Record<import("./types").Domain, { cn: string; en: string; sub: string }> = {
  O: { cn: "开放性",   en: "Openness",          sub: "对新观念、新审美的开放程度" },
  C: { cn: "尽责性",   en: "Conscientiousness", sub: "自律、有计划、说到做到的程度" },
  E: { cn: "外向性",   en: "Extraversion",      sub: "在与人/事件交互中获取能量的程度" },
  A: { cn: "宜人性",   en: "Agreeableness",     sub: "理解他人、合作、不强势的倾向" },
  N: { cn: "情绪敏感", en: "Negative Emotionality", sub: "对负面信号的觉察阈值" },
};
