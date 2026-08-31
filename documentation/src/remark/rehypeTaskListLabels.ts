/**
 * rehypeTaskListLabels — give GFM task-list checkboxes an accessible name.
 *
 * `- [ ] Rotate the admin key` renders as
 * `<li class="task-list-item"><input type="checkbox" disabled> Rotate…</li>`.
 * The input has no label, so axe-core reports a critical `label` violation on
 * every page that uses a markdown checklist (e.g. /docs/security/fundamentals).
 *
 * The checkbox is a disabled, decorative rendering of the item's state, but it
 * still carries meaning (checked vs. unchecked), so it should be named rather
 * than hidden. This derives the name from the list item's own text.
 */

interface HastNode {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
}

/** Concatenate the text content of a node's subtree. */
function textOf(node: HastNode): string {
  if (node.type === 'text') return node.value ?? '';
  return (node.children ?? []).map(textOf).join('');
}

export default function rehypeTaskListLabels() {
  return (tree: HastNode) => {
    const visit = (node: HastNode) => {
      for (const child of node.children ?? []) {
        if (child.tagName === 'li') {
          const checkbox = (child.children ?? []).find(
            (c) => c.tagName === 'input' && c.properties?.type === 'checkbox',
          );
          if (checkbox) {
            const label = textOf(child).trim();
            if (label) {
              checkbox.properties = { ...checkbox.properties, 'aria-label': label };
            }
          }
        }
        visit(child);
      }
    };
    visit(tree);
  };
}
