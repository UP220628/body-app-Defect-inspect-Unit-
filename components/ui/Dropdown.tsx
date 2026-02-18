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
    <>
      {/* Overlay (visible en móvil y desktop para cerrar) */}
      <div
        className="fixed inset-0 z-[9998]"
        onClick={onClose}
      />

      {/* Dropdown — móvil: bottom sheet, desktop: fixed debajo del header a la derecha */}
      <div
        ref={dropdownRef}
        className={[
          // Base
          'fixed z-[9999] bg-white shadow-2xl border border-gray-200 flex flex-col',
          // Móvil: full width, aparece desde abajo, esquinas superiores redondeadas
          'inset-x-0 bottom-0 rounded-t-2xl max-h-[85vh]',
          // Desktop: ancho fijo, posicionado en la esquina superior derecha, debajo del header
          'md:inset-x-auto md:bottom-auto md:right-4 md:top-[88px] md:w-96 md:rounded-lg md:max-h-[80vh]',
        ].join(' ')}
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
    </>
  );
};
