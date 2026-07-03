/* Mantle Seeker — /api/research/stream  (streaming SSE endpoint)
 *
 * Netlify Functions v2 (Web Request/Response). Streams the orchestrator's
 * progress events to the frontend as Server-Sent Events so users watch the
 * investigation happen in real time, then a final `done` event carries the
 * full Distribution Intelligence Dossier.
 *
 * Each SSE message: `data: {json}\n\n` where json is one orchestrator event
 * ({type:'session'|'event'|'plan'|'skill'|'error'|'done', ...}).
 */
import { investigate } from './lib/orchestrator.js';

export default async function (req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { 'Allow': 'POST, OPTIONS' } });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, error: 'Method not allowed. Use POST.' }), {
      status: 405, headers: { 'Content-Type': 'application/json', 'Allow': 'POST, OPTIONS' }
    });
  }

  let input = {};
  try { input = await req.json(); } catch (e) { input = {}; }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = function (obj) {
        try { controller.enqueue(encoder.encode('data: ' + JSON.stringify(obj) + '\n\n')); } catch (e) { /* client gone */ }
      };
      try {
        send({ type: 'open', at: new Date().toISOString() });
        for await (const evt of investigate(input)) { send(evt); }
      } catch (err) {
        send({ type: 'error', errors: [{ message: (err && err.message) || 'stream failure' }] });
      } finally {
        send({ type: 'end' });
        controller.close();
      }
    }
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-store, no-transform',
      'Connection': 'keep-alive',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}

export const config = { path: '/api/research/stream' };
