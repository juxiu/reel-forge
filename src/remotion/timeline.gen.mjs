// 由 scripts/tts_build.mjs 生成，请勿手改；仓库里的占位版本在配音后会被这里覆盖。
// 时间轴真源仍是 script/timeline.json，本文件只是给 webpack 一个必定能解析的模块。
export const timeline = {
  "fps": 30,
  "total_frames": 4992,
  "engine": "edge",
  "voice": "zh-CN-YunxiNeural",
  "rate": "+8%",
  "language": "zh",
  "timing_mode": "tts-word-boundary",
  "chapters": [
    {
      "n": 1,
      "title": "什么是 Agent",
      "from": 94,
      "tech": "What Is an Agent"
    },
    {
      "n": 2,
      "title": "分界线的两侧",
      "from": 1085,
      "tech": "Two Sides"
    },
    {
      "n": 3,
      "title": "从通用到专业",
      "from": 2301,
      "tech": "General to Special"
    },
    {
      "n": 4,
      "title": "技能的形状",
      "from": 3525,
      "tech": "Shape of a Skill"
    }
  ],
  "sentences": [
    {
      "id": "S01",
      "chapter": 1,
      "from": 94,
      "to": 259,
      "text": "「Agent」这个词，在不同人嘴里指的东西并不一样，同一个词有几种定义，先分清它",
      "para": true,
      "subs": [
        {
          "from": 94,
          "to": 122,
          "text": "「Agent」这个词"
        },
        {
          "from": 129,
          "to": 182,
          "text": "在不同人嘴里指的东西并不一样"
        },
        {
          "from": 191,
          "to": 229,
          "text": "同一个词有几种定义"
        },
        {
          "from": 236,
          "to": 259,
          "text": "先分清它"
        }
      ]
    },
    {
      "id": "S02",
      "chapter": 1,
      "from": 292,
      "to": 485,
      "text": "有人说的 agent，是完全自主的系统，长期独立运行，用各种工具完成复杂任务",
      "para": true,
      "subs": [
        {
          "from": 292,
          "to": 312,
          "text": "有人说的 agent"
        },
        {
          "from": 335,
          "to": 373,
          "text": "是完全自主的系统"
        },
        {
          "from": 380,
          "to": 416,
          "text": "长期独立运行"
        },
        {
          "from": 422,
          "to": 485,
          "text": "用各种工具完成复杂任务"
        }
      ]
    },
    {
      "id": "S03",
      "chapter": 1,
      "from": 519,
      "to": 643,
      "text": "也有人用同一个词，指按预定流程走的，更程式化的实现",
      "para": true,
      "subs": [
        {
          "from": 519,
          "to": 554,
          "text": "也有人用同一个词"
        },
        {
          "from": 564,
          "to": 603,
          "text": "指按预定流程走的"
        },
        {
          "from": 609,
          "to": 643,
          "text": "更程式化的实现"
        }
      ]
    },
    {
      "id": "S04",
      "chapter": 1,
      "from": 677,
      "to": 845,
      "text": "Anthropic 把这些变体，统一叫 agentic systems，但划了一条，重要的架构分界线",
      "para": true,
      "subs": [
        {
          "from": 677,
          "to": 723,
          "text": "Anthropic 把这些变体"
        },
        {
          "from": 732,
          "to": 747,
          "text": "统一叫 agentic systems"
        },
        {
          "from": 788,
          "to": 810,
          "text": "但划了一条"
        },
        {
          "from": 816,
          "to": 845,
          "text": "重要的架构分界线"
        }
      ]
    },
    {
      "id": "S05",
      "chapter": 1,
      "from": 879,
      "to": 1026,
      "text": "分界线的一侧是 workflow，LLM 和工具，由预定义代码路径编排",
      "para": true,
      "subs": [
        {
          "from": 879,
          "to": 911,
          "text": "分界线的一侧是 workflow"
        },
        {
          "from": 940,
          "to": 971,
          "text": "LLM 和工具"
        },
        {
          "from": 976,
          "to": 1026,
          "text": "由预定义代码路径编排"
        }
      ]
    },
    {
      "id": "S06",
      "chapter": 2,
      "from": 1085,
      "to": 1274,
      "text": "另一侧才是严格的 agent，系统自主决定步骤，长时间独立运行，用工具完成任务",
      "para": true,
      "subs": [
        {
          "from": 1085,
          "to": 1122,
          "text": "另一侧才是严格的 agent"
        },
        {
          "from": 1149,
          "to": 1189,
          "text": "系统自主决定步骤"
        },
        {
          "from": 1195,
          "to": 1235,
          "text": "长时间独立运行"
        },
        {
          "from": 1241,
          "to": 1274,
          "text": "用工具完成任务"
        }
      ]
    },
    {
      "id": "S07",
      "chapter": 2,
      "from": 1308,
      "to": 1448,
      "text": "过去一年，Anthropic 与数十个团队，一起构建 LLM agent",
      "para": true,
      "subs": [
        {
          "from": 1308,
          "to": 1329,
          "text": "过去一年"
        },
        {
          "from": 1337,
          "to": 1391,
          "text": "Anthropic 与数十个团队"
        },
        {
          "from": 1397,
          "to": 1433,
          "text": "一起构建 LLM agent"
        }
      ]
    },
    {
      "id": "S08",
      "chapter": 2,
      "from": 1481,
      "to": 1635,
      "text": "结论反复出现，最成功的实现，既不用复杂框架，也不用专用库",
      "para": true,
      "subs": [
        {
          "from": 1481,
          "to": 1514,
          "text": "结论反复出现"
        },
        {
          "from": 1524,
          "to": 1555,
          "text": "最成功的实现"
        },
        {
          "from": 1563,
          "to": 1601,
          "text": "既不用复杂框架"
        },
        {
          "from": 1607,
          "to": 1635,
          "text": "也不用专用库"
        }
      ]
    },
    {
      "id": "S09",
      "chapter": 2,
      "from": 1669,
      "to": 1845,
      "text": "他们用的是，简单、可组合的模式，事实证明，简单模式反而更好用",
      "para": true,
      "subs": [
        {
          "from": 1669,
          "to": 1689,
          "text": "他们用的是"
        },
        {
          "from": 1699,
          "to": 1753,
          "text": "简单、可组合的模式"
        },
        {
          "from": 1758,
          "to": 1845,
          "text": "事实证明，简单模式反而更好用"
        }
      ]
    },
    {
      "id": "S10",
      "chapter": 2,
      "from": 1878,
      "to": 2037,
      "text": "与其为每个场景，各造一个定制 agent，不如用可组合的能力，去完成专门化",
      "para": true,
      "subs": [
        {
          "from": 1878,
          "to": 1910,
          "text": "与其为每个场景"
        },
        {
          "from": 1916,
          "to": 1936,
          "text": "各造一个定制 agent"
        },
        {
          "from": 1962,
          "to": 2003,
          "text": "不如用可组合的能力"
        },
        {
          "from": 2008,
          "to": 2037,
          "text": "去完成专门化"
        }
      ]
    },
    {
      "id": "S11",
      "chapter": 2,
      "from": 2071,
      "to": 2242,
      "text": "写死的路径负责可控，交给模型的负责灵活，先想清楚，你的任务要哪一种",
      "para": true,
      "subs": [
        {
          "from": 2071,
          "to": 2117,
          "text": "写死的路径负责可控"
        },
        {
          "from": 2125,
          "to": 2165,
          "text": "交给模型的负责灵活"
        },
        {
          "from": 2175,
          "to": 2196,
          "text": "先想清楚"
        },
        {
          "from": 2205,
          "to": 2242,
          "text": "你的任务要哪一种"
        }
      ]
    },
    {
      "id": "S12",
      "chapter": 3,
      "from": 2301,
      "to": 2472,
      "text": "但通用能力不等于能干活，真实工作需要，程序性知识和组织上下文",
      "para": true,
      "subs": [
        {
          "from": 2301,
          "to": 2361,
          "text": "但通用能力不等于能干活"
        },
        {
          "from": 2370,
          "to": 2399,
          "text": "真实工作需要"
        },
        {
          "from": 2405,
          "to": 2472,
          "text": "程序性知识和组织上下文"
        }
      ]
    },
    {
      "id": "S13",
      "chapter": 3,
      "from": 2506,
      "to": 2642,
      "text": "模型能力在提升，通用 agent 已经能，和完整的计算环境交互",
      "para": true,
      "subs": [
        {
          "from": 2506,
          "to": 2540,
          "text": "模型能力在提升"
        },
        {
          "from": 2549,
          "to": 2590,
          "text": "通用 agent 已经能"
        },
        {
          "from": 2596,
          "to": 2642,
          "text": "和完整的计算环境交互"
        }
      ]
    },
    {
      "id": "S14",
      "chapter": 3,
      "from": 2676,
      "to": 2843,
      "text": "比如 Claude Code，靠本地代码执行和文件系统，跨领域完成复杂任务",
      "para": true,
      "subs": [
        {
          "from": 2676,
          "to": 2715,
          "text": "比如 Claude Code"
        },
        {
          "from": 2723,
          "to": 2788,
          "text": "靠本地代码执行和文件系统"
        },
        {
          "from": 2798,
          "to": 2843,
          "text": "跨领域完成复杂任务"
        }
      ]
    },
    {
      "id": "S15",
      "chapter": 3,
      "from": 2877,
      "to": 3054,
      "text": "agent 越强大，就越需要可组合、可扩展，可移植的方式，来装上领域专长",
      "para": true,
      "subs": [
        {
          "from": 2893,
          "to": 2911,
          "text": "agent 越强大"
        },
        {
          "from": 2916,
          "to": 2977,
          "text": "就越需要可组合、可扩展"
        },
        {
          "from": 2986,
          "to": 3015,
          "text": "可移植的方式"
        },
        {
          "from": 3021,
          "to": 3054,
          "text": "来装上领域专长"
        }
      ]
    },
    {
      "id": "S16",
      "chapter": 3,
      "from": 3088,
      "to": 3300,
      "text": "答案是 Agent Skills，指令、脚本和资料，组织成文件夹，agent 按需发现并动态加载",
      "para": true,
      "subs": [
        {
          "from": 3088,
          "to": 3138,
          "text": "答案是 Agent Skills"
        },
        {
          "from": 3143,
          "to": 3190,
          "text": "指令、脚本和资料"
        },
        {
          "from": 3199,
          "to": 3226,
          "text": "组织成文件夹"
        },
        {
          "from": 3252,
          "to": 3300,
          "text": "agent 按需发现并动态加载"
        }
      ]
    },
    {
      "id": "S17",
      "chapter": 3,
      "from": 3334,
      "to": 3466,
      "text": "专长不再散落在提示词里，而是被打包成，可组合的资源",
      "para": true,
      "subs": [
        {
          "from": 3334,
          "to": 3384,
          "text": "专长不再散落在提示词里"
        },
        {
          "from": 3394,
          "to": 3429,
          "text": "而是被打包成"
        },
        {
          "from": 3437,
          "to": 3466,
          "text": "可组合的资源"
        }
      ]
    },
    {
      "id": "S18",
      "chapter": 4,
      "from": 3525,
      "to": 3670,
      "text": "一个技能就是一个目录，一份 SKILL.md，加上指令、脚本和资源",
      "para": true,
      "subs": [
        {
          "from": 3525,
          "to": 3564,
          "text": "一个技能就是一个目录"
        },
        {
          "from": 3570,
          "to": 3607,
          "text": "一份 SKILL.md"
        },
        {
          "from": 3613,
          "to": 3670,
          "text": "加上指令、脚本和资源"
        }
      ]
    },
    {
      "id": "S19",
      "chapter": 4,
      "from": 3704,
      "to": 3857,
      "text": "给 agent 写技能，就像给新员工，准备一份入职指南，照着做就能上手",
      "para": true,
      "subs": [
        {
          "from": 3704,
          "to": 3737,
          "text": "给 agent 写技能"
        },
        {
          "from": 3742,
          "to": 3771,
          "text": "就像给新员工"
        },
        {
          "from": 3779,
          "to": 3817,
          "text": "准备一份入职指南"
        },
        {
          "from": 3824,
          "to": 3857,
          "text": "照着做就能上手"
        }
      ]
    },
    {
      "id": "S20",
      "chapter": 4,
      "from": 3891,
      "to": 4046,
      "text": "把你的专长打包进去，通用 agent，就变成贴合需求的，专用 agent",
      "para": true,
      "subs": [
        {
          "from": 3891,
          "to": 3934,
          "text": "把你的专长打包进去"
        },
        {
          "from": 3940,
          "to": 3950,
          "text": "通用 agent"
        },
        {
          "from": 3972,
          "to": 4013,
          "text": "就变成贴合需求的"
        },
        {
          "from": 4019,
          "to": 4030,
          "text": "专用 agent"
        }
      ]
    },
    {
      "id": "S21",
      "chapter": 4,
      "from": 4079,
      "to": 4281,
      "text": "任何人都能，捕获并分享程序性知识，来专门化自己的 agent，而不是每个用例重造一个",
      "para": true,
      "subs": [
        {
          "from": 4079,
          "to": 4103,
          "text": "任何人都能"
        },
        {
          "from": 4113,
          "to": 4167,
          "text": "捕获并分享程序性知识"
        },
        {
          "from": 4175,
          "to": 4208,
          "text": "来专门化自己的 agent"
        },
        {
          "from": 4233,
          "to": 4281,
          "text": "而不是每个用例重造一个"
        }
      ]
    },
    {
      "id": "S22",
      "chapter": 4,
      "from": 4314,
      "to": 4474,
      "text": "这套东西已发布为，开放标准，能力可以跨平台移植，不被私有绑定锁死",
      "para": true,
      "subs": [
        {
          "from": 4314,
          "to": 4349,
          "text": "这套东西已发布为"
        },
        {
          "from": 4357,
          "to": 4381,
          "text": "开放标准"
        },
        {
          "from": 4392,
          "to": 4431,
          "text": "能力可以跨平台移植"
        },
        {
          "from": 4437,
          "to": 4474,
          "text": "不被私有绑定锁死"
        }
      ]
    },
    {
      "id": "S23",
      "chapter": 4,
      "from": 4508,
      "to": 4683,
      "text": "回到开头的问题，agent 是什么，它是一条谱系，从写死的流程，到自主的系统",
      "para": true,
      "subs": [
        {
          "from": 4508,
          "to": 4540,
          "text": "回到开头的问题"
        },
        {
          "from": 4562,
          "to": 4574,
          "text": "agent 是什么"
        },
        {
          "from": 4582,
          "to": 4611,
          "text": "它是一条谱系"
        },
        {
          "from": 4619,
          "to": 4652,
          "text": "从写死的流程"
        },
        {
          "from": 4657,
          "to": 4683,
          "text": "到自主的系统"
        }
      ]
    },
    {
      "id": "S24",
      "chapter": 4,
      "from": 4717,
      "to": 4901,
      "text": "框架会过时，模式不会，把专长装进，可组合的容器，agent 才能真正干活",
      "para": true,
      "subs": [
        {
          "from": 4717,
          "to": 4774,
          "text": "框架会过时，模式不会"
        },
        {
          "from": 4783,
          "to": 4809,
          "text": "把专长装进"
        },
        {
          "from": 4815,
          "to": 4843,
          "text": "可组合的容器"
        },
        {
          "from": 4869,
          "to": 4901,
          "text": "agent 才能真正干活"
        }
      ]
    }
  ],
  "speech_seconds": 134.88,
  "hud": [
    {
      "fromS": "S01",
      "toS": "S01",
      "text": "一词多义",
      "tech": "One Word"
    },
    {
      "fromS": "S02",
      "toS": "S02",
      "text": "完全自主派",
      "tech": "Autonomy"
    },
    {
      "fromS": "S03",
      "toS": "S03",
      "text": "预定流程派",
      "tech": "Prescriptive"
    },
    {
      "fromS": "S04",
      "toS": "S04",
      "text": "统称与分界",
      "tech": "Taxonomy"
    },
    {
      "fromS": "S05",
      "toS": "S05",
      "text": "workflow 一侧",
      "tech": "Workflow"
    },
    {
      "fromS": "S06",
      "toS": "S06",
      "text": "agent 一侧",
      "tech": "Agent"
    },
    {
      "fromS": "S07",
      "toS": "S07",
      "text": "数十团队一年",
      "tech": "Field Notes"
    },
    {
      "fromS": "S08",
      "toS": "S08",
      "text": "不靠框架",
      "tech": "No Framework"
    },
    {
      "fromS": "S09",
      "toS": "S09",
      "text": "简单可组合",
      "tech": "Composable"
    },
    {
      "fromS": "S10",
      "toS": "S10",
      "text": "可组合专门化",
      "tech": "Specialize"
    },
    {
      "fromS": "S11",
      "toS": "S11",
      "text": "可控与灵活",
      "tech": "Trade-off"
    },
    {
      "fromS": "S12",
      "toS": "S12",
      "text": "通用≠能干活",
      "tech": "General Gap"
    },
    {
      "fromS": "S13",
      "toS": "S13",
      "text": "完整计算环境",
      "tech": "Environment"
    },
    {
      "fromS": "S14",
      "toS": "S14",
      "text": "Claude Code",
      "tech": "Example"
    },
    {
      "fromS": "S15",
      "toS": "S15",
      "text": "越强越要专长",
      "tech": "Expertise"
    },
    {
      "fromS": "S16",
      "toS": "S16",
      "text": "Skills 文件夹",
      "tech": "Skills"
    },
    {
      "fromS": "S17",
      "toS": "S17",
      "text": "打包成资源",
      "tech": "Package"
    },
    {
      "fromS": "S18",
      "toS": "S18",
      "text": "目录+SKILL.md",
      "tech": "Directory"
    },
    {
      "fromS": "S19",
      "toS": "S19",
      "text": "像入职指南",
      "tech": "Onboarding"
    },
    {
      "fromS": "S20",
      "toS": "S20",
      "text": "通用变专用",
      "tech": "Transform"
    },
    {
      "fromS": "S21",
      "toS": "S21",
      "text": "捕获与分享",
      "tech": "Share"
    },
    {
      "fromS": "S22",
      "toS": "S22",
      "text": "开放标准",
      "tech": "Open Standard"
    },
    {
      "fromS": "S23",
      "toS": "S23",
      "text": "谱系收束",
      "tech": "Spectrum"
    },
    {
      "fromS": "S24",
      "toS": "S24",
      "text": "模式长存",
      "tech": "Patterns Last"
    }
  ],
  "title": {
    "big": "AGENT",
    "rest": "agent 是什么",
    "en": "Agentic Systems",
    "tagline": "从写死的流程到自主的系统，中间隔一条架构分界线"
  },
  "credit": {
    "kicker": "REEL-FORGE 样片",
    "title": "agent 是什么",
    "byline": "脚本 · 画面 · 配音 全部由 reel-forge 生产线生成",
    "note": "all visuals drawn in code"
  }
};

export default timeline;
