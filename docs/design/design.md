# 技术设计文档：微信公众号文章写手

> 项目：issue-2  
> 版本：v2.0  
> 日期：2026-03-15  
> 状态：设计完成（基于用户反馈修订）

## 变更记录

| 版本 | 日期 | 变更内容 |
|------|------|---------|
| v1.0 | 2026-03-15 | 初始设计 |
| v2.0 | 2026-03-15 | 用户反馈修订：选题数量可配置(默认20)、选题展示来源信息、文章输出HTML格式 |

## 1. 概述

基于 OpenClaw 平台实现一个 AgentSkill（`wechat-writer`），为用户提供**热点发现 → 选题建议 → 文章撰写 → 多轮修改 → 自动发布**的完整工作流。

### 1.1 核心架构

```
用户 ──> OpenClaw Agent (wechat-writer skill)
              │
              ├── [1] HotspotScanner  ── 抓取热点（RSS/Web/API）
              ├── [2] TopicAdvisor    ── 汇总热点，推荐选题（可配置数量，默认20条）
              ├── [3] ArticleWriter   ── 撰写文章（直接生成 HTML）
              ├── [4] ImageProvider   ── 配图获取（Unsplash/Pexels/AI生成）
              └── [5] WeChatPublisher ── 调用微信公众号 API 发布
```

整个项目作为一个 **OpenClaw Skill** 交付，用户安装后通过 `/wechat-writer` 命令触发。

### 1.2 技术栈

| 层次 | 选择 | 理由 |
|------|------|------|
| 语言 | TypeScript (Node.js) | 环境要求，异步友好 |
| 包管理 | npm | 环境要求 |
| HTTP 客户端 | undici (Node.js 内置) | 零依赖，性能好 |
| RSS 解析 | rss-parser | 成熟轻量 |
| HTML 生成 | 自定义模板引擎 | 直接生成美观 HTML，不经 Markdown 中转 |
| HTML 美化 | 内联 CSS + 响应式模板 | 公众号兼容，邮件级美观 |
| 配置管理 | YAML (js-yaml) | 用户友好，可读性好 |
| 图片 | Unsplash API / Pexels API | 免费高质量图片 |

## 2. 模块设计

### 2.1 HotspotScanner — 热点抓取模块

**职责**：从可配置的多个数据源抓取行业热点信息。

**数据源类型**：

| 类型 | 实现方式 | 默认源示例 |
|------|---------|-----------|
| RSS/Atom | rss-parser 解析 | 36氪、InfoQ中文、Hacker News |
| Web 爬取 | web_fetch + 文本提取 | 微信热搜、知乎热榜 |
| API | REST 调用 | NewsAPI、GitHub Trending |

**配置结构** (`config.yaml`)：

```yaml
industry: "人工智能"  # 行业方向，部署时可配置

# 选题配置
topic:
  count: 20            # 每次推荐选题数量（默认20条，用户可配置）
  min_relevance: 0.3   # 最低相关性分数过滤阈值

sources:
  - name: "36氪"
    type: rss
    url: "https://36kr.com/feed"
    enabled: true
  - name: "Hacker News Top"
    type: rss
    url: "https://hnrss.org/newest?points=100"
    enabled: true
  - name: "InfoQ中文"
    type: rss
    url: "https://www.infoq.cn/feed"
    enabled: true
  # 用户可自由添加更多源

source_defaults:
  - name: "Hacker News"
    type: rss
    url: "https://hnrss.org/newest?points=100"
  - name: "36氪"
    type: rss
    url: "https://36kr.com/feed"
  - name: "InfoQ中文"
    type: rss
    url: "https://www.infoq.cn/feed"
```

**输出**：热点列表 JSON，每条包含：

```typescript
interface Hotspot {
  title: string;          // 热点标题
  summary: string;        // 摘要（200字以内）
  source: string;         // 来源名称（如 "36氪"、"Hacker News"）
  sourceUrl: string;      // 来源网站 URL
  articleUrl: string;     // 原文链接
  publishedAt: string;    // 发布时间
  relevanceScore: number; // 相关性评分 0-1
}
```

**Token 优化**：
- 先用脚本抓取+结构化，只将摘要（非全文）传给 LLM
- 用 `relevanceScore`（基于关键词匹配）预排序，只取 Top-N（N = `topic.count` × 2，给 LLM 余量）

