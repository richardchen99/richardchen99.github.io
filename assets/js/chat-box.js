(function () {
  "use strict";

  var root = document.querySelector("[data-chat-box]");
  if (!root) return;

  var log = root.querySelector("[data-chat-log]");
  var form = root.querySelector("[data-chat-form]");
  var input = root.querySelector("[data-chat-input]");
  var submitButton = form ? form.querySelector("button[type='submit']") : null;
  var inputStatus = root.querySelector("[data-chat-input-status]");
  var inputCount = root.querySelector("[data-chat-input-count]");
  var clearButton = root.querySelector("[data-chat-clear]");
  var countLabel = root.querySelector("[data-chat-count]");
  var intentLabel = root.querySelector("[data-chat-intent]");
  var modelLabel = root.querySelector("[data-chat-model-current]");
  var modeFeedback = root.querySelector("[data-chat-mode-feedback]");
  var promptButtons = Array.prototype.slice.call(root.querySelectorAll("[data-chat-prompt]"));
  var modelButtons = Array.prototype.slice.call(root.querySelectorAll("[data-chat-model]"));
  var storageKey = "richard-chat-box-v1";
  var sessionKey = storageKey + "-session";
  var modelKey = storageKey + "-model";
  var backendForm = root.querySelector("[data-chat-backend-form]");
  var backendEndpoint = backendForm ? backendForm.getAttribute("data-chat-endpoint") : "";
  var syncFields = backendForm ? {
    model: backendForm.querySelector("[data-chat-sync-model]"),
    session: backendForm.querySelector("[data-chat-sync-session]"),
    ip: backendForm.querySelector("[data-chat-sync-ip]"),
    ipCheckedAt: backendForm.querySelector("[data-chat-sync-ip-checked-at]"),
    location: backendForm.querySelector("[data-chat-sync-location]"),
    timezone: backendForm.querySelector("[data-chat-sync-timezone]"),
    network: backendForm.querySelector("[data-chat-sync-network]"),
    geoSource: backendForm.querySelector("[data-chat-sync-geo-source]"),
    time: backendForm.querySelector("[data-chat-sync-time]"),
    page: backendForm.querySelector("[data-chat-sync-page]"),
    message: backendForm.querySelector("[data-chat-sync-message]"),
    reply: backendForm.querySelector("[data-chat-sync-reply]"),
    intent: backendForm.querySelector("[data-chat-sync-intent]"),
    conversation: backendForm.querySelector("[data-chat-sync-conversation]")
  } : {};

  var modelProfiles = {
    core: {
      name: "Richard Core",
      shortName: "CORE",
      label: "稳健综合"
    },
    strategy: {
      name: "Strategy Lens",
      shortName: "STRATEGY",
      label: "决策拆解"
    },
    sentinel: {
      name: "Risk Review",
      shortName: "SENTINEL",
      label: "风险视角"
    },
    spark: {
      name: "Creative Spark",
      shortName: "SPARK",
      label: "轻松有趣"
    }
  };

  var seedMessages = [
    {
      role: "assistant",
      intent: "WELCOME",
      model: "core",
      text: "你好，欢迎来到 Richard 的 AI 对话空间。你可以问研究方向、项目经历、联系方式，也可以直接留下建议与合作想法。"
    }
  ];
  var lastChoices = {};

  function pickValue(value, key) {
    if (!Array.isArray(value)) return value;
    if (!value.length) return "";
    var index = Math.floor(Math.random() * value.length);
    if (value.length > 1 && lastChoices[key] === index) {
      index = (index + 1 + Math.floor(Math.random() * (value.length - 1))) % value.length;
    }
    lastChoices[key] = index;
    return value[index];
  }

  var thinkingEvents = [
    { thinking: "Reading signal density", inference: "Mapping intent to portfolio context", event: "Context route stabilized" },
    { thinking: "Scanning portfolio memory", inference: "Selecting a concise response path", event: "Strategy lens warmed up" },
    { thinking: "Checking ambiguity", inference: "Balancing useful detail with brevity", event: "Noise trimmed" },
    { thinking: "Calibrating tone", inference: "Keeping the answer direct and human", event: "Signal cleaned" },
    { thinking: "Tracing decision context", inference: "Looking for the next useful move", event: "Action path found" },
    { thinking: "Reading domain cues", inference: "Switching between research, project, and contact routes", event: "Intent lock acquired" },
    { thinking: "Testing edge cases", inference: "Adding guardrails before the answer", event: "Risk check passed" },
    { thinking: "Compressing context", inference: "Turning the prompt into a usable note", event: "Brief drafted" },
    { thinking: "Reviewing evidence shape", inference: "Separating facts, preference, and suggestion", event: "Boundary marked" },
    { thinking: "Running a small mental simulation", inference: "Choosing the reply with the best fit", event: "Scenario fork resolved" }
  ];

  var modelFrames = {
    core: ["Signal mapped.", "Context aligned.", "Thread cleaned.", "Useful route found."],
    strategy: ["Decision route opened.", "Options compressed.", "Trade-off map ready.", "Next move isolated."],
    sentinel: ["Risk layer active.", "Guardrail pass started.", "Assumption check complete.", "Failure mode scanned."],
    spark: ["Creative angle found.", "Fresh phrasing loaded.", "Signal turned sideways.", "A sharper metaphor surfaced."]
  };

  var priorityRules = [
    {
      intent: "COMMENT_SYSTEM",
      keywords: ["评论审核", "审核评论", "评论通过", "评论回复", "回复审核", "approve", "reject", "token", "github token", "ip地址", "点赞", "comment approval"],
      reply: [
        "评论系统现在走 private source repo 审核链路：访客提交后先进邮箱，确认通过再写入源码仓库的数据文件，随后 Actions 发布到公开站点。",
        "评论不是直接公开的。它会先变成一条待审核信号，邮件里带 approve/reject 链接，通过后才进入文章下方。",
        "如果审核按钮报错，优先看 Token 是否授权了 richardchen99.github.io-source，并且 Contents 权限是 Read and write。"
      ],
      action: [
        "下一步可以检查审核页上的仓库名、Token 权限和邮件链接里的 post_key/comment_id。",
        "如果是回复评论，还要确认 parent_comment_id 和 parent_comment_name 都在邮件链接里。",
        "如果要排查 IP，先提交一条新评论；旧邮件链接可能是在 IP 透传修复前生成的。"
      ],
      check: [
        "GitHub 对无权限 private repo 会返回 404，所以 Not Found 经常不是文件不存在，而是 Token 没拿到仓库权限。",
        "评论数据必须写回 private source repo，写到 public repo 会被下一次部署覆盖。",
        "点赞是轻量前端计数，不走审核；评论和回复才走审核链路。"
      ],
      spark: [
        "这套评论系统像一个小型审稿台：邮件是待办入口，Token 是门禁卡，Actions 负责把通过稿发布出去。",
        "如果它说 Not Found，很多时候不是地图错了，而是钥匙没有开到私有仓库那扇门。",
        "评论从访客到页面，不是直线投递，更像一条带闸门的发布流水线。"
      ]
    },
    {
      intent: "HUMAN_STACK",
      keywords: ["human stack", "思维退化", "依赖ai", "依赖 ai", "独立思考", "基础能力", "认知外包", "ai消失", "ai 时代"],
      reply: [
        "这篇文章的核心不是反 AI，而是提醒人不要把问题定义、验证能力和系统重建能力一起外包出去。",
        "Human Stack 更像一个能力栈：AI 可以站在上层加速，但数学、代码、领域判断和 debug 不能被掏空。",
        "真正的风险不是用了 AI，而是答案来得太快，让人误以为自己已经理解了过程。"
      ],
      action: [
        "可以继续补充个人经历、具体模型例子和低资源情况下的工作能力，让文章更有真实质感。",
        "写这类文章时，最好把观点、个人经历和研究证据交叉放置，避免变成纯观点散文。",
        "可以用几个具体场景展开：写代码、读论文、做模型、写报告、调系统。"
      ],
      check: [
        "不要把技术经历写成模型名列表；例子要服务于能力形成过程。",
        "批判 AI 依赖时要承认 AI 的价值，这样观点更稳。",
        "研究型文章最好保留文献证据和可复核的例子。"
      ],
      spark: [
        "这篇文章最有力量的地方，是把 AI 当成基础设施之后，反过来追问人的底层系统还剩多少冗余。",
        "好的写法不是喊口号，而是把一次 debug、一段手写模型、一次误判纠正写成可触摸的经验。",
        "它像一次认知压力测试：把 AI 拿走之后，哪些能力还能独立运行？"
      ]
    },
    {
      intent: "CODEX_MCP",
      keywords: ["codex", "wps", "mcp", "mcp配置", "mcp 教程", "wps mcp", "桌面版", "插件", "tool server"],
      reply: [
        "Codex 桌面版配置 WPS MCP，可以理解为给 AI 接上一套办公工具接口：文档、表格和演示文稿不再只是文本描述，而能被工具调用真正操作。",
        "WPS MCP 的价值在于把办公软件变成可编排能力，AI 负责理解意图，MCP 负责把动作落到文档、表格或 PPT 上。",
        "如果要写教程，重点不是堆命令，而是讲清楚：连接入口、授权方式、可调用能力、失败排查和一个最小应用案例。"
      ],
      action: [
        "可以按“安装入口、连接 WPS、授权检查、创建文档、生成表格、导出演示”来组织。",
        "先做一个很小的例子，例如让 Codex 根据一段会议纪要生成 WPS 文档和行动表。",
        "如果配置失败，优先检查 MCP 服务是否启动、权限是否授权、Codex 是否选中了对应工具。"
      ],
      check: [
        "桌面版教程要避免写成纯命令行教程，用户真正关心的是界面怎么点、连接后能做什么。",
        "涉及文件操作时，最好提醒用户确认保存位置和权限。",
        "MCP 连接成功不等于所有工具都可用，还要看具体 capability 是否暴露。"
      ],
      spark: [
        "MCP 像给 Codex 接上办公桌面的机械臂：它不只是会说，还能伸手改文件。",
        "WPS MCP 的体验关键，是让用户第一次看到 AI 从“建议”变成“执行”。",
        "好的教程应该像一次短途试驾：少讲宣传语，多让用户完成一次真实动作。"
      ]
    },
    {
      intent: "MINI_GAME",
      keywords: ["mini games", "小游戏", "forecast rush", "position size", "k线", "k 线", "行情", "下注", "游戏大厅", "perfect arc"],
      reply: [
        "Mini Games 区域适合放有一点专业逻辑的轻量游戏。Forecast Rush 用模拟行情、仓位选择和止盈止损，把金融决策做成一局短回合实验。",
        "Forecast Rush 的关键不是猜涨跌，而是在不完整信息下管理仓位、风险和退出时机。",
        "Position Size 可以理解为你愿意暴露在这次行情里的资金量。它越大，判断正确时收益更明显，判断错误时回撤也更疼。"
      ],
      action: [
        "如果继续优化游戏，可以增加新闻事件、波动率 regime、资金曲线和复盘标签。",
        "新游戏可以围绕 AI 路径规划、投篮物理、谈判博弈或风险审批设计。",
        "玩法最好保持三步以内：读信号、做选择、看反馈。"
      ],
      check: [
        "金融游戏要强调模拟性质，不能像投资建议。",
        "随机性要有真实感，不能完全像掷骰子。",
        "移动端图表和按钮需要避免横向溢出。"
      ],
      spark: [
        "Forecast Rush 像一间一分钟交易室：信息不完整，时间很短，但风险是真的会在曲线上留下痕迹。",
        "好的小游戏不是按钮多，而是每一次点击都让玩家感觉自己承担了一个选择。",
        "Mini Games 可以成为主页里最轻的一层入口：好玩，但背后有专业骨架。"
      ]
    },
    {
      intent: "CODING_DEBUG",
      keywords: ["bug", "debug", "报错", "代码问题", "接口", "api", "github actions", "部署失败", "构建失败", "前端问题", "后端问题", "脚本"],
      reply: [
        "排查代码问题时，先把现象、触发条件、最近改动和可复现路径分开。这样比直接贴一大段报错更容易定位。",
        "调试可以按证据链走：先确认输入，再看状态变化，再看网络/日志，最后缩小到具体函数或配置。",
        "如果是 GitHub Actions 或部署失败，要同时看源码仓库、构建产物和线上缓存，三者不同步时很容易误判。"
      ],
      action: [
        "提供错误截图、控制台日志、复现步骤和期望行为，会让定位快很多。",
        "先找最近一次成功 commit，再和失败 commit 做差异对比。",
        "把问题缩到一个最小复现，再考虑修复方案。"
      ],
      check: [
        "不要先大范围重构，先拿到能解释现象的证据。",
        "部署问题里，缓存和权限错误经常伪装成功能问题。",
        "修复前要确认不是用户本地旧数据或旧 Token 造成的。"
      ],
      spark: [
        "Debug 像夜间巡航：不要被仪表盘所有灯吓住，先找第一个真正异常的信号。",
        "一个好 bug 报告，应该能让别人不用猜就复现。",
        "修问题的重点不是跑得快，而是每一步都能排除一类可能。"
      ]
    },
    {
      intent: "BLOG_WRITING",
      keywords: ["写文章", "改文章", "润色文章", "博客选题", "大纲", "标题", "研究型博客", "文风", "不要ai感", "不要 ai 感"],
      reply: [
        "研究型博客最好先有一个真实问题，再放个人经验、技术结构和文献证据。这样文章会有骨架，不会像通用观点拼贴。",
        "想让文章少一点 AI 感，可以保留具体的时间、失败、调试过程和判断摇摆。真实经历比漂亮形容词更有说服力。",
        "改文章时可以先改句型密度：少用排比和口号，多写场景、例子和因果关系。"
      ],
      action: [
        "可以按“核心观点、个人经历、技术解释、研究证据、未来判断”五段来重排。",
        "每一节最好有一个具体例子，例如一次 debug、一个项目选择、一个模型误判。",
        "标题保留英文识别度，中文副标题负责解释问题意识。"
      ],
      check: [
        "不要把术语当深度，深度来自问题拆解和边界意识。",
        "研究型文章不建议放 AI 生成插图，数据图和 HTML/CSS 图表更可信。",
        "引用文献要和正文论点直接相关。"
      ],
      spark: [
        "好文章不是把术语铺满桌面，而是让读者看到你怎么从一个问题走到一个判断。",
        "个人经历是文章的温度，技术链路是文章的骨架，文献是文章的地基。",
        "删 AI 味最有效的方法，是写出只有你经历过的细节。"
      ]
    },
    {
      intent: "DATA_COLLECTION",
      keywords: ["数据采集", "爬虫", "抓取", "百度", "微博", "淘宝", "谷歌", "清洗", "停用词", "词频", "数据集", "采集任务"],
      reply: [
        "数据采集任务要先定边界：平台、关键词、字段、频率、去重规则、日志和失败重试。后面清洗和分析的质量，通常在采集阶段就被决定了一半。",
        "如果要做多平台文本采集，建议把原始数据、清洗结果、日志和运行状态分目录保存，方便复现和排错。",
        "采集不是把网页内容搬下来就结束，真正有价值的是稳定获取、结构化存储和可解释清洗。"
      ],
      action: [
        "先设计字段 schema，再写采集脚本；不要等数据乱了再补结构。",
        "可以准备 raw、cleaned、logs、reports 四个目录。",
        "清洗时保留原始文本引用，避免后期无法追溯。"
      ],
      check: [
        "注意平台规则、频率限制和隐私边界。",
        "不要把平台噪声当用户观点。",
        "高频词统计前要先处理停用词、广告词和重复内容。"
      ],
      spark: [
        "采集系统像一条数据管线：入口越稳，后面的图表越不容易骗人。",
        "乱数据不是脏一点那么简单，它会把模型和结论一起带偏。",
        "好的数据工程会让后续分析少很多玄学。"
      ]
    },
    {
      intent: "PAPER_RESEARCH",
      keywords: ["论文", "文献", "综述", "reference", "citation", "research question", "实验设计", "方法论", "literature"],
      reply: [
        "读论文可以先抓四件事：它解决什么问题，为什么原方法不够，实验怎么证明，边界和失败案例在哪里。",
        "做综述时，不要按论文年份流水账排列。更好的方式是按问题脉络、方法演进和争议点组织。",
        "研究问题要能落到可观察证据上，否则很容易变成宽泛判断。"
      ],
      action: [
        "可以先做一张 evidence matrix：论文、方法、数据、结论、限制。",
        "每读一篇论文，写一句它真正改变了什么，而不是只摘摘要。",
        "实验设计要先定义 baseline 和 evaluation，再谈模型。"
      ],
      check: [
        "不要把 arXiv 热度等同于可靠性。",
        "引用要服务论点，不要为了显得专业而堆引用。",
        "读论文时要特别看 limitation 和 ablation。"
      ],
      spark: [
        "论文综述像整理一张技术地形图：山峰重要，山谷和断层同样重要。",
        "真正读懂论文，是能说出它在哪些条件下会失败。",
        "好研究问题会逼你找证据，坏研究问题只会诱导你写观点。"
      ]
    },
    {
      intent: "DECISION_INTELLIGENCE",
      keywords: ["decision intelligence", "决策智能", "mcda", "多目标", "权重", "不确定性", "风险偏好", "决策科学"],
      reply: [
        "Decision Intelligence 的重点是把数据、模型、约束、偏好和风险放到同一张决策图里，而不是只追求单个模型分数。",
        "一个好的决策系统要回答三件事：目标是什么，代价在哪里，什么情况下应该推翻当前建议。",
        "多目标决策里，权重不是装饰参数，它代表真实偏好和资源约束。"
      ],
      action: [
        "可以先列出目标函数、硬约束、软偏好、风险惩罚和可解释输出。",
        "把备选方案放进同一套指标里比较，再讨论权重。",
        "重要决策最好保留敏感性分析，看结论是否对某个参数过度依赖。"
      ],
      check: [
        "不要把模型预测直接当决策结论。",
        "权重设置需要业务解释，不能只为了得到想要的排名。",
        "高风险场景要设置人工审核和回滚机制。"
      ],
      spark: [
        "决策智能像驾驶舱，不只告诉你速度，也告诉你油量、盲区和刹车距离。",
        "模型给分，系统给边界，人负责最后的取舍。",
        "好的决策不是看起来最优，而是在约束下仍然可执行。"
      ]
    },
    {
      intent: "VISUAL_ANALYTICS",
      keywords: ["可视化", "图表", "dashboard", "仪表盘", "echarts", "科研图", "交互图", "展示效果", "数据图"],
      reply: [
        "可视化要先服务判断。科研风格的图表不需要很花，但要让变量、趋势、对比和不确定性一眼可读。",
        "如果是主页或博客里的图，HTML/CSS 原生图表更容易和整体视觉统一，也更方便移动端适配。",
        "Dashboard 的核心不是把图摆满，而是让用户快速发现异常、比较方案、做出下一步动作。"
      ],
      action: [
        "先确定图表要回答的问题，再选折线、矩阵、漏斗、散点或流程图。",
        "移动端优先单列和横向不可溢出，复杂图表要有降级布局。",
        "图注要短，只说图在解释什么。"
      ],
      check: [
        "避免装饰性图表和没有信息密度的渐变块。",
        "不要让标签、刻度和按钮在 320px 宽度下挤压重叠。",
        "颜色要有功能，不要只为了好看。"
      ],
      spark: [
        "好图表像一盏窄光束灯，只照亮要判断的地方。",
        "高级感不是元素少，而是每个元素都有理由存在。",
        "数据可视化最怕热闹，真正难的是克制。"
      ]
    }
  ];

  var rules = priorityRules.concat([
    {
      intent: "CONTACT",
      keywords: ["联系", "邮箱", "邮件", "email", "mail", "wechat", "微信", "电话", "手机号", "怎么找", "联系方式", "contact"],
      reply: "可以通过邮箱联系 Richard：chenjd999@163.com。也可以在 Feedback 页面留下姓名、联系方式和具体事项。",
      action: "邮件里建议写清主题、背景、希望 Richard 回复的问题，以及方便继续沟通的联系方式。",
      check: "不要在公开输入框里放身份证号、银行卡、密码等敏感信息。",
      spark: "最直接的路线就是发邮件，像把信号打到 Richard 的主控台。"
    },
    {
      intent: "COLLAB",
      keywords: ["合作", "collaboration", "项目合作", "研究合作", "加入", "组队", "交流", "咨询", "meeting", "约", "讨论", "共创", "proposal"],
      reply: "如果是合作或研究交流，建议说明主题、目标、已有材料和期望时间线。适合的方向包括 AI、商业分析、金融科技、决策智能和可信生成式 AI。",
      action: "可以按“问题背景、你需要什么、双方能贡献什么、预期产出”四段来写。",
      check: "合作需求最好避免过于笼统，否则很难判断投入成本和边界。",
      spark: "合作邀约最好像一页清晰的路书：目的地、燃料、路线和到达标准都要有。"
    },
    {
      intent: "INVITE",
      keywords: ["邀约", "邀请", "邀请函", "合作邀约", "写一段", "帮我写", "邮件模板", "话术", "私信"],
      reply: "可以这样写：Richard 你好，我关注到你在 AI、商业分析和决策智能方向的项目经历。我们正在推进一个相关议题，希望与你交流合作可能。若方便，我可以先发送背景材料和目标说明，期待进一步沟通。",
      action: "如果要更正式，可以补上你的身份、项目周期、预期成果和会议时间。",
      check: "邀约文字要避免只说“想合作”，需要让对方快速判断价值与成本。",
      spark: "一段好的邀约像商务谈判开场：礼貌、清楚、有筹码，也给对方留下继续聊的理由。"
    },
    {
      intent: "RESUME",
      keywords: ["简历", "履历", "cv", "resume", "求职", "实习", "招聘", "面试", "自我介绍", "个人介绍", "经历介绍"],
      reply: "Richard 的履历主线可以概括为：信息管理与商业分析训练、数据科学与 AI 项目实践、金融科技和决策智能方向的持续探索。",
      action: "如果用于简历或面试，可以突出“数据建模、AI 系统、业务理解、可解释决策”这四个关键词。",
      check: "不要只堆项目名，要说明问题、方法、结果和你本人承担的角色。",
      spark: "把简历当成一张仪表盘：指标不一定多，但每个指标都要能证明你能解决真实问题。"
    },
    {
      intent: "EDUCATION",
      keywords: ["学校", "教育", "学历", "本科", "研究生", "人大", "人民大学", "中南", "商学院", "信息学院", "信息系", "education", "university", "专业"],
      reply: "Richard 本科就读于中南大学商学院信息管理与信息系统专业，研究生阶段在中国人民大学信息学院信息系继续深造。",
      action: "介绍教育背景时，可以把“商科问题意识”和“信息学院技术训练”作为连续叙事。",
      check: "学校信息应保持准确表述：中南大学商学院、中国人民大学信息学院信息系。",
      spark: "这条路径很适合解释 Richard 的主题：从商业场景进入数据系统，再走向 AI 决策。"
    },
    {
      intent: "HONOR",
      keywords: ["奖", "荣誉", "国家奖学金", "挑战杯", "数学建模", "谈判", "优秀毕业生", "scholarship", "award", "honor", "竞赛"],
      reply: "主页记录的荣誉包括国家奖学金、格林美创新创业企业奖学金、中南大学优秀毕业生，以及挑战杯、数学建模和商务谈判等竞赛成果。",
      action: "如果要写进介绍，建议按“学术表现、创新创业、建模能力、表达谈判”分类呈现。",
      check: "荣誉信息要避免夸大排名，最好保留具体奖项名称和级别。",
      spark: "这些荣誉像不同赛道上的计时成绩：有研究能力，也有表达和协作能力。"
    },
    {
      intent: "CREDIT_RISK",
      keywords: ["信用风险", "风控平台", "credit risk", "授信", "尽调", "评分卡", "贷前", "风险决策", "企业信用"],
      reply: "信用风险 LLM 平台是 Richard 项目线里很有代表性的方向：用规则引擎兜底最终决策，用 RAG 和私有化 LLM 提升非结构化材料理解，并保留审计与可解释边界。",
      action: "如果继续问这个项目，可以从数据输入、RAG 检索、规则策略、审计链路和安全降级五块展开。",
      check: "金融风控场景不能把大模型直接当最终裁判，必须有规则、阈值、人工复核和留痕。",
      spark: "这个项目的核心不是让模型“拍脑袋”，而是给风控人员一套带证据链的智能副驾驶。"
    },
    {
      intent: "PROJECT",
      keywords: ["项目", "作品", "经历", "portfolio", "project", "work", "平台", "系统", "案例", "展示", "selected work"],
      reply: "主页的 Selected Work 展示了信用风险 LLM 平台、大模型短视频广告、智能分析与预测等项目。它们共同强调数据、模型和业务判断之间的闭环。",
      action: "可以优先看旗舰项目，再看 AI、商业分析、金融科技三个筛选维度。",
      check: "项目评价不只看技术栈，还要看问题定义、约束条件、结果是否可复核。",
      spark: "这些项目可以理解成 Richard 的研究车库：有风控主力车型，也有生成式媒体和预测分析的概念车型。"
    },
    {
      intent: "CAR",
      keywords: ["燃油车", "新能源车", "汽车", "车", "宝马", "奔驰", "奥迪", "bba", "bmw", "mercedes", "benz", "audi", "电车", "油车", "ice", "ev", "nev"],
      reply: "Richard 更偏爱传统燃油车，尤其是 BMW、Mercedes-Benz 和 Audi。新能源车在效率、智能化和通勤成本上很强，但燃油车的机械质感、驾驶参与感和品牌底蕴更打动他。",
      action: "可以阅读博客里的燃油车与新能源车对比文章，里面把偏好拆成效率、参与感、品牌底蕴和软件体验几个维度。",
      check: "选车不是单一参数最优问题，要看通勤条件、预算、保值、驾驶偏好和长期使用场景。",
      spark: "如果新能源车像一台高性能移动终端，燃油车更像一台有转速、有声浪、有性格的精密机械。"
    },
    {
      intent: "RESEARCH",
      keywords: ["研究", "方向", "research", "graph", "graphrag", "rag", "agent", "智能体", "llm", "大模型", "生成式", "多模态", "推理", "可信", "research map"],
      reply: "Richard 关注 Data Science、Artificial Intelligence、Business Analytics 和 Decision Intelligence，重点把模型推理、证据约束、不确定性校准放进真实业务决策场景。",
      action: "可以从 AI for Decision、Financial Intelligence、Predictive Analytics 三条线继续展开。",
      check: "研究问题最好先定义真实决策对象，否则模型容易变成炫技展示。",
      spark: "Richard 的研究主题像一条决策链：先抓信号，再建模型，最后把结论推到可执行判断。"
    },
    {
      intent: "MODEL",
      keywords: ["模型", "模式", "模型选择", "选择模型", "切换模型", "模型区别", "哪个模型", "model", "richard core", "strategy lens", "fintech sentinel", "creative spark", "回复风格"],
      reply: "这里有四种对话风格：Richard Core 偏稳健综合，Strategy Lens 偏决策拆解，FinTech Sentinel 偏风险复核，Creative Spark 偏轻松有趣。",
      action: "如果想快速了解信息，选 Richard Core；想要结构化建议，选 Strategy Lens；想看风险边界，选 FinTech Sentinel；想要更有记忆点的表达，选 Creative Spark。",
      check: "不同模型只是回复风格切换，不代表接入了不同外部 AI 服务。",
      spark: "四个模型像四种驾驶模式：舒适、运动、稳控和灵感巡航，路还是同一条路，但驾驶手感不同。"
    },
    {
      intent: "AI",
      keywords: ["人工智能", "机器学习", "深度学习", "模型", "算法", "ai", "ml", "deep learning", "transformer", "训练", "预测", "生成式ai", "aigc"],
      reply: "如果问题和 AI 或机器学习有关，可以从数据来源、任务目标、模型选择、评估指标和落地约束五个角度拆解。Richard 的主页也使用 Decision Intelligence 的交互模块表达这个思路。",
      action: "建议先明确任务是分类、预测、检索、生成、解释还是决策支持。",
      check: "AI 输出要关注幻觉、偏差、可解释性、数据泄露和部署成本。",
      spark: "AI 不是万能按钮，更像一个需要仪表盘和安全阈值的高功率引擎。"
    },
    {
      intent: "DATA_PROJECT",
      keywords: ["数据科学项目", "怎么做项目", "项目建议", "数据集", "建模流程", "eda", "特征工程", "可视化", "模型评估", "ab test", "实验"],
      reply: "一个扎实的数据科学项目可以按“问题定义、数据理解、特征构造、模型评估、业务解释、复现材料”推进。最关键的是让模型结果服务一个真实判断。",
      action: "先写清楚业务问题和成功指标，再选择数据、方法和可视化方式。",
      check: "不要只展示准确率，要说明基线、误差来源、泛化风险和行动建议。",
      spark: "好项目不只是跑出分数，而是让读者看到你如何把混乱信号整理成一条清晰跑道。"
    },
    {
      intent: "BUSINESS",
      keywords: ["商业", "业务", "分析", "business", "analytics", "决策", "企业", "案例分析", "市场", "用户", "增长", "策略"],
      reply: "商业分析问题通常不能只看模型分数，还要回到场景、收益、风险、可解释性和执行成本。Richard 更关注能被业务采用的分析结论。",
      action: "可以按“目标、约束、指标、备选方案、风险、执行动作”六步拆解。",
      check: "不要把相关性直接当因果，也不要忽略执行成本。",
      spark: "商业分析像开会前的战术板：不是把图画满，而是让下一步行动更清楚。"
    },
    {
      intent: "FINANCE",
      keywords: ["金融", "金融科技", "fintech", "finance", "投资", "市场", "股票", "基金", "风险", "收益", "量化", "政策", "财报"],
      reply: "金融科技方向可以关注多源数据、文本智能、风险信号识别和可解释研究流程。Richard 更偏好把模型输出与证据、场景和风险边界绑定。",
      action: "如果是金融研究问题，可以先定义资产、时间窗口、信息源和风险假设。",
      check: "金融问题尤其要警惕过拟合、幸存者偏差、未来函数和不可解释结论。",
      spark: "金融数据表面是数字，底层其实是预期、情绪、制度和风险的混合信号。"
    },
    {
      intent: "BLOG",
      keywords: ["博客", "文章", "笔记", "blog", "post", "写作", "内容", "阅读", "燃油车文章", "新文章"],
      reply: "博客页面会放研究笔记、AI 与商业分析观察、金融科技思考，也会加入一些个人兴趣内容，比如传统燃油车与新能源车的对比。",
      action: "可以从导航栏进入 Blog，最新文章会排在列表最上方。",
      check: "如果要引用文章观点，建议区分事实判断和个人偏好。",
      spark: "博客区会更像 Richard 的研究备忘录和兴趣展厅，严肃分析之外也保留一点个人审美。"
    },
    {
      intent: "FEEDBACK",
      keywords: ["建议", "意见", "反馈", "留言", "吐槽", "改进", "优化", "proposal", "suggestion", "feedback", "idea", "评价"],
      reply: "建议已经进入这次私密对话，并会同步到 Richard 的收件通道。若内容较长，也可以通过 Feedback 页面补充背景。",
      action: "建议最好写清楚页面位置、你看到的问题、希望调整的方向，以及是否影响移动端体验。",
      check: "如果是隐私或账号类问题，不要在对话里提交敏感信息。",
      spark: "好的反馈像精准标注：不是只说“这里不对”，而是告诉 Richard 该看哪一块仪表。"
    },
    {
      intent: "WEBSITE",
      keywords: ["网站", "主页", "页面", "设计", "bug", "打不开", "显示", "部署", "github", "github pages", "homepage", "site", "排版", "样式"],
      reply: "如果是网站体验问题，可以描述页面位置、设备、浏览器和异常现象。反馈会通过私密对话通道同步给 Richard，也可以在 Feedback 页面补充提交。",
      action: "最有用的信息是页面名称、截图描述、设备尺寸和你希望达到的效果。",
      check: "视觉建议最好说明是信息太多、颜色不协调、交互不清楚，还是移动端适配问题。",
      spark: "把网站反馈说成“哪里卡眼、哪里顺眼、哪里想点”，Richard 会更容易定位。"
    },
    {
      intent: "NAVIGATION",
      keywords: ["怎么找", "在哪里", "入口", "导航", "tab", "菜单", "blog在哪", "chat box在哪", "feedback在哪", "github在哪"],
      reply: "主页顶部导航可以进入 Blog、Richard's Chat Box 和 Feedback；首页按钮可以直接跳到项目区、博客或联系入口。",
      action: "如果想看研究和项目，先看首页；想留言或合作，进入 Feedback；想快速提问，就用 Chat Box。",
      check: "如果某个入口不明显，可以把问题描述给 Richard，他会继续优化导航。",
      spark: "导航可以理解成三个入口：看观点去 Blog，问问题来 Chat Box，正式联系走 Feedback。"
    },
    {
      intent: "HOBBY",
      keywords: ["篮球", "投篮", "吉他", "运动", "游戏", "兴趣", "爱好", "basketball", "guitar", "game", "hobby", "beyond data"],
      reply: "主页里的 Beyond Data 把篮球做成了一个小型决策游戏：角度、力度、轨迹和命中概率都会联动，表达即时判断和反复训练。",
      action: "可以试着调节角度和力度，看球场弧线与命中概率怎样变化。",
      check: "这个模块是兴趣表达，不代表严肃模型预测，只是把判断过程做成可玩的交互。",
      spark: "投篮和建模有点像：参数调得再漂亮，也要接受一次出手后的不确定性。"
    },
    {
      intent: "STUDY",
      keywords: ["学习", "怎么学", "课程", "书", "路线", "研究生", "入门", "提升", "自学", "计划", "方法"],
      reply: "如果想走数据科学、AI 和商业分析交叉路线，可以先打好统计、数据库、Python、机器学习和业务分析基础，再通过项目把能力串起来。",
      action: "建议每个阶段都产出一个可展示作品：数据报告、预测模型、NLP 分析、AI 应用原型。",
      check: "不要只刷工具名，学习路线要和你想解决的问题绑定。",
      spark: "学习路线像搭建一套引擎：统计是底盘，代码是传动，业务问题决定方向盘。"
    },
    {
      intent: "TECH",
      keywords: ["python", "sql", "代码", "编程", "技术栈", "fastapi", "前端", "后端", "数据库", "爬虫", "可视化", "dashboard", "github"],
      reply: "Richard 的技术表达会偏向数据系统与 AI 应用：Python、SQL、机器学习、NLP、可视化、RAG、FastAPI 和可复现项目组织。",
      action: "如果要交流技术栈，可以说明目标是分析报告、模型实验、Web 原型还是工程部署。",
      check: "技术选型不应只追新，要看数据规模、维护成本和展示目标。",
      spark: "技术栈不用堆满工具箱，关键是每个工具都能服务最终判断。"
    },
    {
      intent: "LANGUAGE",
      keywords: ["英文", "中文", "翻译", "润色", "表达", "命名", "title", "slogan", "名字", "文案"],
      reply: "Richard 的主页风格是标题与专业标签偏英文，正文和解释偏中文，这样兼顾国际化个人品牌和中文语境下的清晰表达。",
      action: "如果要写标题，可以先用英文形成识别度，再用中文说明具体价值。",
      check: "英文命名要避免空泛，比如只写 AI Platform 不如写清楚场景和能力边界。",
      spark: "好的命名像车标一样：短、准、有识别度，最好还能暗示性能。"
    },
    {
      intent: "PROFILE",
      keywords: ["你是谁", "richard", "陈九鼎", "介绍", "履历", "个人主页", "profile", "about", "who are you"],
      reply: "Richard Chen 陈九鼎的核心标签是数据科学、人工智能、商业分析和决策智能。他的个人主页以研究能力、项目探索、竞赛荣誉和开放交流为主线。",
      action: "如果想快速了解 Richard，可以从首页欢迎区、Selected Work、Blog 和 Chat Box 四个区域看。",
      check: "个人介绍最好保持清晰可信，不要把所有标签都写成同等重点。",
      spark: "Richard 的主页像一张个人研究驾驶舱：身份、项目、兴趣和反馈入口都在同一套仪表里。"
    },
    {
      intent: "THANKS",
      keywords: ["谢谢", "感谢", "thanks", "thank you", "好的", "收到", "ok", "nice", "不错", "很棒", "喜欢"],
      reply: "收到。你的这条消息已经进入本次私密会话。",
      action: "如果还有具体问题，可以继续追问研究、项目、博客、联系方式或网站建议。",
      check: "如果是正式反馈，最好补充一句具体喜欢或希望改进的地方。",
      spark: "收到信号。这个对话框会把简短反馈也当成一次有效输入。"
    },
    {
      intent: "PRIVACY",
      keywords: ["记录", "保存", "隐私", "删除", "清空", "localstorage", "本地", "privacy", "data", "公开", "别人看到"],
      reply: "这不是公开留言墙，其他访客看不到你的对话。当前页面只展示本次会话；你发送的消息会通过私密收件通道同步给 Richard，可以点击右上角按钮清空本页记录。",
      action: "如果不想保留浏览器里的记录，可以点击右上角清空按钮。",
      check: "不要在对话里提交密码、证件号、银行卡等敏感信息。",
      spark: "你可以把这里当作一间小型会客室：本页显示给你自己，重要消息会送到 Richard 的收件通道。"
    },
    {
      intent: "GREETING",
      keywords: ["你好", "您好", "hi", "hello", "hey", "早上好", "晚上好", "在吗"],
      reply: "你好。可以直接问 Richard 的研究方向、项目经历、联系方式，也可以留下对网站或合作的想法。",
      action: "试着输入“介绍一下研究方向”“我想合作”“燃油车观点”这类问题。",
      check: "如果问题很宽泛，我会先给一个方向性回复，再引导你补充背景。",
      spark: "欢迎进入 Richard 的对话驾驶舱。你给一个关键词，我会把它转成一条可读的信号。"
    }
  ]);

  var defaultActions = {
    GENERAL: "可以继续补充背景、目标和你希望得到的回复类型，我会把问题整理得更清楚。",
    EMPTY: "先输入一句问题或建议即可。"
  };

  var defaultChecks = {
    GENERAL: "如果问题涉及隐私、账号、金钱或敏感数据，建议只描述场景，不提交原始敏感信息。",
    EMPTY: "空输入不会被发送。"
  };

  function randomReplyDelay() {
    return 2000 + Math.floor(Math.random() * 2001);
  }

  function getRuleDetail(rule, key, fallbackMap, fallbackText) {
    return pickValue(rule[key] || fallbackMap[rule.intent] || fallbackText, rule.intent + ":" + key);
  }

  function getModelProfile(modelName) {
    return modelProfiles[modelName] || modelProfiles.core;
  }

  function loadModel() {
    try {
      var saved = window.localStorage.getItem(modelKey);
      return modelProfiles[saved] ? saved : "core";
    } catch (error) {
      return "core";
    }
  }

  var activeModel = loadModel();

  function saveModel() {
    try {
      window.localStorage.setItem(modelKey, activeModel);
    } catch (error) {
      return false;
    }
    return true;
  }

  function renderModel() {
    var profile = getModelProfile(activeModel);
    root.setAttribute("data-active-model", activeModel);
    modelButtons.forEach(function (button) {
      var selected = button.getAttribute("data-chat-model") === activeModel;
      button.setAttribute("aria-pressed", String(selected));
      button.tabIndex = selected ? 0 : -1;
    });
    if (modelLabel) {
      modelLabel.textContent = profile.shortName;
    }
    if (modeFeedback && modeFeedback.getAttribute("data-state") !== "active") {
      modeFeedback.textContent = "Mode ready · " + profile.name;
    }
  }

  function getIntentStatus() {
    if (!messages || messages.length <= 1) return "READY";
    return (messages[messages.length - 1].intent || "READY").slice(0, 12);
  }

  function announceModelChange(profile) {
    if (!modeFeedback) return;
    if (modeFeedbackTimer) window.clearTimeout(modeFeedbackTimer);
    modeFeedback.textContent = "Mode switched · " + profile.name;
    modeFeedback.setAttribute("data-state", "active");
    modeFeedbackTimer = window.setTimeout(function () {
      modeFeedback.removeAttribute("data-state");
      modeFeedback.textContent = "Mode ready · " + getModelProfile(activeModel).name;
    }, 1800);
  }

  function styleReply(rule) {
    var reply = getRuleDetail(rule, "reply", {}, "这个问题我会先作为开放信号处理。");
    var action = getRuleDetail(rule, "action", defaultActions, "可以继续追问，我会把信息按更清楚的结构整理出来。");
    var check = getRuleDetail(rule, "check", defaultChecks, "重点是保留事实依据、边界条件和下一步动作。");
    var spark = getRuleDetail(rule, "spark", {}, "换个更有画面感的说法：把问题先放到仪表盘上，看清信号，再决定下一步。");
    var frame = pickValue(modelFrames[activeModel] || modelFrames.core, activeModel + ":frame");

    if (activeModel === "strategy") {
      return "Signal · " + frame + "\n\nRead · " + reply + "\n\nRoute · " + action + "\n\nCheck · " + check;
    }

    if (activeModel === "sentinel") {
      return "Risk · " + frame + "\n\nRead · " + reply + "\n\nGuardrail · " + check + "\n\nNext · " + action;
    }

    if (activeModel === "spark") {
      return "Spark · " + frame + "\n\n" + spark + "\n\nSignal · " + reply + "\n\nTry · 可以继续给一个更具体的场景，我会把它转成更有记忆点的表达。";
    }

    if (Math.random() > 0.48) {
      return "Signal · " + frame + "\n\n" + reply + "\n\nNext · " + action + "\n\nGuardrail · " + check;
    }

    return "Signal · " + frame + "\n\n" + reply + "\n\nNext · " + action;
  }

  function buildThinkingText(reply, delay) {
    var event = pickValue(thinkingEvents, "thinking:event");
    var seconds = (delay / 1000).toFixed(1).replace(/\.0$/, "");
    return [
      "Thinking · " + event.thinking,
      "Inference · " + event.inference,
      "Event · " + event.event,
      "ETA · " + seconds + "s / " + reply.intent
    ].join("\n");
  }

  function nowLabel() {
    var date = new Date();
    return date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
  }

  function loadMessages() {
    try {
      var saved = window.localStorage.getItem(storageKey);
      if (!saved) return seedMessages.slice();
      var parsed = JSON.parse(saved);
      if (!Array.isArray(parsed) || !parsed.length) return seedMessages.slice();
      return parsed.slice(-80).map(function (message) {
        if (!message || typeof message.text !== "string") return message;
        if (message.role === "assistant" && message.intent === "WELCOME") {
          message.text = seedMessages[0].text;
          message.intent = "AI DIALOGUE";
        } else if (message.intent === "EMPTY") {
          message.text = "先输入一个问题或建议，我会给出回应。";
        } else if (message.intent === "GENERAL") {
          message.text = "这个问题我会先作为开放问题放进本次私密对话。为了获得更准确的回复，可以在 Feedback 页面补充背景，或直接发送邮件至 chenjd999@163.com。";
        }
        return message;
      });
    } catch (error) {
      return seedMessages.slice();
    }
  }

  var messages = loadMessages();
  var isThinking = false;
  var pendingTimer = 0;
  var pendingToken = 0;
  var modeFeedbackTimer = 0;

  function saveMessages() {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(messages.slice(-80)));
    } catch (error) {
      return false;
    }
    return true;
  }

  function conversationSnapshot(reply) {
    var recent = messages.slice(-10).map(function (message) {
      var modelName = message.model ? getModelProfile(message.model).name : "";
      var modelPart = modelName ? " / " + modelName : "";
      return "[" + (message.time || nowLabel()) + "] " + message.role + " / " + (message.intent || "MESSAGE") + modelPart + ": " + message.text;
    });
    if (reply) {
      recent.push("Assistant draft / " + reply.intent + " / " + reply.modelName + ": " + reply.text);
    }
    return recent.join("\n");
  }

  function buildOwnerPayload(userText, reply) {
    return {
      _subject: "New private chat from Richard's Chat Box",
      _template: "table",
      _captcha: "false",
      _url: window.location.href,
      source: "Richard's Chat Box",
      name: "Chat Box Visitor",
      selected_model: reply.modelName,
      visitor_session: visitorSession,
      visitor_ip: "Lookup pending",
      visitor_ip_checked_at: "",
      visitor_location: "Lookup pending",
      visitor_timezone: "",
      visitor_network: "",
      visitor_geo_source: "",
      submitted_at: new Date().toISOString(),
      page_url: window.location.href,
      message: userText,
      assistant_reply: reply.text,
      intent: reply.intent,
      conversation_snapshot: conversationSnapshot(reply)
    };
  }

  function attachVisitorMetadata(payload, metadata) {
    var current = metadata || {};
    if (
      !current.visitor_ip &&
      window.RichardVisitorMetadata &&
      typeof window.RichardVisitorMetadata.getCurrent === "function"
    ) {
      current = window.RichardVisitorMetadata.getCurrent();
    }
    payload.visitor_ip = current.visitor_ip || "Unavailable";
    payload.visitor_ip_checked_at = current.visitor_ip_checked_at || new Date().toISOString();
    payload.visitor_location = current.visitor_location || "Unavailable";
    payload.visitor_timezone = current.visitor_timezone || "";
    payload.visitor_network = current.visitor_network || "";
    payload.visitor_geo_source = current.visitor_geo_source || "";
    return payload;
  }

  function populateBackendForm(payload) {
    if (!backendForm || !syncFields.model || !syncFields.session || !syncFields.ip || !syncFields.ipCheckedAt || !syncFields.time || !syncFields.page || !syncFields.message || !syncFields.reply || !syncFields.intent || !syncFields.conversation) return false;
    syncFields.model.value = payload.selected_model;
    syncFields.session.value = payload.visitor_session;
    syncFields.ip.value = payload.visitor_ip;
    syncFields.ipCheckedAt.value = payload.visitor_ip_checked_at;
    if (syncFields.location) syncFields.location.value = payload.visitor_location;
    if (syncFields.timezone) syncFields.timezone.value = payload.visitor_timezone;
    if (syncFields.network) syncFields.network.value = payload.visitor_network;
    if (syncFields.geoSource) syncFields.geoSource.value = payload.visitor_geo_source;
    syncFields.time.value = payload.submitted_at;
    syncFields.page.value = payload.page_url;
    syncFields.message.value = payload.message;
    syncFields.reply.value = payload.assistant_reply;
    syncFields.intent.value = payload.intent;
    syncFields.conversation.value = payload.conversation_snapshot;
    return true;
  }

  function fallbackOwnerSubmit() {
    try {
      backendForm.submit();
    } catch (error) {
      root.setAttribute("data-chat-sync", "failed");
      return false;
    }
    root.setAttribute("data-chat-sync", "fallback");
    return true;
  }

  function syncOwnerCopy(userText, reply) {
    if (!backendForm) return false;
    var payload = buildOwnerPayload(userText, reply);
    var visitorMetadata = window.RichardVisitorMetadata;

    function submitPayload(metadata) {
      attachVisitorMetadata(payload, metadata);
      if (!populateBackendForm(payload)) return false;

      if (!window.fetch || !backendEndpoint) {
        return fallbackOwnerSubmit();
      }

      root.setAttribute("data-chat-sync", "sending");
      window.fetch(backendEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(payload)
      })
        .then(function (response) {
          if (!response.ok) throw new Error("Chat inbox sync failed");
          return response.json().catch(function () {
            return {};
          });
        })
        .then(function () {
          root.setAttribute("data-chat-sync", "sent");
        })
        .catch(function () {
          fallbackOwnerSubmit();
        });
      return true;
    }

    if (visitorMetadata && typeof visitorMetadata.ready === "function") {
      root.setAttribute("data-chat-sync", "preparing");
      visitorMetadata.ready(1600).then(submitPayload).catch(function () {
        submitPayload();
      });
      return true;
    }

    submitPayload();
    return true;
  }

  function buildReply(rawText) {
    var text = rawText.trim().toLowerCase();
    if (!text) {
      var emptyRule = {
        intent: "EMPTY",
        reply: "先输入一个问题或建议，我会给出回应。",
        action: defaultActions.EMPTY,
        check: defaultChecks.EMPTY
      };
      return {
        intent: "EMPTY",
        text: styleReply(emptyRule),
        model: activeModel,
        modelName: getModelProfile(activeModel).name
      };
    }

    var best = rules.find(function (rule) {
      return rule.keywords.some(function (keyword) {
        return text.indexOf(String(keyword).toLowerCase()) > -1;
      });
    });

    if (best) {
      return {
        intent: best.intent,
        text: styleReply(best),
        model: activeModel,
        modelName: getModelProfile(activeModel).name
      };
    }

    var fallbackRule = {
      intent: "GENERAL",
      reply: "这个问题我会先作为开放问题放进本次私密对话。为了获得更准确的回复，可以在 Feedback 页面补充背景，或直接发送邮件至 chenjd999@163.com。",
      action: defaultActions.GENERAL,
      check: defaultChecks.GENERAL,
      spark: "这是一个暂时没有命中专门频道的问题，我会先把它放进开放问题池。"
    };
    return {
      intent: "GENERAL",
      text: styleReply(fallbackRule),
      model: activeModel,
      modelName: getModelProfile(activeModel).name
    };
  }

  function getSessionId() {
    try {
      var existing = window.localStorage.getItem(sessionKey);
      if (existing) return existing;
      var created = "chat-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 9);
      window.localStorage.setItem(sessionKey, created);
      return created;
    } catch (error) {
      return "chat-" + Date.now().toString(36);
    }
  }

  var visitorSession = getSessionId();

  function createMessage(message) {
    var item = document.createElement("article");
    item.className = "chatbox-message chatbox-message--" + message.role;
    if (message.transient) {
      item.className += " chatbox-message--thinking";
      item.setAttribute("aria-busy", "true");
    }
    var messageModel = message.model || (message.role === "assistant" ? activeModel : "");
    if (message.intent === "WELCOME") {
      messageModel = activeModel;
    }
    if (messageModel) {
      item.setAttribute("data-message-model", messageModel);
    }

    var avatar = document.createElement("div");
    avatar.className = "chatbox-message__avatar";
    var avatarIcon = document.createElement("i");
    avatarIcon.className = message.transient
      ? "fa-solid fa-circle-notch"
      : (message.role === "user" ? "fa-solid fa-user" : "fa-solid fa-circle-nodes");
    avatarIcon.setAttribute("aria-hidden", "true");
    avatar.appendChild(avatarIcon);

    var content = document.createElement("div");
    content.className = "chatbox-message__content";

    var meta = document.createElement("div");
    meta.className = "chatbox-message__meta";

    var name = document.createElement("span");
    var messageProfile = message.role === "assistant" && messageModel ? getModelProfile(messageModel) : null;
    name.textContent = message.transient ? "Thinking" : (message.role === "user" ? "Visitor" : (messageProfile ? messageProfile.name : "Richard AI"));

    var intent = document.createElement("small");
    intent.textContent = message.transient ? "INFERENCE · LIVE" : (messageProfile ? messageProfile.shortName + " · " + (message.intent || "MESSAGE") : (message.intent || "MESSAGE"));

    var time = document.createElement("time");
    time.textContent = message.time || nowLabel();

    meta.appendChild(name);
    meta.appendChild(intent);
    meta.appendChild(time);

    var body = document.createElement("p");
    body.textContent = message.text;

    content.appendChild(meta);
    content.appendChild(body);
    item.appendChild(avatar);
    item.appendChild(content);
    return item;
  }

  function setThinkingState(state) {
    isThinking = state;
    root.setAttribute("data-chat-thinking", state ? "true" : "false");
    if (input) input.disabled = state;
    if (submitButton) submitButton.disabled = state;
    promptButtons.forEach(function (button) {
      button.disabled = state;
    });
    modelButtons.forEach(function (button) {
      button.disabled = state;
    });
    if (intentLabel) intentLabel.textContent = state ? "THINKING" : getIntentStatus();
    updateComposerState();
  }

  function showThinkingMessage(reply, delay) {
    var node = createMessage({
      role: "assistant",
      text: buildThinkingText(reply, delay),
      intent: "THINKING",
      model: reply.model,
      transient: true,
      time: nowLabel()
    });
    log.appendChild(node);
    log.scrollTop = log.scrollHeight;
    return node;
  }

  function render() {
    log.textContent = "";
    messages.forEach(function (message) {
      log.appendChild(createMessage(message));
    });
    log.scrollTop = log.scrollHeight;
    if (countLabel) countLabel.textContent = String(Math.max(messages.length - 1, 0));
    if (intentLabel) intentLabel.textContent = getIntentStatus();
    renderModel();
  }

  function addMessage(role, text, intent, model) {
    messages.push({
      role: role,
      text: text,
      intent: intent,
      model: model || "",
      time: nowLabel()
    });
    saveMessages();
    render();
  }

  function resizeComposer() {
    if (!input) return;
    input.style.height = "auto";
    input.style.height = Math.min(Math.max(input.scrollHeight, 62), 164) + "px";
  }

  function updateComposerState() {
    if (inputCount && input) {
      inputCount.textContent = String(input.value.length) + " / " + (input.getAttribute("maxlength") || "600");
    }
    if (inputStatus) {
      if (isThinking) {
        inputStatus.textContent = "Inference running";
      } else if (input && input.value.trim()) {
        inputStatus.textContent = "Draft ready";
      } else {
        inputStatus.textContent = "Ready";
      }
    }
  }

  function sendMessage(text) {
    var value = text.trim();
    if (!value || isThinking) return false;
    addMessage("user", value, "INPUT");

    var reply = buildReply(value);
    var delay = randomReplyDelay();
    var token = pendingToken + 1;
    var thinkingNode = showThinkingMessage(reply, delay);
    pendingToken = token;
    setThinkingState(true);
    syncOwnerCopy(value, reply);
    pendingTimer = window.setTimeout(function () {
      if (token !== pendingToken) return;
      if (thinkingNode && thinkingNode.parentNode) {
        thinkingNode.parentNode.removeChild(thinkingNode);
      }
      addMessage("assistant", reply.text, reply.intent, reply.model);
      setThinkingState(false);
      if (input) input.focus();
    }, delay);
    return true;
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    if (!sendMessage(input.value)) return;
    input.value = "";
    resizeComposer();
    updateComposerState();
  });

  input.addEventListener("keydown", function (event) {
    if (event.key !== "Enter" || event.shiftKey || event.isComposing) return;
    event.preventDefault();
    form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
  });

  input.addEventListener("input", function () {
    resizeComposer();
    updateComposerState();
  });

  promptButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      if (sendMessage(button.getAttribute("data-chat-prompt") || button.textContent) && input) {
        input.value = "";
        resizeComposer();
        updateComposerState();
      }
    });
  });

  modelButtons.forEach(function (button, index) {
    button.addEventListener("click", function () {
      var nextModel = button.getAttribute("data-chat-model");
      if (!modelProfiles[nextModel]) return;
      activeModel = nextModel;
      saveModel();
      renderModel();
      announceModelChange(getModelProfile(activeModel));
    });
    button.addEventListener("keydown", function (event) {
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
      event.preventDefault();
      var offset = event.key === "ArrowRight" ? 1 : -1;
      var nextIndex = (index + offset + modelButtons.length) % modelButtons.length;
      activeModel = modelButtons[nextIndex].getAttribute("data-chat-model");
      saveModel();
      renderModel();
      announceModelChange(getModelProfile(activeModel));
      modelButtons[nextIndex].focus();
    });
  });

  if (clearButton) {
    clearButton.addEventListener("click", function () {
      pendingToken += 1;
      if (pendingTimer) window.clearTimeout(pendingTimer);
      pendingTimer = 0;
      setThinkingState(false);
      messages = seedMessages.slice();
      saveMessages();
      render();
      resizeComposer();
      updateComposerState();
      input.focus();
    });
  }

  renderModel();
  render();
  resizeComposer();
  updateComposerState();
})();
