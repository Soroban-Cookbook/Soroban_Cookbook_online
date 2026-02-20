import React from 'react';
import clsx from 'clsx';
import type {ButtonGroupProps} from './Button.types';

export default function ButtonGroup({children, ariaLabel, vertical = false, className}: ButtonGroupProps) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={clsx('sb-btn-group', {'sb-btn-group--vertical': vertical}, className)}>
      {children}
    </div>
  );
}
