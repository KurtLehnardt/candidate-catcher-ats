# Candidate Catcher ATS

Candidate Catcher ATS ranks a batch of resumes against a job's requirements for a recruiter, instead of the usual "optimize my own resume" tools — per-requirement evidence-backed scoring, user-adjustable requirement weights, a reference-hire corpus, manual override scoring, and buzzword-vs-genuine-accomplishment detection.

Free, open-source, and self-hosted only — no hosted SaaS, no billing, no login. Clone it, run it on your own machine (`npm run dev`, bound to localhost), and bring your own cloud LLM API key or run fully local via Ollama. Data lives in a local SQLite file (`DATABASE_PATH`, default `scaffold/data/candidate-catcher-ats.db`) and a local `scaffold/data/resumes/` directory — nothing leaves your machine unless you choose a cloud LLM provider.

## Install

Every OS below ends up running the same `npm` commands inside `scaffold/` — the install script just handles the prerequisites (git, Node 22+, and optionally Ollama) for your platform first.

### macOS

```bash
bash -c "$(curl -fsSL https://raw.githubusercontent.com/YOUR-ORG/candidate-catcher-ats/main/install-macos.sh)"
```

Installs Node 22+ and git if missing — via Homebrew where available, otherwise the Xcode Command Line Tools for git and the official nodejs.org `.pkg` for Node — clones the repo into `./candidate-catcher-ats`, runs `npm ci`, and installs Ollama via Homebrew (or the CLI tarball directly on macOS 13 or older, where Ollama's own app/cask no longer supports the OS). Safe to re-run.

### Linux

```bash
bash -c "$(curl -fsSL https://raw.githubusercontent.com/YOUR-ORG/candidate-catcher-ats/main/install-linux.sh)"
```

Installs git and Node 22+ if missing (supports `apt`, `dnf`, and `yum`), clones the repo, runs `npm ci`, and installs Ollama via its official install script. Safe to re-run.

### Windows

```powershell
irm https://raw.githubusercontent.com/YOUR-ORG/candidate-catcher-ats/main/install-windows.ps1 | iex
```

Installs Node 22+ and git if missing — via `winget` where available, otherwise a direct official-installer download (`winget` isn't present on every Windows box, notably Windows Server) — clones the repo, runs `npm ci`, and installs Ollama via `winget`. Safe to re-run.

### Prefer to do it by hand?

```bash
git clone https://github.com/YOUR-ORG/candidate-catcher-ats.git
cd candidate-catcher-ats/scaffold
npm install
```

> The `YOUR-ORG`/`TODO-SET-ME` placeholders above become a real URL once this repo has a GitHub remote — until then, run an install script from inside an already-cloned local checkout and it detects that and skips the clone step.

## Set up an LLM provider

```bash
cd scaffold
npm run setup           # cloud API key (Anthropic and/or OpenAI), interactive
# or
npm run setup:local     # fully local via Ollama — detects your RAM/VRAM and
                         # picks a model sized for your hardware, no API keys
```

Both are idempotent (safe to re-run, never overwrite a value you've already set) and support `--yes` for non-interactive defaults. Or skip the wizard and edit `scaffold/.env.local` by hand (copy it from `.env.example` first).

```bash
npm run dev       # -> http://localhost:3000, bound to localhost only
npm run dev:lan   # opts in to exposing it to your local network
```
