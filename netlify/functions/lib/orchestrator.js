/* Mantle Seeker backend \u2014 Research Orchestrator (the brain).
 *
 * Implements the official Mantle Agent Stack research workflow:
 *   Receive Request -> Understand Objective -> Read Skill Metadata (SKILL.md) ->
 *   Load Runtime (openai.yaml) -> Select smallest set of Skills -> Execute Skills ->
 *   Collect Evidence -> Reason Over Evidence -> Detect Gaps -> Calculate Confidence ->
 *   Generate Distribution Intelligence Dossier (with Research Verdict).
 *
 * Skill selection and execution are NOT hardcoded: the orchestrator loads every
 * skill definition from the skills/ directory (skill-loader.js), matches each
 * skill's trigger conditions against the research objective, and executes only the
 * skills that are actually needed. Adding a new skill directory extends the agent
 * with no orchestrator changes.
 */
'use strict';
const U = require('./util');
const { runSkill } = require('./skills');
const E = require('./engines');
const { loadSkills } = require('./skill-loader');

// Canonical execution order (grounding -> primary research -> venues -> risk gate).
const ORDER = ['mantle-network-primer', 'mantle-data-indexer', 'mantle-defi-operator', 'mantle-risk-evaluator'];
function orderIndex(name) { const i = ORDER.indexOf(name); return i === -1 ? ORDER.length + 1 : i; }

// Derive the objective's signal set from the brief (drives trigger matching).
function deriveSignals(clean) {
  const set = new Set();
  const text = ((clean.distributionGoal || '') + ' ' + (clean.notes || '') + ' ' + (clean.assetType || '')).toLowerCase();
  text.replace(/[^a-z0-9]+/g, ' ').split(' ').forEach(function (w) { if (w) set.add(w); });
  if (U.has(clean.assetValue)) { set.add('liquidity'); set.add('value'); }
  if (U.has(clean.targetInvestors)) { set.add('holder'); set.add('adoption'); }
  const stage = (clean.launchStage || '').toLowerCase();
  if (/idea|pre-issuance|pre issuance|pre-launch|planning|issued/.test(stage)) { set.add('assumptions'); set.add('network'); }
  return set;
}

function whyNeeded(def, matched) {
  if (def.triggers.always) return 'Primary research skill \u2014 always runs to benchmark comparable assets and ecosystem activity.';
  if (matched.length) return 'Selected because the research objective referenced: ' + matched.join(', ') + '.';
  if (def.triggers.requiresAction) return 'Selected to validate every actionable recommendation (Pass / Warn / Block) before it reaches the dossier.';
  return 'Selected for this objective.';
}
function whyNotNeeded(def) {
  if (def.name === 'mantle-network-primer') return 'Not needed \u2014 no Mantle infrastructure or network-assumption questions were raised in this objective.';
  if (def.name === 'mantle-defi-operator') return 'Not needed \u2014 no liquidity, venue or DeFi distribution signals in this objective.';
  return 'Not needed \u2014 the objective did not match this skill\u2019s trigger conditions.';
}

// STEP: read metadata + select the SMALLEST set of skills whose triggers match.
function selectSkills(clean, registry) {
  const reg = registry || loadSkills();
  const signals = deriveSignals(clean);
  const willProduceActions = true; // this agent always yields actionable recommendations
  const plan = [];
  const considered = [];
  reg.order.forEach(function (name) {
    const def = reg.skills[name];
    if (!def) return;
    const matched = def.triggers.signals.filter(function (sig) { return signals.has(String(sig).toLowerCase()); });
    const selected = def.triggers.always || matched.length > 0 || (def.triggers.requiresAction && willProduceActions);
    if (selected) plan.push({ skill: name, why: whyNeeded(def, matched), matchedSignals: matched, def: def });
    else considered.push({ skill: name, why: whyNotNeeded(def), matchedSignals: [], def: def });
  });
  plan.sort(function (a, b) { return orderIndex(a.skill) - orderIndex(b.skill); });
  considered.sort(function (a, b) { return orderIndex(a.skill) - orderIndex(b.skill); });
  return { plan: plan, considered: considered, signals: Array.from(signals) };
}