### 2.2 TopicAdvisor — 选题推荐模块

**职责**：基于热点列表，生成可配置数量（默认20条）的选题建议，并标注每条选题的**信息来源**。

**v2.0 变更**：
- 选题数量从固定 3-5 条改为可配置（`topic.count`），默认 20 条
- 每条选题必须包含来源信息（哪些热点/数据源触发了该选题）

**流程**：
1. 接收 HotspotScanner 的结构化热点数据
2. 按来源分组，提取各来源的核心趋势
3. 调用 LLM 生成选题建议（通过 OpenClaw agent 的 LLM 能力）
4. 每个选题包含完整来源溯源

**选题数据结构**：

```typescript
interface TopicSuggestion {
  id: number;                // 编号（1-N）
  title: string;             // 推荐标题
  coreTakeaway: string;      // 核心论点（一句话）
  angle: string;             // 写作角度
  targetAudience: string;    // 目标读者
  recommendedStyle: string;  // 推荐写作风格
  sources: TopicSource[];    // ⭐ 信息来源列表（v2.0 新增）
}

interface TopicSource {
  name: string;              // 来源名称（如 "36氪"）
  title: string;             // 相关热点标题
  url: string;               // 原文链接
  publishedAt: string;       // 发布时间
}
```

**用户呈现格式**（选题列表展示）：

```
📋 为您推荐 20 个选题（按相关性排序）：

1. 《GPT-5 发布在即：大模型竞赛进入下半场》
   核心论点：大模型竞争从参数规模转向推理效率
   推荐风格：趋势分析
   📰 来源：
   • [36氪] OpenAI 内部文件泄露 GPT-5 训练细节 (2026-03-14)
     https://36kr.com/p/xxx
   • [Hacker News] GPT-5 benchmarks leaked (2026-03-13)
     https://news.ycombinator.com/item?id=xxx

2. 《AI Agent 落地的 5 个真实案例》
   核心论点：Agent 技术正从实验走向商用
   推荐风格：案例叙事
   📰 来源：
   • [InfoQ中文] 2026年AI Agent商业化报告 (2026-03-12)
     https://www.infoq.cn/article/xxx
   ...

请输入编号选择选题，或描述你的写作思路。
```

**Prompt 模板**（存于 `references/prompts/topic-advisor.md`）：

```
你是一位资深的 {industry} 行业公众号编辑。
以下是近期行业热点（按来源分组）：

{hotspots_by_source}

请推荐 {topic_count} 个公众号文章选题。每个选题必须包含：
1. 标题（吸引眼球但不标题党）
2. 核心论点（一句话）
3. 写作角度
4. 目标读者
5. 推荐写作风格
6. 信息来源：标注该选题基于哪些热点信息，需注明来源名称和原文标题

优先推荐跨来源交叉印证的话题（多个来源同时关注说明更有价值）。
```

**Token 优化**：
- 热点摘要按来源分组，每源最多取 5 条，总量控制在 3000 tokens 以内
- 如果 `topic.count` > 10，分批生成（每批 10 条），减少单次 prompt 压力

### 2.3 ArticleWriter — 文章撰写模块

**职责**：根据用户选定的选题和写作思路，生成文章。

**v2.0 变更**：
- 文章输出格式从 Markdown 改为 **HTML**
- 使用精心设计的 HTML 模板，确保美观性
- 预览阶段直接展示 HTML 渲染效果（通过本地文件打开浏览器预览）

**写作风格预设**（可配置）：

| 风格 | 描述 | 适用场景 |
|------|------|---------|
| `professional` | 专业严谨，数据驱动 | 技术分析、行业报告 |
| `storytelling` | 叙事型，案例驱动 | 产品介绍、创业故事 |
| `opinion` | 观点鲜明，犀利评论 | 热点评论、趋势分析 |
| `tutorial` | 教程式，步骤清晰 | 技术教程、操作指南 |
| `casual` | 轻松幽默，口语化 | 科普、生活化技术文 |

**HTML 输出架构**：

文章生成分两步：
1. **内容生成**：LLM 生成结构化 JSON 内容（标题、段落、引用、代码块等）
2. **HTML 渲染**：TypeScript 模板引擎将结构化内容渲染为美观 HTML

**文章内容结构**：

