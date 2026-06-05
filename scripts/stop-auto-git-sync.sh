#!/usr/bin/env bash
set -euo pipefail

repo_root="${AUTO_GIT_SYNC_REPO:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
label="${AUTO_GIT_SYNC_LABEL:-com.codex.demo2.auto-git-sync}"
plist_file="$HOME/Library/LaunchAgents/${label}.plist"
pid_file="$repo_root/.auto-git-sync/auto-git-sync.pid"
uid="$(id -u)"

if [ -f "$plist_file" ]; then
    launchctl bootout "gui/${uid}" "$plist_file" >/dev/null 2>&1 || true
    echo "stopped launch agent ${label}"
fi

if [ -f "$pid_file" ]; then
    pid="$(cat "$pid_file")"
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
        kill "$pid"
        echo "stopped background process ${pid}"
    fi
    rm -f "$pid_file"
fi
