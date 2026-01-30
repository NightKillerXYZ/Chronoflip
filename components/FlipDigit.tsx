import React, { useEffect, useState } from 'react';

interface FlipDigitProps {
  value: string | number;
  label?: string;
  isZenMode?: boolean;
  cardClassName?: string;
  textClassName?: string;
}

export const FlipDigit: React.FC<FlipDigitProps> = ({ 
  value, 
  label, 
  isZenMode = false,
  cardClassName,
  textClassName
}) => {
  const [currentValue, setCurrentValue] = useState(value);
  const [previousValue, setPreviousValue] = useState(value);
  const [key, setKey] = useState(0);

  const format = (val: string | number) => val.toString().padStart(2, '0');

  useEffect(() => {
    if (value !== currentValue) {
      setPreviousValue(currentValue);
      setCurrentValue(value);
      setKey(prev => prev + 1);
    }
  }, [value, currentValue]);

  const currStr = format(currentValue);
  const prevStr = format(previousValue);

  // Responsive sizing logic
  const containerClass = cardClassName 
    ? cardClassName 
    : isZenMode 
      ? "w-[20vw] aspect-[0.71] lg:w-auto lg:h-[38vh] lg:aspect-[0.71]" 
      : "w-20 h-32 sm:w-28 sm:h-44 md:w-36 md:h-56";

  // Adaptive Font Sizing
  const fontSizeClass = textClassName
    ? textClassName
    : isZenMode
      ? "text-[14vw] lg:text-[24vh] tracking-tighter" 
      : "text-6xl sm:text-7xl md:text-8xl";

  const labelClass = isZenMode
    ? "hidden"
    : "mt-4 text-[10px] sm:text-xs font-bold text-neutral-400 dark:text-neutral-500 tracking-[0.25em] uppercase";
    
  // Dynamic spacing
  const spacingClass = isZenMode ? "mx-[1.5vw] lg:mx-[2.5vw]" : "mx-1 sm:mx-3 md:mx-4";

  // Theme-aware styles for the cards
  const cardBg = "bg-white dark:bg-neutral-800"; // Base card color
  const cardRing = "ring-1 ring-black/10 dark:ring-white/5"; // Subtle outline
  const textColor = "text-neutral-800 dark:text-neutral-200"; // Number color
  
  // Gradients need to be subtler in light mode to look clean
  const gradTop = "bg-gradient-to-b from-neutral-50 to-neutral-200 dark:from-neutral-800 dark:to-neutral-800/90";
  const gradOverlayTop = "bg-gradient-to-b from-white/40 to-transparent dark:from-black/20 dark:to-transparent";
  const gradOverlayBottom = "bg-gradient-to-t from-black/10 to-transparent dark:from-black/20 dark:to-transparent";
  const gradOverlayBottomStatic = "bg-gradient-to-b from-black/5 to-transparent dark:from-black/60 dark:to-transparent"; // Heavier shadow on static bottom
  
  const separatorLine = "bg-neutral-300 dark:bg-black shadow-[0_1px_0px_rgba(255,255,255,0.5)] dark:shadow-[0_1px_0px_rgba(255,255,255,0.08)]";
  const borderHalf = "border-neutral-300 dark:border-black/50"; // The seam border

  return (
    <div className={`flex flex-col items-center ${spacingClass}`}>
      <div className={`relative ${containerClass} perspective-1000 group-container rounded-xl bg-neutral-100 dark:bg-neutral-900 shadow-xl shadow-neutral-300/50 dark:shadow-[0_10px_20px_-5px_rgba(0,0,0,0.5)] ${cardRing}`}>
        
        {/* Layer 1: Background (Current Value) */}
        <div className={`absolute inset-0 z-0 flex flex-col rounded-xl overflow-hidden ${cardBg}`}>
           {/* Top Half */}
           <div className={`h-1/2 relative overflow-hidden border-b ${borderHalf} ${gradTop}`}>
             <span className={`absolute top-0 left-0 right-0 h-[200%] flex items-center justify-center font-mono font-bold leading-none ${fontSizeClass} ${textColor}`}>
               {currStr}
             </span>
             <div className={`absolute inset-0 ${gradOverlayTop} pointer-events-none`}></div>
           </div>
           {/* Bottom Half */}
           <div className={`h-1/2 relative overflow-hidden ${cardBg}`}>
             <span className={`absolute bottom-0 left-0 right-0 h-[200%] flex items-center justify-center font-mono font-bold leading-none ${fontSizeClass} ${textColor}`}>
               {currStr}
             </span>
             <div className={`absolute inset-0 ${gradOverlayBottom} pointer-events-none`}></div>
           </div>
        </div>

        {/* Layer 2: Bottom Static (Previous Value) */}
        <div className={`absolute inset-x-0 bottom-0 h-1/2 z-10 ${cardBg} rounded-b-xl overflow-hidden`}>
            <span className={`absolute bottom-0 left-0 right-0 h-[200%] flex items-center justify-center font-mono font-bold leading-none ${fontSizeClass} ${textColor}`}>
               {prevStr}
            </span>
            <div className={`absolute inset-0 ${gradOverlayBottomStatic} pointer-events-none`}></div>
        </div>

        {/* Layer 3: The Flipper */}
        <div 
          key={key}
          className="absolute inset-x-0 top-0 h-1/2 z-20 origin-bottom transform-style-3d animate-flip"
        >
           {/* Front Face (Old Top) */}
           <div className={`absolute inset-0 backface-hidden ${cardBg} rounded-t-xl overflow-hidden border-b ${borderHalf}`}>
             <span className={`absolute top-0 left-0 right-0 h-[200%] flex items-center justify-center font-mono font-bold leading-none ${fontSizeClass} ${textColor}`}>
               {prevStr}
             </span>
             <div className={`absolute inset-0 ${gradOverlayTop} pointer-events-none`}></div>
           </div>

           {/* Back Face (New Bottom) */}
           <div className={`absolute inset-0 backface-hidden rotate-x-180 ${cardBg} rounded-b-xl overflow-hidden border-t ${borderHalf}`}>
             <span className={`absolute -top-full left-0 right-0 h-[200%] flex items-center justify-center font-mono font-bold leading-none ${fontSizeClass} ${textColor}`}>
               {currStr}
             </span>
             <div className={`absolute inset-0 bg-gradient-to-t from-black/5 to-white/20 dark:from-black/10 dark:to-white/5 pointer-events-none`}></div>
           </div>
        </div>

        {/* Horizontal Split Line & Glint */}
        <div className={`absolute top-1/2 left-0 right-0 h-px z-30 ${separatorLine}`}></div>
        
      </div>
      {label && (
        <span className={labelClass}>
          {label}
        </span>
      )}
    </div>
  );
};

// CSS Injection
const style = document.createElement('style');
style.innerHTML = `
  .perspective-1000 { perspective: 1000px; }
  .transform-style-3d { transform-style: preserve-3d; }
  .backface-hidden { backface-visibility: hidden; }
  .rotate-x-180 { transform: rotateX(180deg); }
  .origin-bottom { transform-origin: bottom; }
  
  @keyframes flip-single {
    0% { transform: rotateX(0deg); }
    100% { transform: rotateX(-180deg); }
  }

  .animate-flip {
    animation: flip-single 0.6s cubic-bezier(0.645, 0.045, 0.355, 1) forwards;
  }
`;
if (!document.getElementById('flip-style-v2')) {
    style.id = 'flip-style-v2';
    document.head.appendChild(style);
}