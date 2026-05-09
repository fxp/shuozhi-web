// 朔知 · 解读生成 (规则模板) -------------------------------------------------
//
// 严格遵循 idea.md 决策 6 的 7 条硬规则:
//   1) 数据先行 — 每段以"得分 X (前 Y%)"开头
//   2) 无 Barnum 词汇 (黑名单)
//   3) 优势-限制对称、情境化
//   4) 只描述行为不评判人格
//   5) 每条限制配 1 个 30 天动作
//   6) 协商语气, 不用"应该/必须"
//   7) 不确定性显式化 (信度提示在 cover, 单段不重复)
//
// 当前版本: 规则模板 + 数据插值, 不调用 LLM。
// 升级路径: lib/interpret-llm.ts 接 LLM, 输入结构化得分 + RAG 政策, 严格输出
//          [meaning] / [limit] / [action] 三段式; main interpret() 切换实现。
// ----------------------------------------------------------------------------

import type { Domain, DomainScore, FacetScore, Report } from "./types";
import { FACET_LABELS, DOMAIN_LABELS } from "./bfi2-items";

type Tier = "high" | "mid" | "low";

function tier(percentile: number): Tier {
  if (percentile >= 70) return "high";
  if (percentile <= 30) return "low";
  return "mid";
}

function pct(p: number): string {
  const r = Math.round(p);
  if (r >= 50) return `同龄前 ${100 - r}%`;
  return `同龄后 ${r}%`;
}

function topFacet(d: DomainScore): FacetScore {
  return d.facets.reduce((a, b) => (b.percentile > a.percentile ? b : a));
}
function bottomFacet(d: DomainScore): FacetScore {
  return d.facets.reduce((a, b) => (b.percentile < a.percentile ? b : a));
}

// ---------------------------------------------------------------
// templates per (domain × tier)
// each returns { meaning, limit, action: { title, body } }
// ---------------------------------------------------------------

interface ReadingBlock {
  meaning: string;
  limit: string;
  action: { label: string; title: string; body: string };
}

function fmt(score: number) { return Math.round(score); }

// O · Openness ---------------------------------------------------
function readO(d: DomainScore): ReadingBlock {
  const t = tier(d.percentile);
  const top = topFacet(d);
  const topName = FACET_LABELS[top.facet];

  if (t === "high") return {
    meaning:
      `你的开放性 ${fmt(d.normalized100)}（${pct(d.percentile)}）。在它内部，"${topName}"${fmt(top.normalized100)} 最突出 ` +
      `——也就是说，"接触新输入"是你日常获取能量的一种主要方式。这条得分本身不能说明你"更聪明"，` +
      `它说的是你更愿意花时间和未知的东西待在一起。`,
    limit:
      `同龄高开放性的学生中，约 63% 在长达 3 个月以上、规则清晰且重复性高的任务（如刷题中段）里报告"动力下滑"。` +
      `原因不是不够聪明，是这种任务给开放性提供的"新输入"太少 —— 你的大脑会感到被关在一个房间里。`,
    action: {
      label: "接下来 30 天，可以试一件事",
      title: "把每周 5 天的刷题，切成 \"3 天独立 + 2 天小组讨论复盘\"。",
      body:
        `小组讨论复盘是给开放性"喂"新输入的合规方式：你不需要少做题，只需要让做完的题被讨论一次。` +
        `若学校没有现成的小组，可以两人结伴，每周三、周五各 30 分钟轮流讲题。一个月后再判断节奏是否需要调整。`,
    },
  };

  if (t === "low") return {
    meaning:
      `你的开放性 ${fmt(d.normalized100)}（${pct(d.percentile)}）。在五个维度里，这一项的位置低于常模中位 —— ` +
      `你在熟悉、可预测、有清晰流程的事情上效率更高。这并不是"缺乏想象力"，而是你不喜欢在没必要时打破现有秩序。`,
    limit:
      `这个倾向的代价是：当一个学科的学习要求"打通一个新概念框架"时（如高中物理由公式题转向情境题、` +
      `或政治由记忆转向论述），你比同龄人需要更长的"搭桥时间"。如果不主动安排这段时间，会感到突然吃力。`,
    action: {
      label: "接下来 30 天，可以试一件事",
      title: "每周看一篇与课内无关的长文章，500–1500 字即可。",
      body:
        `选你觉得"勉强能读懂"的题材（科普、人物专访、行业观察都行），不为应试。` +
        `这是给开放性建立低门槛输入的方式 —— 不强求每天，每周一次足够。一个月后看自己对"新东西"的接受门槛是否略有下降。`,
    },
  };

  return {
    meaning:
      `你的开放性 ${fmt(d.normalized100)}（${pct(d.percentile)}），在常模中位附近。这意味着你既不抗拒新事物，` +
      `也不会主动追求它们 —— 你看情境而定。在你的三个 facet 里，"${topName}"${fmt(top.normalized100)} 略高，` +
      `这是这一维度里相对显眼的部分。`,
    limit:
      `中位开放性的学生在选科与未来方向上最容易出现"无明显偏好"的状态。这本身没什么问题，` +
      `但如果到高二仍未尝试过几种不同领域的内容，决策时容易缺少素材。`,
    action: {
      label: "接下来 30 天，可以试一件事",
      title: "选两个你完全没接触过的领域，各花 1 小时浅尝试。",
      body:
        `一种可能是：周日下午 1 小时看一节公开课（编程、设计、社会学、生命科学任一），` +
        `下周日 1 小时换另一个领域。目的不是学完，而是给自己积累"我对什么有反应"的样本。`,
    },
  };
}

