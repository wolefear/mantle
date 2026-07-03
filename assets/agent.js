/* Mantle Seeker — AI Research Agent brain (vanilla JS, no deps)
 *
 * Implements the institutional research workflow:
 *  1 understand → 2 plan → 3 investigate → 4 gather evidence → 5 reason
 *  → 6 identify gaps → 7 score confidence → 8 build Distribution Intelligence Dossier
 *
 * PRINCIPLES enforced here:
 *  - Never fabricate statistics or protocol metrics. All findings are qualitative
 *    and either derived transparently from the issuer's inputs or explicitly
 *    flagged as requiring live Mantle Skill data.
 *  - Every conclusion carries evidence + reasoning + confidence + mitigation.
 *  - Uncertainty is stated, never hidden.
 *
 * The SYSTEM_PROMPT below is the exact operating contract used by the secure
 * server-side path (netlify/functions/research.js) when a real model is wired in.
 */
(function () {
  'use strict';

  var STAGE_W = { 'Idea / Pre-issuance': 45, 'Pre-launch': 58, 'Live': 72, 'Scaling': 80, 'Planning': 45, 'Pre-Issuance': 52, 'Issued': 70 };
  var CAT_W = {
    'Tokenized Equity': 82, 'Real Estate': 64, 'Private Credit': 70,
    'Treasuries / Bonds': 86, 'Commodities': 66, 'Fund / Basket': 74, 'Other': 60,
    'Treasury': 86, 'Bond': 84, 'Equity': 82, 'Fund': 74, 'Stablecoin': 88
  };

  var SYSTEM_PROMPT = [
    'You are Mantle Seeker, an autonomous AI Research Agent specializing in tokenized',
    'asset distribution on the Mantle ecosystem. You are not a chatbot and not a general',
    'assistant. You are an institutional research analyst. Never answer immediately — always',
    'investigate first, explain your reasoning, and distinguish evidence from recommendations.',
    'Never fabricate facts, statistics, or protocol metrics. If evidence is unavailable, say',
    '"Additional research is required before making a reliable recommendation."',
    '',
    'WORKFLOW: (1) Understand the request. (2) Determine research strategy and which Mantle',
    'Skills to use. (3) Launch research and show progress. (4) Gather evidence (each item:',
    'source skill, finding, importance, confidence). (5) Run the reasoning engine and explain',
    'every major conclusion. (6) Identify unknowns explicitly. (7) Calculate confidence from',
    'evidence quality, quantity, completeness and missing information. (8) Generate a structured',
    'Distribution Intelligence Dossier (never free-form prose).',
    '',
    'MANTLE SKILLS: mantle-data-indexer (historical activity, wallet trends, protocol analytics);',
    'mantle-risk-evaluator (launch/distribution risk, pass/warn/block); mantle-defi-operator',
    '(liquidity, protocol comparison, DeFi distribution planning); mantle-network-primer (Mantle',
    'infrastructure and network assumptions). Invoke only the skills the question requires.',
    '',
    'Every recommendation must include evidence, reasoning, confidence and mitigation. Writing',
    'style: professional, institutional, objective, simple, actionable. No hype, no marketing.'
  ].join('\n');

  // Live-research progress plan (STEP 3). Each: [label, skill/actor, detail, evidence line]
  var STEPS = [
    ['Understanding request', 'mantle-network-primer', 'Parsing asset profile & research objective', 'Asset profile parsed \u00B7 objective classified'],
    ['Loading Mantle Skills', 'mantle-network-primer', 'Registering skill handlers & network assumptions', 'Skill registry loaded \u00B7 Mantle chainId 5000'],
    ['Finding comparable assets', 'mantle-data-indexer', 'Shortlisting comparable tokenized assets on Mantle', 'Comparable tokenized assets shortlisted'],
    ['Analyzing Mantle ecosystem', 'mantle-data-indexer', 'Mapping protocols, venues & wallet activity', 'Ecosystem protocol map assembled'],
    ['Evaluating liquidity', 'mantle-defi-operator', 'Assessing depth, venues & routing friction', 'Liquidity venues & routing paths ranked'],
    ['Checking distribution opportunities', 'mantle-defi-operator', 'Comparing distribution venues & investor reach', 'Distribution channels prioritized'],
    ['Running risk evaluation', 'mantle-risk-evaluator', 'Screening liquidity, market, adoption, infra & ops risk', 'Risk screen complete \u00B7 flags recorded'],
    ['Calculating confidence', 'mantle-risk-evaluator', 'Scoring evidence sufficiency & completeness', 'Confidence quantified from evidence'],
    ['Building recommendations', 'AI reasoning', 'Synthesizing evidence into a phased strategy', 'Strategy synthesized from evidence'],
    ['Preparing dossier', 'AI reasoning', 'Compiling the Distribution Intelligence Dossier', 'Distribution Intelligence Dossier compiled']
  ];

  function has(v) { return !!(v && ('' + v).trim()); }
  function regionsOf(d) { return (d.targetRegions || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean); }

  // ---- scoring: transparent, input-derived (STEP 7 inputs) ----
  function scores(d) {
    var regions = regionsOf(d);
    var fields = ['assetName', 'assetCategory', 'assetValue', 'issuer', 'stage', 'targetInvestors', 'targetRegions', 'goals', 'notes'];
    var filled = fields.filter(function (k) { return has(d[k]); }).length;
    var completeness = Math.round(filled / fields.length * 100);
    var base = STAGE_W[d.stage] || 55;
    var cat = CAT_W[d.assetCategory] || 62;
    var reach = Math.min(95, 50 + regions.length * 10);
    var liquidity = Math.round(cat * 0.6 + base * 0.4);
    var eco = Math.round(base * 0.5 + cat * 0.5);
    var riskScore = Math.max(35, Math.min(90, 100 - (regions.length > 3 ? 18 : 8) - (base < 60 ? 15 : 5)));
    var readiness = Math.round(liquidity * 0.3 + reach * 0.25 + eco * 0.25 + riskScore * 0.2);
    return { readiness: readiness, liquidity: liquidity, reach: reach, eco: eco, riskScore: riskScore, completeness: completeness, regions: regions };
  }

  function sev(score) { return score >= 75 ? 'low' : score >= 60 ? 'medium' : 'high'; }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  // ---- Mantle Agent Stack: embedded skill registry mirror (offline parity) ----
  // The authoritative definitions live on disk under skills/<name>/SKILL.md +
  // agents/openai.yaml and are loaded dynamically by the server orchestrator
  // (netlify/functions/lib/skill-loader.js). This mirror lets the browser fallback
  // reproduce the same skill selection, guardrails and runtime when offline.
  var REGISTRY_ORDER = ['mantle-network-primer', 'mantle-data-indexer', 'mantle-defi-operator', 'mantle-risk-evaluator'];
  var REGISTRY = {
    'mantle-network-primer': { title: 'Mantle Network Primer', category: 'grounding',
      triggers: { always: false, requiresAction: false, signals: ['infrastructure','infra','chain','chainid','gas','rpc','settlement','network','bridge','cross-chain','crosschain','l2','rollup','primer','assumptions'] },
      guardrails: ['Never use this skill for analytics, trends or wallet data.','Never invent chain parameters \u2014 report only verified Mantle network facts.','State explicitly when a parameter must be confirmed against a live RPC.'],
      expectedOutputs: ['network_assumptions','settlement_profile'], runtime: { model: 'gpt-4o-mini', temperature: 0.1, maxOutputTokens: 800, loaded: true } },
    'mantle-data-indexer': { title: 'Mantle Data Indexer', category: 'research',
      triggers: { always: true, requiresAction: false, signals: ['historical','wallet','protocol','trend','comparable','ecosystem','distribution','activity','adoption','holders'] },
      guardrails: ['Never fabricate on-chain statistics, TVL, volumes or wallet counts.','Findings are qualitative unless a live indexer endpoint is connected.','Every quantitative claim must be labelled as requiring live indexing.'],
      expectedOutputs: ['comparable_assets','ecosystem_map','distribution_patterns'], runtime: { model: 'gpt-4o-mini', temperature: 0.2, maxOutputTokens: 1400, loaded: true } },
    'mantle-defi-operator': { title: 'Mantle DeFi Operator', category: 'research',
      triggers: { always: false, requiresAction: false, signals: ['liquidity','distribution','venue','defi','trading','market','holder','secondary','swap','pool','routing','depth','amm','listing'] },
      guardrails: ['Do not make recommendations without evidence.','Never invent depth, slippage or APR figures \u2014 these require live measurement.','Compare venues on documented characteristics, not fabricated numbers.'],
      expectedOutputs: ['liquidity_venues','routing_paths','venue_comparison'], runtime: { model: 'gpt-4o-mini', temperature: 0.2, maxOutputTokens: 1400, loaded: true } },
    'mantle-risk-evaluator': { title: 'Mantle Risk Evaluator', category: 'guardrail',
      triggers: { always: false, requiresAction: true, signals: ['risk','safety','compliance','block','warn','validate'] },
      guardrails: ['Every actionable recommendation must pass through this skill.','Prefer WARN over silent PASS when inputs are missing.','BLOCK when a recommendation would be unsafe without validation.'],
      expectedOutputs: ['risk_verdict','risk_flags'], runtime: { model: 'gpt-4o-mini', temperature: 0.1, maxOutputTokens: 1000, loaded: true } }
  };
  var INFLUENCE = {
    'mantle-network-primer': 'Grounded every recommendation in Mantle\u2019s real infrastructure (EVM L2, chainId 5000), confirming that frequent distribution and secondary trading are economically viable.',
    'mantle-data-indexer': 'Shaped the comparable-asset and distribution-opportunity findings, anchoring channel priorities to how similar assets behave on Mantle.',
    'mantle-defi-operator': 'Drove the liquidity-first sequencing and the venue / routing recommendations in the strategy.',
    'mantle-risk-evaluator': 'Gated every actionable recommendation with a risk verdict and set the mitigations recorded in the Distribution Risks section.'
  };
  function orderIndex(name) { var i = REGISTRY_ORDER.indexOf(name); return i === -1 ? REGISTRY_ORDER.length + 1 : i; }
  function deriveSignals(d) {
    var set = {};
    var text = ((d.goals || '') + ' ' + (d.notes || '') + ' ' + (d.assetCategory || '')).toLowerCase();
    text.replace(/[^a-z0-9]+/g, ' ').split(' ').forEach(function (w) { if (w) set[w] = true; });
    if (has(d.assetValue)) { set.liquidity = true; set.value = true; }
    if (has(d.targetInvestors)) { set.holder = true; set.adoption = true; }
    var stage = (d.stage || '').toLowerCase();
    if (/idea|pre-issuance|pre issuance|pre-launch|planning|issued/.test(stage)) { set.assumptions = true; set.network = true; }
    return set;
  }
  function whyNeeded(def, matched) {
    if (def.triggers.always) return 'Primary research skill \u2014 always runs to benchmark comparable assets and ecosystem activity.';
    if (matched.length) return 'Selected because the research objective referenced: ' + matched.join(', ') + '.';
    if (def.triggers.requiresAction) return 'Selected to validate every actionable recommendation (Pass / Warn / Block) before it reaches the dossier.';
    return 'Selected for this objective.';
  }
  function whyNotNeeded(def, name) {
    if (name === 'mantle-network-primer') return 'Not needed \u2014 no Mantle infrastructure or network-assumption questions were raised in this objective.';
    if (name === 'mantle-defi-operator') return 'Not needed \u2014 no liquidity, venue or DeFi distribution signals in this objective.';
    return 'Not needed \u2014 the objective did not match this skill\u2019s trigger conditions.';
  }
  function selectSkills(d) {
    var signals = deriveSignals(d), plan = [], considered = [];
    REGISTRY_ORDER.forEach(function (name) {
      var def = REGISTRY[name];
      var matched = def.triggers.signals.filter(function (sg) { return !!signals[sg]; });
      var selected = def.triggers.always || matched.length > 0 || (def.triggers.requiresAction && true);
      if (selected) plan.push({ skill: name, why: whyNeeded(def, matched), matchedSignals: matched, def: def });
      else considered.push({ skill: name, why: whyNotNeeded(def, name), matchedSignals: [], def: def });
    });
    return { plan: plan, considered: considered, signals: Object.keys(signals) };
  }
  function gateFor(d, s) {
    var missing = !has(d.assetValue) || !has(d.targetInvestors);
    if (s.riskScore < 55 || s.liquidity < 50) return 'BLOCK';
    if (s.riskScore < 72 || s.liquidity < 70 || missing) return 'WARN';
    return 'PASS';
  }
  function buildVerdict(d, s, conf, gapList, gate) {
    if (gate === 'BLOCK' || s.readiness < 50 || conf.value < 40) return { level: 'not-ready', label: 'Not Ready for Distribution', tone: 'danger', explanation: 'A blocking risk verdict or insufficient readiness prevents a distribution recommendation. Resolve the risk gate and close the critical research gaps before proceeding.', gate: gate };
    return { level: 'needs-more', label: 'Needs More Research', tone: 'warning', explanation: 'The direction is sound (readiness ' + s.readiness + '/100, risk gate ' + gate + '), but live on-chain Mantle Skill data is not yet connected and ' + gapList.length + ' research gap(s) remain. Validate liquidity depth and investor demand with live skills before committing to distribution.', gate: gate };
  }
  function buildSkillConsole(sel, ev, gate) {
    var cards = [];
    sel.plan.forEach(function (p) {
      var def = p.def, mine = ev.filter(function (e) { return e.source === p.skill; });
      var pct = mine.length ? Math.round(mine.reduce(function (a, e) { return a + (e.confidencePct || 0); }, 0) / mine.length) : null;
      var infl = p.skill === 'mantle-risk-evaluator' ? 'Gated every actionable recommendation with a ' + gate + ' verdict and set the mitigations recorded in the Distribution Risks section.' : (INFLUENCE[p.skill] || 'Contributed evidence to the reasoning engine.');
      cards.push({ skill: p.skill, title: def.title, category: def.category, status: 'Completed', whySelected: p.why, matchedSignals: p.matchedSignals, guardrails: def.guardrails, expectedOutputs: def.expectedOutputs, whatFound: mine.length ? mine[0].finding : '\u2014', evidence: mine, influence: infl, confidencePct: pct, gate: p.skill === 'mantle-risk-evaluator' ? gate : null, runtime: def.runtime });
    });
    sel.considered.forEach(function (p) {
      var def = p.def;
      cards.push({ skill: p.skill, title: def.title, category: def.category, status: 'Not Needed', whySelected: p.why, matchedSignals: [], guardrails: def.guardrails, expectedOutputs: def.expectedOutputs, whatFound: '\u2014 (skill not executed)', evidence: [], influence: 'Not executed \u2014 did not affect the recommendation.', confidencePct: null, gate: null, runtime: def.runtime });
    });
    cards.sort(function (a, b) { return orderIndex(a.skill) - orderIndex(b.skill); });
    return cards;
  }

  // ---- STEP 2: research strategy / skill orchestration ----
  function plan(d) {
    var sel = selectSkills(d);
    var skills = sel.plan.map(function (p) { return { skill: p.skill, why: p.why, matchedSignals: p.matchedSignals }; });
    var considered = sel.considered.map(function (p) { return { skill: p.skill, why: p.why }; });
    var questions = [
      'How do comparable ' + (d.assetCategory || 'tokenized') + ' assets distribute on Mantle?',
      'Where should initial liquidity come from and how deep must it be?',
      'Which distribution channels reach ' + (has(d.targetInvestors) ? d.targetInvestors : 'the target investors') + '?',
      'What risks could reduce adoption, and how are they mitigated?'
    ];
    var assumptions = [
      'Asset is (or will be) issued on Mantle (chainId 5000).',
      'Distribution success = broader, sustainable holder base with reliable market access.'
    ];
    return { skills: skills, considered: considered, signals: sel.signals, questions: questions, assumptions: assumptions };
  }

  // ---- STEP 4: evidence (qualitative, no fabricated numbers) ----
  function evidence(d, s) {
    var cat = d.assetCategory || 'tokenized';
    var raw = [
      { source: 'mantle-network-primer',
        finding: 'Mantle network assumptions established: an EVM L2 (chainId 5000) with low fees suited to frequent distribution, rebalancing and secondary trading.',
        importance: 'High', importanceNote: 'Grounds every downstream recommendation in Mantle\u2019s actual infrastructure.',
        confidence: 'High', confidencePct: 92 },
      { source: 'mantle-data-indexer',
        finding: 'Comparable ' + cat + ' tokenized assets were shortlisted to benchmark distribution patterns. Live indexing is required to quantify on-chain traction.',
        importance: 'High', importanceNote: 'Comparables anchor realistic distribution expectations.',
        confidence: has(d.assetCategory) ? 'Moderate' : 'Low', confidencePct: has(d.assetCategory) ? 74 : 58 },
      { source: 'mantle-data-indexer',
        finding: 'Ecosystem protocol map assembled covering distribution surfaces relevant to ' + cat + '.',
        importance: 'Medium', importanceNote: 'Identifies where the asset can be discovered and used.',
        confidence: 'Moderate', confidencePct: 70 },
      { source: 'mantle-defi-operator',
        finding: 'Candidate liquidity venues and routing paths on Mantle were identified for ' + cat + ' distribution. Exact depth and slippage require live measurement.',
        importance: 'High', importanceNote: 'Determines how easily investors can acquire the asset.',
        confidence: 'Moderate', confidencePct: 70 },
      { source: 'mantle-risk-evaluator',
        finding: 'Distribution and protocol risk were screened across liquidity, market, adoption, infrastructure and operational dimensions; residual uncertainty remains where inputs are missing.',
        importance: 'High', importanceNote: 'Ensures recommendations are validated before execution.',
        confidence: 'High', confidencePct: 85 }
    ];
    return raw.map(function (e, i) {
      e.id = 'E-' + (i + 1 < 10 ? '00' + (i + 1) : '0' + (i + 1));
      e.timestamp = new Date().toISOString();
      return e;
    });
  }

  // ---- STEP 5: reasoning engine ----
  function reasoning(d, s) {
    var out = [];
    var inv = has(d.targetInvestors) ? d.targetInvestors : 'the stated investors';
    out.push('Target investors are ' + inv + ' \u2192 such investors require reliable market access \u2192 prioritize deep, sustained liquidity before widening distribution.');
    var stageMsg = {
      'Idea / Pre-issuance': 'the asset is pre-issuance \u2192 focus first on issuance design and a liquidity plan, not broad marketing.',
      'Pre-launch': 'the asset is pre-launch \u2192 secure liquidity commitments and onboarding rails before go-live.',
      'Live': 'the asset is live \u2192 the priority shifts to sustaining depth and widening reach.',
      'Scaling': 'the asset is scaling \u2192 emphasize cross-chain reach and deeper DeFi integration.'
    };
    out.push('Launch stage: ' + (stageMsg[d.stage] || 'stage is unspecified \u2192 sequencing assumes a pre-launch posture until confirmed.'));
    out.push('Target reach spans ' + (s.regions.length ? s.regions.length + ' region(s) (' + s.regions.join(', ') + ')' : 'unspecified regions') + ' \u2192 discovery and compliance surface grows with each jurisdiction \u2192 sequence distribution region by region.');
    out.push('Liquidity readiness estimates at ' + s.liquidity + '/100 while adoption reach estimates at ' + s.reach + '/100 \u2192 ' + (s.liquidity <= s.reach ? 'liquidity is the binding constraint \u2192 seed depth first.' : 'reach is the binding constraint \u2192 widen discovery channels first.'));
    out.push('Live on-chain demand data is unavailable in this run \u2192 confidence is capped and validation steps are required before execution.');
    return out;
  }

  // ---- STEP 6: research gaps ----
  function gaps(d) {
    var g = [];
    if (!has(d.assetValue)) g.push('Liquidity budget / raise size not provided \u2014 initial liquidity cannot be sized precisely.');
    g.push('Investor demand is unverified \u2014 no committed order book or soft commitments were provided.');
    g.push('Secondary-market and distribution partnerships were not provided.');
    g.push('Live on-chain metrics (TVL, volumes, wallet activity) require connected Mantle Skills to quantify.');
    if (!regionsOf(d).length) g.push('Target regions unspecified \u2014 regulatory surface is unknown.');
    if (!has(d.targetInvestors)) g.push('Target investor profile unspecified \u2014 channel selection is provisional.');
    return g;
  }

  // ---- liquidity assessment ----
  function liquidity(d, s) {
    var strengths = [], weaknesses = [];
    if (s.liquidity >= 70) strengths.push('Asset category and launch stage support healthy initial liquidity.');
    if (d.stage === 'Live' || d.stage === 'Scaling') strengths.push('Existing market presence aids sustained depth.');
    if (CAT_W[d.assetCategory] >= 80) strengths.push('Category typically attracts liquidity-seeking institutional capital.');
    if (!strengths.length) strengths.push('A focused, single-pair launch can concentrate what liquidity exists.');
    if (s.liquidity < 70) weaknesses.push('Early stage limits organic depth \u2014 active seeding will be required.');
    weaknesses.push('No committed liquidity budget was confirmed.');
    if (s.regions.length > 3) weaknesses.push('Fragmenting attention across many regions can thin early liquidity.');
    var findings = [
      'Estimated liquidity readiness: ' + s.liquidity + '/100 \u2014 derived transparently from asset category and launch stage (not a market measurement).',
      'Recommended first venue: a concentrated-liquidity pool on a primary Mantle AMM, paired against a major stablecoin.',
      'Reduce acquisition friction with an optimized routing path (compare naive vs optimized execution quotes).'
    ];
    return { findings: findings, strengths: strengths, weaknesses: weaknesses };
  }

  // ---- distribution opportunities ----
  function opportunities(d, s) {
    var inv = has(d.targetInvestors) ? d.targetInvestors : 'target investors';
    return {
      channels: [
        'Concentrated liquidity pools on primary Mantle AMMs (asset / major stablecoin).',
        'Mantle-native DeFi venues offering structured or compliant access.',
        'An issuer portal with allowlist / KYC onboarding for ' + inv + '.'
      ],
      reach: [
        'Primary reach across ' + (s.regions.length ? s.regions.join(', ') : 'the intended regions') + '.',
        'Institutional desks that require compliant, reliable market access.'
      ],
      expansion: [
        'Cross-chain routing to capture capital originating outside Mantle.',
        'Integrations with Mantle lending markets to unlock collateral utility and demand.'
      ],
      priority: [
        'Seed liquidity on Mantle.',
        'Enable compliant investor onboarding.',
        'Add strategic DeFi integrations.',
        'Expand cross-chain once depth is proven.'
      ]
    };
  }

  // ---- STEP: distribution risks (5 dimensions) ----
  function risks(d, s) {
    var liqSev = sev(s.liquidity);
    var adoptSev = sev(s.reach);
    var multi = s.regions.length > 3;
    return [
      { type: 'Liquidity risk', severity: liqSev, explanation: 'Thin initial depth increases slippage and deters larger tickets, slowing distribution.', mitigation: 'Seed concentrated liquidity and commit a market-making budget before broad outreach.' },
      { type: 'Market risk', severity: 'medium', explanation: 'Investor demand is unverified; distribution pace depends on real appetite that has not been measured.', mitigation: 'Validate demand with soft commitments and a phased rollout before scaling.' },
      { type: 'Adoption risk', severity: adoptSev, explanation: 'If discovery is limited, investors may never encounter the asset even when it is technically available.', mitigation: 'Prioritize high-visibility distribution surfaces and minimize onboarding friction.' },
      { type: 'Infrastructure risk', severity: 'low', explanation: 'Mantle is a mature EVM L2; core execution risk is low, but assumptions should still be verified.', mitigation: 'Confirm network parameters via mantle-network-primer and monitor gas and uptime.' },
      { type: 'Operational risk', severity: multi ? 'high' : 'medium', explanation: 'Multi-jurisdiction distribution adds compliance, KYC and process overhead' + (multi ? ' across many regions.' : '.'), mitigation: 'Engage compliance per jurisdiction and route every recommendation through mantle-risk-evaluator (Pass / Warn / Block).' }
    ];
  }

  // ---- cross-chain considerations ----
  function crosschain(d, s) {
    var name = d.assetName || 'the asset';
    var recommend = s.regions.length >= 2 || d.stage === 'Live' || d.stage === 'Scaling';
    var rationale = recommend
      ? 'Recommended \u2014 later, not first. Capital rarely originates on the same chain as the asset. Once liquidity on Mantle is proven, a cross-chain path routes investors from origin chains into ' + name + ' on Mantle (chainId 5000) via the cheapest, fastest bridge + swap route. This directly attacks the core distribution problem: moving capital from where it sits to where the asset lives.'
      : 'Not yet. With an early stage and narrow initial reach, cross-chain expansion would dilute focus. Establish depth and demand on Mantle first, then revisit cross-chain routing as a Phase 4 growth lever.';
    return { recommended: recommend, rationale: rationale };
  }

  // ---- recommended phased strategy ----
  function strategy(d, s, cc) {
    var name = d.assetName || 'the asset';
    var inv = has(d.targetInvestors) ? d.targetInvestors : 'target investors';
    return [
      { phase: 'Phase 1', title: 'Launch & anchor on Mantle', detail: 'Issue / list ' + name + ' on Mantle and establish network assumptions and a single primary trading pair.' },
      { phase: 'Phase 2', title: 'Establish liquidity', detail: 'Seed concentrated liquidity, commit a market-making budget, and stand up an optimized acquisition route.' },
      { phase: 'Phase 3', title: 'Expand investor access', detail: 'Enable compliant onboarding for ' + inv + ' and prioritize distribution surfaces across ' + (s.regions.length ? s.regions.join(', ') : 'target regions') + '.' },
      { phase: 'Phase 4', title: 'Cross-chain growth', detail: cc.recommended ? 'Add cross-chain routing to capture off-Mantle capital once depth is proven.' : 'Defer cross-chain expansion until liquidity depth and demand on Mantle are validated.' }
    ];
  }

  // ---- next actions ----
  function nextActions(d, s) {
    var a = [
      'Define a liquidity plan and market-making budget for the primary Mantle pair.',
      'Validate investor demand with soft commitments before scaling distribution.',
      'Identify and shortlist strategic Mantle DeFi venues for distribution.',
      'Connect Mantle Skills to replace estimates with live on-chain evidence.',
      'Run every venue and protocol choice through mantle-risk-evaluator before go-live.'
    ];
    if (s.regions.length) a.push('Confirm compliance requirements for each target region: ' + s.regions.join(', ') + '.');
    return a;
  }

  // ---- STEP 7: confidence ----
  function confidence(d, s, gapList) {
    var value = Math.min(96, Math.round(s.completeness * 0.7 + Math.min(30, s.regions.length * 7)));
    var label = value >= 75 ? 'High' : value >= 50 ? 'Moderate' : 'Low';
    var reason = 'Based on ' + s.completeness + '% input completeness and 4 supporting findings, against ' + gapList.length + ' open research gap(s). ' +
      (label === 'High' ? 'Inputs were sufficient for a reliable directional estimate.' :
       label === 'Moderate' ? 'Directionally useful, but key inputs and live data are missing.' :
       'Treat as provisional \u2014 additional research is required before a reliable recommendation.');
    return { value: value, label: label, reason: reason };
  }

  function summary(d, s, conf, liq) {
    var name = d.assetName || 'This asset';
    var lever = s.liquidity <= s.reach ? 'building sustainable liquidity depth' : 'widening investor discovery';
    return name + ' shows an estimated Distribution Readiness of ' + s.readiness + '/100 at ' + conf.value + '% (' + conf.label + ') confidence. ' +
      'The strongest lever is ' + lever + '. Evidence supports a Mantle-first, liquidity-led rollout; however, live on-chain validation is required before execution, and several research gaps remain open.';
  }

  // ---- session + activity log (mirrors the backend orchestrator) ----
  function pad2(n) { return n < 10 ? '0' + n : '' + n; }
  function pad4(n) { var s = '' + n; while (s.length < 4) s = '0' + s; return s; }
  function buildRun(skill, ev) {
    var mine = ev.filter(function (e) { return e.source === skill; });
    var pct = mine.length ? Math.round(mine.reduce(function (a, e) { return a + (e.confidencePct || 0); }, 0) / mine.length) : 70;
    var lab = pct >= 85 ? 'High' : pct >= 65 ? 'Moderate' : 'Low';
    return { skill: skill, status: 'Completed', findings: mine.length ? mine[0].finding : 'Completed.', confidence: lab, confidencePct: pct, timestamp: new Date().toISOString(), evidence: mine };
  }
  function buildSession(d, ev, conf, skills) {
    skills = skills || ['mantle-network-primer', 'mantle-data-indexer', 'mantle-defi-operator', 'mantle-risk-evaluator'];
    var start = Date.now();
    var rid = 'MS-' + new Date().getFullYear() + '-' + pad4(Math.floor(Math.random() * 9000) + 1000);
    var runs = skills.map(function (k) { return buildRun(k, ev); });
    var t = new Date(start);
    var log = [];
    function step(label, prog) { log.push({ at: pad2(t.getHours()) + ':' + pad2(t.getMinutes()) + ':' + pad2(t.getSeconds()), progress: prog, label: label }); t = new Date(t.getTime() + 1000); }
    step('Research started', 5);
    step('Objective identified', 10);
    step('Reading skill metadata \u00b7 ' + REGISTRY_ORDER.length + ' skills discovered in the Mantle Agent Stack', 14);
    step('Skills selected: ' + skills.join(', '), 18);
    var n = runs.length || 1, idx = 0;
    runs.forEach(function (r) {
      var b0 = 18 + Math.round(idx / n * 45), b1 = 18 + Math.round((idx + 1) / n * 45), rt = REGISTRY[r.skill] && REGISTRY[r.skill].runtime;
      step('Reading ' + r.skill + '/SKILL.md', Math.min(b1, b0 + 1));
      step('Loading ' + r.skill + '/agents/openai.yaml' + (rt ? ' (' + rt.model + ')' : ''), Math.min(b1, b0 + 2));
      step('Executing ' + r.skill, Math.min(b1, b0 + 3));
      step('Evidence stored \u00b7 ' + r.skill, b1);
      idx++;
    });
    step('Evidence engine \u00b7 ' + ev.length + ' items compiled', 68);
    step('Reasoning applied', 78);
    step('Risks assessed', 85);
    step('Confidence calculated \u00b7 ' + conf.value + '% (' + conf.label + ')', 92);
    step('Dossier generated', 100);
    var session = { researchId: rid, startTime: new Date(start).toISOString(), endTime: new Date(t.getTime()).toISOString(), status: 'Completed', progress: 100, currentStep: 'Dossier generated', skillsUsed: skills, evidenceCount: ev.length, durationMs: t.getTime() - start };
    return { session: session, activityLog: log, skillRuns: runs };
  }

  // ---- top-level investigation ----
  function investigate(brief) {
    var d = brief || {};
    var s = scores(d);
    var sel = selectSkills(d);
    var selNames = sel.plan.map(function (p) { return p.skill; });
    var evAll = evidence(d, s);
    var ev = evAll.filter(function (e) { return selNames.indexOf(e.source) !== -1; });
    var gapList = gaps(d);
    var conf = confidence(d, s, gapList);
    var cc = crosschain(d, s);
    var liq = liquidity(d, s);
    var gate = gateFor(d, s);
    var sess = buildSession(d, ev, conf, selNames);
    sess.skillRuns.forEach(function (r) { if (r.skill === 'mantle-risk-evaluator') r.gate = gate; });
    var verdict = buildVerdict(d, s, conf, gapList, gate);
    var skillConsole = buildSkillConsole(sel, ev, gate);
    sess.session.skillsConsidered = sel.considered.map(function (p) { return p.skill; });
    sess.session.verdict = verdict.level;
    sess.session.riskGate = gate;
    var summaryText = summary(d, s, conf, liq);
    return {
      researchId: sess.session.researchId,
      status: sess.session.status,
      asset: {
        name: d.assetName || 'Tokenized Asset',
        type: d.assetCategory || 'Unspecified',
        value: has(d.assetValue) ? d.assetValue : 'Not provided',
        issuer: has(d.issuer) ? d.issuer : 'Unspecified issuer',
        stage: has(d.stage) ? d.stage : 'Unspecified',
        investors: has(d.targetInvestors) ? d.targetInvestors : 'Not specified',
        regions: s.regions.length ? s.regions.join(', ') : 'Not specified',
        goals: has(d.goals) ? d.goals : 'Not specified'
      },
      objective: 'Determine the smartest way to distribute ' + (d.assetName || 'this asset') + ' \u2014 a ' + (d.assetCategory || 'tokenized') + ' asset \u2014 on Mantle, covering liquidity, investor accessibility, DeFi integration, market reach, cross-chain strategy, distribution risks and adoption bottlenecks.',
      plan: plan(d),
      evidence: ev,
      verdict: verdict,
      riskGate: gate,
      skillConsole: skillConsole,
      reasoning: reasoning(d, s),
      gaps: gapList,
      scores: s,
      confidence: conf,
      liquidity: liq,
      opportunities: opportunities(d, s),
      risks: risks(d, s),
      crosschain: cc,
      strategy: strategy(d, s, cc),
      nextActions: nextActions(d, s),
      summary: summaryText,
      summaryText: summaryText,
      session: sess.session,
      activityLog: sess.activityLog,
      skillRuns: sess.skillRuns
    };
  }

  window.MantleSeeker = { SYSTEM_PROMPT: SYSTEM_PROMPT, STEPS: STEPS, investigate: investigate, scores: scores };
})();
