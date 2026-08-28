import React from 'react';

export default function Head(props: { children?: React.ReactNode }) {
  return React.createElement('head', null, props?.children);
}
