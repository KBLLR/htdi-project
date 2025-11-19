// src/ui/uiFrame/UIFrameOverlay.js

/**
 * UIFrameOverlay
 * - Injects an SVG overlay above the canvas
 * - Sits below the actions bar (z-index layering)
 */
export class UIFrameOverlay {
  constructor({ container, svgPath, zIndex = 200 } = {}) {
    if (!container) {
      throw new Error('[UIFrameOverlay] container is required');
    }
    this.container = container;
    this.svgPath = svgPath;
    this.zIndex = zIndex;
    this.el = null;
  }

  mount() {
    if (this.el) return;

    const frame = document.createElement('img');
    frame.className = 'ui-frame-overlay';
    frame.src = this.svgPath;
    frame.style.position = 'absolute';
    frame.style.inset = '0';
    frame.style.pointerEvents = 'none';
    frame.style.zIndex = String(this.zIndex);
    frame.style.width = '100%';
    frame.style.height = '100%';
    frame.style.objectFit = 'cover';
    frame.style.opacity = '0.8';

    this.container.appendChild(frame);
    this.el = frame;
    console.log('[UIFrameOverlay] Mounted:', this.svgPath);
  }

  updateSvg(svgPath) {
    this.svgPath = svgPath;
    if (this.el) {
      this.el.src = svgPath;
      console.log('[UIFrameOverlay] Updated:', svgPath);
    }
  }

  setOpacity(opacity) {
    if (this.el) {
      this.el.style.opacity = String(opacity);
    }
  }

  show() {
    if (this.el) {
      this.el.style.display = 'block';
    }
  }

  hide() {
    if (this.el) {
      this.el.style.display = 'none';
    }
  }

  destroy() {
    if (!this.el) return;
    this.el.remove();
    this.el = null;
    console.log('[UIFrameOverlay] Destroyed');
  }
}
