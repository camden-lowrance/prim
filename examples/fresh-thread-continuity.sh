#!/usr/bin/env sh
set -eu

cd "$(dirname "$0")/.."
node --import tsx examples/fresh-thread-continuity.ts
