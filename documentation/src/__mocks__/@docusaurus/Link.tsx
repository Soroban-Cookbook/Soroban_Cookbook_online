import React from 'react';

interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  to?: string;
}

export default function Link({ to, href, children, ...props }: LinkProps) {
  return React.createElement('a', { href: to || href, ...props }, children);
}