```typescript
interface ArticleContent {
  title: string;
  subtitle?: string;
  author: string;
  digest: string;           // 摘要
  coverImageKeywords: string[];  // 封面图搜索关键词
  sections: ArticleSection[];
}

interface ArticleSection {
  type: 'heading' | 'paragraph' | 'quote' | 'code' | 'image' | 'list' | 'divider' | 'callout';
  level?: number;           // heading level (2-4)
  content?: string;         // 文本内容（支持内联 HTML: <strong>, <em>, <a>）
  language?: string;        // 代码语言
  items?: string[];         // 列表项
  imageKeywords?: string[]; // 配图搜索关键词
  imageCaption?: string;    // 图片说明
  calloutType?: 'info' | 'warning' | 'tip';  // callout 类型
}
```

**HTML 模板系统**（`src/renderer/`）：

```typescript
// 渲染流程
ArticleContent → HTMLRenderer → 完整 HTML 文件

// HTMLRenderer 职责：
// 1. 将 ArticleSection[] 映射为 HTML 元素
// 2. 注入内联 CSS 样式（公众号不支持外部 CSS）
// 3. 响应式排版（适配手机阅读）
// 4. 生成两个版本：
//    a. preview.html — 本地预览版（含完整 <html> 结构）
//    b. content.html — 公众号发布版（仅 <body> 内容，内联样式）
```

**HTML 样式设计原则**：
- 所有 CSS 内联（微信公众号要求）
- 中文排版优化：行高 1.8，段间距 1.2em，首行缩进可选
- 代码块语法高亮（预生成内联样式，不依赖 JS）
- 引用块采用左侧色条 + 浅背景
- 配图居中，圆角，带图片说明
- 标题层级清晰，使用颜色区分
- Callout 框（提示/警告/技巧）有专属图标和配色
- 支持多种主题色（通过配置切换）

**样式配置**：

```yaml
article:
  theme: "default"          # default | dark | elegant | tech
  primary_color: "#1a73e8"  # 主题色
  font_family: "'PingFang SC', 'Microsoft YaHei', sans-serif"
  line_height: 1.8
  indent_first_line: false  # 首行缩进
  code_theme: "github"      # 代码高亮主题
```

**多轮修改流程**：
1. 生成初稿 → 渲染为 HTML → 保存 `preview.html` → 提示用户浏览器预览
2. 用户提出修改意见 → agent 修改结构化内容 → 重新渲染 HTML
3. 循环直到用户确认满意
4. 确认后进入发布流程

**Token 优化策略**：
- 初稿生成：一次性生成结构化 JSON，不拆段
- 修改阶段：只传修改意见 + 需修改的 section index，不重传全文
- HTML 渲染完全在本地执行，不消耗 Token
- 使用 `references/prompts/` 下的模板，避免每次重复 system prompt

### 2.4 ImageProvider — 配图模块

**职责**：为文章提供相关配图。

**图片来源**（按优先级）：

1. **Unsplash API**（免费，高质量）— 默认
2. **Pexels API**（免费，高质量）— 备选
3. **AI 生成**（通过 OpenClaw 的 image-gen skill，如可用）— 自定义

**流程**：
1. 从文章结构化内容提取关键词（`imageKeywords` 字段）
2. 调用图片 API 搜索
3. 下载图片到本地临时目录
4. 通过微信 API 上传为永久素材，获取 `media_id`
5. 更新 HTML 中的图片 URL 为微信图片 URL

**配置**：
```yaml
images:
  provider: "unsplash"  # unsplash | pexels | ai
  api_key: ""           # 对应平台的 API Key
  default_count: 3      # 每篇文章默认配图数
  style: "tech"         # 图片搜索偏好风格
```

### 2.5 WeChatPublisher — 微信发布模块

**职责**：调用微信公众号 API 完成发布。

**API 调用链**：

