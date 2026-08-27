import React, { type ReactNode } from 'react';
import Link from '@theme-original/DocSidebarItem/Link';
import type LinkType from '@theme/DocSidebarItem/Link';
import type { WrapperProps } from '@docusaurus/types';
import { useProgress } from '@site/src/contexts/ProgressContext';

type Props = WrapperProps<typeof LinkType>;

export default function LinkWrapper(props: Props): ReactNode {
  const { isCompleted } = useProgress();

  // Extract path to match against our context
  const href = props.item.href?.split('#')[0].split('?')[0] || '';
  const completed = isCompleted(href);

  const itemWithCheckmark = {
    ...props.item,
    label: completed ? (
      <>
        {props.item.label}{' '}
        <span
          title="Completed"
          aria-label="Completed"
          style={{ marginLeft: '4px', fontSize: '0.9em' }}>
          ✅
        </span>
      </>
    ) : (
      props.item.label
    ),
  };

  return (
    <>
      <Link {...props} item={itemWithCheckmark} />
    </>
  );
}
