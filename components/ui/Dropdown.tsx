'use client';

import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';

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
  anchorRef,
}) => {
  const [isMobile, setIsMobile] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const update = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile && anchorRef?.current) {
        const rect = anchorRef.current.getBoundingClientRect();
        setPos({
          top: rect.bottom + 8,
          right: window.innerWidth - rect.right,
        });
      }
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [isOpen, anchorRef]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 z-[9998] ${isMobile ? 'bg-black/50' : ''}`}
        onClick={onClose}
      />

      {/* Móvil: modal centrado con overlay */}
      {isMobile && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white shadow-2xl border border-gray-200 rounded-xl max-h-[80vh] flex flex-col">
            {title && (
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 flex-shrink-0">
                <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
              </div>
            )}
            <div className="overflow-y-auto flex-1">{children}</div>
          </div>
        </div>
      )}

      {/* Desktop: posicionado debajo del botón */}
      {!isMobile && (
        <div
          style={{ top: pos.top, right: pos.right }}
          className="fixed z-[9999] w-96 bg-white shadow-2xl border border-gray-200 rounded-lg max-h-[80vh] flex flex-col"
        >
          {title && (
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 flex-shrink-0">
              <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
          )}
          <div className="overflow-y-auto flex-1">{children}</div>
        </div>
      )}
    </>,
    document.body
  );
};
