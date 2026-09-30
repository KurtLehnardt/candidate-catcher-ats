# ClearMatch

ClearMatch ranks a batch of resumes against a job's requirements for a recruiter, instead of the usual "optimize my own resume" tools — per-requirement evidence-backed scoring, user-adjustable requirement weights, a reference-hire corpus, manual override scoring, and buzzword-vs-genuine-accomplishment detection.

One Next.js codebase (`scaffold/`) runs as two editions. The `DEPLOYMENT_MODE` env var (`hosted` | `self-hosted`) toggles whether multi-tenant Supabase auth and Stripe per-job-credit billing are enforced: the hosted edition is a paid multi-tenant SaaS using a cloud LLM provider, the self-hosted edition is a single-user local install where you bring your own cloud API key or run fully local via Ollama (`LLM_PROVIDER=anthropic|openai|ollama`).

Install scripts and the guided `setup`/`setup:local` wizards (mirroring github.com/KurtLehnardt/granted's OS-detection/hardware-detection install pattern) are not built yet — this is foundation only: app scaffold, database schema, and the LLM provider abstraction.
