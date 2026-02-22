import type {ButtonHTMLAttributes, ReactNode} from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'ghost' | 'link';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  loading?: boolean;
  iconOnly?: boolean;
}

export interface ButtonGroupProps {
  children: ReactNode;
  ariaLabel?: string;
  vertical?: boolean;
  className?: string;
}
