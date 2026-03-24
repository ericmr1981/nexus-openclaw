#!/usr/bin/env bash

set -euo pipefail

# Ensure common system binaries are available (macOS lsof often lives in /usr/sbin)
export PATH="/usr/sbin:/usr/bin:/bin:/opt/homebrew/bin:$PATH"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Keep state/logs colocated with Nexus (fallback if $HOME/.nexus is not writable)
DEFAULT_STATE_DIR="${NEXUS_STATE_DIR:-$HOME/.nexus}"
STATE_DIR="$DEFAULT_STATE_DIR"
if ! mkdir -p "$STATE_DIR" >/dev/null 2>&1; then
  STATE_DIR="$REPO_ROOT/.nexus-runtime"
fi

RUN_DIR="$STATE_DIR/run"
LOG_DIR="$STATE_DIR/logs"
mkdir -p "$RUN_DIR" "$LOG_DIR"

NEXUSCTL="$REPO_ROOT/scripts/nexusctl.sh"

BITOFFICE_DIR="$REPO_ROOT/bit-office"
BITOFFICE_PID_FILE="$RUN_DIR/bitoffice.pid"
BITOFFICE_LOG="$LOG_DIR/bitoffice.log"

OA_PROJECT_DIR="$REPO_ROOT/oa-project"
OA_CONFIG="$OA_PROJECT_DIR/config.yaml"
OA_PID_FILE="$RUN_DIR/oa.pid"
OA_LOG="$LOG_DIR/oa.log"

need_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing command: $1" >&2
    exit 1
  fi
}

is_pid_running() {
  local pid="$1"
  [[ -n "${pid:-}" ]] && kill -0 "$pid" >/dev/null 2>&1
}

pid_cmd() {
  local pid="$1"
  ps -p "$pid" -o command= 2>/dev/null || true
}

port_listening() {
  local port="$1"
  lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1
}

wait_for_port() {
  local port="$1"
  local tries="${2:-40}"
  while (( tries > 0 )); do
    if port_listening "$port"; then
      return 0
    fi
    sleep 0.25
    tries=$((tries - 1))
  done
  return 1
}

stop_from_pid_file_guarded() {
  local file="$1"
  local label="$2"
  local must_contain="$3" # substring that must appear in ps command line

  if [[ ! -f "$file" ]]; then
    return 0
  fi

  local pid
  pid="$(cat "$file" 2>/dev/null || true)"
  if [[ -z "$pid" ]]; then
    rm -f "$file"
    return 0
  fi

  if ! is_pid_running "$pid"; then
    rm -f "$file"
    return 0
  fi

  local cmd
  cmd="$(pid_cmd "$pid")"
  if [[ -n "$must_contain" ]] && [[ "$cmd" != *"$must_contain"* ]]; then
    echo "[stack] Refusing to stop $label (pid=$pid) — command mismatch"
    echo "[stack]   expected contains: $must_contain"
    echo "[stack]   actual: $cmd"
    return 1
  fi

  kill "$pid" >/dev/null 2>&1 || true
  sleep 0.3
  if is_pid_running "$pid"; then
    kill -9 "$pid" >/dev/null 2>&1 || true
  fi

  rm -f "$file"
  echo "[stack] Stopped $label (pid=$pid)"
}

start_nexus() {
  need_cmd bash
  if [[ ! -x "$NEXUSCTL" ]]; then
    echo "[stack] Missing nexusctl: $NEXUSCTL" >&2
    exit 1
  fi

  if port_listening 7878; then
    echo "[stack] Nexus already listening on :7878"
    return 0
  fi

  echo "[stack] Starting Nexus (prod) ..."
  bash "$NEXUSCTL" start
}

start_bitoffice() {
  if [[ ! -d "$BITOFFICE_DIR" ]]; then
    echo "[stack] bit-office not found: $BITOFFICE_DIR (skip)"
    return 0
  fi

  need_cmd pnpm

  if port_listening 3000 || port_listening 9099; then
    echo "[stack] bit-office already listening (3000/9099)"
    return 0
  fi

  echo "[stack] Starting bit-office (dev) ..."
  (
    cd "$BITOFFICE_DIR"
    nohup pnpm dev >"$BITOFFICE_LOG" 2>&1 &
    echo $! >"$BITOFFICE_PID_FILE"
  )

  if ! wait_for_port 3000 60; then
    echo "[stack] bit-office web did not come up on 127.0.0.1:3000 (see $BITOFFICE_LOG)" >&2
    return 1
  fi

  if ! wait_for_port 9099 60; then
    echo "[stack] bit-office gateway did not come up on 127.0.0.1:9099 (see $BITOFFICE_LOG)" >&2
    return 1
  fi

  echo "[stack] bit-office started"
}

