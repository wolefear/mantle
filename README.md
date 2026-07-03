# Mantle Seeker

**Research Before Distribution.** The AI research agent for tokenized asset distribution on Mantle.

Mantle Seeker is not a chatbot and not a dashboard. It is a research agent that **investigates first, gathers evidence, measures confidence, and only then recommends** a distribution strategy for a tokenized asset — delivered as a **Distribution Intelligence Dossier**.

## Why

Issuing tokenized assets is largely solved. The hard part is **distribution**: moving capital from where it sits to where the asset lives, without friction or borders. Mantle Seeker turns that open problem into structured, evidence-backed research grounded in the Mantle ecosystem.

## Core flow

Home → Start Research (brief) → Live Investigation (Mantle Skills gather evidence) → Confidence scored → Distribution Intelligence Dossier → Export PDF / Share / **Replay Research**.

## Backend orchestration layer

The backend is the **brain** of the app. It behaves like a professional research analyst, never a chatbot: it validates input, opens a research session, decides which Mantle Skills to run, gathers evidence, reasons over it, scores confidence, and returns a **structured JSON dossier** — never free-form AI text.

```
User → Frontend → Netlify Function → Research Orchestrator
     → Mantle Skills → Evidence Engine → Reasoning Engine
     → Confidence Engine → Distribution Intelligence Dossier → Frontend
```

### Endpoints

- `POST /api/research` — runs the full investigation and returns the complete dossier in one buffered JSON response.
- `POST /api/research/stream` — Server-Sent Events; streams each stage (`session`, `plan`, `skill`, `event`, `done`) as it completes so the UI can show the investigation happening live (target: full run under 10s).

**Request body**

```json
{ "assetName":"", "assetType":"", "assetValue":"", "targetInvestors":"",
  "targetRegion":"", "launchStage":"", "distributionGoal":"", "notes":"" }
```

Every field is sanitized and validated; invalid requests are rejected with meaningful errors (`422`), bad JSON with `400`, wrong method with `405`, and excess traffic is rate-limited (`429`).

**Response shape**

```json
{ "ok": true, "mode": "deterministic|assisted", "researchId": "MS-2026-0001",
  "session": {}, "activityLog": [], "skillRuns": [], "dossier": {} }
```

### Engines (`netlify/functions/lib/`)