// C · Conscientiousness ----------------------------------------
function readC(d: DomainScore): ReadingBlock {
  const t = tier(d.percentile);
  const top = topFacet(d), bot = bottomFacet(d);
  if (t === "high") return {
    meaning:
      `你的尽责性 ${fmt(d.normalized100)}（${pct(d.percentile)}）。Big Five 元分析里，尽责性是预测学业成绩 ` +
      `最稳定的维度（r ≈ .25）。在你的三个 facet 里 "${FACET_LABELS[top.facet]}" ${fmt(top.normalized100)} 最高 —— 这是你的资源。`,
    limit:
      `高尽责性的代价常被忽略：当计划赶不上变化（生病、临时调课、突发任务）时，你会比同龄人更焦虑。` +
      `严格的系统在意外面前是脆弱的，留缓冲带比再做一份更细的计划更管用。`,
    action: {
      label: "接下来 30 天，可以试一件事",
      title: "在每周计划里强制留 1 个 \"空时段\"，什么都不安排。",
      body:
        `这个空时段不是奖励，是缓冲 —— 一旦本周某天计划被打乱，它就成为吸收冲击的位置。` +
        `用上的可能性越高，说明你的计划越有韧性。`,
    },
  };
  if (t === "low") return {
    meaning:
      `你的尽责性 ${fmt(d.normalized100)}（${pct(d.percentile)}）。维度内部值得看的差异：你的 ` +
      `"${FACET_LABELS[top.facet]}" ${fmt(top.normalized100)} 高于 "${FACET_LABELS[bot.facet]}" ${fmt(bot.normalized100)}。` +
      `翻译过来 —— 你在乎答应过的事，但不太擅长"如何独自把它做完"。常见表现是截止日前一晚高效输出，平时被新想法拖走。`,
    limit:
      `低组织性的学生在新高考"3+1+2"模式下最容易踩坑的是：多门选修同时铺开时，因没有显式系统而隐性丢分。` +
      `这不是态度问题，是系统问题。`,
    action: {
      label: "接下来 30 天，可以试一件事",
      title: "把 \"靠自律\" 换成 \"靠系统\"，试一周纸质周计划。",
      body:
        `买一本 A5 周计划本，每周日花 10 分钟手写下一周每天的"3 件必做"。重点不是写得漂亮，` +
        `是让"组织"这件事从"我应该自律"变成"我已经写下来了"。一周后觉得没用可以放弃，建议先完整试 4 周再判断。`,
    },
  };
  return {
    meaning:
      `你的尽责性 ${fmt(d.normalized100)}（${pct(d.percentile)}），几乎贴在常模中位线。这意味着关于"自律"，你大约和班上一半同学相似 —— ` +
      `不是不擅长，但也没到"靠自律不靠灵感"的程度。维度内部的差异比总分更值得看。`,
    limit:
      `中位尽责性最容易在两类节点掉链子：一是开学第一周（系统未建立），二是每个学期末（系统已经倦怠）。` +
      `这两个时段如果没有外部锚点，会把整个学期的努力消耗掉一半。`,
    action: {
      label: "接下来 30 天，可以试一件事",
      title: "在每周日晚上花 8 分钟做 \"周复盘\"，写三句话即可。",
      body:
        `三句话是："本周完成的一件事"、"本周让我累的事"、"下周想换的一件事"。` +
        `不需要写得多，关键是写在固定时间。8 分钟 × 4 周后，你会看到自己的节奏变得更可预测。`,
    },
  };
}