// RESEARCH VERDICT \u2014 one of ready / needs-more / not-ready, explained transparently.
function buildVerdict(clean, s, confidence, gaps, gate, mode) {
  const live = mode === 'assisted';
  if (gate === 'BLOCK' || s.readiness < 50 || confidence.value < 40) {
    return {
      level: 'not-ready', label: 'Not Ready for Distribution', tone: 'danger',
      explanation: 'A blocking risk verdict or insufficient readiness prevents a distribution recommendation. Resolve the risk gate and close the critical research gaps before proceeding.',
      gate: gate
    };
  }
  if (live && s.readiness >= 75 && confidence.value >= 75 && gate === 'PASS' && gaps.length <= 2) {
    return {
      level: 'ready', label: 'Ready for Distribution', tone: 'success',
      explanation: 'Live Mantle Skill evidence, a PASS risk gate and high confidence (' + confidence.value + '%) support proceeding with the phased strategy below.',
      gate: gate
    };
  }
  return {
    level: 'needs-more', label: 'Needs More Research', tone: 'warning',
    explanation: 'The direction is sound (readiness ' + s.readiness + '/100, risk gate ' + gate + '), but ' +
      (live ? '' : 'live on-chain Mantle Skill data is not yet connected and ') + gaps.length + ' research gap(s) remain. ' +
      'Validate liquidity depth and investor demand with live skills before committing to distribution.',
    gate: gate
  };
}

const INFLUENCE = {
  'mantle-network-primer': 'Grounded every recommendation in Mantle\u2019s real infrastructure (EVM L2, chainId 5000), confirming that frequent distribution and secondary trading are economically viable.',
  'mantle-data-indexer': 'Shaped the comparable-asset and distribution-opportunity findings, anchoring channel priorities to how similar assets behave on Mantle.',
  'mantle-defi-operator': 'Drove the liquidity-first sequencing and the venue / routing recommendations in the strategy.',
  'mantle-risk-evaluator': 'Gated every actionable recommendation with a risk verdict and set the mitigations recorded in the Distribution Risks section.'
};

// Build the Skills Console: every skill (executed + not needed), with why it was
// selected, what it found, and how it influenced the final recommendation.
function buildSkillConsole(plan, considered, skillRuns, evidence, gate) {
  const runByName = {};
  skillRuns.forEach(function (r) { runByName[r.skill] = r; });
  const evBySource = function (src) { return evidence.filter(function (e) { return e.source === src; }); };
  const cards = [];
  plan.forEach(function (p) {
    const run = runByName[p.skill] || {};
    const def = p.def || {};
    const infl = p.skill === 'mantle-risk-evaluator'
      ? 'Gated every actionable recommendation with a ' + (run.gate || gate || 'PASS') + ' verdict and set the mitigations recorded in the Distribution Risks section.'
      : (INFLUENCE[p.skill] || 'Contributed evidence to the reasoning engine.');
    cards.push({
      skill: p.skill,
      title: def.title || p.skill,
      category: def.category || 'skill',
      status: run.status || 'Completed',
      whySelected: p.why,
      matchedSignals: p.matchedSignals || [],
      guardrails: run.guardrails || def.guardrails || [],
      expectedOutputs: run.expectedOutputs || def.expectedOutputs || [],
      whatFound: run.findings || '\u2014',
      evidence: evBySource(p.skill),
      influence: infl,
      confidencePct: run.confidencePct != null ? run.confidencePct : null,
      gate: run.gate || null,
      runtime: run.runtime || (def.runtime ? { model: def.runtime.model, temperature: def.runtime.temperature, maxOutputTokens: def.runtime.maxOutputTokens, loaded: def.runtimeLoaded } : null)
    });
  });
  considered.forEach(function (p) {
    const def = p.def || {};
    cards.push({
      skill: p.skill,
      title: def.title || p.skill,
      category: def.category || 'skill',
      status: 'Not Needed',
      whySelected: p.why,
      matchedSignals: [],
      guardrails: def.guardrails || [],
      expectedOutputs: def.expectedOutputs || [],
      whatFound: '\u2014 (skill not executed)',
      evidence: [],
      influence: 'Not executed \u2014 did not affect the recommendation.',
      confidencePct: null,
      gate: null,
      runtime: def.runtime ? { model: def.runtime.model, temperature: def.runtime.temperature, maxOutputTokens: def.runtime.maxOutputTokens, loaded: def.runtimeLoaded } : null
    });
  });
  cards.sort(function (a, b) { return orderIndex(a.skill) - orderIndex(b.skill); });
  return cards;
}

