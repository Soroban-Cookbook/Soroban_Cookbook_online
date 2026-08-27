import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { RecommendationWidget } from './RecommendationWidget';
import * as tracker from '../../lib/recommendations/tracker';

// Mock the tracker module
vi.mock('../../lib/recommendations/tracker', () => ({
  trackPatternView: vi.fn(),
  getTopRecommendations: vi.fn(() => []),
  clearTrackerData: vi.fn(),
}));

describe('RecommendationWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockRenderPattern = (patternId: string) => <div>{patternId}</div>;

  describe('rendering', () => {
    it('renders the component', () => {
      render(
        <RecommendationWidget
          currentPatternId="pattern1"
          allPatternIds={['pattern1', 'pattern2']}
          renderPattern={mockRenderPattern}
        />,
      );

      expect(screen.getByText('No related patterns found yet. Keep exploring!')).toBeDefined();
    });

    it('renders empty state when no recommendations', () => {
      vi.mocked(tracker.getTopRecommendations).mockReturnValue([]);

      render(
        <RecommendationWidget
          currentPatternId="pattern1"
          allPatternIds={['pattern1', 'pattern2']}
          renderPattern={mockRenderPattern}
        />,
      );

      expect(screen.getByText('No related patterns found yet. Keep exploring!')).toBeDefined();
    });

    it('renders recommendations when available', () => {
      vi.mocked(tracker.getTopRecommendations).mockReturnValue(['pattern2', 'pattern3']);

      render(
        <RecommendationWidget
          currentPatternId="pattern1"
          allPatternIds={['pattern1', 'pattern2', 'pattern3']}
          renderPattern={mockRenderPattern}
        />,
      );

      expect(screen.getByText('Related Patterns')).toBeDefined();
      expect(screen.getByText('pattern2')).toBeDefined();
      expect(screen.getByText('pattern3')).toBeDefined();
    });

    it('applies custom className', () => {
      const { container } = render(
        <RecommendationWidget
          currentPatternId="pattern1"
          allPatternIds={['pattern1']}
          renderPattern={mockRenderPattern}
          className="custom-class"
        />,
      );

      const widget = container.querySelector('.widget');
      expect(widget?.className).toContain('custom-class');
    });
  });

  describe('tracking behavior', () => {
    it('tracks current pattern view on mount', () => {
      render(
        <RecommendationWidget
          currentPatternId="pattern1"
          allPatternIds={['pattern1', 'pattern2']}
          renderPattern={mockRenderPattern}
        />,
      );

      expect(vi.mocked(tracker.trackPatternView)).toHaveBeenCalledWith('pattern1');
    });

    it('tracks pattern view on currentPatternId change', () => {
      const { rerender } = render(
        <RecommendationWidget
          currentPatternId="pattern1"
          allPatternIds={['pattern1', 'pattern2']}
          renderPattern={mockRenderPattern}
        />,
      );

      expect(vi.mocked(tracker.trackPatternView)).toHaveBeenCalledWith('pattern1');

      vi.clearAllMocks();

      rerender(
        <RecommendationWidget
          currentPatternId="pattern2"
          allPatternIds={['pattern1', 'pattern2']}
          renderPattern={mockRenderPattern}
        />,
      );

      expect(vi.mocked(tracker.trackPatternView)).toHaveBeenCalledWith('pattern2');
    });

    it('fetches recommendations based on tracking', () => {
      vi.mocked(tracker.getTopRecommendations).mockReturnValue(['pattern2']);

      render(
        <RecommendationWidget
          currentPatternId="pattern1"
          allPatternIds={['pattern1', 'pattern2', 'pattern3']}
          renderPattern={mockRenderPattern}
          maxRecommendations={3}
        />,
      );

      expect(vi.mocked(tracker.getTopRecommendations)).toHaveBeenCalledWith(
        ['pattern1', 'pattern2', 'pattern3'],
        3,
        'pattern1',
      );
    });

    it('excludes current pattern from recommendations', () => {
      render(
        <RecommendationWidget
          currentPatternId="pattern1"
          allPatternIds={['pattern1', 'pattern2', 'pattern3']}
          renderPattern={mockRenderPattern}
        />,
      );

      // Third argument should be the current pattern to exclude
      const calls = vi.mocked(tracker.getTopRecommendations).mock.calls;
      expect(calls[0][2]).toBe('pattern1');
    });
  });

  describe('props handling', () => {
    it('uses custom maxRecommendations', () => {
      render(
        <RecommendationWidget
          currentPatternId="pattern1"
          allPatternIds={['pattern1', 'pattern2', 'pattern3']}
          renderPattern={mockRenderPattern}
          maxRecommendations={5}
        />,
      );

      const calls = vi.mocked(tracker.getTopRecommendations).mock.calls;
      expect(calls[0][1]).toBe(5);
    });

    it('defaults maxRecommendations to 3', () => {
      render(
        <RecommendationWidget
          currentPatternId="pattern1"
          allPatternIds={['pattern1', 'pattern2', 'pattern3']}
          renderPattern={mockRenderPattern}
        />,
      );

      const calls = vi.mocked(tracker.getTopRecommendations).mock.calls;
      expect(calls[0][1]).toBe(3);
    });

    it('calls renderPattern for each recommendation', () => {
      const renderMock = vi.fn((id: string) => <div>{id}</div>);
      vi.mocked(tracker.getTopRecommendations).mockReturnValue(['pattern2', 'pattern3']);

      render(
        <RecommendationWidget
          currentPatternId="pattern1"
          allPatternIds={['pattern1', 'pattern2', 'pattern3']}
          renderPattern={renderMock}
        />,
      );

      expect(renderMock).toHaveBeenCalledWith('pattern2');
      expect(renderMock).toHaveBeenCalledWith('pattern3');
    });
  });

  describe('edge cases', () => {
    it('handles empty allPatternIds', () => {
      render(
        <RecommendationWidget
          currentPatternId="pattern1"
          allPatternIds={[]}
          renderPattern={mockRenderPattern}
        />,
      );

      expect(
        screen.getByText('No related patterns found yet. Keep exploring!'),
      ).toBeDefined();
    });

    it('handles single pattern', () => {
      vi.mocked(tracker.getTopRecommendations).mockReturnValue([]);

      render(
        <RecommendationWidget
          currentPatternId="pattern1"
          allPatternIds={['pattern1']}
          renderPattern={mockRenderPattern}
        />,
      );

      expect(
        screen.getByText('No related patterns found yet. Keep exploring!'),
      ).toBeDefined();
    });

    it('handles pattern id changes but same recommendations', () => {
      vi.mocked(tracker.getTopRecommendations).mockReturnValue(['pattern2']);

      const { rerender } = render(
        <RecommendationWidget
          currentPatternId="pattern1"
          allPatternIds={['pattern1', 'pattern2']}
          renderPattern={mockRenderPattern}
        />,
      );

      // Change to different pattern but get same recommendation
      vi.mocked(tracker.getTopRecommendations).mockReturnValue(['pattern2']);

      rerender(
        <RecommendationWidget
          currentPatternId="pattern3"
          allPatternIds={['pattern1', 'pattern2', 'pattern3']}
          renderPattern={mockRenderPattern}
        />,
      );

      expect(screen.getByText('pattern2')).toBeDefined();
    });

    it('handles rapid pattern changes', () => {
      const { rerender } = render(
        <RecommendationWidget
          currentPatternId="pattern1"
          allPatternIds={['pattern1', 'pattern2', 'pattern3']}
          renderPattern={mockRenderPattern}
        />,
      );

      for (let i = 2; i <= 10; i++) {
        rerender(
          <RecommendationWidget
            currentPatternId={`pattern${i}`}
            allPatternIds={['pattern1', 'pattern2', 'pattern3']}
            renderPattern={mockRenderPattern}
          />,
        );
      }

      // Should not throw and should track last viewed
      expect(vi.mocked(tracker.trackPatternView)).toHaveBeenLastCalledWith('pattern10');
    });
  });

  describe('integration with tracker', () => {
    it('passes correct arguments to getTopRecommendations', () => {
      const patterns = ['pattern1', 'pattern2', 'pattern3', 'pattern4'];

      render(
        <RecommendationWidget
          currentPatternId="pattern1"
          allPatternIds={patterns}
          renderPattern={mockRenderPattern}
          maxRecommendations={2}
        />,
      );

      expect(vi.mocked(tracker.getTopRecommendations)).toHaveBeenCalledWith(
        patterns,
        2,
        'pattern1',
      );
    });

    it('updates recommendations when allPatternIds changes', () => {
      const { rerender } = render(
        <RecommendationWidget
          currentPatternId="pattern1"
          allPatternIds={['pattern1', 'pattern2']}
          renderPattern={mockRenderPattern}
        />,
      );

      vi.clearAllMocks();
      vi.mocked(tracker.getTopRecommendations).mockReturnValue(['pattern3']);

      rerender(
        <RecommendationWidget
          currentPatternId="pattern1"
          allPatternIds={['pattern1', 'pattern2', 'pattern3']}
          renderPattern={mockRenderPattern}
        />,
      );

      expect(vi.mocked(tracker.getTopRecommendations)).toHaveBeenCalledWith(
        ['pattern1', 'pattern2', 'pattern3'],
        3,
        'pattern1',
      );
    });
  });
});
