#!/usr/bin/env bash
set -euo pipefail

repo_root="${AUTO_GIT_SYNC_REPO:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
label="${AUTO_GIT_SYNC_LABEL:-com.codex.demo2.auto-git-sync}"
launch_agents_dir="$HOME/Library/LaunchAgents"
plist_file="$launch_agents_dir/${label}.plist"
state_dir="$repo_root/.auto-git-sync"
uid="$(id -u)"

mkdir -p "$launch_agents_dir" "$state_dir"

launchctl bootout "gui/${uid}" "$plist_file" >/dev/null 2>&1 || true

cat > "$plist_file" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${label}</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>${repo_root}/scripts/auto-git-sync.sh</string>
  </array>
  <key>WorkingDirectory</key>
  <string>${repo_root}</string>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>${state_dir}/auto-git-sync.log</string>
  <key>StandardErrorPath</key>
  <string>${state_dir}/auto-git-sync.err.log</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>AUTO_GIT_SYNC_REPO</key>
    <string>${repo_root}</string>
  </dict>
</dict>
</plist>
EOF

launchctl bootstrap "gui/${uid}" "$plist_file"
launchctl kickstart -k "gui/${uid}/${label}" >/dev/null 2>&1 || true

echo "installed and started ${label}"
echo "plist: ${plist_file}"
echo "log: ${state_dir}/auto-git-sync.log"
