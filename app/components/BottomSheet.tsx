'use client';

import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}

export default function BottomSheet({ isOpen, onClose, children, title }: BottomSheetProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setIsClosing(false);
      setCurrentY(0);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 300);
  };

  const handleDragHandleTouchStart = (e: React.TouchEvent) => {
    setStartY(e.touches[0].clientY);
    setIsDragging(true);
  };

  const handleDragHandleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const y = e.touches[0].clientY;
    const diff = y - startY;
    if (diff > 0) {
      setCurrentY(diff);
    }
  };

  const handleDragHandleTouchEnd = () => {
    setIsDragging(false);
    if (currentY > 100) {
      handleClose();
    } else {
      setCurrentY(0);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  // Prevent clicks from bubbling up and causing issues
  const handleContentClick = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
  };

  if (!isMounted || !isOpen) return null;

  const sheetContent = (
    <div 
      className={`fixed inset-0 z-[100] transition-opacity duration-300 ${
        isClosing ? 'opacity-0' : 'opacity-100'
      }`}
      onClick={handleBackdropClick}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      
      {/* Sheet */}
      <div
        className={`absolute bottom-0 left-0 right-0 bg-background-secondary rounded-t-2xl border-t border-x border-border transition-transform duration-300 ease-out ${
          isClosing ? 'translate-y-full' : 'translate-y-0'
        }`}
        style={{
          transform: `translateY(${isClosing ? '100%' : `${currentY}px`})`,
          maxHeight: '85vh',
        }}
        onClick={handleContentClick}
      >
        {/* Drag Handle - only this area handles swipe to close */}
        <div 
          className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing touch-none"
          onTouchStart={handleDragHandleTouchStart}
          onTouchMove={handleDragHandleTouchMove}
          onTouchEnd={handleDragHandleTouchEnd}
        >
          <div className="w-9 h-1 bg-foreground-muted/30 rounded-full" />
        </div>

        {/* Title (optional) */}
        {title && (
          <div className="px-4 pb-3 border-b border-border">
            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          </div>
        )}

        {/* Content - clicks work normally here */}
        <div 
          ref={contentRef}
          className="overflow-y-auto max-h-[calc(85vh-60px)]"
          onClick={handleContentClick}
        >
          {children}
        </div>
      </div>
    </div>
  );

  return createPortal(sheetContent, document.body);
}
