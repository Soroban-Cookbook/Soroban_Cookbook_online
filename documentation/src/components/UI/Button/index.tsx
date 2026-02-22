import React, {forwardRef} from 'react';
import clsx from 'clsx';
import type {ButtonProps} from './Button.types';

function Spinner() {
  return <span className="sb-btn__spinner" aria-hidden="true" />;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    iconLeft,
    iconRight,
    loading = false,
    iconOnly = false,
    className,
    children,
    disabled,
    type = 'button',
    ...rest
  },
  ref,
) {
  const isDisabled = disabled || loading;

  return (
    <button
      {...rest}
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={clsx(
        'sb-btn',
        `sb-btn--${variant}`,
        `sb-btn--${size}`,
        {
          'sb-btn--icon-only': iconOnly,
          'is-loading': loading,
        },
        className,
      )}>
      {loading && <Spinner />}
      {!loading && iconLeft && <span className="sb-btn__icon">{iconLeft}</span>}
      {!iconOnly && <span className="sb-btn__label">{children}</span>}
      {!loading && iconRight && <span className="sb-btn__icon">{iconRight}</span>}
    </button>
  );
});

export default Button;
