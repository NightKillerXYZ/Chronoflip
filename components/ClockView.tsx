
import React, { useState, useEffect, memo } from 'react';
import { FlipDigit } from './FlipDigit';
import { Maximize2, Minimize2, MapPin } from 'lucide-react';
import { AppearanceSettings } from '../types';

interface ClockViewProps {
  isZenMode: boolean;
  toggleZenMode: () => void;
  appearance?: AppearanceSettings;
}

// Extracted Separator to be a stable component
const Separator = memo(({ isZenMode }: { isZenMode: boolean }) => (
  <div className={`flex flex-col justify-center items-center opacity-80 transition-all duration-500
      ${isZenMode 
         ? 'gap-[3vw] mx-[0.5vw] lg:gap-[4vh]' 
         : 'gap-4 sm:gap-6 lg:gap-8 mx-1 sm:mx-2 lg:mx-3'
      }`}>
      <div className={`rounded-full shadow-lg transition-all duration-500 bg-neutral-800 dark:bg-neutral-500/50 backdrop-blur-sm
         ${isZenMode 
            ? 'w-[2vw] h-[2vw] lg:w-[1.5vh] lg:h-[1.5vh]' 
            : 'w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 xl:w-6 xl:h-6' 
         }`} 
      />
      <div className={`rounded-full shadow-lg transition-all duration-500 bg-neutral-800 dark:bg-neutral-500/50 backdrop-blur-sm
         ${isZenMode 
            ? 'w-[2vw] h-[2vw] lg:w-[1.5vh] lg:h-[1.5vh]' 
            : 'w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 xl:w-6 xl:h-6' 
         }`} 
      />
  </div>
));
Separator.displayName = 'Separator';

export const ClockView: React.FC<ClockViewProps> = ({ isZenMode, toggleZenMode, appearance }) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    // Check frequently to ensure precision
    const timer = setInterval(() => {
      setTime(prevTime => {
        const now = new Date();
        // Only update state if the second has actually changed
        if (now.getSeconds() !== prevTime.getSeconds()) {
            return now;
        }
        return prevTime;
      });
    }, 100);
    return () => clearInterval(timer);
  }, []);

  const handleToggle = () => {
    toggleZenMode();
    if (!isZenMode) {
         if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch((e) => {});
        }
    } else {
        if (document.fullscreenElement) {
            document.exitFullscreen().catch((e) => {});
        }
    }
  };

  // --- World Clock Logic ---
  // If timezone is 'local' or undefined, use system time. Otherwise, convert.
  let targetTime = time;
  let timeLabel = '';
  
  if (appearance?.timezone && appearance.timezone !== 'local') {
      try {
          // Create a string representation in the target timezone
          const targetString = time.toLocaleString('en-US', { timeZone: appearance.timezone });
          targetTime = new Date(targetString);
      } catch (e) {
          // Fallback to local if invalid timezone
          targetTime = time; 
      }
  }

  let hours = targetTime.getHours();
  const minutes = targetTime.getMinutes();
  const seconds = targetTime.getSeconds();
  
  const is12Hour = appearance?.timeFormat === '12h';
  const ampm = hours >= 12 ? 'PM' : 'AM';

  if (is12Hour) {
      hours = hours % 12;
      hours = hours ? hours : 12; 
  }

  // Calculate Date String for the *Target* timezone
  const dateOptions: Intl.DateTimeFormatOptions = { 
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      timeZone: appearance?.timezone === 'local' ? undefined : appearance?.timezone
  };
  // We use the original 'time' object for toLocaleDateString because it handles the timeZone option correctly internally
  const dateString = time.toLocaleDateString('en-GB', dateOptions);

  return (
    <div className="relative flex flex-col items-center justify-center h-full w-full bg-transparent p-4 sm:p-8 transition-colors duration-500">
      
      <button 
        onClick={handleToggle}
        aria-label={isZenMode ? "Exit Zen Mode" : "Enter Zen Mode"}
        className={`absolute top-6 right-6 p-3 rounded-full transition-all duration-300 z-50 border shadow-lg group focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none backdrop-blur-md
            ${isZenMode 
                ? 'bg-black/20 border-white/10 text-white/50 hover:text-white hover:bg-black/40' 
                : 'bg-white/80 dark:bg-neutral-800/80 border-neutral-200 dark:border-neutral-700 text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:border-amber-500'
            }`}
      >
        {isZenMode ? <Minimize2 size={24} aria-hidden="true" /> : <Maximize2 size={24} aria-hidden="true" />}
      </button>

      <div 
        className="flex flex-col items-center justify-center flex-1 w-full scale-90 sm:scale-100"
        role="timer"
      >
        {/* Location Label (World Clock) */}
        {!isZenMode && (
             <div className="flex items-center gap-2 mb-8 sm:mb-12 bg-neutral-100 dark:bg-neutral-800/50 px-4 py-2 rounded-full border border-neutral-200 dark:border-neutral-700/50">
                 <MapPin size={14} className="text-amber-500" />
                 <span className="text-xs sm:text-sm font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">
                     {appearance?.locationLabel || 'Local Time'}
                 </span>
             </div>
        )}

        {/* Clock Container */}
        <div className="flex items-center justify-center relative drop-shadow-2xl" aria-hidden="true">
            <FlipDigit key="hours" value={hours} label="Hours" isZenMode={isZenMode} appearance={appearance} />
            <Separator isZenMode={isZenMode} />
            <FlipDigit key="minutes" value={minutes} label="Minutes" isZenMode={isZenMode} appearance={appearance} />
            <Separator isZenMode={isZenMode} />
            <FlipDigit key="seconds" value={seconds} label="Seconds" isZenMode={isZenMode} appearance={appearance} />
            
            {/* AM/PM Indicator for 12h mode */}
            {is12Hour && (
              <div className={`absolute font-black tracking-widest text-neutral-300 dark:text-neutral-600
                ${isZenMode 
                  ? 'text-[3vw] -right-[8vw] bottom-[5vh]' 
                  : 'hidden sm:block text-base sm:text-xl lg:text-3xl -right-10 sm:-right-12 lg:-right-16 bottom-6 sm:bottom-8 lg:bottom-10'
                }`}>
                {ampm}
              </div>
            )}
        </div>
        
        {/* Mobile AM/PM Indicator */}
        {is12Hour && !isZenMode && (
           <div className="mt-8 text-xl font-black tracking-widest text-neutral-300 dark:text-neutral-600 sm:hidden">
             {ampm}
           </div>
        )}
        
        {/* Date Display */}
        <div className={`mt-12 lg:mt-16 xl:mt-24 font-mono font-medium tracking-[0.22em] sm:tracking-[0.3em] lg:tracking-[0.4em] uppercase transition-all duration-500 text-center
          ${isZenMode ? 'text-neutral-500/60 text-[2.5vw] lg:text-[1.5vh]' : 'text-neutral-500 dark:text-neutral-400 text-xs sm:text-base lg:text-lg'}`}>
            {dateString}
        </div>
      </div>
    </div>
  );
};
