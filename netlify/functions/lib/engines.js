/* Mantle Seeker backend — Evidence, Reasoning, Gap and Confidence engines.
 * These are deterministic analysts, NOT free-form LLM text. Every recommendation
 * traces back to evidence ids; every uncertainty is stated. */
'use strict';
const { has, regionsOf, computeScores, pad } = require('./util');

// EVIDENCE ENGINE — assign ids + timestamps, build the evidence database.
function buildEvidence(rawEvidence) {
  return rawEvidence.map(function (e, i) {
    return {
      id: 'E-' + pad(i + 1, 3),
      source: e.source,
      finding: e.finding,
      importance: e.importance,
      importanceNote: e.importanceNote,
      confidence: e.confidence,
      confidencePct: e.confidencePct,
      timestamp: new Date().toISOString()
    };
  });
}

function bySource(evidence, src) {
  return evidence.filter(function (e) { return e.source === src; }).map(function (e) { return e.id; });
}

// REASONING ENGINE — compare evidence, find patterns/conflicts, set priorities,
// and explain WHY each recommendation exists (with evidence traces).
function reason(clean, evidence, scores) {
  const s = scores || computeScores(clean);
  const inv = has(clean.targetInvestors) ? clean.targetInvestors : 'the stated investors';
  const reasoning = [];
  reasoning.push('Target investors are ' + inv + ' \u2192 such investors require reliable market access \u2192 prioritize deep, sustained liquidity before widening distribution.');
  const stageMsg = {
    'Idea / Pre-issuance': 'the asset is pre-issuance \u2192 focus first on issuance design and a liquidity plan, not broad marketing.',
    'Pre-launch': 'the asset is pre-launch \u2192 secure liquidity commitments and onboarding rails before go-live.',
    'Live': 'the asset is live \u2192 the priority shifts to sustaining depth and widening reach.',
    'Scaling': 'the asset is scaling \u2192 emphasize cross-chain reach and deeper DeFi integration.'
  };
  reasoning.push('Launch stage: ' + (stageMsg[clean.launchStage] || 'stage is unspecified \u2192 sequencing assumes a pre-launch posture until confirmed.'));
  reasoning.push('Target reach spans ' + (s.regions.length ? s.regions.length + ' region(s) (' + s.regions.join(', ') + ')' : 'unspecified regions') + ' \u2192 discovery and compliance surface grows with each jurisdiction \u2192 sequence distribution region by region.');
  reasoning.push('Liquidity readiness estimates at ' + s.liquidity + '/100 while adoption reach estimates at ' + s.reach + '/100 \u2192 ' + (s.liquidity <= s.reach ? 'liquidity is the binding constraint \u2192 seed depth first.' : 'reach is the binding constraint \u2192 widen discovery channels first.'));

  // conflict detection
  const conflicts = [];
  if (s.reach - s.liquidity >= 15) {
    conflicts.push({ type: 'reach-vs-liquidity', note: 'Reach outpaces liquidity: distribution may attract investors faster than on-chain depth can absorb, risking slippage and poor early execution.' });
    reasoning.push('Conflict detected \u2192 reach ('+s.reach+') exceeds liquidity ('+s.liquidity+') by \u2265 15 \u2192 resolve by front-loading liquidity before demand generation.');
  }
  reasoning.push('Live on-chain demand data is unavailable in this run \u2192 confidence is capped and validation steps are required before execution.');

  // structured findings (each traceable to evidence)
  const findings = [
    {
      id: 'F-001', title: 'Liquidity strategy',
      insight: (s.liquidity >= 70 ? 'Liquidity conditions look favorable. ' : 'Liquidity depth is a constraint to address early. ') + 'Seed concentrated liquidity on primary Mantle venues before broad marketing, then widen ranges as volume builds.',
      basis: bySource(evidence, 'mantle-defi-operator').concat(bySource(evidence, 'mantle-network-primer')),
      confidence: s.liquidity >= 70 ? 'High' : 'Moderate'
    },
    {
      id: 'F-002', title: 'Distribution opportunities',
      insight: 'Prioritize distribution surfaces that map to ' + inv + ' across ' + (s.regions.length ? s.regions.join(', ') : 'target regions') + ', and reduce onboarding friction.',
      basis: bySource(evidence, 'mantle-data-indexer'),
      confidence: s.reach >= 70 ? 'High' : 'Moderate'
    },
    {
      id: 'F-003', title: 'Risk & compliance posture',
      insight: (s.riskScore >= 70 ? 'Risk posture is manageable with standard controls. ' : 'Risk posture needs attention. ') + 'Validate every distribution recommendation through mantle-risk-evaluator (Pass / Warn / Block) before execution.',
      basis: bySource(evidence, 'mantle-risk-evaluator'),
      confidence: s.riskScore >= 70 ? 'High' : 'Moderate'
    }
  ];

  const priorities = s.liquidity <= s.reach
    ? ['Seed liquidity depth', 'Enable compliant onboarding', 'Widen discovery', 'Expand cross-chain']
    : ['Widen discovery', 'Seed liquidity depth', 'Enable compliant onboarding', 'Expand cross-chain'];

  return { reasoning: reasoning, findings: findings, conflicts: conflicts, priorities: priorities };
}

