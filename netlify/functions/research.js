/* Mantle Seeker — /api/research  (buffered JSON endpoint)
 *
 * Netlify Function (classic handler). Validates input, rate-limits by IP, runs the
 * Research Orchestrator to completion and returns a structured Distribution
 * Intelligence Dossier as JSON. Never returns free-form AI text. Never crashes.
 *
 * Security: API keys (AI_API_KEY / MANTLE_SKILLS_URL) stay server-side and are
 * never sent to the client. Input is sanitized and validated before use.
 */
'use strict';
const { runResearch } = require('./lib/orchestrator');

// Simple in-memory rate limiter (per warm instance). For durable limits across
// instances, back this with Netlify KV / Upstash in production.
const WINDOW_MS = 60 * 1000;
const MAX_HITS = 20;
const HITS = new Map();
function rateLimit(key) {
  const now = Date.now();
  const arr = (HITS.get(key) || []).filter(function (t) { return now - t < WINDOW_MS; });
  arr.push(now);
  HITS.set(key, arr);
  return { allowed: arr.length <= MAX_HITS, remaining: Math.max(0, MAX_HITS - arr.length), limit: MAX_HITS };
}

const BASE_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff'
};

function json(statusCode, body, extra) {
  return { statusCode: statusCode, headers: Object.assign({}, BASE_HEADERS, extra || {}), body: JSON.stringify(body) };
}

exports.handler = async function (event) {
  try {
    if (event.httpMethod === 'OPTIONS') {
      return { statusCode: 204, headers: Object.assign({}, BASE_HEADERS, { 'Allow': 'POST, OPTIONS' }) };
    }
    if (event.httpMethod !== 'POST') {
      return json(405, { ok: false, error: 'Method not allowed. Use POST.' }, { 'Allow': 'POST, OPTIONS' });
    }

    const ip = (event.headers && (event.headers['x-nf-client-connection-ip'] || event.headers['x-forwarded-for'] || event.headers['client-ip'])) || 'anon';
    const rl = rateLimit(String(ip).split(',')[0].trim());
    if (!rl.allowed) {
      return json(429, { ok: false, error: 'Rate limit exceeded. Try again shortly.' }, { 'Retry-After': '60' });
    }

    let input;
    try { input = event.body ? JSON.parse(event.body) : {}; }
    catch (e) { return json(400, { ok: false, error: 'Invalid JSON body.' }); }
    if (typeof input !== 'object' || input === null || Array.isArray(input)) {
      return json(400, { ok: false, error: 'Request body must be a JSON object.' });
    }

    const result = await runResearch(input);
    if (!result.ok) {
      return json(422, { ok: false, error: 'Validation failed. Please complete the required fields.', errors: result.errors, session: result.session });
    }

    return json(200, {
      ok: true,
      mode: process.env.AI_API_KEY ? 'assisted' : 'deterministic',
      researchId: result.session.researchId,
      session: result.session,
      activityLog: result.activityLog,
      skillRuns: result.skillRuns,
      dossier: result.dossier
    }, { 'X-RateLimit-Remaining': String(rl.remaining) });
  } catch (err) {
    // Never crash — always return a meaningful error.
    return json(500, { ok: false, error: 'Internal research error.', detail: (err && err.message) || 'unknown' });
  }
};
