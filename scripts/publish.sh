#!/bin/bash
# Quick publish: preview an article JSON
set -e
SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "${SKILL_DIR}"

if [ -z "$1" ]; then
  echo "Usage: publish.sh <article.json>"
  echo "Renders article JSON to HTML preview."
  exit 1
fi

node dist/index.js preview "$1"
