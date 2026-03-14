#!/bin/bash
# wechat-writer setup script
# Run this to initialize configuration for the skill

set -e

SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CONFIG_DIR="${HOME}/.openclaw/skills/wechat-writer"
CONFIG_FILE="${CONFIG_DIR}/config.yaml"

echo "✍️  wechat-writer 配置向导"
echo "========================="
echo ""

# Create config directory
mkdir -p "${CONFIG_DIR}"

if [ -f "${CONFIG_FILE}" ]; then
  echo "⚠️  配置文件已存在: ${CONFIG_FILE}"
  read -p "是否覆盖？(y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "保留现有配置。"
    exit 0
  fi
fi

# Copy default config
cp "${SKILL_DIR}/assets/default-config.yaml" "${CONFIG_FILE}"
chmod 600 "${CONFIG_FILE}"

echo "✅ 配置文件已创建: ${CONFIG_FILE}"
echo ""
echo "请编辑配置文件，填入以下信息："
echo "  - 行业方向 (industry)"
echo "  - 微信公众号 AppID 和 AppSecret (wechat.appid, wechat.secret)"
echo "  - 图片 API Key (images.api_key) — 可选"
echo ""
echo "编辑命令: nano ${CONFIG_FILE}"
