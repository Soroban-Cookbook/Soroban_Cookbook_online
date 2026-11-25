/**
 * Tests for mermaidZoomModule.ts — Keyboard interaction tests
 *
 * Covers:
 *   - Lightbox opens and closes
 *   - Escape key closes lightbox
 *   - +/- keys adjust zoom scale
 *   - Tab focus cycling within lightbox
 *   - Accessibility attributes are set correctly
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  openLightbox,
  closeLightbox,
  updateZoom,
  getZoomState,
  initMermaidZoom,
  cleanupMermaidZoom,
} from './mermaidZoomModule';

describe('mermaidZoomModule', () => {
  beforeEach(() => {
    // Create a minimal DOM structure for testing
    document.body.innerHTML = '';
    cleanupMermaidZoom();
  });

  afterEach(() => {
    cleanupMermaidZoom();
    document.body.innerHTML = '';
  });

  describe('openLightbox', () => {
    it('should open the lightbox and set isOpen to true', () => {
      const diagram = document.createElement('div');
      diagram.className = 'mermaid';
      diagram.textContent = '<svg></svg>';
      document.body.appendChild(diagram);

      openLightbox(diagram);

      const state = getZoomState();
      expect(state.isOpen).toBe(true);

      const lightbox = document.getElementById('mermaid-zoom-lightbox');
      expect(lightbox).toBeTruthy();
      expect(lightbox?.style.display).toBe('flex');
    });

    it('should create lightbox with correct accessibility attributes', () => {
      const diagram = document.createElement('div');
      diagram.className = 'mermaid';
      document.body.appendChild(diagram);

      openLightbox(diagram);

      const lightbox = document.getElementById('mermaid-zoom-lightbox');
      expect(lightbox?.getAttribute('role')).toBe('dialog');
      expect(lightbox?.getAttribute('aria-modal')).toBe('true');
      expect(lightbox?.getAttribute('aria-label')).toBe('Diagram zoom viewer');
      expect(lightbox?.getAttribute('tabindex')).toBe('0');
    });

    it('should clone the diagram into the lightbox', () => {
      const diagram = document.createElement('div');
      diagram.className = 'mermaid';
      diagram.textContent = 'Test Diagram';
      document.body.appendChild(diagram);

      openLightbox(diagram);

      const content = document.querySelector('.mermaid-zoom-content');
      expect(content?.textContent).toBe('Test Diagram');
    });

    it('should set initial scale to 1', () => {
      const diagram = document.createElement('div');
      diagram.className = 'mermaid';
      document.body.appendChild(diagram);

      openLightbox(diagram);

      const state = getZoomState();
      expect(state.scale).toBe(1);

      const content = document.querySelector('.mermaid-zoom-content') as HTMLElement;
      expect(content?.style.transform).toContain('scale(1)');
    });

    it('should create a close button with accessibility attributes', () => {
      const diagram = document.createElement('div');
      diagram.className = 'mermaid';
      document.body.appendChild(diagram);

      openLightbox(diagram);

      const closeButton = document.querySelector('.mermaid-zoom-close');
      expect(closeButton).toBeTruthy();
      expect(closeButton?.getAttribute('aria-label')).toBe('Close diagram zoom');
      expect(closeButton?.getAttribute('tabindex')).toBe('0');
    });
  });

  describe('closeLightbox', () => {
    it('should close the lightbox and set isOpen to false', () => {
      const diagram = document.createElement('div');
      diagram.className = 'mermaid';
      document.body.appendChild(diagram);

      openLightbox(diagram);
      expect(getZoomState().isOpen).toBe(true);

      closeLightbox();

      expect(getZoomState().isOpen).toBe(false);
      const lightbox = document.getElementById('mermaid-zoom-lightbox');
      expect(lightbox?.style.display).toBe('none');
    });

    it('should reset scale to 1 when closed', () => {
      const diagram = document.createElement('div');
      diagram.className = 'mermaid';
      document.body.appendChild(diagram);

      openLightbox(diagram);
      updateZoom(0.3);
      expect(getZoomState().scale).not.toBe(1);

      closeLightbox();

      expect(getZoomState().scale).toBe(1);
    });

    it('should safely handle close when lightbox does not exist', () => {
      // Should not throw
      expect(() => closeLightbox()).not.toThrow();
    });
  });

  describe('updateZoom', () => {
    it('should increase scale with positive delta', () => {
      const diagram = document.createElement('div');
      diagram.className = 'mermaid';
      document.body.appendChild(diagram);

      openLightbox(diagram);
      const initialScale = getZoomState().scale;

      updateZoom(0.1);

      expect(getZoomState().scale).toBe(initialScale + 0.1);
    });

    it('should decrease scale with negative delta', () => {
      const diagram = document.createElement('div');
      diagram.className = 'mermaid';
      document.body.appendChild(diagram);

      openLightbox(diagram);
      updateZoom(0.3);
      const currentScale = getZoomState().scale;

      updateZoom(-0.1);

      expect(getZoomState().scale).toBe(currentScale - 0.1);
    });

    it('should not exceed max scale', () => {
      const diagram = document.createElement('div');
      diagram.className = 'mermaid';
      document.body.appendChild(diagram);

      openLightbox(diagram);

      // Update zoom multiple times
      for (let i = 0; i < 30; i++) {
        updateZoom(0.1);
      }

      expect(getZoomState().scale).toBe(getZoomState().maxScale);
      expect(getZoomState().scale).toBe(3);
    });

    it('should not go below min scale', () => {
      const diagram = document.createElement('div');
      diagram.className = 'mermaid';
      document.body.appendChild(diagram);

      openLightbox(diagram);

      // Update zoom multiple times in negative direction
      for (let i = 0; i < 10; i++) {
        updateZoom(-0.1);
      }

      expect(getZoomState().scale).toBe(getZoomState().minScale);
      expect(getZoomState().scale).toBe(0.5);
    });

    it('should apply transform to content element', () => {
      const diagram = document.createElement('div');
      diagram.className = 'mermaid';
      document.body.appendChild(diagram);

      openLightbox(diagram);
      updateZoom(0.2);

      const content = document.querySelector('.mermaid-zoom-content') as HTMLElement;
      expect(content?.style.transform).toBe('scale(1.2)');
    });

    it('should not update zoom if lightbox is closed', () => {
      const diagram = document.createElement('div');
      diagram.className = 'mermaid';
      document.body.appendChild(diagram);

      openLightbox(diagram);
      closeLightbox();

      const initialScale = getZoomState().scale;
      updateZoom(0.1);

      expect(getZoomState().scale).toBe(initialScale);
    });
  });

  describe('keyboard interactions', () => {
    it('should close lightbox when Escape is pressed', () => {
      const diagram = document.createElement('div');
      diagram.className = 'mermaid';
      document.body.appendChild(diagram);

      openLightbox(diagram);
      expect(getZoomState().isOpen).toBe(true);

      const lightbox = document.getElementById('mermaid-zoom-lightbox')!;
      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      const preventDefaultSpy = vi.spyOn(escapeEvent, 'preventDefault');

      lightbox.dispatchEvent(escapeEvent);

      expect(getZoomState().isOpen).toBe(false);
      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('should increase zoom when + key is pressed', () => {
      const diagram = document.createElement('div');
      diagram.className = 'mermaid';
      document.body.appendChild(diagram);

      openLightbox(diagram);
      const initialScale = getZoomState().scale;

      const lightbox = document.getElementById('mermaid-zoom-lightbox')!;
      const plusEvent = new KeyboardEvent('keydown', { key: '+' });

      lightbox.dispatchEvent(plusEvent);

      expect(getZoomState().scale).toBe(initialScale + 0.1);
    });

    it('should increase zoom when = key is pressed (equals without shift)', () => {
      const diagram = document.createElement('div');
      diagram.className = 'mermaid';
      document.body.appendChild(diagram);

      openLightbox(diagram);
      const initialScale = getZoomState().scale;

      const lightbox = document.getElementById('mermaid-zoom-lightbox')!;
      const equalsEvent = new KeyboardEvent('keydown', { key: '=' });

      lightbox.dispatchEvent(equalsEvent);

      expect(getZoomState().scale).toBe(initialScale + 0.1);
    });

    it('should decrease zoom when - key is pressed', () => {
      const diagram = document.createElement('div');
      diagram.className = 'mermaid';
      document.body.appendChild(diagram);

      openLightbox(diagram);
      updateZoom(0.2);
      const currentScale = getZoomState().scale;

      const lightbox = document.getElementById('mermaid-zoom-lightbox')!;
      const minusEvent = new KeyboardEvent('keydown', { key: '-' });

      lightbox.dispatchEvent(minusEvent);

      expect(getZoomState().scale).toBe(currentScale - 0.1);
    });

    it('should handle Tab key for forward focus cycling', () => {
      const diagram = document.createElement('div');
      diagram.className = 'mermaid';
      document.body.appendChild(diagram);

      openLightbox(diagram);

      const lightbox = document.getElementById('mermaid-zoom-lightbox')!;
      const closeButton = lightbox.querySelector('.mermaid-zoom-close') as HTMLElement;
      const content = lightbox.querySelector('.mermaid-zoom-content') as HTMLElement;

      // Focus on first button
      lightbox.focus();

      const tabEvent = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true });
      const preventDefaultSpy = vi.spyOn(tabEvent, 'preventDefault');

      lightbox.dispatchEvent(tabEvent);

      // Should prevent default and handle focus
      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('should handle Shift+Tab for backward focus cycling', () => {
      const diagram = document.createElement('div');
      diagram.className = 'mermaid';
      document.body.appendChild(diagram);

      openLightbox(diagram);

      const lightbox = document.getElementById('mermaid-zoom-lightbox')!;
      lightbox.focus();

      const shiftTabEvent = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true });
      const preventDefaultSpy = vi.spyOn(shiftTabEvent, 'preventDefault');

      lightbox.dispatchEvent(shiftTabEvent);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('should not respond to keyboard if lightbox is closed', () => {
      const diagram = document.createElement('div');
      diagram.className = 'mermaid';
      document.body.appendChild(diagram);

      openLightbox(diagram);
      closeLightbox();

      const lightbox = document.getElementById('mermaid-zoom-lightbox')!;
      const initialScale = getZoomState().scale;

      const plusEvent = new KeyboardEvent('keydown', { key: '+' });
      lightbox.dispatchEvent(plusEvent);

      expect(getZoomState().scale).toBe(initialScale);
    });
  });

  describe('getZoomState', () => {
    it('should return current zoom state', () => {
      const diagram = document.createElement('div');
      diagram.className = 'mermaid';
      document.body.appendChild(diagram);

      openLightbox(diagram);
      updateZoom(0.2);

      const state = getZoomState();

      expect(state.isOpen).toBe(true);
      expect(state.scale).toBe(1.2);
      expect(state.minScale).toBe(0.5);
      expect(state.maxScale).toBe(3);
    });

    it('should return a copy of state (immutable)', () => {
      const diagram = document.createElement('div');
      diagram.className = 'mermaid';
      document.body.appendChild(diagram);

      openLightbox(diagram);

      const state1 = getZoomState();
      state1.scale = 999; // Try to mutate

      const state2 = getZoomState();
      expect(state2.scale).toBe(1); // Should not be affected
    });
  });

  describe('initMermaidZoom', () => {
    it('should attach click handlers to diagram containers', () => {
      const container = document.createElement('div');
      container.setAttribute('data-mermaid-diagram', '');

      const diagram = document.createElement('div');
      diagram.className = 'mermaid';
      diagram.textContent = 'Test Diagram';

      container.appendChild(diagram);
      document.body.appendChild(container);

      initMermaidZoom();

      expect(diagram.style.cursor).toBe('pointer');
    });

    it('should open lightbox when diagram is clicked', () => {
      const container = document.createElement('div');
      container.setAttribute('data-mermaid-diagram', '');

      const diagram = document.createElement('div');
      diagram.className = 'mermaid';
      diagram.textContent = 'Test Diagram';

      container.appendChild(diagram);
      document.body.appendChild(container);

      initMermaidZoom();
      diagram.click();

      expect(getZoomState().isOpen).toBe(true);
    });

    it('should handle multiple diagram containers', () => {
      const container1 = document.createElement('div');
      container1.setAttribute('data-mermaid-diagram', '');
      const diagram1 = document.createElement('div');
      diagram1.className = 'mermaid';
      container1.appendChild(diagram1);

      const container2 = document.createElement('div');
      container2.setAttribute('data-mermaid-diagram', '');
      const diagram2 = document.createElement('div');
      diagram2.className = 'mermaid';
      container2.appendChild(diagram2);

      document.body.appendChild(container1);
      document.body.appendChild(container2);

      initMermaidZoom();

      expect(diagram1.style.cursor).toBe('pointer');
      expect(diagram2.style.cursor).toBe('pointer');
    });
  });

  describe('cleanupMermaidZoom', () => {
    it('should remove lightbox from DOM', () => {
      const diagram = document.createElement('div');
      diagram.className = 'mermaid';
      document.body.appendChild(diagram);

      openLightbox(diagram);
      expect(document.getElementById('mermaid-zoom-lightbox')).toBeTruthy();

      cleanupMermaidZoom();

      expect(document.getElementById('mermaid-zoom-lightbox')).toBeNull();
    });

    it('should reset state to initial values', () => {
      const diagram = document.createElement('div');
      diagram.className = 'mermaid';
      document.body.appendChild(diagram);

      openLightbox(diagram);
      updateZoom(0.5);

      cleanupMermaidZoom();

      const state = getZoomState();
      expect(state.isOpen).toBe(false);
      expect(state.scale).toBe(1);
    });

    it('should safely handle cleanup when no lightbox exists', () => {
      expect(() => cleanupMermaidZoom()).not.toThrow();
    });
  });
});