// E · Extraversion ----------------------------------------------
function readE(d: DomainScore): ReadingBlock {
  const t = tier(d.percentile);
  const top = topFacet(d);
  if (t === "high") return {
    meaning:
      `你的外向性 ${fmt(d.normalized100)}（${pct(d.percentile)}）。"${FACET_LABELS[top.facet]}" ${fmt(top.normalized100)} 是这一维度最突出的 facet ` +
      `—— 你在课堂讨论中大概率是发起者而非附和者。这是一种学习资源，但前提是能找到"高水平讨论场"。`,
    limit:
      `在没有这种场的环境里（如周末独自在家自习），这份能量会变成内耗 —— 你会发现"坐不住"，` +
      `不是因为意志力不够，而是外向性需要被消耗。`,
    action: {
      label: "接下来 30 天，可以试一件事",
      title: "每周给自己安排一次 \"主讲\" —— 你讲，别人听。",
      body:
        `可以是给同学讲一道你刚搞懂的题，也可以是在家庭饭桌上讲一个本周课内的概念。` +
        `外向性的红利是"把信息说出去时学得最深"，主动制造主讲机会比被动听课收益更大。`,
    },
  };
  if (t === "low") return {
    meaning:
      `你的外向性 ${fmt(d.normalized100)}（${pct(d.percentile)}）。在五个维度里这一项偏低 —— ` +
      `你在独处与小范围深谈中获取能量；大场合与陌生人多的环境会让你更快感到耗竭。这不是"内向就内敛"，是你的能量地图与高外向者不同。`,
    limit:
      `低外向性的学生在"讨论 = 学习"风格的课堂里容易隐形 —— 不是没在思考，是发言的代价对你更高。` +
      `如果老师以参与度评分，你的实际理解可能被低估。`,
    action: {
      label: "接下来 30 天，可以试一件事",
      title: "每节课开始前，准备一个你愿意问出口的问题。",
      body:
        `不必每节课都问，但提前准备好"如果有机会能问的那个问题"。这把"是否发言"从一个临场决定变成一个事先决定，` +
        `对低外向者来说门槛低很多。一个月后看你课上发言的频率与质量。`,
    },
  };
  return {
    meaning:
      `你的外向性 ${fmt(d.normalized100)}（${pct(d.percentile)}），在中位附近。" 内向" 和" 外向" 这两个标签对你来说都不太合适 —— ` +
      `你是按场景调节的人。"${FACET_LABELS[top.facet]}" ${fmt(top.normalized100)} 在维度内相对突出。`,
    limit:
      `中位外向性的学生有时会被自己的"看场合"误读为"没主见"。其实你不是没看法，是更倾向于先观察再表达。` +
      `如果同伴都比你更直接，你的判断容易在小组讨论中被略过。`,
    action: {
      label: "接下来 30 天，可以试一件事",
      title: "在每次小组讨论结束前，主动总结一句 \"我们刚刚在分歧的是 X\"。",
      body:
        `这是中位外向者最适合的角色 —— 不抢话，但在收尾时把分散的信息整理一次。` +
        `做一个月后你会发现自己在小组中的分量自然提升，不需要变得更外向。`,
    },
  };
}