- **orchestrator.js** — the brain. `selectSkills()` chooses only the skills a given brief needs (never unnecessary calls), executes them in sequence, and assembles the dossier. `investigate()` is an async generator that yields progress events for streaming.
- **skills.js** — Mantle Skill adapters (`mantle-network-primer`, `mantle-data-indexer`, `mantle-defi-operator`, `mantle-risk-evaluator`). Each returns Skill / Status / Findings / Confidence / Timestamp. On failure it **retries once**, then continues with the remaining skills and marks the session **Partial Research** — it never crashes.
- **engines.js** —
  - *Evidence Engine* — collects every finding into an evidence database (`E-001…`, source skill, importance, confidence %, timestamp).
  - *Reasoning Engine* — not a free LLM: it compares evidence, finds patterns, detects conflicts (e.g. reach vs. liquidity), sets priorities, and traces every recommendation back to specific evidence IDs.
  - *Gap Detector* — lists missing inputs (liquidity target, investor profile, jurisdiction…) that lower confidence.
  - *Confidence Engine* — a transparent, factor-based score (completeness, #skills, evidence consistency, gaps, conflicts) with an explanation and strength level. Never random.
- **util.js** — sanitize / validate / normalize inputs, research-ID + timestamp helpers, shared scoring.

### Session logging & activity log

Every run tracks Research ID, start/end time, skills used, evidence count, duration, and status, and emits a timeline (Research Started → Skills Selected → Evidence Collected → Risk Analysis → Confidence Calculated → Dossier Generated) rendered as the **Agent Activity Log** in the report.

### Research Replay Mode

After the dossier is generated, **Replay Research** re-runs the investigation step by step — objective identified → skills selected → evidence gathered → reasoning applied → risks assessed → confidence calculated → final recommendations — so judges can *watch* the orchestration rather than just read a static report.

## Mantle Skills

- **mantle-data-indexer** — comparable assets, ecosystem analytics, wallet activity, time-windowed research
- **mantle-defi-operator** — liquidity research, distribution venues, protocol comparison, execution planning
- **mantle-risk-evaluator** — distribution/protocol risk with Pass / Warn / Block validation
- **mantle-network-primer** — gas, chain IDs, infrastructure assumptions (Mantle chainId 5000)

## Trust principles

Every conclusion carries **evidence + reasoning + confidence**. The UI clearly labels what comes from **Mantle Skills (evidence)** vs **AI reasoning (recommendations)**. It never fabricates statistics or citations; it states uncertainty instead.

## Tech

- Semantic HTML, modern CSS, vanilla JS (no heavy libraries)
- Animated canvas circuit + particle background
- Transparent, input-derived scoring model (shared between `assets/agent.js` and the backend engines)
- Netlify Functions for the secure server-side orchestration path (buffered + streaming)
- Frontend calls the backend first and falls back to the in-browser engine on static hosting, so the demo always works


## Structure

```
mantle-seeker/
  index.html        # Home
  research.html     # Research intake form
  live.html         # Live investigation timeline + evidence log
  report.html       # Distribution Intelligence Dossier (19 sections, gauges, export/PDF)
  about.html        # Project story, tech, challenge
  assets/styles.css # Design system
  assets/dossier.css# Dossier, gauges, charts, Skills Console & print/PDF styles
  assets/agent.js   # In-browser research engine (fallback + replay data)
  assets/app.js     # Chrome, background, live run, dossier render, replay UI
  netlify/functions/
    research.js         # POST /api/research (buffered orchestration)
    research-stream.js  # POST /api/research/stream (SSE progress)
    lib/orchestrator.js # the brain: skill selection + dossier assembly
    lib/skills.js       # Mantle Skill adapters (retry + graceful degrade)
    lib/engines.js      # evidence, reasoning, gap detector, confidence
    lib/util.js         # validation, sanitization, ids, scoring
  skills/           # Official Mantle Agent Stack skill definitions
    mantle-network-primer/   # SKILL.md + agents/openai.yaml + references + assets
    mantle-data-indexer/
    mantle-defi-operator/
    mantle-risk-evaluator/
  netlify.toml
```


## The Distribution Intelligence Dossier

`report.html` renders the final research output as an institutional intelligence file — not a chat transcript. It is fully vanilla HTML/CSS/JS (no chart libraries) and reads identically from the live backend dossier or the offline engine.

Sections: page header + session strip, hero **Distribution Readiness** gauge (animated SVG, green glow), Executive Summary, Asset Profile (iconized), Research Objective (question + scope + constraints), Research Flow diagram, Evidence Dashboard (ID / source skill / finding / importance / confidence / timestamp, revealed on scroll), Agent Activity Log timeline, Distribution Readiness Analysis (animated breakdown bars with status + explanation), Liquidity Assessment (strengths / weaknesses / improvements / priority), Distribution Opportunities, Distribution Bottlenecks, Risk Analysis (5 dimensions + assessment confidence), Cross-chain Strategy roadmap, AI Reasoning chain (Evidence → Reasoning → Conclusion → Recommendation), Research Gaps, Recommended Action Plan (numbered), Confidence Analysis (gauge + factors), **Skills Console**, **Research Verdict** banner (Ready / Needs More Research / Not Ready with summary, reasoning, next step), and a first-person **“What Seeker Would Do”** closing.

**Charts (all hand-built, animated):** circular readiness & confidence gauges, horizontal progress bars, activity timeline, distribution roadmap, and count-up number animations.

**Export options:** Export PDF / Print (institutional print stylesheet with a cover page, dark-preserving colors, per-card page-break control and a confidential running footer), Download JSON (the full dossier object), Share link, and Copy summary. Micro-interactions: cards lift on hover, numbers count up, bars fill, sections fade in, buttons glow. Accessible: semantic HTML, keyboard-operable Skills Console, ARIA labels, high-contrast palette, responsive down to mobile.

**Out of scope (future extensions):** cross-chain multi-bridge pathfinding beyond LI.FI, live wallet signing/execution, x402 pay-per-query data, ERC-8004 agent identity, and a conversational Mantle AI Agent Skills layer.
