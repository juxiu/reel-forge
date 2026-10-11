// 由 scripts/tts_build.mjs 生成，请勿手改；仓库里的占位版本在配音后会被这里覆盖。
// 时间轴真源仍是 script/timeline.json，本文件只是给 webpack 一个必定能解析的模块。
export const timeline = {
  "fps": 30,
  "total_frames": 6380,
  "engine": "edge",
  "voice": "zh-CN-YunxiNeural",
  "rate": "+8%",
  "language": "zh",
  "timing_mode": "tts-word-boundary",
  "chapters": [
    {
      "n": 1,
      "title": "技能的定义",
      "from": 94,
      "tech": "What Is a Skill"
    },
    {
      "n": 2,
      "title": "结构",
      "from": 1747,
      "tech": "Anatomy"
    },
    {
      "n": 3,
      "title": "运行",
      "from": 3344,
      "tech": "Runtime"
    },
    {
      "n": 4,
      "title": "写法",
      "from": 4802,
      "tech": "Authoring"
    }
  ],
  "sentences": [
    {
      "id": "S01",
      "chapter": 1,
      "from": 94,
      "to": 366,
      "text": "通用 Agent 已经能干活了，但一到你的领域就不够用，缺的不是算力，是方法，所以我们需要一种，能把专长装进去的容器",
      "para": true,
      "subs": [
        {
          "from": 94,
          "to": 155,
          "text": "通用 Agent 已经能干活了"
        },
        {
          "from": 165,
          "to": 205,
          "text": "但一到你的领域就不够用"
        },
        {
          "from": 212,
          "to": 262,
          "text": "缺的不是算力，是方法"
        },
        {
          "from": 271,
          "to": 315,
          "text": "所以我们需要一种"
        },
        {
          "from": 322,
          "to": 366,
          "text": "能把专长装进去的容器"
        }
      ]
    },
    {
      "id": "S02",
      "chapter": 1,
      "from": 400,
      "to": 679,
      "text": "先给结论，一个技能就是一个文件夹，里面放着一份 SKILL.md，再加可选的脚本和资料，Agent 会在需要时自己找到它并加载",
      "para": true,
      "subs": [
        {
          "from": 400,
          "to": 421,
          "text": "先给结论"
        },
        {
          "from": 433,
          "to": 475,
          "text": "一个技能就是一个文件夹"
        },
        {
          "from": 481,
          "to": 538,
          "text": "里面放着一份 SKILL.md"
        },
        {
          "from": 545,
          "to": 590,
          "text": "再加可选的脚本和资料"
        },
        {
          "from": 599,
          "to": 679,
          "text": "Agent 会在需要时自己找到它并加载"
        }
      ]
    },
    {
      "id": "S03",
      "chapter": 1,
      "from": 712,
      "to": 973,
      "text": "你可能一直在重复粘贴同一段指令，那是一张清单，或者一套多步流程，提示词用完就散了，技能是把它固定下来的地方",
      "para": true,
      "subs": [
        {
          "from": 712,
          "to": 774,
          "text": "你可能一直在重复粘贴同一段指令"
        },
        {
          "from": 783,
          "to": 861,
          "text": "那是一张清单，或者一套多步流程"
        },
        {
          "from": 872,
          "to": 919,
          "text": "提示词用完就散了"
        },
        {
          "from": 931,
          "to": 973,
          "text": "技能是把它固定下来的地方"
        }
      ]
    },
    {
      "id": "S04",
      "chapter": 1,
      "from": 1007,
      "to": 1253,
      "text": "技能和常驻配置不一样，正文只在使用时才被读进来，所以再长的参考资料，在真正需要之前几乎不占预算",
      "para": true,
      "subs": [
        {
          "from": 1007,
          "to": 1059,
          "text": "技能和常驻配置不一样"
        },
        {
          "from": 1070,
          "to": 1131,
          "text": "正文只在使用时才被读进来"
        },
        {
          "from": 1140,
          "to": 1180,
          "text": "所以再长的参考资料"
        },
        {
          "from": 1186,
          "to": 1253,
          "text": "在真正需要之前几乎不占预算"
        }
      ]
    },
    {
      "id": "S05",
      "chapter": 1,
      "from": 1287,
      "to": 1499,
      "text": "技能不是工具，也不是插件，工具给它一双手，技能给的是方法，技能之间还能像积木一样叠加",
      "para": true,
      "subs": [
        {
          "from": 1287,
          "to": 1341,
          "text": "技能不是工具，也不是插件"
        },
        {
          "from": 1351,
          "to": 1420,
          "text": "工具给它一双手，技能给的是方法"
        },
        {
          "from": 1431,
          "to": 1499,
          "text": "技能之间还能像积木一样叠加"
        }
      ]
    },
    {
      "id": "S06",
      "chapter": 1,
      "from": 1533,
      "to": 1689,
      "text": "现在技能已经是一个开放标准，同一份格式到处都能用，换个平台不用重写",
      "para": true,
      "subs": [
        {
          "from": 1533,
          "to": 1592,
          "text": "现在技能已经是一个开放标准"
        },
        {
          "from": 1603,
          "to": 1646,
          "text": "同一份格式到处都能用"
        },
        {
          "from": 1653,
          "to": 1689,
          "text": "换个平台不用重写"
        }
      ]
    },
    {
      "id": "S07",
      "chapter": 2,
      "from": 1747,
      "to": 2029,
      "text": "拆开看，一个技能长这样，根目录下一份 SKILL.md，旁边可以有 scripts、references、assets，只有 SKILL.md 是必需的",
      "para": true,
      "subs": [
        {
          "from": 1747,
          "to": 1802,
          "text": "拆开看，一个技能长这样"
        },
        {
          "from": 1809,
          "to": 1866,
          "text": "根目录下一份 SKILL.md"
        },
        {
          "from": 1875,
          "to": 1892,
          "text": "旁边可以有 scripts、references、assets"
        },
        {
          "from": 1967,
          "to": 2029,
          "text": "只有 SKILL.md 是必需的"
        }
      ]
    },
    {
      "id": "S08",
      "chapter": 2,
      "from": 2063,
      "to": 2287,
      "text": "三个目录各管一件事，scripts 放能直接跑的代码，references 放沉淀下来的文档，assets 放模板和素材",
      "para": true,
      "subs": [
        {
          "from": 2063,
          "to": 2106,
          "text": "三个目录各管一件事"
        },
        {
          "from": 2127,
          "to": 2170,
          "text": "scripts 放能直接跑的代码"
        },
        {
          "from": 2197,
          "to": 2231,
          "text": "references 放沉淀下来的文档"
        },
        {
          "from": 2253,
          "to": 2287,
          "text": "assets 放模板和素材"
        }
      ]
    },
    {
      "id": "S09",
      "chapter": 2,
      "from": 2321,
      "to": 2536,
      "text": "SKILL.md 分成两段，开头是元数据，至少两项，名字和描述，下面才是写给 Agent 看的指令",
      "para": true,
      "subs": [
        {
          "from": 2321,
          "to": 2374,
          "text": "SKILL.md 分成两段"
        },
        {
          "from": 2382,
          "to": 2441,
          "text": "开头是元数据，至少两项"
        },
        {
          "from": 2449,
          "to": 2475,
          "text": "名字和描述"
        },
        {
          "from": 2481,
          "to": 2536,
          "text": "下面才是写给 Agent 看的指令"
        }
      ]
    },
    {
      "id": "S10",
      "chapter": 2,
      "from": 2570,
      "to": 2789,
      "text": "写技能最好的心智模型，是给新同事写一份入职指南，你把踩过的坑写清楚，它就不用再踩一遍",
      "para": true,
      "subs": [
        {
          "from": 2570,
          "to": 2622,
          "text": "写技能最好的心智模型"
        },
        {
          "from": 2628,
          "to": 2694,
          "text": "是给新同事写一份入职指南"
        },
        {
          "from": 2707,
          "to": 2747,
          "text": "你把踩过的坑写清楚"
        },
        {
          "from": 2756,
          "to": 2789,
          "text": "它就不用再踩一遍"
        }
      ]
    },
    {
      "id": "S11",
      "chapter": 2,
      "from": 2822,
      "to": 3022,
      "text": "关键在于渐进式披露，描述一直挂着，但很短，正文命中才读，附属文件按需再取",
      "para": true,
      "subs": [
        {
          "from": 2822,
          "to": 2866,
          "text": "关键在于渐进式披露"
        },
        {
          "from": 2876,
          "to": 2932,
          "text": "描述一直挂着，但很短"
        },
        {
          "from": 2941,
          "to": 2972,
          "text": "正文命中才读"
        },
        {
          "from": 2982,
          "to": 3022,
          "text": "附属文件按需再取"
        }
      ]
    },
    {
      "id": "S12",
      "chapter": 2,
      "from": 3056,
      "to": 3286,
      "text": "这样设计是为了省上下文，常驻的只有一小段描述，所以你能同时装很多技能，而不会把窗口塞满",
      "para": true,
      "subs": [
        {
          "from": 3056,
          "to": 3118,
          "text": "这样设计是为了省上下文"
        },
        {
          "from": 3126,
          "to": 3170,
          "text": "常驻的只有一小段描述"
        },
        {
          "from": 3180,
          "to": 3240,
          "text": "所以你能同时装很多技能"
        },
        {
          "from": 3251,
          "to": 3286,
          "text": "而不会把窗口塞满"
        }
      ]
    },
    {
      "id": "S13",
      "chapter": 3,
      "from": 3344,
      "to": 3549,
      "text": "那它到底怎么被用起来，第一步是发现，Agent 会扫描手上所有技能，找出和当前任务相关的那些",
      "para": true,
      "subs": [
        {
          "from": 3344,
          "to": 3380,
          "text": "那它到底怎么被用起来"
        },
        {
          "from": 3391,
          "to": 3416,
          "text": "第一步是发现"
        },
        {
          "from": 3425,
          "to": 3488,
          "text": "Agent 会扫描手上所有技能"
        },
        {
          "from": 3494,
          "to": 3549,
          "text": "找出和当前任务相关的那些"
        }
      ]
    },
    {
      "id": "S14",
      "chapter": 3,
      "from": 3583,
      "to": 3773,
      "text": "没有匹配就完全不碰，只有相关时才会访问某个技能，所以技能多，不等于负担重",
      "para": true,
      "subs": [
        {
          "from": 3583,
          "to": 3628,
          "text": "没有匹配就完全不碰"
        },
        {
          "from": 3640,
          "to": 3709,
          "text": "只有相关时才会访问某个技能"
        },
        {
          "from": 3719,
          "to": 3773,
          "text": "所以技能多，不等于负担重"
        }
      ]
    },
    {
      "id": "S15",
      "chapter": 3,
      "from": 3807,
      "to": 3991,
      "text": "命中之后，它只加载最小的那一部分，必要的说明和文件就够了，这样还能保持响应速度",
      "para": true,
      "subs": [
        {
          "from": 3807,
          "to": 3829,
          "text": "命中之后"
        },
        {
          "from": 3839,
          "to": 3886,
          "text": "它只加载最小的那一部分"
        },
        {
          "from": 3895,
          "to": 3939,
          "text": "必要的说明和文件就够了"
        },
        {
          "from": 3949,
          "to": 3991,
          "text": "这样还能保持响应速度"
        }
      ]
    },
    {
      "id": "S16",
      "chapter": 3,
      "from": 4025,
      "to": 4222,
      "text": "技能里真正干活的是脚本，Agent 用本地代码执行，配合文件系统完成任务，再把结论写回来",
      "para": true,
      "subs": [
        {
          "from": 4025,
          "to": 4074,
          "text": "技能里真正干活的是脚本"
        },
        {
          "from": 4082,
          "to": 4136,
          "text": "Agent 用本地代码执行"
        },
        {
          "from": 4145,
          "to": 4187,
          "text": "配合文件系统完成任务"
        },
        {
          "from": 4193,
          "to": 4222,
          "text": "再把结论写回来"
        }
      ]
    },
    {
      "id": "S17",
      "chapter": 3,
      "from": 4256,
      "to": 4504,
      "text": "再回到上下文预算这条线，指令和资料都不常驻，只有命中那一刻才付出成本，这是它和常驻提示词最大的区别",
      "para": true,
      "subs": [
        {
          "from": 4256,
          "to": 4307,
          "text": "再回到上下文预算这条线"
        },
        {
          "from": 4316,
          "to": 4358,
          "text": "指令和资料都不常驻"
        },
        {
          "from": 4368,
          "to": 4428,
          "text": "只有命中那一刻才付出成本"
        },
        {
          "from": 4439,
          "to": 4504,
          "text": "这是它和常驻提示词最大的区别"
        }
      ]
    },
    {
      "id": "S18",
      "chapter": 3,
      "from": 4538,
      "to": 4743,
      "text": "一个任务往往要用好几个技能，它们能叠在一起，Agent 自己判断需要哪些，再协调它们一起用",
      "para": true,
      "subs": [
        {
          "from": 4538,
          "to": 4600,
          "text": "一个任务往往要用好几个技能"
        },
        {
          "from": 4611,
          "to": 4641,
          "text": "它们能叠在一起"
        },
        {
          "from": 4649,
          "to": 4705,
          "text": "Agent 自己判断需要哪些"
        },
        {
          "from": 4711,
          "to": 4743,
          "text": "再协调它们一起用"
        }
      ]
    },
    {
      "id": "S19",
      "chapter": 4,
      "from": 4802,
      "to": 5047,
      "text": "如果你的技能一直没被触发，九成是描述没写好，名字和描述是唯一的常驻信息，写得含糊，就等于不存在",
      "para": true,
      "subs": [
        {
          "from": 4802,
          "to": 4856,
          "text": "如果你的技能一直没被触发"
        },
        {
          "from": 4864,
          "to": 4905,
          "text": "九成是描述没写好"
        },
        {
          "from": 4919,
          "to": 4986,
          "text": "名字和描述是唯一的常驻信息"
        },
        {
          "from": 4995,
          "to": 5047,
          "text": "写得含糊，就等于不存在"
        }
      ]
    },
    {
      "id": "S20",
      "chapter": 4,
      "from": 5081,
      "to": 5316,
      "text": "描述里要写清楚什么时候用它，触发时机、适用场景、还有边界，Agent 就是靠这几句判断该不该开",
      "para": true,
      "subs": [
        {
          "from": 5081,
          "to": 5148,
          "text": "描述里要写清楚什么时候用它"
        },
        {
          "from": 5155,
          "to": 5235,
          "text": "触发时机、适用场景、还有边界"
        },
        {
          "from": 5245,
          "to": 5316,
          "text": "Agent 就是靠这几句判断该不该开"
        }
      ]
    },
    {
      "id": "S21",
      "chapter": 4,
      "from": 5350,
      "to": 5563,
      "text": "什么时候值得建一个技能，当你反复粘贴同一段指令，当一个清单越来越长，或者某个文档已经塞不下的时候",
      "para": true,
      "subs": [
        {
          "from": 5350,
          "to": 5399,
          "text": "什么时候值得建一个技能"
        },
        {
          "from": 5409,
          "to": 5454,
          "text": "当你反复粘贴同一段指令"
        },
        {
          "from": 5464,
          "to": 5504,
          "text": "当一个清单越来越长"
        },
        {
          "from": 5511,
          "to": 5563,
          "text": "或者某个文档已经塞不下的时候"
        }
      ]
    },
    {
      "id": "S22",
      "chapter": 4,
      "from": 5597,
      "to": 5802,
      "text": "与其为每个场景单独造一个 Agent，不如把专长打包成能力，让同一个通用 Agent 长出专才的分支",
      "para": true,
      "subs": [
        {
          "from": 5597,
          "to": 5663,
          "text": "与其为每个场景单独造一个 Agent"
        },
        {
          "from": 5673,
          "to": 5717,
          "text": "不如把专长打包成能力"
        },
        {
          "from": 5726,
          "to": 5802,
          "text": "让同一个通用 Agent 长出专才的分支"
        }
      ]
    },
    {
      "id": "S23",
      "chapter": 4,
      "from": 5836,
      "to": 6045,
      "text": "技能有两种被用起来的方式，相关时自动加载，也可以直接点名调用，两种都靠那份描述兜底",
      "para": true,
      "subs": [
        {
          "from": 5836,
          "to": 5887,
          "text": "技能有两种被用起来的方式"
        },
        {
          "from": 5897,
          "to": 5937,
          "text": "相关时自动加载"
        },
        {
          "from": 5946,
          "to": 5983,
          "text": "也可以直接点名调用"
        },
        {
          "from": 5992,
          "to": 6045,
          "text": "两种都靠那份描述兜底"
        }
      ]
    },
    {
      "id": "S24",
      "chapter": 4,
      "from": 6079,
      "to": 6290,
      "text": "所以技能到底是什么，是一份能被执行的方法论，也是给 Agent 的一份入职指南，从一个文件夹开始",
      "para": true,
      "subs": [
        {
          "from": 6079,
          "to": 6130,
          "text": "所以技能到底是什么"
        },
        {
          "from": 6137,
          "to": 6186,
          "text": "是一份能被执行的方法论"
        },
        {
          "from": 6193,
          "to": 6248,
          "text": "也是给 Agent 的一份入职指南"
        },
        {
          "from": 6256,
          "to": 6290,
          "text": "从一个文件夹开始"
        }
      ]
    }
  ],
  "speech_seconds": 181.154,
  "hud": [
    {
      "fromS": "S01",
      "toS": "S01",
      "text": "为什么需要",
      "tech": "The Gap"
    },
    {
      "fromS": "S02",
      "toS": "S02",
      "text": "一个文件夹",
      "tech": "A Folder"
    },
    {
      "fromS": "S03",
      "toS": "S03",
      "text": "与提示词的区别",
      "tech": "vs Prompt"
    },
    {
      "fromS": "S04",
      "toS": "S04",
      "text": "与常驻的区别",
      "tech": "vs Always-on"
    },
    {
      "fromS": "S05",
      "toS": "S05",
      "text": "与工具的边界",
      "tech": "vs Tools"
    },
    {
      "fromS": "S06",
      "toS": "S06",
      "text": "开放标准",
      "tech": "Open Standard"
    },
    {
      "fromS": "S07",
      "toS": "S07",
      "text": "目录结构",
      "tech": "Anatomy"
    },
    {
      "fromS": "S08",
      "toS": "S08",
      "text": "三个目录",
      "tech": "Three Dirs"
    },
    {
      "fromS": "S09",
      "toS": "S09",
      "text": "SKILL.md",
      "tech": "Frontmatter"
    },
    {
      "fromS": "S10",
      "toS": "S10",
      "text": "入职指南",
      "tech": "Onboarding"
    },
    {
      "fromS": "S11",
      "toS": "S11",
      "text": "渐进式披露",
      "tech": "Disclosure"
    },
    {
      "fromS": "S12",
      "toS": "S12",
      "text": "省上下文",
      "tech": "Context Budget"
    },
    {
      "fromS": "S13",
      "toS": "S13",
      "text": "第一步：发现",
      "tech": "Discovery"
    },
    {
      "fromS": "S14",
      "toS": "S14",
      "text": "相关才访问",
      "tech": "Relevance"
    },
    {
      "fromS": "S15",
      "toS": "S15",
      "text": "最小加载",
      "tech": "Minimal Load"
    },
    {
      "fromS": "S16",
      "toS": "S16",
      "text": "脚本执行",
      "tech": "Execution"
    },
    {
      "fromS": "S17",
      "toS": "S17",
      "text": "上下文预算",
      "tech": "Budget"
    },
    {
      "fromS": "S18",
      "toS": "S18",
      "text": "技能叠加",
      "tech": "Composition"
    },
    {
      "fromS": "S19",
      "toS": "S19",
      "text": "命名与描述",
      "tech": "Naming"
    },
    {
      "fromS": "S20",
      "toS": "S20",
      "text": "触发时机",
      "tech": "Trigger"
    },
    {
      "fromS": "S21",
      "toS": "S21",
      "text": "何时值得建",
      "tech": "When"
    },
    {
      "fromS": "S22",
      "toS": "S22",
      "text": "打包成能力",
      "tech": "Packaging"
    },
    {
      "fromS": "S23",
      "toS": "S23",
      "text": "两种用法",
      "tech": "Loading"
    },
    {
      "fromS": "S24",
      "toS": "S24",
      "text": "所以是什么",
      "tech": "Recap"
    }
  ],
  "title": {
    "big": "SKILL",
    "rest": "什么是技能",
    "en": "Agent Skills",
    "tagline": "把方法论写成 Agent 能用的说明书"
  },
  "credit": {
    "kicker": "REEL-FORGE 样片",
    "title": "什么是技能",
    "byline": "脚本 · 画面 · 配音 全部由 reel-forge 生产线生成",
    "note": "all visuals drawn in code"
  }
};

export default timeline;
