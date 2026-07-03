/* Mantle Seeker backend — shared utilities: sanitize, validate, scoring, ids */
'use strict';

const FIELDS = ['assetName', 'assetType', 'assetValue', 'targetInvestors', 'targetRegion', 'launchStage', 'distributionGoal', 'notes'];
const REQUIRED = ['assetName', 'assetType'];

const STAGE_W = { 'Idea / Pre-issuance': 45, 'Pre-launch': 58, 'Live': 72, 'Scaling': 80, 'Planning': 45, 'Pre-Issuance': 52, 'Issued': 70 };
const CAT_W = {
  'Tokenized Equity': 82, 'Real Estate': 64, 'Private Credit': 70,
  'Treasuries / Bonds': 86, 'Commodities': 66, 'Fund / Basket': 74, 'Other': 60,
  'Treasury': 86, 'Bond': 84, 'Equity': 82, 'Fund': 74, 'Stablecoin': 88
};

function has(v) { return !!(v && ('' + v).trim()); }

// Strip control chars + any HTML tags, collapse whitespace, cap length.
function sanitizeStr(v, max) {
  if (v == null) return '';
  let s = ('' + v)
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (max && s.length > max) s = s.slice(0, max);
  return s;
}

// Accept both the canonical contract and the legacy frontend field names.
function normalize(raw) {
  const src = raw || {};
  const pick = function () {
    for (let i = 0; i < arguments.length; i++) {
      const k = arguments[i];
      if (src[k] != null && ('' + src[k]).trim() !== '') return src[k];
    }
    return '';
  };
  return {
    assetName: pick('assetName'),
    assetType: pick('assetType', 'assetCategory'),
    assetValue: pick('assetValue'),
    targetInvestors: pick('targetInvestors'),
    targetRegion: pick('targetRegion', 'targetRegions'),
    launchStage: pick('launchStage', 'stage'),
    distributionGoal: pick('distributionGoal', 'goals'),
    notes: pick('notes')
  };
}

function validate(raw) {
  const norm = normalize(raw);
  const clean = {};
  for (const f of FIELDS) {
    const max = (f === 'notes' || f === 'distributionGoal') ? 1200 : 300;
    clean[f] = sanitizeStr(norm[f], max);
  }
  const errors = [];
  for (const r of REQUIRED) if (!clean[r]) errors.push({ field: r, message: r + ' is required.' });
  if (clean.assetValue && !/[0-9]/.test(clean.assetValue)) {
    // non-fatal: value is free text, but flag it
    clean._valueNote = 'Asset value has no numeric component.';
  }
  return { clean, errors };
}

function regionsOf(clean) {
  return (clean.targetRegion || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
}

// Transparent, input-derived scoring (never a market measurement).
function computeScores(clean) {
  const regions = regionsOf(clean);
  const filled = FIELDS.filter(function (k) { return has(clean[k]); }).length;
  const completeness = Math.round(filled / FIELDS.length * 100);
  const base = STAGE_W[clean.launchStage] || 55;
  const cat = CAT_W[clean.assetType] || 62;
  const reach = Math.min(95, 50 + regions.length * 10);
  const liquidity = Math.round(cat * 0.6 + base * 0.4);
  const eco = Math.round(base * 0.5 + cat * 0.5);
  const riskScore = Math.max(35, Math.min(90, 100 - (regions.length > 3 ? 18 : 8) - (base < 60 ? 15 : 5)));
  const readiness = Math.round(liquidity * 0.3 + reach * 0.25 + eco * 0.25 + riskScore * 0.2);
  return { readiness: readiness, liquidity: liquidity, reach: reach, eco: eco, riskScore: riskScore, completeness: completeness, regions: regions };
}

function sev(score) { return score >= 75 ? 'low' : score >= 60 ? 'medium' : 'high'; }

function pad(n, w) { let s = '' + n; while (s.length < w) s = '0' + s; return s; }
function hhmmss(d) { d = d || new Date(); return pad(d.getHours(), 2) + ':' + pad(d.getMinutes(), 2) + ':' + pad(d.getSeconds(), 2); }

// Research IDs: MS-YYYY-#### . Counter is per-instance; seeded to avoid collisions
// across concurrent serverless instances. (For durable IDs use a KV/DB in prod.)
let COUNTER = Math.floor(Math.random() * 900) + 1;
function researchId(date) {
  const y = (date || new Date()).getFullYear();
  COUNTER = (COUNTER % 9999) + 1;
  return 'MS-' + y + '-' + pad(COUNTER, 4);
}

function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

module.exports = {
  FIELDS: FIELDS, REQUIRED: REQUIRED, STAGE_W: STAGE_W, CAT_W: CAT_W,
  has: has, sanitizeStr: sanitizeStr, normalize: normalize, validate: validate,
  regionsOf: regionsOf, computeScores: computeScores, sev: sev,
  hhmmss: hhmmss, researchId: researchId, sleep: sleep, pad: pad
};
