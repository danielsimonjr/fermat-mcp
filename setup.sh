#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

if ! command -v bun >/dev/null 2>&1; then
  echo "Installing Bun..."
  curl -fsSL https://bun.sh/install | bash
  export BUN_INSTALL="${HOME}/.bun"
  export PATH="${BUN_INSTALL}/bin:${PATH}"
fi

echo "Installing dependencies..."
bun install --frozen-lockfile 2>/dev/null || bun install

echo "Starting MCP server..."
exec bun run src/index.ts
