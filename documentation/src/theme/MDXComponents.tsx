import MDXComponents from '@theme-original/MDXComponents';
import {
  PatternCallout,
  PatternMeta,
  PatternSection,
  EstimatedTime,
} from '@site/src/components/PatternDoc';
import { CodeSnippet } from '@site/src/components/CodeSnippet';
import { PatternCustomizer } from '@site/src/components/PatternCustomizer';
import { VideoPlayer } from '@site/src/components/VideoPlayer';
import Collapsible from '@site/src/components/Collapsible/Collapsible';
import { Quiz } from '@site/src/components/Quiz';
import { CodeComparison } from '@site/src/components/CodeComparison';
import { PrerequisitesChecker } from '@site/src/components/PrerequisitesChecker';

export default {
  ...MDXComponents,
  PatternMeta,
  PatternSection,
  PatternCallout,
  EstimatedTime,
  CodeSnippet,
  PatternCustomizer,
  VideoPlayer,
  Collapsible,
  Quiz,
  CodeComparison,
  PrerequisitesChecker,
};