```
1. 获取 access_token
   POST https://api.weixin.qq.com/cgi-bin/token
   ?grant_type=client_credential&appid={APPID}&secret={SECRET}

2. 上传文章内图片为永久素材
   POST https://api.weixin.qq.com/cgi-bin/media/uploadimg
   (multipart/form-data)
   → 返回 url（文章内引用）

3. 上传封面图为永久素材
   POST https://api.weixin.qq.com/cgi-bin/material/add_material
   ?type=image
   → 返回 media_id（封面用）

4. HTML 内容后处理
   - 替换图片 URL 为微信上传后的 URL
   - 确保所有样式内联
   - 移除不兼容的 HTML 标签/属性

5. 新增草稿
   POST https://api.weixin.qq.com/cgi-bin/draft/add
   {
     "articles": [{
       "title": "...",
       "author": "...",
       "digest": "...",
       "content": "<html>...</html>",
       "thumb_media_id": "...",
       "content_source_url": "..."
     }]
   }
   → 返回 media_id（草稿 ID）

6. 发布草稿（用户确认后）
   POST https://api.weixin.qq.com/cgi-bin/freepublish/submit
   { "media_id": "..." }
   → 返回 publish_id

7. 查询发布状态
   POST https://api.weixin.qq.com/cgi-bin/freepublish/get
   { "publish_id": "..." }
```

**微信配置**：
```yaml
wechat:
  appid: ""        # 公众号 AppID
  secret: ""       # 公众号 AppSecret
  author: ""       # 默认作者名
```

**access_token 管理**：
- 缓存到文件（`~/.openclaw/skills/wechat-writer/.token-cache.json`）
- 过期时间 7200s，提前 300s 刷新

## 3. Skill 目录结构

```
wechat-writer/
├── SKILL.md                          # Skill 入口（OpenClaw 加载）
├── package.json                      # Node.js 依赖
├── tsconfig.json                     # TypeScript 配置
├── src/
│   ├── index.ts                      # 主入口，CLI 命令解析
│   ├── scanner/
│   │   ├── index.ts                  # HotspotScanner 主逻辑
│   │   ├── rss.ts                    # RSS 源适配器
│   │   └── types.ts                  # 热点数据类型定义
│   ├── advisor/
│   │   └── index.ts                  # TopicAdvisor 选题推荐
│   ├── writer/
│   │   ├── index.ts                  # ArticleWriter 主逻辑
│   │   └── styles.ts                 # 写作风格定义
│   ├── renderer/
│   │   ├── index.ts                  # HTMLRenderer 主逻辑
│   │   ├── templates.ts             # HTML 模板片段
│   │   ├── themes.ts                # 主题色配置
│   │   └── code-highlight.ts        # 代码块语法高亮（内联CSS）
│   ├── images/
│   │   ├── index.ts                  # ImageProvider 主逻辑
│   │   ├── unsplash.ts               # Unsplash 适配器
│   │   └── pexels.ts                 # Pexels 适配器
│   ├── publisher/
│   │   ├── index.ts                  # WeChatPublisher 主逻辑
│   │   ├── auth.ts                   # access_token 管理
│   │   ├── material.ts               # 素材上传
│   │   └── sanitizer.ts             # HTML 清洗（移除微信不兼容标签）
│   ├── config/
│   │   ├── index.ts                  # 配置加载/合并
│   │   └── schema.ts                 # 配置校验 schema
│   └── utils/
│       ├── token-counter.ts          # Token 计数（优化用）
│       └── logger.ts                 # 日志工具
├── scripts/
│   ├── scan.sh                       # 快捷脚本：抓取热点
│   ├── publish.sh                    # 快捷脚本：发布文章
│   └── setup.sh                      # 首次配置引导
├── references/
│   ├── prompts/
│   │   ├── topic-advisor.md          # 选题推荐 prompt
│   │   ├── article-writer.md         # 文章撰写 prompt
│   │   └── style-guides.md          # 各风格写作指南
│   └── wechat-api.md                 # 微信 API 参考
├── assets/
│   ├── default-config.yaml           # 默认配置模板
│   └── themes/
│       ├── default.json              # 默认主题
│       ├── dark.json                 # 深色主题
│       ├── elegant.json              # 典雅主题
│       └── tech.json                 # 科技主题
└── dist/                             # 编译输出
```

## 4. SKILL.md 设计

