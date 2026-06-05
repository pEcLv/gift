#!/usr/bin/env bash
set -u

repo_root="${AUTO_GIT_SYNC_REPO:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
remote="${AUTO_GIT_SYNC_REMOTE:-origin}"
poll_seconds="${AUTO_GIT_SYNC_POLL_SECONDS:-2}"
debounce_seconds="${AUTO_GIT_SYNC_DEBOUNCE_SECONDS:-8}"

cd "$repo_root" || exit 1

state_dir="$repo_root/.auto-git-sync"
lock_dir="$state_dir/lock"
mkdir -p "$state_dir"

log() {
    printf '%s %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"
}

dirty_snapshot() {
    git status --porcelain=v1 --untracked-files=all
}

snapshot_hash() {
    if command -v shasum >/dev/null 2>&1; then
        shasum | awk '{print $1}'
    else
        cksum | awk '{print $1}'
    fi
}

git_path_exists() {
    path="$(git rev-parse --git-path "$1" 2>/dev/null || true)"
    [ -n "$path" ] && [ -e "$path" ]
}

repo_is_busy() {
    git_path_exists MERGE_HEAD && return 0
    git_path_exists REVERT_HEAD && return 0
    git_path_exists CHERRY_PICK_HEAD && return 0
    git_path_exists rebase-merge && return 0
    git_path_exists rebase-apply && return 0
    return 1
}

with_lock() {
    if ! mkdir "$lock_dir" 2>/dev/null; then
        log "another sync is running; skipping this cycle"
        return 1
    fi

    "$@"
    status=$?
    rmdir "$lock_dir" 2>/dev/null || true
    return "$status"
}

commit_and_push() {
    branch="$(git branch --show-current 2>/dev/null || true)"

    if [ -z "$branch" ]; then
        log "detached HEAD; skipping auto commit"
        return 1
    fi

    if repo_is_busy; then
        log "repository has merge/rebase state; skipping auto commit"
        return 1
    fi

    if ! git config "remote.${remote}.url" >/dev/null 2>&1; then
        log "remote '${remote}' not found; skipping auto push"
        return 1
    fi

    git add -A

    if git diff --cached --quiet; then
        log "nothing staged after git add; skipping"
        return 0
    fi

    message="Auto commit: $(date '+%Y-%m-%d %H:%M:%S')"
    if ! AUTO_GIT_SYNC_SKIP_POST_COMMIT_PUSH=1 git commit -m "$message"; then
        log "git commit failed"
        return 1
    fi

    if git rev-parse --abbrev-ref --symbolic-full-name "@{u}" >/dev/null 2>&1; then
        if ! git pull --rebase --autostash; then
            log "git pull --rebase failed; resolve manually before watcher can push"
            return 1
        fi
        if ! git push; then
            log "git push failed"
            return 1
        fi
    else
        if ! git push -u "$remote" "$branch"; then
            log "git push -u ${remote} ${branch} failed"
            return 1
        fi
    fi

    log "committed and pushed '${message}' on ${branch}"
}

log "watching ${repo_root}; debounce=${debounce_seconds}s poll=${poll_seconds}s remote=${remote}"

last_hash=""
last_change_at=0

while true; do
    snapshot="$(dirty_snapshot)"

    if [ -z "$snapshot" ]; then
        last_hash=""
        last_change_at=0
        sleep "$poll_seconds"
        continue
    fi

    hash="$(printf '%s' "$snapshot" | snapshot_hash)"
    now="$(date '+%s')"

    if [ "$hash" != "$last_hash" ]; then
        last_hash="$hash"
        last_change_at="$now"
        sleep "$poll_seconds"
        continue
    fi

    if [ "$last_change_at" -gt 0 ] && [ $((now - last_change_at)) -ge "$debounce_seconds" ]; then
        with_lock commit_and_push
        last_hash=""
        last_change_at=0
    fi

    sleep "$poll_seconds"
done