// STEP: distribution risks (5 dimensions), derived from scores + evidence.
function buildRisks(clean, s) {
  const multi = s.regions.length > 3;
  return [
    { type: 'Liquidity risk', severity: U.sev(s.liquidity), explanation: 'Thin initial depth increases slippage and deters larger tickets, slowing distribution.', mitigation: 'Seed concentrated liquidity and commit a market-making budget before broad outreach.' },
    { type: 'Market risk', severity: 'medium', explanation: 'Investor demand is unverified; distribution pace depends on real appetite that has not been measured.', mitigation: 'Validate demand with soft commitments and a phased rollout before scaling.' },
    { type: 'Adoption risk', severity: U.sev(s.reach), explanation: 'If discovery is limited, investors may never encounter the asset even when it is technically available.', mitigation: 'Prioritize high-visibility distribution surfaces and minimize onboarding friction.' },
    { type: 'Infrastructure risk', severity: 'low', explanation: 'Mantle is a mature EVM L2; core execution risk is low, but assumptions should still be verified.', mitigation: 'Confirm network parameters via mantle-network-primer and monitor gas and uptime.' },
    { type: 'Operational risk', severity: multi ? 'high' : 'medium', explanation: 'Multi-jurisdiction distribution adds compliance, KYC and process overhead' + (multi ? ' across many regions.' : '.'), mitigation: 'Engage compliance per jurisdiction and route every recommendation through mantle-risk-evaluator (Pass / Warn / Block).' }
  ];
}

function buildCrosschain(clean, s) {
  const name = clean.assetName || 'the asset';
  const recommend = s.regions.length >= 2 || clean.launchStage === 'Live' || clean.launchStage === 'Scaling';
  const rationale = recommend
    ? 'Recommended \u2014 later, not first. Capital rarely originates on the same chain as the asset. Once liquidity on Mantle is proven, a cross-chain path routes investors from origin chains into ' + name + ' on Mantle (chainId 5000) via the cheapest, fastest bridge + swap route.'
    : 'Not yet. With an early stage and narrow initial reach, cross-chain expansion would dilute focus. Establish depth and demand on Mantle first, then revisit cross-chain routing as a Phase 4 growth lever.';
  return { recommended: recommend, rationale: rationale };
}

function buildStrategy(clean, s, cc) {
  const name = clean.assetName || 'the asset';
  const inv = U.has(clean.targetInvestors) ? clean.targetInvestors : 'target investors';
  return [
    { phase: 'Phase 1', title: 'Launch & anchor on Mantle', detail: 'Issue / list ' + name + ' on Mantle and establish network assumptions and a single primary trading pair.' },
    { phase: 'Phase 2', title: 'Establish liquidity', detail: 'Seed concentrated liquidity, commit a market-making budget, and stand up an optimized acquisition route.' },
    { phase: 'Phase 3', title: 'Expand investor access', detail: 'Enable compliant onboarding for ' + inv + ' and prioritize distribution surfaces across ' + (s.regions.length ? s.regions.join(', ') : 'target regions') + '.' },
    { phase: 'Phase 4', title: 'Cross-chain growth', detail: cc.recommended ? 'Add cross-chain routing to capture off-Mantle capital once depth is proven.' : 'Defer cross-chain expansion until liquidity depth and demand on Mantle are validated.' }
  ];
}