// RESEARCH GAP DETECTOR — missing information that reduces confidence.
function detectGaps(clean) {
  const gaps = [];
  if (!has(clean.assetValue)) gaps.push('Liquidity budget / raise size not provided \u2014 initial liquidity cannot be sized precisely.');
  gaps.push('Investor demand is unverified \u2014 no committed order book or soft commitments were provided.');
  gaps.push('Secondary-market and distribution partnerships were not provided.');
  gaps.push('Live on-chain metrics (TVL, volumes, wallet activity) require connected Mantle Skills to quantify.');
  if (!regionsOf(clean).length) gaps.push('Target regions unspecified \u2014 regulatory surface is unknown.');
  if (!has(clean.targetInvestors)) gaps.push('Target investor profile unspecified \u2014 channel selection is provisional.');
  if (!has(clean.distributionGoal)) gaps.push('Distribution goal not stated \u2014 success criteria are assumed.');
  return gaps;
}

// CONFIDENCE ENGINE — logical, factor-based, never random.
function scoreConfidence(clean, evidence, gaps, reasoningResult, skillRuns) {
  const s = computeScores(clean);
  const completed = skillRuns.filter(function (r) { return r.status === 'Completed'; }).length;
  const totalSkills = skillRuns.length || 4;
  const avgConf = evidence.length ? Math.round(evidence.reduce(function (a, e) { return a + (e.confidencePct || 0); }, 0) / evidence.length) : 0;
  const skillFactor = Math.round(completed / totalSkills * 100);
  const gapPenalty = Math.min(28, gaps.length * 5);
  const conflictPenalty = (reasoningResult.conflicts.length || 0) * 4;
  const raw = s.completeness * 0.4 + skillFactor * 0.2 + avgConf * 0.4;
  const value = Math.max(25, Math.min(96, Math.round(raw - gapPenalty - conflictPenalty)));
  const label = value >= 75 ? 'High' : value >= 50 ? 'Moderate' : 'Low';
  const factors = [
    { factor: 'Evidence completeness', value: s.completeness + '%' },
    { factor: 'Mantle Skills completed', value: completed + '/' + totalSkills },
    { factor: 'Avg. evidence confidence', value: avgConf + '%' },
    { factor: 'Research gaps', value: String(gaps.length) },
    { factor: 'Conflicting evidence', value: String(reasoningResult.conflicts.length) }
  ];
  const explanation = 'Derived from ' + s.completeness + '% input completeness, ' + completed + '/' + totalSkills +
    ' skills completed, ' + avgConf + '% average evidence confidence, against ' + gaps.length + ' research gap(s) and ' +
    reasoningResult.conflicts.length + ' conflict(s). ' +
    (label === 'High' ? 'Inputs were sufficient for a reliable directional estimate.'
      : label === 'Moderate' ? 'Directionally useful, but key inputs and live data are missing.'
        : 'Provisional \u2014 additional research is required before a reliable recommendation.');
  return { value: value, label: label, strengthLevel: label, explanation: explanation, reason: explanation, factors: factors };
}

module.exports = {
  buildEvidence: buildEvidence, reason: reason, detectGaps: detectGaps, scoreConfidence: scoreConfidence, bySource: bySource
};
