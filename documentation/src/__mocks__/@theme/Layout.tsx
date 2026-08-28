import React from 'react';

interface LayoutProps {
  children?: React.ReactNode;
  title?: string;
  description?: string;
}

export default function Layout({ children, title, description }: LayoutProps) {
  return React.createElement(
    'div',
    { 'data-testid': 'layout', 'data-title': title, 'data-description': description },
    React.createElement(
      'nav',
      { 'data-testid': 'mock-navbar' },
      React.createElement('a', { href: '/' }, 'Soroban Cookbook'),
      React.createElement('a', { href: '/docs' }, 'Docs'),
    ),
    React.createElement('main', null, children),
    React.createElement(
      'footer',
      { 'data-testid': 'mock-footer' },
      React.createElement('p', null, '© 2026 Soroban Cookbook'),
    ),
  );
}
