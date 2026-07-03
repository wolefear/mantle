# Mantle Skills (Mantle Agent Stack)

Each subdirectory is an official Mantle Skill following the Mantle Agent Stack convention:

```
<skill-name>/
  SKILL.md            # metadata: triggers, workflow, guardrails, inputs, outputs
  agents/openai.yaml  # runtime configuration
  references/          # reference material
  assets/              # static assets / schemas
```

The orchestrator (`netlify/functions/lib/skill-loader.js`) reads these files at runtime, selects the smallest set of skills whose trigger conditions match the research objective, executes them per their documented workflow, and gathers evidence. Nothing about skill selection or execution is hardcoded in the orchestrator — add a new directory here and it becomes available automatically.

Skills:
- **mantle-network-primer** — Verify Mantle-specific network assumptions before any analysis. Chain IDs, gas token, RPC endpoints, settlement and infrastructure only — never analytics.
- **mantle-data-indexer** — Historical Mantle ecosystem research — the primary research skill. Wallet activity, protocol activity, historical trends, time-window analytics and distribution patterns.
- **mantle-defi-operator** — Research distribution venues on Mantle — liquidity, protocols, DeFi opportunities, venue comparison and execution planning.
- **mantle-risk-evaluator** — Evaluate whether recommendations are safe. Emits PASS, WARN or BLOCK. Every recommendation requiring user action should be checked by this skill.
