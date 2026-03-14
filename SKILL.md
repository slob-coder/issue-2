---
name: wechat-writer
description: >
  微信公众号文章写手。搜索行业热点 → 推荐选题（默认20条，可配置）→
  撰写 HTML 格式文章 → 多轮修改 → 自动发布到公众号。
  支持自定义行业方向、热点源、写作风格、主题色。
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

# ✍️ wechat-writer — 微信公众号文章写手

## 功能

根据行业热点自动生成公众号文章的完整工作流：

1. **热点抓取** — 从可配置的 RSS/API 源抓取行业热点
2. **选题推荐** — 基于热点推荐选题（默认20条，每条附来源信息）
3. **文章撰写** — 按选定风格生成 HTML 格式文章
4. **多轮修改** — 支持增量修改，实时预览
5. **自动发布** — 调用微信公众号 API 发布

## 使用方式

### 扫描热点 & 推荐选题

```
/wechat-writer scan
```

Agent 会：
- 抓取所有已启用的热点源
- 分析热点与行业的相关性
- 推荐指定数量的选题（默认20条）
- 每条选题展示信息来源（来源名称、原文标题、URL、发布时间）

### 撰写文章

选择选题编号后，agent 会：
- 根据选题和你的写作思路生成文章
- 输出为 HTML 格式，保存预览文件
- 支持多轮修改直到满意

快捷模式（跳过热点扫描）：
```
/wechat-writer write 帮我写一篇关于 RAG 技术的教程
```

### 发布文章

确认文章后：
```
/wechat-writer publish
```

Agent 会上传图片、创建草稿、发布到公众号。

### 配置

```
/wechat-writer config
```

可配置项：
- **行业方向**：如 "人工智能"、"金融科技"
- **选题数量**：每次推荐的选题数（默认20）
- **热点源**：RSS/API 源列表
- **写作风格**：professional / storytelling / opinion / tutorial / casual
- **文章主题**：default / dark / elegant / tech
- **微信账号**：AppID、AppSecret
- **配图服务**：Unsplash / Pexels API Key

## 配置文件

配置文件位于 `config.yaml`（skill 目录）或 `~/.openclaw/skills/wechat-writer/config.yaml`。

参考 `assets/default-config.yaml` 获取完整配置模板。

## 写作风格

| 风格 | 描述 | 适用场景 |
|------|------|---------|
| professional | 专业严谨，数据驱动 | 技术分析、行业报告 |
| storytelling | 叙事型，案例驱动 | 产品介绍、创业故事 |
| opinion | 观点鲜明，犀利评论 | 热点评论、趋势分析 |
| tutorial | 教程式，步骤清晰 | 技术教程、操作指南 |
| casual | 轻松幽默，口语化 | 科普、生活化技术文 |

## 主题

支持 4 种文章视觉主题：

- **default** — 清新蓝色，经典公众号风格
- **dark** — 深色背景，适合技术内容
- **elegant** — 暖棕色调，文艺气质
- **tech** — 科技感深色，代码友好

## 技术架构

```
src/
├── scanner/    — 热点抓取（RSS/API）
├── advisor/    — 选题推荐
├── writer/     — 文章撰写
├── renderer/   — HTML 渲染引擎
├── images/     — 配图搜索（Unsplash/Pexels）
├── publisher/  — 微信发布
├── config/     — 配置管理
└── utils/      — 工具函数
```

## Token 优化

- 热点摘要按来源分组，每源最多5条
- 选题 >10 条时分批生成
- 文章修改仅传 diff section
- HTML 渲染完全本地执行，零 Token 消耗

## 依赖

- Node.js >= 18.0.0
- rss-parser — RSS/Atom 解析
- js-yaml — YAML 配置解析

## 许可

MIT
