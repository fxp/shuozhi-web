// 认知风格 · CHC v0 自陈 -----------------------------------------------------
//
// ⚠️  这是 *自陈式* 认知风格量表,不是真正的认知能力测验。
// 真正的能力测验需要 IRT 校准的题库 + 自适应施测(参见 idea.md 决策 3)。
// 这里 16 题(每能力 4 题)只反映学生**对自身认知偏好的感知**,
// 它跟实际认知能力的相关性中等(自陈式认知 vs 客观测验 r ≈ .25–.45,
// Schmidt & Hunter 1998),够提供一个粗略剖面、不能用于选拔。
//
// 报告中明示这一点,避免学生/家长把它当 IQ 来读。
// ----------------------------------------------------------------------------

import type { Item, CogAbility, LikertResponse, CognitiveResult, CogScore } from "./types";

// 16 题,id 范围 85–100
export const COGNITIVE_ITEMS: Item[] = [
  // Gf · 流体推理(新颖问题、规律识别、抽象推导)
  { id: 85, module: "cognitive", text: "面对从没见过的题型,我能比较快地找到切入点。", cogAbility: "Gf" },
  { id: 86, module: "cognitive", text: "我能在表面无关的事物之间发现共同模式。",       cogAbility: "Gf" },
  { id: 87, module: "cognitive", text: "脑筋急转弯 / 逻辑谜题对我来说不算太难。",      cogAbility: "Gf" },
  { id: 88, module: "cognitive", text: "比起死记硬背,我更擅长理解和推导。",            cogAbility: "Gf" },

  // Gc · 晶体知识(词汇、阅读理解、常识积累)
  { id: 89, module: "cognitive", text: "我的词汇量在同龄人里算多。",                    cogAbility: "Gc" },
  { id: 90, module: "cognitive", text: "阅读长篇文章 / 小说对我来说很自然。",           cogAbility: "Gc" },
  { id: 91, module: "cognitive", text: "我能比较准确地用文字表达复杂想法。",            cogAbility: "Gc" },
  { id: 92, module: "cognitive", text: "我对常识 / 文史 / 时事知识的积累比较多。",      cogAbility: "Gc" },

  // Gv · 视觉空间(空间想象、图形旋转、地理感)
  { id: 93, module: "cognitive", text: "看到一张地图我能快速找到路线。",                cogAbility: "Gv" },
  { id: 94, module: "cognitive", text: "我能在脑里旋转 / 翻转一个三维形状。",           cogAbility: "Gv" },
  { id: 95, module: "cognitive", text: "做立体几何题比代数题让我更有信心。",            cogAbility: "Gv" },
  { id: 96, module: "cognitive", text: "我对空间布局(房间布置 / 座位排列)有想法。",    cogAbility: "Gv" },

  // Gs · 加工速度(简单任务速度、注意切换、反应速度)
  { id: 97, module: "cognitive", text: "我处理简单重复任务(批改 / 计算 / 抄录)比同学快。", cogAbility: "Gs" },
  { id: 98, module: "cognitive", text: "我能在限时考试里把会做的题做完。",              cogAbility: "Gs" },
  { id: 99, module: "cognitive", text: "扫一眼能注意到一篇文章的关键词。",              cogAbility: "Gs" },
  { id: 100, module: "cognitive", text: "我反应速度比较快(打字 / 玩游戏 / 抢答)。",    cogAbility: "Gs" },
];

export const COG_LABELS: Record<CogAbility, { cn: string; en: string; oneLiner: string }> = {
  Gf: { cn: "流体推理", en: "Fluid Reasoning",    oneLiner: "面对新颖问题快速识别规律的能力" },
  Gc: { cn: "晶体知识", en: "Crystallized Knowledge", oneLiner: "积累的词汇、阅读和常识" },
  Gv: { cn: "视觉空间", en: "Visual-Spatial",     oneLiner: "空间想象、图形旋转、方位感" },
  Gs: { cn: "加工速度", en: "Processing Speed",   oneLiner: "处理简单任务的速度与流畅性" },
};

const ABILITY_ORDER: CogAbility[] = ["Gf", "Gc", "Gv", "Gs"];

export const COGNITIVE_CAVEAT =
  "这是自陈式认知风格剖面,不是 IQ 或能力测验。它反映你对自己思维偏好的感知 —— " +
  "和客观能力测验的相关性中等(r≈.25-.45)。可以用作自我了解,不可用于选拔或诊断。";

export function scoreCognitive(responses: Record<number, LikertResponse>): CognitiveResult {
  const scores: CogScore[] = ABILITY_ORDER.map((a) => {
    const items = COGNITIVE_ITEMS.filter((i) => i.cogAbility === a);
    const vals = items.map((i) => responses[i.id] ?? 3);
    const raw = vals.reduce((s, v) => s + v, 0) / vals.length;
    const normalized100 = Math.round(((raw - 1) / 4) * 100);
    return { ability: a, raw, normalized100 };
  });
  return { scores, caveat: COGNITIVE_CAVEAT };
}
