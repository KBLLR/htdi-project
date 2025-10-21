// src/modules/devlogPipeline.js
// Turn raw devlog events into human-readable lines + model-friendly JSONL + action list.

import { onDevlog } from '@modules/devlog.js';
import { defaultRules } from '@modules/devlogRules.js';

/**
 * @typedef {Object} DevlogEntry
 * @property {string} ts
 * @property {'debug'|'info'|'warn'|'error'} level
 * @property {string} message
 * @property {string=} tag
 */

/**
 * @typedef {Object} ActionHint
 * @property {string} code
 * @property {number} priority      // lower = more urgent
 * @property {string} summary
 * @property {string[]} steps
 * @property {{type:string,value:string}[]} refs
 * @property {string=} ruleId
 */

function normalize(e) {
  return {
    ts: e.ts || new Date().toISOString(),
    level: e.level || 'info',
    message: String(e.message ?? ''),
    tag: e.tag,
  };
}

function classify(entry, rules) {
  /** @type {ActionHint[]} */
  const hints = [];
  for (const r of rules) {
    const m = entry.message.match(r.test);
    if (m) {
      const hint = r.classify(m) || null;
      if (hint) {
        hints.push({ ...hint, ruleId: r.id });
      }
    }
  }
  return hints;
}

function formatHuman(entry) {
  const icon = entry.level === 'error' ? '🧯'
    : entry.level === 'warn' ? '⚠️'
      : entry.level === 'info' ? 'ℹ️'
        : '🪵';
  const tag = entry.tag ? ` [${entry.tag}]` : '';
  return `${icon} ${entry.ts} ${entry.level.toUpperCase()}${tag}: ${entry.message}`;
}

export function registerDevlogPipeline({
  bufferSize = 400,
  rules = defaultRules,
  dedupeWindowMs = 10_000,
} = {}) {
  /** @type {(DevlogEntry & {hints:ActionHint[]})[]} */
  const ring = [];
  /** de-dupe seen action (code+summary) within a window */
  const seen = new Map(); // key -> ts

  const unsub = onDevlog((e) => {
    const entry = normalize(e);
    const hints = classify(entry, rules);

    // de-dupe hints by (code+summary) for a short window
    const now = Date.now();
    const freshHints = hints.filter(h => {
      const key = `${h.code}::${h.summary}`;
      const last = seen.get(key) || 0;
      if (now - last < dedupeWindowMs) return false;
      seen.set(key, now);
      return true;
    });

    ring.push({ ...entry, hints: freshHints });
    if (ring.length > bufferSize) ring.shift();
  });

  function getHumanFeed({ max = 120 } = {}) {
    const start = Math.max(0, ring.length - max);
    return ring.slice(start).map(formatHuman).join('\n');
  }

  function getModelFeed({ max = 200 } = {}) {
    const start = Math.max(0, ring.length - max);
    // JSONL: one JSON object per line
    return ring.slice(start).map(r => JSON.stringify({
      ts: r.ts,
      level: r.level,
      message: r.message,
      tag: r.tag ?? null,
      hints: r.hints,
    })).join('\n');
  }

  function getActionList() {
    /** @type {Record<string, ActionHint & {count:number, examples:string[]}>} */
    const map = {};
    for (const r of ring) {
      for (const h of r.hints) {
        const key = `${h.code}::${h.summary}`;
        const cur = map[key] || { ...h, count: 0, examples: [] };
        cur.count += 1;
        if (cur.examples.length < 3) cur.examples.push(r.message);
        map[key] = cur;
      }
    }
    // sort by priority asc then frequency desc
    return Object.values(map).sort((a, b) => (a.priority - b.priority) || (b.count - a.count));
  }

  // expose for debugging
  const api = {
    dispose: unsub,
    getHumanFeed,
    getModelFeed,
    getActionList,
  };
  window.__devlogPipeline = api;
  return api;
}
// src/main-devlog-pipeline-setup.js
// Minimal wiring you can import once in main.js (keeps main tidy)

import { enableOverlay, installConsoleTap, emitDevlog } from '@modules/devlog.js';
import { registerDevlogPipeline } from '@modules/devlogPipeline.js';

export function setupDevlogUX() {
  // Mirror console → overlay, hidden by default (Alt+D toggles)
  installConsoleTap({ level: 'debug', tag: 'console' });
  enableOverlay();

  // Register pipeline (rules → actions; human/model feeds)
  const pipeline = registerDevlogPipeline();

  // Key helpers:
  document.addEventListener('keydown', (e) => {
    // Alt+L → dump JSONL model feed to console (copy+send to local LLM)
    if (e.altKey && (e.key === 'l' || e.key === 'L')) {
      const jsonl = pipeline.getModelFeed({ max: 200 });
      console.info('[devlog JSONL]\n' + jsonl);
    }
    // Alt+A → print actionable todo list (ranked)
    if (e.altKey && (e.key === 'a' || e.key === 'A')) {
      const actions = pipeline.getActionList();
      console.info('[devlog actions]', actions);
      // Optional: emit a synthetic entry that shows a summary line in overlay
      emitDevlog('info', `Actions ready (${actions.length}). Press Alt+L for JSONL, check console for list.`, { tag: 'devlog' });
    }
  });

  return pipeline;
}
