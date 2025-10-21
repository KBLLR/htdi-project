// src/modules/devlog.js
// Minimal dev logger with console tap + in-page overlay (HMR-safe)
const BUS_KEY = '__kbllr_devlog_bus__';
const OVERLAY_KEY = '__kbllr_devlog_overlay__';
const TAP_KEY = '__kbllr_devlog_tap__';

const levels = ['debug', 'info', 'warn', 'error'];
const colors = {
  debug: '#9CA3AF',
  info: '#10B981',
  warn: '#F59E0B',
  error: '#EF4444'
};

class Bus {
  constructor() { this.s = new Set(); }
  on(fn) { this.s.add(fn); return () => this.s.delete(fn); }
  emit(e) { for (const fn of [...this.s]) try { fn(e); } catch (err) { } }
}

function timestamp() {
  const d = new Date();
  return d.toISOString().slice(11, 23); // HH:MM:SS.mmm
}

function ensureBus() {
  if (!window[BUS_KEY]) window[BUS_KEY] = new Bus();
  return window[BUS_KEY];
}

function ensureOverlay() {
  if (window[OVERLAY_KEY]) return window[OVERLAY_KEY];

  const wrap = document.createElement('div');
  wrap.id = 'devlog-overlay';
    wrap.style.cssText = `
      position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); z-index:999999;
      width:min(44vw,720px); max-height:40vh; overflow:auto;
      background:rgba(17,17,20,.9); color:#E5E7EB; font:12px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace;
      border:1px solid #27272a; border-radius:10px; box-shadow:0 8px 32px rgba(0,0,0,.45);
      padding:16px 18px 14px 18px; backdrop-filter: blur(6px);
      display:none; /* Hidden by default */
    `;
    const head = document.createElement('div');
    head.style.cssText = 'display:flex;align-items:center;gap:12px;margin-bottom:8px';
    head.innerHTML = `
      <strong style="font-weight:600">DevLog</strong>
      <span style="opacity:.7">(<kbd style="padding:1px 4px;border:1px solid #444;border-radius:4px;background:#111">Alt+D</kbd> to toggle)</span>
      <span style="margin-left:auto;opacity:.7" id="devlog-count">0</span>
      <button id="devlog-clear" style="margin-left:6px;background:#111;color:#eee;border:1px solid #333;border-radius:6px;padding:2px 6px;cursor:pointer">Clear</button>
    `;
    const list = document.createElement('div');
    list.id = 'devlog-list';
    list.style.cssText = 'display:flex;flex-direction:column;gap:6px';
    wrap.append(head, list);
    document.documentElement.appendChild(wrap);
  
    document.getElementById('devlog-clear').onclick = () => {
      list.innerHTML = '';
      document.getElementById('devlog-count').textContent = '0';
    };
    const api = {
      el: wrap,
      add(entry){
        const row = document.createElement('div');
        row.style.cssText = 'display:flex; gap:12px; white-space:pre-wrap; word-break:break-word';
        row.innerHTML = `
          <span style="opacity:.6">${entry.ts}</span>
          <span style="color:${colors[entry.level]};min-width:50px;text-transform:uppercase">${entry.level}</span>
          <span>${entry.message}</span>
        `;
      list.appendChild(row);
      const count = list.childElementCount;
      document.getElementById('devlog-count').textContent = String(count);
      wrap.scrollTop = wrap.scrollHeight;
    },
    toggle() { wrap.style.display = (wrap.style.display === 'none' ? '' : 'none'); }
  };

  window[OVERLAY_KEY] = api;
  document.addEventListener('keydown', (e) => {
    if (e.altKey && (e.key === 'd' || e.key === 'D')) api.toggle();
  });
  return api;
}

export function enableOverlay() {
  const bus = ensureBus();
  const ui = ensureOverlay();
  if (!ui._sub) ui._sub = bus.on((e) => ui.add(e));
  return () => { ui.toggle(); }; // returns a toggle
}

export function installConsoleTap({ level = 'debug' } = {}) {
  if (window[TAP_KEY]) return window[TAP_KEY];
  const minIdx = levels.indexOf(level);
  const bus = ensureBus();
  const orig = {
    log: console.log.bind(console),
    debug: console.debug.bind(console),
    info: console.info.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
  };
  function make(kind, fn) {
    return (...args) => {
      try {
        if (levels.indexOf(kind) >= minIdx) {
          const msg = args.map(a => {
            if (a instanceof Error) return `${a.name}: ${a.message}\n${a.stack ?? ''}`;
            if (typeof a === 'object') { try { return JSON.stringify(a); } catch { return String(a); } }
            return String(a);
          }).join(' ');
          bus.emit({ level: kind, ts: timestamp(), message: msg });
        }
      } catch {/*no-op*/ }
      fn(...args);
    };
  }
  console.log = make('debug', orig.log);
  console.debug = make('debug', orig.debug);
  console.info = make('info', orig.info);
  console.warn = make('warn', orig.warn);
  console.error = make('error', orig.error);
  const uninstall = () => {
    console.log = orig.log;
    console.debug = orig.debug;
    console.info = orig.info;
    console.warn = orig.warn;
    console.error = orig.error;
  };
  window[TAP_KEY] = uninstall;
  return uninstall;
}

export const devlog = {
  debug: (...a) => console.log(...a),
  info: (...a) => console.info(...a),
  warn: (...a) => console.warn(...a),
  error: (...a) => console.error(...a),
};
