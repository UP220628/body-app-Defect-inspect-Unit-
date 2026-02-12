import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input = ({ label, className = '', ...props }: InputProps) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-lg font-normal mb-2 text-gray-800">
          {label}
        </label>
      )}
      <input
        className={`w-full px-4 py-1 border-2 border-gray-800 rounded-full 
          focus:outline-none focus:border-gray-600 transition-colors ${className}`}
        {...props}
      />
    </div>
  );
};