start_oa() {
  if [[ ! -d "$OA_PROJECT_DIR" ]]; then
    echo "[stack] oa-project not found: $OA_PROJECT_DIR (skip)"
    return 0
  fi

  if port_listening 3460; then
    echo "[stack] OA Dashboard already listening on 127.0.0.1:3460"
    return 0
  fi

  local oa_bin
  oa_bin="$REPO_ROOT/tools/oa-cli-src/CLIs/oa-cli/.venv/bin/oa"
  if [[ ! -x "$oa_bin" ]]; then
    oa_bin="$(command -v oa || true)"
  fi
  if [[ -z "$oa_bin" ]]; then
    echo "[stack] Missing oa executable (expected venv or PATH)" >&2
    return 1
  fi

  if [[ ! -f "$OA_CONFIG" ]]; then
    echo "[stack] Missing OA config: $OA_CONFIG" >&2
    return 1
  fi

  echo "[stack] Starting OA Dashboard (3460, loopback) ..."
  nohup "$oa_bin" serve --config "$OA_CONFIG" --port 3460 --no-open >"$OA_LOG" 2>&1 &
  echo $! >"$OA_PID_FILE"

  if ! wait_for_port 3460 60; then
    echo "[stack] OA did not come up on 127.0.0.1:3460 (see $OA_LOG)" >&2
    return 1
  fi

  echo "[stack] OA started"
}

start_all() {
  start_nexus
  start_oa
  start_bitoffice

  echo ""
  echo "[stack] ✅ Ready"
  echo "[stack] Main entry: http://localhost:7878"
  echo "[stack] (internal) OA:         http://127.0.0.1:3460"
  echo "[stack] (internal) bit-office: http://127.0.0.1:3000"
}

stop_all() {
  need_cmd bash

  # Stop helpers first (they are not required for a clean Nexus stop)
  stop_from_pid_file_guarded "$OA_PID_FILE" "OA" "oa serve" || true
  stop_from_pid_file_guarded "$BITOFFICE_PID_FILE" "bit-office" "pnpm" || true

  echo "[stack] Stopping Nexus ..."
  bash "$NEXUSCTL" stop || true
}

status() {
  echo "Nexus :7878  => $(port_listening 7878 && echo LISTEN || echo -)"
  echo "OA    :3460  => $(port_listening 3460 && echo LISTEN || echo -) (loopback)"
  echo "Web   :3000  => $(port_listening 3000 && echo LISTEN || echo -) (loopback)"
  echo "GW    :9099  => $(port_listening 9099 && echo LISTEN || echo -) (loopback)"
  echo ""
  echo "Logs:"
  echo "- Nexus:      $STATE_DIR/logs/prod.log (or backend/frontend when dev)"
  echo "- OA:         $OA_LOG"
  echo "- bit-office: $BITOFFICE_LOG"
}

logs() {
  local target="${1:-all}"
  case "$target" in
    nexus) tail -n 200 -f "$STATE_DIR/logs/prod.log" ;;
    oa) tail -n 200 -f "$OA_LOG" ;;
    bitoffice) tail -n 200 -f "$BITOFFICE_LOG" ;;
    all)
      echo "[stack] Logs (paths):"
      echo "- nexus:      $STATE_DIR/logs/prod.log"
      echo "- oa:         $OA_LOG"
      echo "- bitoffice:  $BITOFFICE_LOG"
      ;;
    *)
      echo "Unknown log target: $target" >&2
      exit 1
      ;;
  esac
}

run_forever() {
  # Start everything, then keep the supervisor process alive so Local Portal can manage it.
  # On SIGTERM/SIGINT, stop the whole stack and exit.
  trap 'echo "[stack] Caught signal, stopping..."; stop_all; exit 0' INT TERM

  start_all

  echo "[stack] Supervisor running (Ctrl+C to stop)"
  while true; do
    sleep 3600 &
    wait $! || true
  done
}

usage() {
  cat <<'EOF'
Usage: bash scripts/nexus-stack.sh <command>

Commands:
  start            Start Nexus (7878) + OA (3460 loopback) + bit-office (3000/9099 loopback)
  run              Start + stay in foreground (supervisor) — good for Local Portal
  stop             Stop all components started by this script + stop Nexus
  restart          Restart all
  status           Show port status + log locations
  logs [target]    Show log paths or tail logs (nexus|oa|bitoffice|all)
EOF
}

cmd="${1:-}"
case "$cmd" in
  start) start_all ;;
  run) run_forever ;;
  stop) stop_all ;;
  restart) stop_all; start_all ;;
  status) status ;;
  logs) logs "${2:-all}" ;;
  ""|-h|--help|help) usage ;;
  *)
    echo "Unknown command: $cmd" >&2
    usage
    exit 1
    ;;
esac
