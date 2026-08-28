/**
 * DocItem/Content wrapper — surfaces EstimatedTime from `time` frontmatter
 * (issue #307 / Phase 4), the TutorialProgress step bar from `steps`
 * frontmatter (issue #306 / Phase 4), the page feedback widget (issue #359),
 * the content recommendation engine (issue #341 / Phase 5), and scroll-spy
 * sidebar highlighting (issue #133 / Phase 4).
 */

import React, { type ReactNode } from 'react';
import Content from '@theme-original/DocItem/Content';
import BrowserOnly from '@docusaurus/BrowserOnly';
import { useDoc } from '@docusaurus/plugin-content-docs/client';
import { EstimatedTime, parseEstimatedTime } from '@site/src/components/PatternDoc';
import { TutorialProgress } from '@site/src/components/TutorialProgress';
import DocFeedback from '@site/src/components/DocFeedback';
import ScrollSpyActivator from '@site/src/components/ScrollSpyActivator';
import ProgressToggleButton from '@site/src/components/ProgressToggleButton/ProgressToggleButton';
import { RecommendationWidget } from '@site/src/components/recommendations';
import styles from './styles.module.css';

type Props = React.ComponentProps<typeof Content>;

type DocFrontMatter = { time?: string | number; steps?: string[] };

export default function DocItemContentWrapper(props: Props): ReactNode {
  const docObj = useDoc();
  const metadata = docObj.metadata;
  const frontMatter = docObj.frontMatter as DocFrontMatter;

  const rawTime = frontMatter?.time;
  const label = parseEstimatedTime(rawTime);
  const steps = frontMatter?.steps;

  return (
    <>
      {label && rawTime != null && rawTime !== '' ? (
        <div className={styles.estimatedTimeRow}>
          <EstimatedTime time={rawTime} />
        </div>
      ) : null}
      {steps && steps.length > 0 ? <TutorialProgress steps={steps} /> : null}
      <Content {...props} />
      {metadata?.id ? (
        <BrowserOnly>{() => <RecommendationWidget currentDocId={metadata.id} />}</BrowserOnly>
      ) : null}
      {metadata?.permalink ? <ProgressToggleButton path={metadata.permalink} /> : null}
      <DocFeedback />
      <ScrollSpyActivator />
    </>
  );
}
