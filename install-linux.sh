#!/usr/bin/env bash
# ClearMatch — one-shot Linux installer.
#
#   bash -c "$(curl -fsSL https://raw.githubusercontent.com/YOUR-ORG/clearmatch/main/install-linux.sh)"
#
# Installs git + Node.js 22+ if missing (apt, dnf, and yum are supported),
# clones the repo (skipped if you're already running this from a local
# checkout — see TARGET_DIR detection below), runs `npm ci` in scaffold/,
# and (optionally) installs Ollama for a fully local run via its official
# install script. Safe to re-run: skips anything already present/done.
#
# After this finishes, `cd clearmatch/scaffold` and run `npm run setup`
# (cloud API keys) or `npm run setup:local -- --yes` (fully local via
# Ollama), then `npm run dev`.
set -euo pipefail

# TODO: set this once the repo has a real GitHub remote.
REPO_URL="${CLEARMATCH_REPO_URL:-https://github.com/TODO-SET-ME/clearmatch.git}"
TARGET_DIR="${CLEARMATCH_INSTALL_DIR:-clearmatch}"
NODE_MAJOR_MIN=22

log()  { printf '\n\033[1m%s\033[0m\n' "$1"; }
ok()   { printf '  \033[32m\xe2\x9c\x93\033[0m %s\n' "$1"; }
warn() { printf '  \033[33m!\033[0m %s\n' "$1"; }
die()  { printf '  \033[31mx\033[0m %s\n' "$1" >&2; exit 1; }

log "ClearMatch — Linux install"

[ "$(uname -s)" = "Linux" ] || die "This installer is for Linux. On macOS use install-macos.sh; on Windows use install-windows.ps1."

# Figure out which package manager we've got. Checked in this order because a
# system can have more than one binary present (e.g. yum as a dnf shim) —
# preferring the more modern one where both exist.
PKG_MGR=""
for mgr in apt-get dnf yum; do
  if command -v "$mgr" >/dev/null 2>&1; then
    PKG_MGR="$mgr"
    break
  fi
done
if [ -z "$PKG_MGR" ]; then
  die "No supported package manager found (apt-get, dnf, or yum). Install git and Node.js ${NODE_MAJOR_MIN}+ by hand, then re-run this script from inside the cloned repo."
fi
ok "package manager: $PKG_MGR"

SUDO=""
if [ "$(id -u)" -ne 0 ]; then
  command -v sudo >/dev/null 2>&1 || die "Not running as root and 'sudo' isn't available — install git/Node/Ollama manually, then re-run from inside the cloned repo."
  SUDO="sudo"
  if ! "$SUDO" -n true 2>/dev/null && [ ! -t 0 ]; then
    die "Installing packages needs sudo, which can't prompt through a non-interactive/piped invocation. Run 'sudo -v' first, or run this script directly (not piped) so sudo has a terminal to prompt through."
  fi
fi

pkg_install() {
  case "$PKG_MGR" in
    apt-get) $SUDO apt-get update -y >/dev/null && $SUDO apt-get install -y "$@" ;;
    dnf)     $SUDO dnf install -y "$@" ;;
    yum)     $SUDO yum install -y "$@" ;;
  esac
}

# 1) git.
if command -v git >/dev/null 2>&1; then
  ok "git already installed ($(git --version))"
else
  log "Installing git..."
  pkg_install git
  ok "git installed ($(git --version))"
fi

# 2) Node.js 22+. NodeSource's setup script configures the right repo for
#    whichever package manager we detected, then a normal install pulls Node
#    from it — this is what lets the same NODE_MAJOR_MIN apply across
#    Debian/Ubuntu (apt) and Amazon Linux/Fedora/RHEL (dnf/yum) alike.
NODE_OK=0
if command -v node >/dev/null 2>&1; then
  NODE_MAJOR=$(node -v | sed 's/^v//' | cut -d. -f1)
  case "$NODE_MAJOR" in
    ''|*[!0-9]*)
      warn "couldn't parse a version from 'node -v' ($(node -v)) — installing ${NODE_MAJOR_MIN} to be safe"
      ;;
    *)
      if [ "$NODE_MAJOR" -ge "$NODE_MAJOR_MIN" ]; then
        ok "node already installed ($(node -v))"
        NODE_OK=1
      else
        warn "node $(node -v) is older than ${NODE_MAJOR_MIN} — installing a newer one"
      fi
      ;;
  esac
fi
if [ "$NODE_OK" -ne 1 ]; then
  log "Installing Node.js ${NODE_MAJOR_MIN}+..."
  case "$PKG_MGR" in
    apt-get)
      curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR_MIN}.x" | $SUDO -E bash -
      ;;
    dnf|yum)
      curl -fsSL "https://rpm.nodesource.com/setup_${NODE_MAJOR_MIN}.x" | $SUDO -E bash -
      ;;
  esac
  pkg_install nodejs
  command -v node >/dev/null 2>&1 || die "Node still isn't on PATH after installing. Open a new shell and re-run this script."
  ok "node installed ($(node -v))"
fi

# 3) Clone, unless we're already running this from inside a checkout.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR/scaffold/package.json" ]; then
  TARGET_DIR="$SCRIPT_DIR"
  ok "running from an existing checkout ($TARGET_DIR) — skipping clone"
elif [ -f "$TARGET_DIR/scaffold/package.json" ]; then
  ok "$TARGET_DIR already cloned"
else
  if [[ "$REPO_URL" == *"TODO-SET-ME"* ]]; then
    die "CLEARMATCH_REPO_URL isn't set and no local checkout was found next to this script. Set CLEARMATCH_REPO_URL=<your fork's git URL>, or run this script from inside an already-cloned copy of the repo."
  fi
  log "Cloning $REPO_URL into ./$TARGET_DIR ..."
  git clone "$REPO_URL" "$TARGET_DIR"
  ok "cloned"
fi

# 4) npm ci -- never rewrites package-lock.json (unlike npm install).
cd "$TARGET_DIR/scaffold"
log "Installing npm dependencies..."
npm ci
ok "dependencies installed"

# 5) Ollama (only needed for the fully-local path, so never fatal). The
#    official installer handles distro detection itself — no need to
#    special-case apt/dnf/yum here the way Node needed.
log "Ollama (for the fully local, no-API-key path)"
if command -v ollama >/dev/null 2>&1; then
  ok "ollama already installed ($(ollama --version 2>&1 | tail -1))"
else
  log "Installing Ollama..."
  if curl -fsSL https://ollama.com/install.sh | sh; then
    ok "ollama installed ($(ollama --version 2>&1 | tail -1 || echo "installed"))"
  else
    warn "Ollama install failed — get it from https://ollama.com/download if you want the fully local path"
  fi
fi

log "Done. Next steps:"
echo "  cd $TARGET_DIR/scaffold"
echo "  npm run setup                  # cloud API keys (Anthropic and/or OpenAI), or"
echo "  npm run setup:local -- --yes   # fully local via Ollama, no API keys"
echo "  npm run dev                    # -> http://localhost:3000"
echo
echo "  Going local? Start the daemon if it isn't already running:"
echo "    ollama serve    # or: systemctl start ollama"
