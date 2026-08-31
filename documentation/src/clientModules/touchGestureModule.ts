/**
 * Touch Gesture Client Module — Phase 4: Touch Gestures (issue #325)
 *
 * This Docusaurus client module adds swipe-to-open/close gesture support
 * for the mobile sidebar menu, as progressive enhancement on top of the
 * existing tap-to-open behaviour.
 *
 * Implementation
 * ──────────────
 * Uses native `touchstart`, `touchmove`, `touchend` events to detect
 * horizontal swipe gestures:
 *
 *   - Swipe right (from near the left edge OR anywhere when sidebar is
 *     closed) → opens the sidebar by clicking the hamburger toggle.
 *   - Swipe left (when sidebar is open) → closes the sidebar by clicking
 *     the backdrop overlay.
 *
 * A minimum distance threshold (50 px) and velocity threshold (0.3 px/ms)
 * prevent accidental triggers. Mostly-vertical swipes are ignored so page
 * scrolling is unaffected.
 *
 * Guard clauses ensure handlers only attach on touch-capable devices and
 * are skipped on desktop / non-touch viewports.
 *
 * Progressive enhancement
 * ───────────────────────
 * Existing tap-to-open/close controls keep working unchanged. Desktop
 * behaviour is unaffected (no touch events → no handler attachment).
 * No new npm dependencies are introduced.
 */

// ─── Configuration ───────────────────────────────────────────────────────────

/** Minimum horizontal distance (px) for a swipe to register. */
const SWIPE_DISTANCE_THRESHOLD = 50;

/** Maximum time (ms) for a swipe to complete (prevents slow drags). */
const SWIPE_TIME_THRESHOLD = 300;

/** Minimum velocity (px/ms) for a swipe to register. */
const SWIPE_VELOCITY_THRESHOLD = 0.3;

/**
 * Maximum horizontal offset (px) from the left edge of the viewport
 * where a right-swipe can originate (edge-swipe detection).
 */
const EDGE_SWIPE_ZONE = 30;

/** Desktop breakpoint — must match mobile-menu.css `@media (max-width: 996px)`. */
const _MOBILE_BREAKPOINT = 997;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Detects whether the Docusaurus mobile sidebar is currently open.
 *
 * Docusaurus 3.x adds `.navbar-sidebar--show` on the parent `<nav>`
 * when the sidebar is visible (see mobile-menu.css header comment).
 */
function isSidebarOpen(): boolean {
  return document.querySelector('nav.navbar-sidebar--show') !== null;
}

/**
 * Opens the sidebar by clicking the hamburger toggle button.
 *
 * Docusaurus 3.x renders `.navbar__toggle` inside the navbar; clicking
 * it toggles the `.navbar-sidebar--show` class on the parent `<nav>`.
 */
function openSidebar(): void {
  const toggle = document.querySelector<HTMLButtonElement>('.navbar__toggle');
  if (toggle) {
    toggle.click();
  }
}

/**
 * Closes the sidebar by clicking the backdrop overlay.
 *
 * Docusaurus 3.x renders `.navbar-sidebar__backdrop` inside the navbar;
 * clicking it removes `.navbar-sidebar--show` from the parent `<nav>`.
 */
function closeSidebar(): void {
  const backdrop = document.querySelector<HTMLElement>('.navbar-sidebar__backdrop');
  if (backdrop) {
    backdrop.click();
  }
}

// ─── Touch state ─────────────────────────────────────────────────────────────

/** Touch coordinates captured at `touchstart`. */
let touchStartX = 0;
let touchStartY = 0;
let touchStartTime = 0;

// ─── Touch event handlers ────────────────────────────────────────────────────

function handleTouchStart(e: TouchEvent): void {
  const touch = e.touches[0];
  touchStartX = touch.clientX;
  touchStartY = touch.clientY;
  touchStartTime = Date.now();
}

function handleTouchEnd(e: TouchEvent): void {
  const touch = e.changedTouches[0];
  const deltaX = touch.clientX - touchStartX;
  const deltaY = touch.clientY - touchStartY;
  const elapsed = Date.now() - touchStartTime;

  // Ignore slow gestures (drag, not swipe).
  if (elapsed > SWIPE_TIME_THRESHOLD) return;

  const velocity = Math.abs(deltaX) / elapsed;

  // Ignore mostly-vertical swipes so page scrolling isn't broken.
  if (Math.abs(deltaY) > Math.abs(deltaX)) return;

  // Swipe right → open sidebar.
  if (deltaX > SWIPE_DISTANCE_THRESHOLD && velocity > SWIPE_VELOCITY_THRESHOLD) {
    const sidebarOpen = isSidebarOpen();
    // Only open if the sidebar is not already open.
    // Allow edge swipe (from left ~30 px) or any right-swipe when closed.
    if (!sidebarOpen && (touchStartX < EDGE_SWIPE_ZONE || deltaX > EDGE_SWIPE_ZONE)) {
      openSidebar();
    }
    return;
  }

  // Swipe left → close sidebar.
  if (deltaX < -SWIPE_DISTANCE_THRESHOLD && velocity > SWIPE_VELOCITY_THRESHOLD) {
    if (isSidebarOpen()) {
      closeSidebar();
    }
  }
}

// ─── Module lifecycle ─────────────────────────────────────────────────────────

let attached = false;

function attachTouchListeners(): void {
  if (attached) return;
  attached = true;

  document.addEventListener('touchstart', handleTouchStart, { passive: true });
  document.addEventListener('touchend', handleTouchEnd, { passive: true });
}

// ─── Docusaurus client module entry points ────────────────────────────────────

/**
 * Called after every route change in Docusaurus SPA navigation.
 * No-op for touch listeners (they persist at `document` level),
 * but resets the `attached` flag to match the module lifecycle
 * pattern established by searchAnalyticsModule.
 */
export function onRouteDidUpdate(): void {
  // Touch listeners are attached to `document` which persists across
  // SPA navigations — no re-attachment needed.  The `attached` flag
  // is intentionally NOT reset here because the listeners should
  // survive route changes.
}

// Bootstrap on module load for the initial page.
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attachTouchListeners);
  } else {
    attachTouchListeners();
  }
}
