#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
git submodule update --init --recursive
bun run --cwd leek setup
bun install --cwd mikuOS-thistle --frozen-lockfile --ignore-scripts
