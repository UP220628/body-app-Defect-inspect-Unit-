'use client';

import React, { useEffect, useRef } from 'react';

interface DropdownProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}

export const Dropdown: React.FC<DropdownProps> = ({
  isOpen,
  onClose,
  children,
  title,
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    // Agregar listener con pequeño delay para evitar cerrar inmediatamente
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      className="fixed md:absolute md:right-0 md:top-full md:mt-2 bottom-0 md:bottom-auto left-0 md:left-auto right-0 w-full md:w-96 md:rounded-lg rounded-t-lg bg-white shadow-xl z-[9999] border border-gray-200 md:border-gray-200 max-h-[80vh] md:max-h-[80vh] flex flex-col"
    >
      {/* Header */}
      {title && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 flex-shrink-0">
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ×
          </button>
        </div>
      )}

      {/* Content */}
      <div className="overflow-y-auto flex-1">
        {children}
      </div>
    </div>
  );
};
