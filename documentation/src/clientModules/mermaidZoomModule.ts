/**
 * Mermaid Zoom Module
 *
 * Provides keyboard-navigable lightbox for diagram zoom functionality.
 * Supports:
 *   - Escape to close lightbox
 *   - +/- keys to adjust zoom scale
 *   - Tab focus cycling within lightbox
 *
 * Usage:
 *   initMermaidZoom()
 */

export interface ZoomLightboxState {
  isOpen: boolean;
  scale: number;
  minScale: number;
  maxScale: number;
}

const ZOOM_STEP = 0.1;
const MIN_SCALE = 0.5;
const MAX_SCALE = 3;

let lightboxState: ZoomLightboxState = {
  isOpen: false,
  scale: 1,
  minScale: MIN_SCALE,
  maxScale: MAX_SCALE,
};

let lightboxElement: HTMLElement | null = null;

/**
 * Create the lightbox DOM element with required attributes for accessibility
 */
function createLightbox(): HTMLElement {
  const lightbox = document.createElement('div');
  lightbox.id = 'mermaid-zoom-lightbox';
  lightbox.setAttribute('role', 'dialog');
  lightbox.setAttribute('aria-modal', 'true');
  lightbox.setAttribute('aria-label', 'Diagram zoom viewer');
  lightbox.setAttribute('tabindex', '0');
  lightbox.style.display = 'none';
  lightbox.style.position = 'fixed';
  lightbox.style.top = '0';
  lightbox.style.left = '0';
  lightbox.style.width = '100%';
  lightbox.style.height = '100%';
  lightbox.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
  lightbox.style.zIndex = '1000';
  lightbox.style.display = 'flex';
  lightbox.style.alignItems = 'center';
  lightbox.style.justifyContent = 'center';

  const content = document.createElement('div');
  content.className = 'mermaid-zoom-content';
  content.setAttribute('tabindex', '-1');
  content.style.transform = `scale(${lightboxState.scale})`;
  content.style.transformOrigin = 'center';
  content.style.transition = 'transform 0.2s ease-in-out';

  const closeButton = document.createElement('button');
  closeButton.setAttribute('aria-label', 'Close diagram zoom');
  closeButton.className = 'mermaid-zoom-close';
  closeButton.textContent = '×';
  closeButton.style.position = 'absolute';
  closeButton.style.top = '20px';
  closeButton.style.right = '20px';
  closeButton.style.background = 'white';
  closeButton.style.border = 'none';
  closeButton.style.borderRadius = '50%';
  closeButton.style.width = '40px';
  closeButton.style.height = '40px';
  closeButton.style.fontSize = '24px';
  closeButton.style.cursor = 'pointer';
  closeButton.style.zIndex = '1001';
  closeButton.setAttribute('tabindex', '0');

  lightbox.appendChild(content);
  lightbox.appendChild(closeButton);

  return lightbox;
}

/**
 * Open the lightbox with a diagram
 */
export function openLightbox(diagramElement: HTMLElement): void {
  if (!lightboxElement) {
    lightboxElement = createLightbox();
    document.body.appendChild(lightboxElement);
    attachKeyboardHandlers();
  }

  const content = lightboxElement.querySelector('.mermaid-zoom-content') as HTMLElement;
  const clone = diagramElement.cloneNode(true) as HTMLElement;
  content.innerHTML = '';
  content.appendChild(clone);

  lightboxState.isOpen = true;
  lightboxElement.style.display = 'flex';
  lightboxElement.focus();
}

/**
 * Close the lightbox
 */
export function closeLightbox(): void {
  if (!lightboxElement) return;

  lightboxState.isOpen = false;
  lightboxElement.style.display = 'none';
  lightboxState.scale = 1;

  const content = lightboxElement.querySelector('.mermaid-zoom-content') as HTMLElement;
  if (content) {
    content.style.transform = 'scale(1)';
  }
}

/**
 * Update zoom scale and apply to content
 */
export function updateZoom(delta: number): void {
  if (!lightboxState.isOpen) return;

  const newScale = Math.max(
    lightboxState.minScale,
    Math.min(lightboxState.maxScale, lightboxState.scale + delta),
  );

  lightboxState.scale = newScale;

  const content = lightboxElement?.querySelector('.mermaid-zoom-content') as HTMLElement;
  if (content) {
    content.style.transform = `scale(${newScale})`;
  }
}

/**
 * Get current zoom state
 */
export function getZoomState(): Readonly<ZoomLightboxState> {
  return { ...lightboxState };
}

/**
 * Attach keyboard event handlers
 */
function attachKeyboardHandlers(): void {
  if (!lightboxElement) return;

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!lightboxState.isOpen) return;

    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        closeLightbox();
        break;
      case '+':
      case '=':
        e.preventDefault();
        updateZoom(ZOOM_STEP);
        break;
      case '-':
      case '_':
        e.preventDefault();
        updateZoom(-ZOOM_STEP);
        break;
      case 'Tab':
        // Manage focus cycling within lightbox
        handleTabFocus(e);
        break;
      default:
        break;
    }
  };

  lightboxElement.addEventListener('keydown', handleKeyDown);
}

/**
 * Handle tab focus cycling within lightbox
 */
function handleTabFocus(e: KeyboardEvent): void {
  if (!lightboxElement) return;

  const focusableElements = lightboxElement.querySelectorAll(
    'button, [tabindex="0"], a, input, textarea, select',
  ) as NodeListOf<HTMLElement>;

  if (focusableElements.length === 0) return;

  const currentFocus = document.activeElement as HTMLElement;
  const focusIndex = Array.from(focusableElements).indexOf(currentFocus);

  if (e.shiftKey) {
    // Shift+Tab: move focus backward
    e.preventDefault();
    const prevIndex = focusIndex <= 0 ? focusableElements.length - 1 : focusIndex - 1;
    focusableElements[prevIndex].focus();
  } else {
    // Tab: move focus forward
    e.preventDefault();
    const nextIndex = focusIndex >= focusableElements.length - 1 ? 0 : focusIndex + 1;
    focusableElements[nextIndex].focus();
  }
}

/**
 * Initialize the module and attach event handlers to diagram containers
 */
export function initMermaidZoom(): void {
  const diagramContainers = document.querySelectorAll('[data-mermaid-diagram]');

  diagramContainers.forEach((container) => {
    const diagram = container.querySelector('.mermaid') as HTMLElement;
    if (diagram) {
      diagram.style.cursor = 'pointer';
      diagram.addEventListener('click', () => {
        openLightbox(diagram);
      });
    }
  });
}

/**
 * Cleanup function for testing
 */
export function cleanupMermaidZoom(): void {
  if (lightboxElement && lightboxElement.parentNode) {
    lightboxElement.parentNode.removeChild(lightboxElement);
  }
  lightboxElement = null;
  lightboxState = {
    isOpen: false,
    scale: 1,
    minScale: MIN_SCALE,
    maxScale: MAX_SCALE,
  };
}
