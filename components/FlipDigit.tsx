
import React, { useEffect, useState, memo } from 'react';
import { AppearanceSettings } from '../types';

interface FlipDigitProps {
  value: string | number;
  label?: string;
  isZenMode?: boolean;
  cardClassName?: string;
  textClassName?: string;
  appearance?: AppearanceSettings;
  variant?: 'default' | 'fast'; // 'fast' disables 3D flip for rapid updates (e.g. stopwatch ms)
}

export const FlipDigit = memo(({ 
  value, 
  label, 
  isZenMode = false,
  cardClassName,
  textClassName,
  appearance,
  variant = 'default'
}: FlipDigitProps) => {
  const [displayValue, setDisplayValue] = useState(value);
  const [nextValue, setNextValue] = useState(value);
  const [isFlipping, setIsFlipping] = useState(false);

  // Helper to ensure 2 digits
  const format = (val: string | number) => val.toString().padStart(2, '0');

  useEffect(() => {
    // If in fast mode, just update directly without flip state
    if (variant === 'fast') {
      setDisplayValue(value);
      return;
    }

    if (value !== nextValue) {
        if (isFlipping) {
            setDisplayValue(nextValue); 
        }
        setNextValue(value);
        setIsFlipping(true);
    }
  }, [value, nextValue, isFlipping, variant]);

  const handleAnimationEnd = () => {
    setDisplayValue(nextValue);
    setIsFlipping(false);
  };

  // --- Styles & Dimensions ---
  const containerClass = cardClassName 
    ? cardClassName 
    : isZenMode 
      ? "w-[22vw] aspect-[0.71] lg:w-auto lg:h-[42vh] lg:aspect-[0.71]" 
      : "w-20 h-32 sm:w-28 sm:h-44 md:w-36 md:h-56 lg:w-44 lg:h-64 xl:w-56 xl:h-80 2xl:w-64 2xl:h-96"; 

  // Adjusted font sizes to prevent edge bumping on large screens
  const fontSizeClass = textClassName
    ? textClassName
    : isZenMode
      ? "text-[14vw] lg:text-[26vh] tracking-tight" 
      : "text-6xl sm:text-7xl md:text-8xl lg:text-9xl xl:text-[8.5rem] 2xl:text-[10.5rem]"; 

  const labelClass = isZenMode
    ? "hidden"
    : "text-[10px] sm:text-xs xl:text-sm font-bold text-neutral-400 dark:text-neutral-500 tracking-[0.3em] uppercase opacity-70 whitespace-nowrap";
    
  const spacingClass = isZenMode ? "mx-[1vw] lg:mx-[1.5vw]" : "mx-1.5 sm:mx-3 md:mx-4 lg:mx-5";

  // Appearance Logic
  const defaultCardBg = "bg-[#e5e5e5] dark:bg-[#202023]"; 
  const defaultTextColor = "text-neutral-800 dark:text-[#f0f0f0]";
  
  const cardBgClass = (appearance?.isCustom && appearance.cardColor !== 'auto') ? '' : defaultCardBg;
  const textColorClass = (appearance?.isCustom && appearance.numberColor !== 'auto') ? '' : defaultTextColor;

  // SOFTER EDGES: Increased radius values for a less "edgey" look
  const getRadiusClasses = () => {
    if (!appearance || !appearance.isCustom) return { full: 'rounded-2xl', top: 'rounded-t-2xl', bottom: 'rounded-b-2xl' };
    switch (appearance.cardShape) {
        case 'square': return { full: 'rounded-md', top: 'rounded-t-md', bottom: 'rounded-b-md' }; // Softened square
        case 'extra-rounded': return { full: 'rounded-[2.5rem]', top: 'rounded-t-[2.5rem]', bottom: 'rounded-b-[2.5rem]' };
        case 'rounded': default: return { full: 'rounded-2xl', top: 'rounded-t-2xl', bottom: 'rounded-b-2xl' };
    }
  };
  const { full: radiusFull, top: radiusTop, bottom: radiusBottom } = getRadiusClasses();

  const getCustomStyle = () => {
      const style: React.CSSProperties = {};
      if (appearance?.isCustom) {
          if (appearance.cardColor !== 'auto') style.backgroundColor = appearance.cardColor;
          if (appearance.numberColor !== 'auto') style.color = appearance.numberColor;
      }
      return style;
  };
  const customFaceStyle = getCustomStyle();
  const numberShadow = appearance?.numberColor !== 'auto' ? { textShadow: '0 2px 10px rgba(0,0,0,0.1)' } : {};

  // --- Visual Assets ---
  const highlightGradient = "bg-gradient-to-b from-white/20 to-transparent"; 
  const shadowGradient = "bg-gradient-to-t from-black/30 to-transparent";    

  const numberClass = `absolute left-0 right-0 w-full h-[200%] flex items-center justify-center font-mono font-bold leading-none ${fontSizeClass} ${textColorClass}`;
  
  // --- FAST MODE RENDERING (Stopwatch Centiseconds) ---
  // Now uses the EXACT SAME appearance as standard cards, just without the split line and flip mechanics.
  if (variant === 'fast') {
     return (
       <div className={`flex flex-col items-center ${spacingClass} group select-none`}>
         <div 
           className={`relative ${containerClass} ${radiusFull} shadow-2xl bg-neutral-900/10 dark:bg-black/20`}
           role="img" 
           aria-label={value.toString()}
         >
            {/* Unified Card Body */}
            <div className={`absolute inset-0 overflow-hidden ${radiusFull} ${cardBgClass} border border-black/5 dark:border-white/5`} style={customFaceStyle}>
                <div className="relative w-full h-full flex items-center justify-center">
                    {/* Centered Number */}
                    <span className={`font-mono font-bold leading-none ${fontSizeClass} ${textColorClass}`} style={{...numberShadow, ...customFaceStyle}}>
                        {format(value)}
                    </span>
                    
                    {/* Lighting Effects (Unified) */}
                    <div className={`absolute inset-0 ${highlightGradient} opacity-40`}></div>
                    <div className="absolute inset-0 shadow-[inset_0_2px_10px_rgba(0,0,0,0.1)]"></div>
                </div>
            </div>
         </div>
         {label && <span className={`${labelClass} mt-4 sm:mt-6`}>{label}</span>}
       </div>
     );
  }

  // --- STANDARD FLIP RENDERING ---
  return (
    <div className={`flex flex-col items-center ${spacingClass} group select-none`}>
      <div 
        className={`relative ${containerClass} perspective-1000 ${radiusFull} shadow-2xl bg-neutral-900/10 dark:bg-black/20`}
        role="img" 
        aria-label={value.toString()}
      >
        
        {/* Layer 1: Static Background */}
        <div className={`absolute top-0 left-0 right-0 h-1/2 overflow-hidden z-0 backface-hidden ${radiusTop} ${cardBgClass} border-b border-black/10 dark:border-black/50`} style={customFaceStyle}>
             <div className="relative w-full h-full">
                 <span className={`${numberClass} top-0`} style={numberShadow}>{format(nextValue)}</span>
                 <div className={`absolute inset-0 ${highlightGradient} opacity-50`}></div>
                 <div className="absolute inset-0 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]"></div>
             </div>
        </div>

        <div className={`absolute bottom-0 left-0 right-0 h-1/2 overflow-hidden z-0 backface-hidden ${radiusBottom} ${cardBgClass} border-t border-white/20 dark:border-white/5`} style={customFaceStyle}>
             <div className="relative w-full h-full">
                 <span className={`${numberClass} -top-full`} style={numberShadow}>{format(displayValue)}</span>
                 <div className={`absolute inset-0 ${shadowGradient} opacity-30`}></div>
             </div>
        </div>

        {/* Layer 2: The Flipper */}
        <div 
          className={`absolute top-0 left-0 right-0 h-1/2 z-10 origin-bottom transform-style-3d will-change-transform ${isFlipping ? 'animate-flip' : ''}`}
          onAnimationEnd={handleAnimationEnd}
        >
            <div className={`absolute inset-0 backface-hidden overflow-hidden ${radiusTop} ${cardBgClass} border-b border-black/10 dark:border-black/50`} style={customFaceStyle}>
                <div className="relative w-full h-full">
                    <span className={`${numberClass} top-0`} style={numberShadow}>{format(displayValue)}</span>
                    <div className={`absolute inset-0 ${highlightGradient} opacity-80`}></div>
                    <div className="absolute inset-0 shadow-[inset_0_1px_2px_rgba(255,255,255,0.1)]"></div>
                </div>
            </div>

            <div className={`absolute inset-0 backface-hidden overflow-hidden rotate-x-180 ${radiusBottom} ${cardBgClass} border-t border-white/20 dark:border-white/5`} style={customFaceStyle}>
                <div className="relative w-full h-full">
                    <span className={`${numberClass} -top-full`} style={numberShadow}>{format(nextValue)}</span>
                    <div className={`absolute inset-0 ${shadowGradient} opacity-80`}></div>
                    <div className="absolute inset-0 shadow-[inset_0_-1px_2px_rgba(0,0,0,0.2)]"></div>
                </div>
            </div>
        </div>

        {/* Overlays */}
        <div className="absolute top-1/2 left-0 right-0 h-px z-20 bg-black/40 dark:bg-black/80 shadow-[0_1px_0_rgba(255,255,255,0.1)]"></div>
        
        {!isZenMode && (
          <>
            <div className="absolute top-[48%] -left-[1px] w-[2px] h-[4%] bg-neutral-400 dark:bg-neutral-600 rounded-r-sm z-30 opacity-60"></div>
            <div className="absolute top-[48%] -right-[1px] w-[2px] h-[4%] bg-neutral-400 dark:bg-neutral-600 rounded-l-sm z-30 opacity-60"></div>
          </>
        )}
      </div>

      {label && (
        <span className={`${labelClass} mt-4 sm:mt-6`}>
          {label}
        </span>
      )}
    </div>
  );
});

FlipDigit.displayName = 'FlipDigit';
