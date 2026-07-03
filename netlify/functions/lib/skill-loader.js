/* Mantle Seeker backend \u2014 Mantle Agent Stack skill loader.
 *
 * Reads the official skill definitions from the skills/ directory at runtime:
 *   skills/<name>/SKILL.md            (metadata: triggers, workflow, guardrails, inputs, outputs)
 *   skills/<name>/agents/openai.yaml  (runtime configuration)
 *   skills/<name>/references/          (reference material)
 *   skills/<name>/assets/              (static assets / schemas)
 *
 * NOTHING about skill selection or execution is hardcoded in the orchestrator.
 * Adding a new directory here makes a new skill available automatically. The
 * loader parses each SKILL.md YAML frontmatter and reads openai.yaml so the
 * orchestrator can honour trigger conditions, workflows and guardrails.
 */
'use strict';
const fs = require('fs');
const path = require('path');

// Resolve the skills/ directory across local, test and Netlify layouts.
function skillsRoot() {
  const candidates = [
    path.join(__dirname, '..', '..', '..', 'skills'),
    path.join(process.cwd(), 'skills'),
    path.join(__dirname, 'skills')
  ];
  for (const c of candidates) {
    try { if (fs.existsSync(c) && fs.statSync(c).isDirectory()) return c; } catch (e) { /* keep trying */ }
  }
  return candidates[0];
}

// --- Minimal YAML frontmatter parser (indentation-based, recursive, no deps). ---
function coerce(v) {
  const t = ('' + v).trim();
  if (t === 'true') return true;
  if (t === 'false') return false;
  if (t !== '' && /^-?[0-9]+(\.[0-9]+)?$/.test(t)) return Number(t);
  return t.replace(/^['"]|['"]$/g, '');
}
function indentOf(line) { return line.match(/^ */)[0].length; }

function parseFrontmatter(md) {
  const m = md.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return {};
  const lines = m[1].split('\n').filter(function (l) { return l.trim() !== ''; });
  let idx = 0;
  function parseNode(minIndent) {
    if (idx >= lines.length) return null;
    const isArray = lines[idx].trim()[0] === '-';
    if (isArray) {
      const arr = [];
      while (idx < lines.length) {
        const ind = indentOf(lines[idx]);
        const t = lines[idx].trim();
        if (ind < minIndent || t[0] !== '-') break;
        arr.push(coerce(t.slice(1)));
        idx++;
      }
      return arr;
    }
    const obj = {};
    while (idx < lines.length) {
      const ind = indentOf(lines[idx]);
      const t = lines[idx].trim();
      if (ind < minIndent || t[0] === '-') break;
      const ci = t.indexOf(':');
      if (ci === -1) { idx++; continue; }
      const key = t.slice(0, ci).trim();
      const val = t.slice(ci + 1).trim();
      idx++;
      if (val === '') {
        if (idx < lines.length && indentOf(lines[idx]) > ind) obj[key] = parseNode(indentOf(lines[idx]));
        else obj[key] = null;
      } else if (val === '|') {
        const block = [];
        while (idx < lines.length && indentOf(lines[idx]) > ind) { block.push(lines[idx].slice(ind + 2)); idx++; }
        obj[key] = block.join('\n');
      } else {
        obj[key] = coerce(val);
      }
    }
    return obj;
  }
  return parseNode(0) || {};
}

// Extract runtime scalars from openai.yaml (regex; avoids a full YAML dependency).
function parseRuntime(yamlText) {
  const out = { raw: yamlText, bytes: yamlText.length };
  const grab = function (key) {
    const re = new RegExp('^' + key + ':[ \\t]*(.+)$', 'm');
    const mm = yamlText.match(re);
    return mm ? mm[1].trim() : null;
  };
  out.name = grab('name');
  out.model = grab('model');
  out.kind = grab('kind');
  const temp = grab('temperature');
  out.temperature = temp == null ? null : Number(temp);
  const mot = grab('max_output_tokens');
  out.maxOutputTokens = mot == null ? null : Number(mot);
  return out;
}

let CACHE = null;

function loadSkills(force) {
  if (CACHE && !force) return CACHE;
  const root = skillsRoot();
  const skills = {};
  let dirs = [];
  try {
    dirs = fs.readdirSync(root).filter(function (d) {
      try { return fs.statSync(path.join(root, d)).isDirectory(); } catch (e) { return false; }
    });
  } catch (e) { dirs = []; }

  for (const name of dirs) {
    const dir = path.join(root, name);
    const skillMdPath = path.join(dir, 'SKILL.md');
    if (!fs.existsSync(skillMdPath)) continue;
    let md = '';
    try { md = fs.readFileSync(skillMdPath, 'utf8'); } catch (e) { md = ''; }
    const meta = parseFrontmatter(md);
    const runtimeRel = meta.runtime || 'agents/openai.yaml';
    const runtimePath = path.join(dir, runtimeRel);
    let runtime = null, runtimeLoaded = false;
    try { runtime = parseRuntime(fs.readFileSync(runtimePath, 'utf8')); runtimeLoaded = true; }
    catch (e) { runtime = { error: 'openai.yaml not found', bytes: 0 }; }

    const triggers = meta.triggers || {};
    skills[name] = {
      name: name,
      title: meta.title || name,
      category: meta.category || 'skill',
      description: meta.description || '',
      triggers: {
        always: !!triggers.always,
        requiresAction: !!triggers.requires_action,
        signals: Array.isArray(triggers.signals) ? triggers.signals : []
      },
      requiredInputs: Array.isArray(meta.required_inputs) ? meta.required_inputs : [],
      optionalInputs: Array.isArray(meta.optional_inputs) ? meta.optional_inputs : [],
      expectedOutputs: Array.isArray(meta.expected_outputs) ? meta.expected_outputs : [],
      guardrails: Array.isArray(meta.guardrails) ? meta.guardrails : [],
      skillMdPath: skillMdPath,
      runtimePath: runtimePath,
      runtimeLoaded: runtimeLoaded,
      runtime: runtime
    };
  }
  CACHE = { root: root, skills: skills, order: Object.keys(skills) };
  return CACHE;
}

module.exports = { loadSkills: loadSkills, parseFrontmatter: parseFrontmatter, parseRuntime: parseRuntime, skillsRoot: skillsRoot };
