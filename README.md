# ClearMatch

ClearMatch ranks a batch of resumes against a job's requirements for a recruiter, instead of the usual "optimize my own resume" tools — per-requirement evidence-backed scoring, user-adjustable requirement weights, a reference-hire corpus, manual override scoring, and buzzword-vs-genuine-accomplishment detection.

Free, open-source, and self-hosted only — no hosted SaaS, no billing, no login. Clone it, run it on your own machine (`npm run dev`, bound to localhost), and bring your own cloud LLM API key or run fully local via Ollama (`LLM_PROVIDER=anthropic|openai|ollama`). Data lives in a local SQLite file (`DATABASE_PATH`, default `scaffold/data/clearmatch.db`) and a local `scaffold/data/resumes/` directory — nothing leaves your machine unless you choose a cloud LLM provider.

Install scripts and the guided `setup`/`setup:local` wizards (mirroring github.com/KurtLehnardt/granted's OS-detection/hardware-detection install pattern, including auto-picking an Ollama model sized to your RAM/VRAM) are not built yet — that's the next phase. For now: `cd scaffold`, `cp .env.example .env.local` and fill in an LLM provider, `npm install`, `npm run dev`.
