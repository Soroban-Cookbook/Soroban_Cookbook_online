import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Testimonials, { getInitials } from './index';

describe('Testimonials', () => {
  const testimonials = [
    {
      name: 'Jane Doe',
      avatarUrl: 'https://example.com/avatar.png',
      quote: 'Great product!',
      role: 'Engineer',
    },
  ];

  it('shows the image when it loads', () => {
    render(<Testimonials testimonials={testimonials} />);
    const img = screen.getByTestId('testimonial-avatar-image');
    expect(img).toHaveAttribute('src', testimonials[0].avatarUrl);
    expect(img).toHaveAttribute('alt', 'Jane Doe avatar');
  });

  it('shows initials and keeps the name when the image fails', () => {
    render(<Testimonials testimonials={testimonials} />);
    const img = screen.getByTestId('testimonial-avatar-image');
    fireEvent.error(img);

    const initials = screen.getByTestId('testimonial-avatar-initials');
    expect(initials).toHaveTextContent('JD');
    expect(initials).toHaveAttribute('aria-label', 'Jane Doe');
    expect(screen.queryByTestId('testimonial-avatar-image')).not.toBeInTheDocument();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
  });

  it('computes initials from a name', () => {
    expect(getInitials('Jane Doe')).toBe('JD');
    expect(getInitials('Prince')).toBe('PR');
    expect(getInitials('')).toBe('');
  });
});