function buildDossier(ctx) {
  const clean = ctx.clean, evidence = ctx.evidence, r = ctx.reasoning, gaps = ctx.gaps, confidence = ctx.confidence, session = ctx.session;
  const s = U.computeScores(clean);
  const cc = buildCrosschain(clean, s);
  const risks = buildRisks(clean, s);
  const strategy = buildStrategy(clean, s, cc);
  const inv = U.has(clean.targetInvestors) ? clean.targetInvestors : 'target investors';

  const liquidity = (function () {
    const strengths = [], weaknesses = [];
    if (s.liquidity >= 70) strengths.push('Asset category and launch stage support healthy initial liquidity.');
    if (clean.launchStage === 'Live' || clean.launchStage === 'Scaling') strengths.push('Existing market presence aids sustained depth.');
    if (U.CAT_W[clean.assetType] >= 80) strengths.push('Category typically attracts liquidity-seeking institutional capital.');
    if (!strengths.length) strengths.push('A focused, single-pair launch can concentrate what liquidity exists.');
    if (s.liquidity < 70) weaknesses.push('Early stage limits organic depth \u2014 active seeding will be required.');
    weaknesses.push('No committed liquidity budget was confirmed.');
    if (s.regions.length > 3) weaknesses.push('Fragmenting attention across many regions can thin early liquidity.');
    return {
      findings: [
        'Estimated liquidity readiness: ' + s.liquidity + '/100 \u2014 derived transparently from asset category and launch stage (not a market measurement).',
        'Recommended first venue: a concentrated-liquidity pool on a primary Mantle AMM, paired against a major stablecoin.',
        'Reduce acquisition friction with an optimized routing path (compare naive vs optimized execution quotes).'
      ], strengths: strengths, weaknesses: weaknesses
    };
  })();

  const opportunities = {
    channels: [
      'Concentrated liquidity pools on primary Mantle AMMs (asset / major stablecoin).',
      'Mantle-native DeFi venues offering structured or compliant access.',
      'An issuer portal with allowlist / KYC onboarding for ' + inv + '.'
    ],
    reach: ['Primary reach across ' + (s.regions.length ? s.regions.join(', ') : 'the intended regions') + '.', 'Institutional desks that require compliant, reliable market access.'],
    expansion: ['Cross-chain routing to capture capital originating outside Mantle.', 'Integrations with Mantle lending markets to unlock collateral utility and demand.'],
    priority: r.priorities
  };

  const nextActions = [
    'Define a liquidity plan and market-making budget for the primary Mantle pair.',
    'Validate investor demand with soft commitments before scaling distribution.',
    'Identify and shortlist strategic Mantle DeFi venues for distribution.',
    'Connect Mantle Skills to replace estimates with live on-chain evidence.',
    'Run every venue and protocol choice through mantle-risk-evaluator before go-live.'
  ];
  if (s.regions.length) nextActions.push('Confirm compliance requirements for each target region: ' + s.regions.join(', ') + '.');

  const recommendations = strategy.map(function (p, i) {
    return { id: 'R-' + U.pad(i + 1, 3), title: p.title, detail: p.detail, basis: r.findings.map(function (f) { return f.id; }), confidence: confidence.label };
  });

  const lever = s.liquidity <= s.reach ? 'building sustainable liquidity depth' : 'widening investor discovery';
  const summaryText = (clean.assetName || 'This asset') + ' shows an estimated Distribution Readiness of ' + s.readiness + '/100 at ' + confidence.value + '% (' + confidence.label + ') confidence. The strongest lever is ' + lever + '. Evidence supports a Mantle-first, liquidity-led rollout; however, live on-chain validation is required before execution, and several research gaps remain open.';

  return {
    researchId: session.researchId,
    status: session.status,
    asset: {
      name: clean.assetName || 'Tokenized Asset', type: clean.assetType || 'Unspecified',
      value: U.has(clean.assetValue) ? clean.assetValue : 'Not provided',
      issuer: U.has(clean.issuer) ? clean.issuer : 'Unspecified issuer',
      stage: U.has(clean.launchStage) ? clean.launchStage : 'Unspecified',
      investors: U.has(clean.targetInvestors) ? clean.targetInvestors : 'Not specified',
      regions: s.regions.length ? s.regions.join(', ') : 'Not specified',
      goals: U.has(clean.distributionGoal) ? clean.distributionGoal : 'Not specified'
    },
    objective: 'Determine the smartest way to distribute ' + (clean.assetName || 'this asset') + ' \u2014 a ' + (clean.assetType || 'tokenized') + ' asset \u2014 on Mantle, covering liquidity, investor accessibility, DeFi integration, market reach, cross-chain strategy, distribution risks and adoption bottlenecks.',
    plan: { skills: ctx.skillsPlan, considered: ctx.considered, signals: ctx.signals },
    summary: { text: summaryText },
    readiness: { score: s.readiness, label: (s.readiness >= 75 ? 'Strong' : s.readiness >= 55 ? 'Moderate' : 'Early'), subScores: { liquidity: s.liquidity, reachability: s.reach, ecosystemFit: s.eco, riskPosture: s.riskScore }, explanation: 'Blends liquidity (' + s.liquidity + '), reachability (' + s.reach + '), ecosystem fit (' + s.eco + ') and risk posture (' + s.riskScore + '); transparent estimates from your inputs.' },
    evidence: evidence,
    findings: r.findings,
    reasoning: r.reasoning,
    conflicts: r.conflicts,
    scores: s,
    liquidity: liquidity,
    opportunities: opportunities,
    risks: risks,
    crosschain: cc,
    strategy: strategy,
    recommendations: recommendations,
    gaps: gaps,
    confidence: confidence,
    nextActions: nextActions,
    verdict: ctx.verdict,
    riskGate: ctx.gate,
    skillConsole: ctx.skillConsole,
    summaryText: summaryText
  };
}

