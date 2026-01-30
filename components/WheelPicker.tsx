import React, { useRef } from 'react';
import { audioService } from '../services/audioService';

interface WheelPickerProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (val: number) => void;
}

export const WheelPicker: React.FC<WheelPickerProps> = ({ label, value, min, max, onChange }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number | null>(null);
  const scrollAccumulator = useRef<number>(0);

  const updateValue = (direction: 'up' | 'down') => {
    let next: number;
    if (direction === 'up') {
        next = value === max ? min : value + 1;
    } else {
        next = value === min ? max : value - 1;
    }
    onChange(next);
    audioService.playTick();
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation(); 
    // Normalize wheel delta
    if (Math.abs(e.deltaY) > 0) {
       updateValue(e.deltaY > 0 ? 'up' : 'down');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      updateValue('down');
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      updateValue('up');
    }
  };

  // --- Touch Logic (Continuous Scrubbing) ---
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    scrollAccumulator.current = 0;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    
    // Prevent browser scrolling while interacting with the picker
    if (e.cancelable) e.preventDefault();
    
    const currentY = e.touches[0].clientY;
    const diff = touchStartY.current - currentY;
    
    // Add to accumulator
    scrollAccumulator.current += diff;

    // Threshold pixels to trigger one "tick"
    const threshold = 15; 

    // Consume accumulator
    while (Math.abs(scrollAccumulator.current) >= threshold) {
        if (scrollAccumulator.current > 0) {
            updateValue('up');
            scrollAccumulator.current -= threshold;
        } else {
            updateValue('down');
            scrollAccumulator.current += threshold;
        }
    }
    
    touchStartY.current = currentY; 
  };

  const handleTouchEnd = () => {
    touchStartY.current = null;
    scrollAccumulator.current = 0;
  };

  const fmt = (n: number) => n.toString().padStart(2, '0');
  const prevVal = value === min ? max : value - 1;
  const nextVal = value === max ? min : value + 1;

  return (
    <div className="flex flex-col items-center mx-1 sm:mx-2 select-none group">
      <div 
        ref={containerRef}
        tabIndex={0}
        role="spinbutton"
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuetext={fmt(value)}
        onWheel={handleWheel}
        onKeyDown={handleKeyDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        // Critical for allowing custom touch logic without browser interference
        style={{ touchAction: 'none' }} 
        className="relative h-32 w-20 bg-white dark:bg-neutral-900 rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-800 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/50 outline-none cursor-ns-resize shadow-inner transition-all hover:border-neutral-300 dark:hover:border-neutral-700 active:cursor-grabbing"
      >
        {/* Gradient Overlay - Adaptive for Light/Dark */}
        <div className="absolute inset-0 bg-gradient-to-b from-white via-transparent to-white dark:from-neutral-950 dark:via-transparent dark:to-neutral-950 z-10 pointer-events-none" />
        
        {/* Active Highlight Band */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-10 border-y border-amber-500/30 bg-amber-500/10 z-0 backdrop-blur-[1px]" />

        <div className="flex flex-col items-center justify-center h-full space-y-0.5 pointer-events-none">
            {/* Previous */}
            <div className="h-8 flex items-center justify-center text-neutral-400 dark:text-neutral-600 text-xl font-mono font-medium opacity-50 blur-[1px] transform scale-75">
                {fmt(prevVal)}
            </div>
            {/* Current */}
            <div className="h-10 flex items-center justify-center text-neutral-900 dark:text-white text-3xl font-mono font-bold z-20 transform scale-100 drop-shadow-sm">
                {fmt(value)}
            </div>
            {/* Next */}
            <div className="h-8 flex items-center justify-center text-neutral-400 dark:text-neutral-600 text-xl font-mono font-medium opacity-50 blur-[1px] transform scale-75">
                {fmt(nextVal)}
            </div>
        </div>
      </div>
      <span className="text-[9px] font-bold text-neutral-500 mt-2 tracking-[0.2em] uppercase group-hover:text-amber-500 transition-colors" id={`label-${label.replace(/\s+/g, '-').toLowerCase()}`}>{label}</span>
    </div>
  );
};