```yaml
---
name: wechat-writer
description: >
  微信公众号文章写手。搜索行业热点 → 推荐选题（默认20条，可配置）→
  撰写 HTML 格式文章 → 多轮修改 → 自动发布到公众号。
  支持自定义行业方向、热点源、写作风格、主题色。
  使用: /wechat-writer [scan|write|publish|config]
  - scan: 抓取热点并推荐选题（附来源信息）
  - write: 根据选题撰写文章（HTML 格式，可预览）
  - publish: 发布文章到公众号
  - config: 配置行业/热点源/微信账号/主题
metadata:
  openclaw:
    emoji: "✍️"
    requires:
      bins: ["node"]
    install:
      - id: deps
        kind: npm
        path: "."
        label: "Install wechat-writer dependencies"
---
```

## 5. 用户交互流程

### 5.1 首次配置

```
用户: /wechat-writer config
Agent: 请配置以下信息：
  1. 行业方向（如：人工智能、金融科技）
  2. 微信公众号 AppID 和 AppSecret
  3. 图片服务 API Key（可选，默认 Unsplash）
  4. 每次推荐选题数量（默认 20 条）
  5. 文章主题风格（default/dark/elegant/tech）
  → 生成 config.yaml 到 skill 目录
```

### 5.2 完整工作流

```
用户: /wechat-writer scan
Agent: 正在扫描热点源... (执行 scanner 脚本)
      ✅ 36氪 — 获取 12 条
      ✅ Hacker News — 获取 8 条
      ✅ InfoQ中文 — 获取 10 条

      正在分析与生成选题...

      📋 为您推荐 20 个选题（按热度排序）：

      1. 《GPT-5 发布在即：大模型竞赛进入下半场》
         核心论点：大模型竞争从参数规模转向推理效率
         推荐风格：趋势分析
         📰 来源：
         • [36氪] OpenAI 内部文件泄露 GPT-5 训练细节 (2026-03-14)
           https://36kr.com/p/xxx
         • [Hacker News] GPT-5 benchmarks leaked (2026-03-13)
           https://news.ycombinator.com/item?id=xxx

      2. 《AI Agent 落地的 5 个真实案例》
         核心论点：Agent 技术正从实验走向商用
         推荐风格：案例叙事
         📰 来源：
         • [InfoQ中文] 2026年AI Agent商业化报告 (2026-03-12)
           https://www.infoq.cn/article/xxx
      ...

      20. 《...》
          ...

      请输入编号选择选题（输入编号），或描述你的写作思路。

用户: 选 1，加入对国产大模型的分析
Agent: 收到，正在撰写...

      ✅ 文章已生成！
      📄 HTML 预览已保存至: /tmp/wechat-writer-preview.html
      💡 提示：用浏览器打开预览文件查看排版效果

      === 文章结构 ===
      标题：GPT-5 发布在即：大模型竞赛进入下半场
      字数：2,350
      段落：12 段
      配图：3 张
      ===

      请审阅预览文件，有修改意见请直接说。

用户: 第三段关于 Llama 的分析太浅了，加深一些
Agent: 已修改第三段，重新渲染 HTML...
      📄 预览已更新: /tmp/wechat-writer-preview.html
      还有其他修改吗？

用户: OK 可以发布了
Agent: 正在上传图片... ✅ (3/3)
      正在创建草稿... ✅
      草稿已创建 (media_id: xxx)
      正在发布... ✅
      文章已发布！publish_id: xxx
```

### 5.3 快捷模式

```
用户: /wechat-writer write 帮我写一篇关于 RAG 技术的教程
Agent: (跳过 scan，直接进入撰写模式，使用 tutorial 风格)
```

## 6. Token 优化策略

| 策略 | 节省量 | 实现方式 |
|------|--------|---------|
| 热点预处理 | ~60% | 脚本抓取+结构化，只传摘要给 LLM |
| Prompt 模板外置 | ~20% | 存于 `references/prompts/`，按需加载 |
| 增量修改 | ~40% | 修改时只传 diff section，不重传全文 |
| HTML 本地渲染 | ~30% | 内容→HTML 转换全部本地执行，零 Token |
| 分批选题 | ~25% | 选题数 >10 时分批生成，减少单次 prompt |
| 风格缓存 | ~15% | 首次选定风格后缓存，后续不重复指定 |
| 配图关键词内嵌 | ~10% | 关键词在文章结构中内嵌，不额外调用 LLM |

## 7. 配置示例（完整）