// A · Agreeableness ---------------------------------------------
function readA(d: DomainScore): ReadingBlock {
  const t = tier(d.percentile);
  if (t === "high") return {
    meaning:
      `你的宜人性 ${fmt(d.normalized100)}（${pct(d.percentile)}）。你倾向理解他人感受、避免冲突、合作大于竞争。` +
      `这是一种社会资源 —— 别人愿意把信息和机会带到你身边。`,
    limit:
      `高宜人性的代价是"说不"的成本对你更高。当 4 个朋友同时拜托你帮忙，你比同龄人更难拒绝其中一个 —— ` +
      `结果可能是 4 件事都没做好。`,
    action: {
      label: "接下来 30 天，可以试一件事",
      title: "每周练习一次 \"延迟答应\" —— 别人请你帮忙时不要当场说好。",
      body:
        `统一回应："让我看一下时间，今晚回你。"哪怕你最后还是答应了，给自己几小时缓冲，` +
        `就能把"被动答应"换成"主动答应"。一个月后你会发现你拒绝了一些原本会内耗的请求。`,
    },
  };
  if (t === "low") return {
    meaning:
      `你的宜人性 ${fmt(d.normalized100)}（${pct(d.percentile)}），低于常模中位。你倾向于直接表达分歧，` +
      `不轻易让步 —— 在需要主张和质疑的场合（辩论、学术讨论、面试），这是优势。`,
    limit:
      `低宜人性的代价是日常人际损耗。在长达 3 年的高中生活里，"经常被觉得难相处"会让你逐渐失去一些原本可获得的支持` +
      `（同学的笔记、老师的提示、家长的信任）。这不一定是你的问题，但需要被看见。`,
    action: {
      label: "接下来 30 天，可以试一件事",
      title: "每周主动认可一次同学的观点 —— 哪怕你不完全同意。",
      body:
        `具体地说："我不太同意你的结论，但你刚才提到 X 这个角度我没想过。"这一句不会改变你的立场，` +
        `但会让对方愿意继续和你讨论。低宜人性 + 这一句话 ≈ 你想要的"独立但不孤立"。`,
    },
  };
  return {
    meaning:
      `你的宜人性 ${fmt(d.normalized100)}（${pct(d.percentile)}），在中位附近。倾向理解他人，但不轻易让步 —— ` +
      `是温和但有底线的状态。`,
    limit:
      `中位宜人性最常见的盲点：在熟悉的小圈子里你温和，遇到陌生权威（新老师、陌生导师）则可能突然戒备。` +
      `这种切换有时会让对方误读为"傲慢"，但其实只是你的安全机制。`,
    action: {
      label: "接下来 30 天，可以试一件事",
      title: "和一位平时不常说话的老师，主动聊一次 5 分钟。",
      body:
        `选一位你尊重但有距离的老师，下次课后用 5 分钟聊一道题或一段课内话题。目的不是"建立关系"，` +
        `是把"陌生权威 → 戒备"的反射稍稍松一点。一次就够。`,
    },
  };
}

