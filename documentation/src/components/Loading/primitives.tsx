import React from 'react';

export const Skeleton = ({
  width,
  height,
  circle,
}: {
  width?: string | number;
  height?: string | number;
  circle?: boolean;
}) => {
  return (
    <div
      className="skeleton-loader"
      style={{
        width: width || '100%',
        height: height || '1.5rem',
        borderRadius: circle ? '50%' : '4px',
        display: 'block',
        backgroundColor: '#e5e7eb', // Fallback
        marginBottom: '0.5rem',
      }}
      role="status"
      aria-busy="true"
      aria-label="Loading"
    />
  );
};

export const Spinner = ({ size = 24 }: { size?: number }) => (
  <div
    className="spinner-loader"
    style={{ width: size, height: size, display: 'inline-block' }}
    role="status"
    aria-busy="true"
    aria-label="Loading"
  />
);
