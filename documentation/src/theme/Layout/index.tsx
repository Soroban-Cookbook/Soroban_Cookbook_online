import React from 'react';
import Layout from '@theme-original/Layout';
import { BookmarkButton } from '../../components/BookmarkButton';
import KeyboardShortcuts from '../../components/KeyboardShortcuts';

type LayoutProps = React.ComponentProps<typeof Layout>;

export default function LayoutWrapper(props: LayoutProps) {
  return (
    <Layout {...props}>
      {props.children}
      {/* KeyboardShortcuts uses useColorMode, which requires the theme
          providers that only exist inside the Layout tree. */}
      <KeyboardShortcuts />
      <div style={{ position: 'fixed', bottom: 16, right: 16 }}>
        <BookmarkButton />
      </div>
    </Layout>
  );
}
