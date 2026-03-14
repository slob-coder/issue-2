#!/bin/bash
# Quick scan: fetch hotspots and generate topic prompt
set -e
SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "${SKILL_DIR}"
node dist/index.js scan "$@"
