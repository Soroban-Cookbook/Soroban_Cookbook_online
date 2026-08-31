import React from 'react';
import Layout from '@theme-original/Layout';
import { BookmarkButton } from '../../components/BookmarkButton';
export default function L(props: any) {
  return (
    <>
      <Layout{...props} />
      <div style={{ position: 'fixed', bottom: 16, right: 16 }}>
        <BookmarkButton />
      </div>
    </>
  );
}