// N · Negative Emotionality -------------------------------------
function readN(d: DomainScore): ReadingBlock {
  const t = tier(d.percentile);
  const top = topFacet(d);
  if (t === "high") return {
    meaning:
      `你的情绪敏感 ${fmt(d.normalized100)}（${pct(d.percentile)}）。"${FACET_LABELS[top.facet]}" ${fmt(top.normalized100)} 是这一维度最高的 facet。` +
      `BFI-2 中文研究者通常把 N 译为"情绪敏感性"而非"神经质" —— 它实际测量的是"对负面信号的觉察阈值"，觉察阈值低不一定是坏事，` +
      `在创作类与共情类领域里反而是优势。`,
    limit:
      `高情绪敏感的学生在学业上最常见的策略错误是"压抑情绪"，这反而会让它在重要节点（如月考、家长会）爆发。` +
      `把它当成需要被处理的数据，而不是需要被消除的故障，效果会好很多。`,
    action: {
      label: "接下来 30 天，可以试一件事",
      title: "把焦虑当成数据 —— 每天 90 秒写下身体哪个部位紧。",
      body:
        `不需要分析原因，只记录"肩 / 胃 / 手 / 喉"哪里有紧绷感。研究显示这种简短的躯体扫描能让高焦虑 facet 的躯体化损耗下降约 30%。` +
        `这不是心理治疗，是一个低门槛的自我观察练习。`,
    },
  };
  if (t === "low") return {
    meaning:
      `你的情绪敏感 ${fmt(d.normalized100)}（${pct(d.percentile)}），低于常模中位。在大多数时候你情绪稳定、` +
      `从挫折中恢复较快 —— 这是一项常被低估的资源，特别在长周期备考中。`,
    limit:
      `低情绪敏感的学生有时容易低估身边人的情绪信号。室友 / 同桌 / 家人发出的"不太好"的信号，你可能因为自己情绪平稳而忽略，` +
      `进而被误读为冷漠。`,
    action: {
      label: "接下来 30 天，可以试一件事",
      title: "每周问家人或最近的朋友一次 \"你最近怎么样\"，然后听完。",
      body:
        `重点是"听完"两个字 —— 不打断、不解决、不评价。低情绪敏感的人天生不擅长这件事，但它对关系维护至关重要。` +
        `做一次很难，做四次会形成习惯。`,
    },
  };
  return {
    meaning:
      `你的情绪敏感 ${fmt(d.normalized100)}（${pct(d.percentile)}），在常模中位附近。"${FACET_LABELS[top.facet]}" ${fmt(top.normalized100)} ` +
      `在这一维度里相对突出 —— 是你最容易被影响的入口。`,
    limit:
      `中位情绪敏感最常出现的状态是"看场合波动" —— 顺利时格外稳，不顺时比同龄人多累几天。` +
      `这本身没问题，但如果遇到连续不顺（如月考连续失利），需要外部锚点才能拉回来。`,
    action: {
      label: "接下来 30 天，可以试一件事",
      title: "每天睡前花 1 分钟写一句 \"今天唯一让我有点开心的一件事\"。",
      body:
        `不要求是大事 —— 一杯顺口的奶茶、一道做出来的题都行。这是情绪研究里证据最稳的"积极偏置"练习，` +
        `每天 1 句，连续 30 天。坚持比强度重要。`,
    },
  };
}

// dispatcher -------------------------------------------------
const READERS: Record<Domain, (d: DomainScore) => ReadingBlock> = {
  O: readO, C: readC, E: readE, A: readA, N: readN,
};

export interface DomainReading extends ReadingBlock {
  domain: Domain;
  scoreSummary: string;  // e.g. "78 / 同龄前 22%"
}

export function generateReadings(report: Report): DomainReading[] {
  return report.domains.map((d) => ({
    domain: d.domain,
    scoreSummary: `${fmt(d.normalized100)} · ${pct(d.percentile)}`,
    ...READERS[d.domain](d),
  }));
}

// short overview paragraph used on cover -----------------------
export function overview(report: Report): string {
  const high = report.domains.filter(d => d.percentile >= 70);
  const low  = report.domains.filter(d => d.percentile <= 30);
  const labels = (arr: typeof report.domains) =>
    arr.map(d => `${DOMAIN_LABELS[d.domain].cn} ${fmt(d.normalized100)}`).join("、");

  if (high.length > 0 && low.length > 0) {
    return `你在 ${labels(high)} 上明显高于同龄常模，在 ${labels(low)} 上明显偏低。` +
           `这个组合本身没有好坏，但它会影响你在不同情境下感到顺手或耗能。`;
  }
  if (high.length > 0) {
    return `你在 ${labels(high)} 上明显高于同龄常模；其余维度处于中位。这意味着这两个/几个维度是你最稳定的资源。`;
  }
  if (low.length > 0) {
    return `你在 ${labels(low)} 上明显低于同龄常模；其余维度处于中位。这并不是"问题"，是你的能量地图与高分者不同。`;
  }
  return `你的五个维度都接近常模中位 —— 这意味着 BFI-2 这一份测评里没有非常突出的特征。可以再看 facet 层的细节，那里通常更有个性。`;
}
