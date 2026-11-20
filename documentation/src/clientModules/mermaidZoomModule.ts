/**
 * Mermaid Diagram Zoom/Pan Client Module — Issue #316
 *
 * `@docusaurus/theme-mermaid` renders each ```mermaid``` code block as an
 * inline SVG on the client (asynchronously, after the page mounts). This
 * module watches for those SVGs and makes them interactive: clicking (or
 * pressing Enter/Space) opens the diagram in a full-screen lightbox that
 * supports scroll-to-zoom and drag-to-pan.
 *
 * Detecting rendered diagrams
 * ────────────────────────────
 * Mermaid.js assigns the rendered SVG root an `id` starting with "mermaid"
 * (the id docusaurus-theme-mermaid passes to `mermaid.render()`), and the
 * theme's wrapper `<div>` carries a CSS-module class containing the literal
 * substring "mermaid" regardless of its hashed suffix. Both are used as
 * fallback selectors, similar to the selector-list pattern in
 * `searchAnalyticsModule.ts`.
 */

const DIAGRAM_SELECTORS = ['svg[id^="mermaid"]', '[class*="mermaid" i] svg'];
const ENHANCED_ATTR = 'data-zoom-enhanced';
const MIN_SCALE = 0.5;
const MAX_SCALE = 4;
const SCALE_STEP = 0.2;

// ─── Lightbox state ─────────────────────────────────────────────────────────

let overlayEl: HTMLDivElement | null = null;
let viewportEl: HTMLDivElement | null = null;
let scale = 1;
let translateX = 0;
let translateY = 0;
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;

function applyTransform(): void {
  if (!viewportEl) return;
  viewportEl.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
}

function resetTransform(): void {
  scale = 1;
  translateX = 0;
  translateY = 0;
  applyTransform();
}

function zoomBy(delta: number): void {
  scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale + delta));
  applyTransform();
}

function closeLightbox(): void {
  overlayEl?.classList.remove('mermaid-zoom-open');
}

function createButton(label: string, text: string, onClick: () => void): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'mermaid-zoom-button';
  button.setAttribute('aria-label', label);
  button.textContent = text;
  button.addEventListener('click', onClick);
  return button;
}

function ensureOverlay(): { overlay: HTMLDivElement; viewport: HTMLDivElement } {
  if (overlayEl && viewportEl) return { overlay: overlayEl, viewport: viewportEl };

  const overlay = document.createElement('div');
  overlay.className = 'mermaid-zoom-overlay';

  const dialog = document.createElement('div');
  dialog.className = 'mermaid-zoom-dialog';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-label', 'Diagram zoom view');

  const toolbar = document.createElement('div');
  toolbar.className = 'mermaid-zoom-toolbar';
  toolbar.append(
    createButton('Zoom out', '−', () => zoomBy(-SCALE_STEP)),
    createButton('Reset zoom', 'Reset', resetTransform),
    createButton('Zoom in', '+', () => zoomBy(SCALE_STEP)),
  );

  const closeButton = createButton('Close diagram zoom view', '×', closeLightbox);
  closeButton.classList.add('mermaid-zoom-close');
  toolbar.append(closeButton);

  const viewport = document.createElement('div');
  viewport.className = 'mermaid-zoom-viewport';

  dialog.append(toolbar, viewport);
  overlay.append(dialog);
  document.body.append(overlay);

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) closeLightbox();
  });

  viewport.addEventListener(
    'wheel',
    (event) => {
      event.preventDefault();
      zoomBy(event.deltaY < 0 ? SCALE_STEP : -SCALE_STEP);
    },
    { passive: false },
  );

  viewport.addEventListener('mousedown', (event) => {
    isDragging = true;
    dragStartX = event.clientX - translateX;
    dragStartY = event.clientY - translateY;
  });

  window.addEventListener('mousemove', (event) => {
    if (!isDragging) return;
    translateX = event.clientX - dragStartX;
    translateY = event.clientY - dragStartY;
    applyTransform();
  });

  window.addEventListener('mouseup', () => {
    isDragging = false;
  });

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeLightbox();
  });

  overlayEl = overlay;
  viewportEl = viewport;
  return { overlay, viewport };
}

function openLightbox(svg: SVGSVGElement): void {
  const { overlay, viewport } = ensureOverlay();
  viewport.innerHTML = '';
  viewport.append(svg.cloneNode(true));
  resetTransform();
  overlay.classList.add('mermaid-zoom-open');
}

// ─── Diagram discovery ──────────────────────────────────────────────────────

function findDiagrams(): SVGSVGElement[] {
  const found = new Set<SVGSVGElement>();
  DIAGRAM_SELECTORS.forEach((selector) => {
    document.querySelectorAll<SVGSVGElement>(selector).forEach((svg) => found.add(svg));
  });
  return Array.from(found);
}

function enhanceDiagram(svg: SVGSVGElement): void {
  if (svg.hasAttribute(ENHANCED_ATTR)) return;
  svg.setAttribute(ENHANCED_ATTR, 'true');
  svg.classList.add('mermaid-zoom-target');
  svg.setAttribute('role', 'button');
  svg.setAttribute('tabindex', '0');
  svg.setAttribute('aria-label', 'Open diagram in zoomable view');

  const activate = () => openLightbox(svg);
  svg.addEventListener('click', activate);
  svg.addEventListener('keydown', (event: KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      activate();
    }
  });
}

function enhanceAllDiagrams(): void {
  findDiagrams().forEach(enhanceDiagram);
}

// ─── Module lifecycle ───────────────────────────────────────────────────────

let mutationObserver: MutationObserver | null = null;

function observeForDiagrams(): void {
  enhanceAllDiagrams();

  mutationObserver?.disconnect();
  mutationObserver = new MutationObserver(() => enhanceAllDiagrams());
  mutationObserver.observe(document.body, { childList: true, subtree: true });
}

/** Called on every client-side navigation in case new diagrams mount. */
export function onRouteDidUpdate(): void {
  observeForDiagrams();
}

// Bootstrap on module load for the initial page
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', observeForDiagrams);
  } else {
    observeForDiagrams();
  }
}
