#!/usr/bin/env bash
set -euo pipefail

repo_root="${AUTO_GIT_SYNC_REPO:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
state_dir="$repo_root/.auto-git-sync"
pid_file="$state_dir/auto-git-sync.pid"
log_file="$state_dir/auto-git-sync.log"

mkdir -p "$state_dir"

if [ -f "$pid_file" ]; then
    existing_pid="$(cat "$pid_file")"
    if [ -n "$existing_pid" ] && kill -0 "$existing_pid" 2>/dev/null; then
        echo "auto-git-sync is already running with PID ${existing_pid}"
        exit 0
    fi
fi

nohup "$repo_root/scripts/auto-git-sync.sh" >> "$log_file" 2>&1 &
pid="$!"
printf '%s\n' "$pid" > "$pid_file"

echo "auto-git-sync started with PID ${pid}"
echo "log: ${log_file}"