```yaml
# ~/.openclaw/skills/wechat-writer/config.yaml

# 行业方向 - 部署时配置
industry: "人工智能"

# 选题配置
topic:
  count: 20              # 每次推荐选题数量（默认20条）
  min_relevance: 0.3     # 最低相关性阈值
  show_sources: true     # 选题展示来源信息（默认开启）

# 热点源 - 用户可配置
sources:
  - name: "36氪"
    type: rss
    url: "https://36kr.com/feed"
    enabled: true
  - name: "Hacker News Top"
    type: rss
    url: "https://hnrss.org/newest?points=100"
    enabled: true
  - name: "InfoQ中文"
    type: rss
    url: "https://www.infoq.cn/feed"
    enabled: true
  - name: "GitHub Trending"
    type: api
    url: "https://api.github.com/search/repositories?q=stars:>100+created:>2026-03-01&sort=stars"
    enabled: false

# 文章输出
article:
  format: "html"            # 输出格式：html
  theme: "default"          # 主题：default | dark | elegant | tech
  primary_color: "#1a73e8"  # 主题色
  font_family: "'PingFang SC', 'Microsoft YaHei', sans-serif"
  line_height: 1.8
  indent_first_line: false  # 首行缩进
  code_theme: "github"      # 代码高亮主题

# 写作风格
writing:
  default_style: "professional"
  tone: "专业但不枯燥"
  target_length: 2000  # 目标字数
  language: "zh-CN"

# 微信公众号
wechat:
  appid: ""
  secret: ""
  author: ""
  enable_comment: false

# 配图
images:
  provider: "unsplash"
  api_key: ""
  default_count: 3
  style: "tech"  # 图片搜索偏好

# Token 优化
optimization:
  max_hotspot_summary_tokens: 3000  # 热点摘要 token 上限（适配 20 条选题）
  max_article_tokens: 4000
  enable_incremental_edit: true
  batch_topic_threshold: 10         # 超过此数量分批生成选题
```

## 8. 错误处理

| 场景 | 处理方式 |
|------|---------|
| RSS 源不可达 | 跳过该源，记录警告，继续其他源 |
| 微信 access_token 过期 | 自动刷新，重试一次 |
| 素材上传失败 | 重试 3 次，间隔递增 (1s, 3s, 5s) |
| 发布失败 | 保留草稿 media_id，提示用户手动发布 |
| 图片 API 配额耗尽 | 降级为无配图模式，提示用户 |
| 微信 API 限流 | 429 响应时 backoff 等待，最多等 60s |
| HTML 渲染失败 | 降级为纯文本输出，记录错误 |
| 热点源全部失败 | 提示用户检查网络/配置，展示错误详情 |

## 9. 安全考虑

- **敏感配置**：AppID/Secret 存储在 config.yaml，该文件权限设为 600
- **Token 缓存**：`.token-cache.json` 文件权限 600，不进 git
- **内容审核**：发布前提醒用户确认内容合规（微信有内容审核）
- **图片版权**：Unsplash/Pexels 图片免费商用，自动添加来源声明
- **临时文件**：预览 HTML 使用 `/tmp/` 目录，定期清理

## 10. 兼容性

- **macOS**: 原生支持（Node.js 全平台）
- **Linux**: 主流发行版支持（Ubuntu 20+, Debian 11+, CentOS 8+, Arch）
- **Node.js**: >= 18.0.0（使用内置 fetch/undici）
- **OpenClaw**: 跟随 OpenClaw 主流版本（skill 标准格式）

## 11. 依赖清单

```json
{
  "dependencies": {
    "rss-parser": "^3.13.0",
    "js-yaml": "^4.1.0",
    "undici": "^6.0.0"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "@types/js-yaml": "^4.0.9",
    "@types/node": "^20.0.0"
  }
}
```

> 注意：v2.0 移除了 `marked` 依赖（不再需要 Markdown→HTML 转换），HTML 由自定义模板引擎直接生成。

## 12. 里程碑

| 阶段 | 内容 | 预估工时 |
|------|------|---------|
| M1 | 项目脚手架 + 配置系统 | 2h |
| M2 | 热点抓取 + 选题推荐（含来源展示） | 3h |
| M3 | HTML 渲染引擎 + 主题系统 | 3h |
| M4 | 文章撰写 + 多轮修改 | 3h |
| M5 | 配图模块 | 2h |
| M6 | 微信发布 API 集成 | 3h |
| M7 | SKILL.md + 集成测试 | 2h |
