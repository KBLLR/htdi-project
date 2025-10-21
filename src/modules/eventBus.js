const KEY = '__kbllr_eventbus__';

class EventBus {
  constructor() { this.map = new Map(); }
  on(type, handler) {
    if (!this.map.has(type)) this.map.set(type, new Set());
    this.map.get(type).add(handler);
    return () => this.off(type, handler);
  }
  off(type, handler) {
    const s = this.map.get(type); if (!s) return;
    s.delete(handler); if (s.size === 0) this.map.delete(type);
  }
  emit(type, payload) {
    const s = this.map.get(type); if (!s) return;
    for (const fn of [...s]) { try { fn(payload); } catch (e) { console.error('[bus]', type, e); } }
  }
}
export const bus = typeof window !== 'undefined'
  ? (window[KEY] = window[KEY] || new EventBus())
  : new EventBus();
