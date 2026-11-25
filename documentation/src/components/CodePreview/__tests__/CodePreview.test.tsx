/**
 * Tests for CodePreview component — Visual regression snapshot tests
 *
 * Covers:
 *   - Basic rendering with default props
 *   - Different languages (rust, typescript, javascript)
 *   - With and without line numbers
 *   - With title, fileName, or both
 *   - Collapse/expand functionality
 *   - Copy button functionality
 *
 * Snapshots can be updated via: npm run test -- --update-snapshots
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CodePreview from '../CodePreview';

const RUST_CODE = `pub fn hello(env: Env) -> String {
  let message = String::from_linear(&env, "Hello, World!");
  message
}`;

const TYPESCRIPT_CODE = `interface Props {
  name: string;
  age: number;
}

function greet(props: Props): string {
  return \`Hello, \${props.name}!\`;
}`;

const JAVASCRIPT_CODE = `const hello = (name) => {
  console.log(\`Hello, \${name}!\`);
};

hello("World");`;

describe('CodePreview', () => {
  beforeEach(() => {
    // Mock navigator.clipboard
    global.navigator.clipboard = {
      writeText: vi.fn().mockResolvedValue(undefined),
    } as any;
  });

  describe('basic rendering', () => {
    it('renders with default props (Rust language)', () => {
      const { container } = render(
        <CodePreview code={RUST_CODE} language="rust" />
      );
      expect(container.querySelector('.wrapper')).toBeInTheDocument();
      expect(screen.getByText('rust')).toBeInTheDocument();
      expect(container).toMatchSnapshot();
    });

    it('renders TypeScript code with line numbers', () => {
      const { container } = render(
        <CodePreview code={TYPESCRIPT_CODE} language="typescript" showLineNumbers={true} />
      );
      expect(container).toMatchSnapshot();
    });

    it('renders JavaScript code without line numbers', () => {
      const { container } = render(
        <CodePreview code={JAVASCRIPT_CODE} language="javascript" showLineNumbers={false} />
      );
      expect(container).toMatchSnapshot();
    });

    it('renders with no line numbers by default when false', () => {
      const { container } = render(
        <CodePreview code={RUST_CODE} showLineNumbers={false} />
      );
      const gutters = container.querySelectorAll('.gutter');
      expect(gutters.length).toBe(0);
      expect(container).toMatchSnapshot();
    });
  });

  describe('title and fileName', () => {
    it('displays title when provided', () => {
      const { container } = render(
        <CodePreview code={RUST_CODE} title="lib.rs" />
      );
      expect(screen.getByText('lib.rs')).toBeInTheDocument();
      expect(container).toMatchSnapshot();
    });

    it('displays fileName when provided', () => {
      const { container } = render(
        <CodePreview code={RUST_CODE} fileName="contract.rs" />
      );
      expect(screen.getByText('contract.rs')).toBeInTheDocument();
      expect(container).toMatchSnapshot();
    });

    it('prefers title over fileName', () => {
      const { container } = render(
        <CodePreview code={RUST_CODE} title="lib.rs" fileName="main.rs" />
      );
      expect(screen.getByText('lib.rs')).toBeInTheDocument();
      expect(screen.queryByText('main.rs')).not.toBeInTheDocument();
      expect(container).toMatchSnapshot();
    });

    it('defaults to language when neither title nor fileName provided', () => {
      const { container } = render(
        <CodePreview code={RUST_CODE} language="rust" />
      );
      const headerTitle = screen.getAllByText('rust')[0]; // First occurrence is in the header
      expect(headerTitle).toBeInTheDocument();
      expect(container).toMatchSnapshot();
    });
  });

  describe('copy button', () => {
    it('renders copy button with initial label', () => {
      render(<CodePreview code={RUST_CODE} />);
      const copyButton = screen.getByRole('button', { name: /Copy/ });
      expect(copyButton).toBeInTheDocument();
      expect(screen.getByText('Copy')).toBeInTheDocument();
    });

    it('changes label after copying', async () => {
      const user = userEvent.setup();
      render(<CodePreview code={RUST_CODE} />);
      const copyButton = screen.getByRole('button', { name: /Copy/ });

      await user.click(copyButton);

      expect(screen.getByText('Copied!')).toBeInTheDocument();
      expect(screen.queryByText('Copy')).not.toBeInTheDocument();
    });

    it('resets copy button label after delay', async () => {
      const user = userEvent.setup();
      vi.useFakeTimers();

      render(<CodePreview code={RUST_CODE} />);
      const copyButton = screen.getByRole('button', { name: /Copy/ });

      await user.click(copyButton);
      expect(screen.getByText('Copied!')).toBeInTheDocument();

      vi.advanceTimersByTime(1500);

      expect(screen.getByText('Copy')).toBeInTheDocument();

      vi.useRealTimers();
    });

    it('copies code to clipboard', async () => {
      const user = userEvent.setup();
      render(<CodePreview code={RUST_CODE} />);
      const copyButton = screen.getByRole('button', { name: /Copy/ });

      await user.click(copyButton);

      expect(global.navigator.clipboard.writeText).toHaveBeenCalledWith(RUST_CODE);
    });

    it('has proper accessibility attributes', () => {
      render(<CodePreview code={RUST_CODE} />);
      const copyButton = screen.getByRole('button');
      expect(copyButton).toHaveAttribute('aria-label');
      expect(['Copy code to clipboard', 'Copied to clipboard']).toContain(
        copyButton.getAttribute('aria-label')
      );
    });
  });

  describe('collapse/expand functionality', () => {
    const longCode = Array(30)
      .fill(null)
      .map((_, i) => `line ${i + 1}`)
      .join('\n');

    it('does not show expand button when collapseAt is 0', () => {
      const { container } = render(
        <CodePreview code={longCode} collapseAt={0} />
      );
      const expandButton = screen.queryByRole('button', { name: /Expand/ });
      expect(expandButton).not.toBeInTheDocument();
      expect(container).toMatchSnapshot();
    });

    it('shows expand button when lines exceed collapseAt', () => {
      const { container } = render(
        <CodePreview code={longCode} collapseAt={10} />
      );
      const expandButton = screen.getByRole('button', { name: /Expand/ });
      expect(expandButton).toBeInTheDocument();
      expect(expandButton).toHaveTextContent('Expand (20 more lines)');
      expect(container).toMatchSnapshot();
    });

    it('expands code when expand button is clicked', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <CodePreview code={longCode} collapseAt={10} />
      );
      const expandButton = screen.getByRole('button', { name: /Expand/ });

      await user.click(expandButton);

      expect(expandButton).toHaveTextContent('Collapse');
      expect(container).toMatchSnapshot();
    });

    it('collapses code when collapse button is clicked', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <CodePreview code={longCode} collapseAt={10} />
      );
      const expandButton = screen.getByRole('button', { name: /Expand/ });

      await user.click(expandButton);
      expect(expandButton).toHaveTextContent('Collapse');

      await user.click(expandButton);
      expect(expandButton).toHaveTextContent(/Expand/);
      expect(container).toMatchSnapshot();
    });

    it('does not collapse single lines', () => {
      const singleLine = 'const x = 1;';
      const { container } = render(
        <CodePreview code={singleLine} collapseAt={10} />
      );
      const expandButton = screen.queryByRole('button', { name: /Expand/ });
      expect(expandButton).not.toBeInTheDocument();
      expect(container).toMatchSnapshot();
    });
  });

  describe('language highlighting', () => {
    it('renders rust code with syntax highlighting', () => {
      const { container } = render(
        <CodePreview code={RUST_CODE} language="rust" />
      );
      expect(container).toMatchSnapshot();
    });

    it('renders typescript code with syntax highlighting', () => {
      const { container } = render(
        <CodePreview code={TYPESCRIPT_CODE} language="typescript" />
      );
      expect(container).toMatchSnapshot();
    });

    it('renders javascript code with syntax highlighting', () => {
      const { container } = render(
        <CodePreview code={JAVASCRIPT_CODE} language="javascript" />
      );
      expect(container).toMatchSnapshot();
    });

    it('applies custom className', () => {
      const { container } = render(
        <CodePreview code={RUST_CODE} className="custom-preview" />
      );
      expect(container.querySelector('.custom-preview')).toBeInTheDocument();
      expect(container).toMatchSnapshot();
    });
  });

  describe('edge cases', () => {
    it('handles code with trailing newlines', () => {
      const codeWithNewlines = `pub fn test() {}\n\n\n`;
      const { container } = render(
        <CodePreview code={codeWithNewlines} />
      );
      expect(container).toMatchSnapshot();
    });

    it('handles empty code', () => {
      const { container } = render(<CodePreview code="" />);
      expect(container).toMatchSnapshot();
    });

    it('handles code with special characters', () => {
      const specialCode = 'const obj = { "key": "value" }; // Comment with émojis 🎉';
      const { container } = render(
        <CodePreview code={specialCode} language="javascript" />
      );
      expect(container).toMatchSnapshot();
    });

    it('renders with multiple line numbers', () => {
      const { container } = render(
        <CodePreview code={RUST_CODE} showLineNumbers={true} />
      );
      const lineNumbers = container.querySelectorAll('.gutter');
      expect(lineNumbers.length).toBeGreaterThan(1);
      expect(container).toMatchSnapshot();
    });
  });

  describe('full component snapshots', () => {
    it('matches snapshot: complete Rust example with title and line numbers', () => {
      const { container } = render(
        <CodePreview
          code={RUST_CODE}
          language="rust"
          title="lib.rs"
          showLineNumbers={true}
        />
      );
      expect(container).toMatchSnapshot('rust-complete');
    });

    it('matches snapshot: TypeScript with collapse', () => {
      const longTypescript = `${TYPESCRIPT_CODE}\n\n${TYPESCRIPT_CODE}\n\n${TYPESCRIPT_CODE}`;
      const { container } = render(
        <CodePreview
          code={longTypescript}
          language="typescript"
          fileName="types.ts"
          collapseAt={5}
        />
      );
      expect(container).toMatchSnapshot('typescript-collapse');
    });

    it('matches snapshot: JavaScript minimal (no line numbers, no collapse)', () => {
      const { container } = render(
        <CodePreview
          code={JAVASCRIPT_CODE}
          language="javascript"
          showLineNumbers={false}
        />
      );
      expect(container).toMatchSnapshot('javascript-minimal');
    });
  });
});
