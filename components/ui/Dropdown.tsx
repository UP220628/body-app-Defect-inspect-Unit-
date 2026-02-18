'use client';

import React, { useEffect, useState } from 'react';

interface DropdownProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  anchorRef?: React.RefObject<HTMLElement | null>;
}

export const Dropdown: React.FC<DropdownProps> = ({
  isOpen,
  onClose,
  children,
  title,
}) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay para cerrar al hacer clic fuera */}
      <div className="fixed inset-0 z-[9998]" onClick={onClose} />

      {/* Móvil: bottom sheet desde abajo */}
      {isMobile && (
        <div className="fixed inset-x-0 bottom-0 z-[9999] bg-white shadow-2xl border-t border-gray-200 rounded-t-2xl max-h-[85vh] flex flex-col">
          {title && (
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 flex-shrink-0">
              <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
          )}
          <div className="overflow-y-auto flex-1">{children}</div>
        </div>
      )}

      {/* Desktop: absolute debajo del botón, expandiéndose hacia la izquierda */}
      {!isMobile && (
        <div className="absolute right-0 top-full mt-2 z-[9999] w-96 bg-white shadow-2xl border border-gray-200 rounded-lg max-h-[80vh] flex flex-col">
          {title && (
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 flex-shrink-0">
              <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
          )}
          <div className="overflow-y-auto flex-1">{children}</div>
        </div>
      )}
    </>
  );
};
