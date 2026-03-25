#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# Quick E2E smoke test for the Sessions UX changes.
# Uses Playwright config (will reuse an existing server on :7878 when not in CI).

npx playwright test tests/e2e/sessions-ux.spec.ts