// The orchestrator as an async generator of progress events, ending with the dossier.
async function* investigate(rawInput) {
  const t0 = Date.now();
  const activity = [];
  function ev(label, progress, extra) {
    const e = { at: U.hhmmss(), iso: new Date().toISOString(), label: label, progress: progress };
    if (extra) Object.assign(e, extra);
    activity.push(e);
    return e;
  }
  const mode = process.env.AI_API_KEY ? 'assisted' : 'deterministic';

  const parsed = U.validate(rawInput);
  const clean = parsed.clean;
  const session = {
    researchId: U.researchId(), startTime: new Date().toISOString(), endTime: null,
    status: 'Research Started', progress: 0, currentStep: 'Understanding request',
    skillsUsed: [], skillsConsidered: [], evidenceCount: 0, durationMs: null, mode: mode
  };
  yield { type: 'session', session: session, event: ev('Research started', 4) };

  if (parsed.errors.length) {
    session.status = 'Rejected';
    session.endTime = new Date().toISOString();
    yield { type: 'error', errors: parsed.errors, session: session };
    return;
  }
  session.currentStep = 'Understanding objective';
  yield { type: 'event', event: ev('Objective identified', 9) };

  // STEP: read skill metadata + select the smallest set of skills.
  const registry = loadSkills();
  yield { type: 'event', event: ev('Reading skill metadata \u00b7 ' + registry.order.length + ' skills discovered in the Mantle Agent Stack', 13) };
  const sel = selectSkills(clean, registry);
  session.skillsUsed = sel.plan.map(function (p) { return p.skill; });
  session.skillsConsidered = sel.considered.map(function (p) { return p.skill; });
  session.currentStep = 'Selecting Mantle Skills';
  yield { type: 'plan', skillsPlan: sel.plan.map(function (p) { return { skill: p.skill, why: p.why, matchedSignals: p.matchedSignals }; }), considered: sel.considered.map(function (p) { return { skill: p.skill, why: p.why }; }), event: ev('Skills selected: ' + (session.skillsUsed.join(', ') || 'none') + (session.skillsConsidered.length ? ' \u00b7 not needed: ' + session.skillsConsidered.join(', ') : ''), 18) };

  const skillRuns = [];
  const rawEvidence = [];
  let gate = 'PASS';
  for (let i = 0; i < sel.plan.length; i++) {
    const p = sel.plan[i];
    const def = p.def;
    const b0 = 18 + Math.round(i / sel.plan.length * 45);
    const b1 = 18 + Math.round((i + 1) / sel.plan.length * 45);
    session.currentStep = 'Running ' + p.skill;
    yield { type: 'event', event: ev('Reading ' + p.skill + '/SKILL.md', Math.min(b1, b0 + 1)) };
    yield { type: 'event', event: ev('Loading ' + p.skill + '/agents/openai.yaml' + (def.runtime && def.runtime.model ? ' (' + def.runtime.model + ')' : ''), Math.min(b1, b0 + 2)) };
    yield { type: 'event', event: ev('Executing ' + p.skill, Math.min(b1, b0 + 3)) };
    const run = await runSkill(def, clean);
    if (run.gate) gate = run.gate;
    skillRuns.push(run);
    for (const e of run.evidence) rawEvidence.push(e);
    yield { type: 'skill', run: run, event: ev((run.status === 'Completed' ? 'Evidence stored \u00b7 ' : 'Skill ' + run.status + ' \u00b7 ') + p.skill, b1) };
  }

  const evidence = E.buildEvidence(rawEvidence);
  session.evidenceCount = evidence.length;
  session.currentStep = 'Compiling evidence';
  yield { type: 'event', event: ev('Evidence engine \u00b7 ' + evidence.length + ' items stored (never overwritten)', 68) };

  const s = U.computeScores(clean);
  const reasoning = E.reason(clean, evidence, s);
  session.currentStep = 'Reasoning over evidence';
  yield { type: 'event', event: ev('Reasoning engine applied' + (reasoning.conflicts.length ? ' \u00b7 ' + reasoning.conflicts.length + ' conflict(s) found' : '') + ' \u00b7 evidence \u2192 reasoning \u2192 recommendation', 78) };

  const gaps = E.detectGaps(clean);
  session.currentStep = 'Assessing risks & gaps';
  yield { type: 'event', event: ev('Risks assessed \u00b7 gate ' + gate + ' \u00b7 ' + gaps.length + ' research gap(s)', 85) };

  const confidence = E.scoreConfidence(clean, evidence, gaps, reasoning, skillRuns);
  session.currentStep = 'Calculating confidence';
  yield { type: 'event', event: ev('Confidence calculated \u00b7 ' + confidence.value + '% (' + confidence.label + ')', 92) };

  const verdict = buildVerdict(clean, s, confidence, gaps, gate, mode);
  const skillConsole = buildSkillConsole(sel.plan, sel.considered, skillRuns, evidence, gate);

  const partial = skillRuns.some(function (r) { return r.status !== 'Completed'; });
  session.status = partial ? 'Partial Research' : 'Completed';
  if (partial) session.partialReason = 'One or more Mantle Skills were unavailable after retry.';
  session.verdict = verdict.level;
  session.riskGate = gate;
  session.endTime = new Date().toISOString();
  session.durationMs = Date.now() - t0;
  session.currentStep = 'Dossier generated';
  session.progress = 100;

  const dossier = buildDossier({
    clean: clean, evidence: evidence, reasoning: reasoning, gaps: gaps, confidence: confidence,
    session: session, skillsPlan: sel.plan.map(function (p) { return { skill: p.skill, why: p.why, matchedSignals: p.matchedSignals }; }),
    considered: sel.considered.map(function (p) { return { skill: p.skill, why: p.why }; }), signals: sel.signals,
    verdict: verdict, gate: gate, skillConsole: skillConsole
  });
  ev('Distribution Intelligence Dossier generated', 100);

  yield {
    type: 'done',
    session: session,
    activityLog: activity,
    skillRuns: skillRuns,
    dossier: Object.assign({}, dossier, { session: session, activityLog: activity, skillRuns: skillRuns })
  };
}

async function runResearch(rawInput) {
  let last = null, error = null, sessionRef = null;
  for await (const evt of investigate(rawInput)) {
    if (evt.session) sessionRef = evt.session;
    if (evt.type === 'error') { error = evt; break; }
    if (evt.type === 'done') last = evt;
  }
  if (error) return { ok: false, errors: error.errors, session: sessionRef };
  return { ok: true, session: last.session, activityLog: last.activityLog, skillRuns: last.skillRuns, dossier: last.dossier };
}

module.exports = { investigate: investigate, runResearch: runResearch, selectSkills: selectSkills, buildDossier: buildDossier, deriveSignals: deriveSignals, buildVerdict: buildVerdict };
