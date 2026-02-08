'use client';

import { useState, useRef, useCallback } from 'react';

interface SwipeableCardProps {
  children: React.ReactNode;
  onEdit?: () => void;
  onDelete?: () => void;
  className?: string;
}

export default function SwipeableCard({ children, onEdit, onDelete, className = '' }: SwipeableCardProps) {
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);
  const currentXRef = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);

  const SNAP_THRESHOLD = 80;
  const MAX_SWIPE = 120;

  const handleTouchStart = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    startXRef.current = clientX;
    currentXRef.current = clientX;
    setIsDragging(true);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!isDragging) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    currentXRef.current = clientX;
    
    const diff = clientX - startXRef.current;
    
    // Limit swipe distance
    if (diff > 0) {
      // Swiping right (edit) - limit to MAX_SWIPE
      setTranslateX(Math.min(diff, MAX_SWIPE));
    } else {
      // Swiping left (delete) - limit to -MAX_SWIPE
      setTranslateX(Math.max(diff, -MAX_SWIPE));
    }
  }, [isDragging]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    
    const diff = currentXRef.current - startXRef.current;
    
    if (diff > SNAP_THRESHOLD && onEdit) {
      // Swiped right past threshold - trigger edit
      setTranslateX(MAX_SWIPE);
      setTimeout(() => {
        onEdit();
        setTranslateX(0);
      }, 200);
    } else if (diff < -SNAP_THRESHOLD && onDelete) {
      // Swiped left past threshold - trigger delete
      if (window.confirm('Are you sure you want to delete this item?')) {
        setTranslateX(-MAX_SWIPE);
        setTimeout(() => {
          onDelete();
          setTranslateX(0);
        }, 200);
      } else {
        // User cancelled, snap back
        setTranslateX(0);
      }
    } else {
      // Not past threshold, snap back
      setTranslateX(0);
    }
  }, [onEdit, onDelete]);

  const handleMouseLeave = useCallback(() => {
    if (isDragging) {
      handleTouchEnd();
    }
  }, [isDragging, handleTouchEnd]);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Background Actions */}
      <div className="absolute inset-0 flex">
        {/* Edit Action (Right swipe) */}
        {onEdit && (
          <div 
            className="flex-1 bg-amber-500/90 flex items-center justify-start pl-4"
            style={{ opacity: translateX > 0 ? Math.min(translateX / 60, 1) : 0 }}
          >
            <div className="flex items-center gap-2 text-white font-medium">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span>Edit</span>
            </div>
          </div>
        )}
        
        {/* Spacer */}
        <div className="flex-[2]" />
        
        {/* Delete Action (Left swipe) */}
        {onDelete && (
          <div 
            className="flex-1 bg-red-500/90 flex items-center justify-end pr-4"
            style={{ opacity: translateX < 0 ? Math.min(Math.abs(translateX) / 60, 1) : 0 }}
          >
            <div className="flex items-center gap-2 text-white font-medium">
              <span>Delete</span>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* Card Content */}
      <div
        ref={cardRef}
        className={`relative bg-background-secondary border border-border rounded-2xl transition-transform duration-200 ease-out select-none ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
        style={{
          transform: `translateX(${translateX}px)`,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleTouchStart}
        onMouseMove={handleTouchMove}
        onMouseUp={handleTouchEnd}
        onMouseLeave={handleMouseLeave}
      >
        {children}
      </div>
    </div>
  );
}
