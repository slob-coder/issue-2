/**
 * Writing style definitions.
 */

export interface WritingStyle {
  name: string;
  label: string;
  description: string;
  promptGuidance: string;
}

export const WRITING_STYLES: Record<string, WritingStyle> = {
  professional: {
    name: 'professional',
    label: '专业严谨',
    description: '数据驱动，逻辑清晰，适合技术分析和行业报告',
    promptGuidance: `写作风格要求：专业严谨
- 使用数据和事实支撑观点
- 逻辑结构清晰，层次分明
- 避免过多口语化表达
- 适当引用权威来源
- 结论明确，有洞察力`,
  },
  storytelling: {
    name: 'storytelling',
    label: '叙事型',
    description: '案例驱动，通过故事引出观点，适合产品介绍和创业故事',
    promptGuidance: `写作风格要求：叙事型
- 以真实案例或场景开篇，吸引读者
- 通过故事线串联核心观点
- 人物和细节描写生动
- 情感共鸣与理性分析并重
- 结尾有升华或启发`,
  },
  opinion: {
    name: 'opinion',
    label: '观点评论',
    description: '观点鲜明，犀利评论，适合热点评论和趋势分析',
    promptGuidance: `写作风格要求：观点评论
- 观点鲜明，立场清晰
- 论据充分，反驳有力
- 允许犀利表达但不偏激
- 多角度分析，展示思考深度
- 结尾给出明确判断或预测`,
  },
  tutorial: {
    name: 'tutorial',
    label: '教程指南',
    description: '步骤清晰，操作性强，适合技术教程和操作指南',
    promptGuidance: `写作风格要求：教程指南
- 目标明确，开篇说明读者能学到什么
- 步骤编号清晰，循序渐进
- 包含代码示例或操作截图说明
- 注意事项和常见问题单独标注
- 提供进一步学习的资源`,
  },
  casual: {
    name: 'casual',
    label: '轻松幽默',
    description: '口语化表达，轻松有趣，适合科普和生活化技术文',
    promptGuidance: `写作风格要求：轻松幽默
- 口语化表达，像朋友聊天一样
- 适当使用比喻和类比让概念通俗易懂
- 可以有幽默元素但不刻意
- 避免过多专业术语，必要时加解释
- 读起来轻松愉快，不费力`,
  },
};

/**
 * Get writing style by name, falling back to professional.
 */
export function getWritingStyle(name: string): WritingStyle {
  return WRITING_STYLES[name] ?? WRITING_STYLES['professional'];
}
