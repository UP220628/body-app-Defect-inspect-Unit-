import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'tertiary';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const Button = ({ 
  variant = 'primary', 
  size = 'md',
  children, 
  className = '',
  ...props 
}: ButtonProps) => {
  const sizeClasses = {
    xs: 'px-3 py-0.75 text-sm',
    sm: 'px-4 py-2 text-sm',
    md: 'px-12 py-3',
    lg: 'px-16 py-4 text-base'
  } as const;

  const baseStyles = `rounded-full font-medium transition-all ${sizeClasses[size]}`;
  
  const variants = {
    primary: 'bg-black text-white hover:bg-gray-800',
    secondary: 'bg-white text-black border-2 border-black hover:bg-gray-100',
    tertiary: 'bg-transparent text-black border border-blue-500 hover:bg-gray-200'
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
