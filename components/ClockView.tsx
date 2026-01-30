import React, { useState, useEffect } from 'react';
import { FlipDigit } from './FlipDigit';
import { Maximize2, Minimize2 } from 'lucide-react';

interface ClockViewProps {
  isZenMode: boolean;
  toggleZenMode: () => void;
}

export const ClockView: React.FC<ClockViewProps> = ({ isZenMode, toggleZenMode }) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleToggle = () => {
    toggleZenMode();
    // Only toggle native fullscreen if we are entering zen mode
    if (!isZenMode) {
         if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch((e) => {
                console.log("Fullscreen not allowed", e);
            });
        }
    } else {
        if (document.fullscreenElement) {
            document.exitFullscreen().catch((e) => {
                 console.log("Exit fullscreen failed", e);
            });
        }
    }
  };

  const hours = time.getHours();
  const minutes = time.getMinutes();
  const seconds = time.getSeconds();

  const timeLabel = `Current time is ${hours} hours, ${minutes} minutes, and ${seconds} seconds`;

  // Separator Component
  // Adaptive scaling:
  // - Mobile: Gap 2.5vw, Margin 1.5vw.
  // - Desktop: Gap 3vh, Margin 2.5vw.
  const Separator = () => (
      <div className={`flex flex-col justify-center items-center opacity-60 transition-all duration-300
          ${isZenMode 
             ? 'gap-[2.5vw] mx-[1.5vw] lg:gap-[3vh] lg:mx-[2.5vw]' 
             : 'gap-4 mx-2 md:mx-4'
          }`}>
          <div className={`rounded-full shadow-inner transition-all duration-300 bg-neutral-400/80 dark:bg-neutral-700/80
             ${isZenMode 
                ? 'w-[1.5vw] h-[1.5vw] lg:w-[1.2vh] lg:h-[1.2vh]' 
                : 'w-2 h-2 sm:w-3 sm:h-3 md:w-4 md:h-4'
             }`} 
          />
          <div className={`rounded-full shadow-inner transition-all duration-300 bg-neutral-400/80 dark:bg-neutral-700/80
             ${isZenMode 
                ? 'w-[1.5vw] h-[1.5vw] lg:w-[1.2vh] lg:h-[1.2vh]' 
                : 'w-2 h-2 sm:w-3 sm:h-3 md:w-4 md:h-4'
             }`} 
          />
      </div>
  );

  return (
    <div className="relative flex flex-col items-center justify-center h-full w-full bg-neutral-100 dark:bg-neutral-950 p-8 transition-colors duration-500">
      
      <button 
        onClick={handleToggle}
        aria-label={isZenMode ? "Exit Zen Mode (Fullscreen)" : "Enter Zen Mode (Fullscreen)"}
        className={`absolute top-6 right-6 p-4 rounded-full transition-all duration-300 z-50 border shadow-lg group focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none
            ${isZenMode 
                ? 'bg-transparent border-neutral-300 dark:border-neutral-800 text-neutral-400 dark:text-neutral-600 hover:text-neutral-900 dark:hover:text-white hover:border-neutral-400 dark:hover:border-neutral-600' 
                : 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:border-amber-500 hover:bg-neutral-50 dark:hover:bg-neutral-700'
            }`}
        title={isZenMode ? "Exit Fullscreen" : "Go Fullscreen"}
      >
        {isZenMode ? <Minimize2 size={24} aria-hidden="true" /> : <Maximize2 size={24} aria-hidden="true" />}
      </button>

      <div 
        className="flex flex-col items-center justify-center flex-1 w-full"
        role="timer"
        aria-label={timeLabel}
      >
        {/* Clock Container - Aligned Items Center for vertical centering */}
        <div className="flex items-center justify-center" aria-hidden="true">
            <FlipDigit value={hours} label="Hours" isZenMode={isZenMode} />
            <Separator />
            <FlipDigit value={minutes} label="Minutes" isZenMode={isZenMode} />
            <Separator />
            <FlipDigit value={seconds} label="Seconds" isZenMode={isZenMode} />
        </div>
        
        {/* Date Display - Scaled responsively */}
        <div className={`mt-12 font-mono tracking-[0.3em] uppercase transition-all duration-500 text-center
            ${isZenMode ? 'text-neutral-500 dark:text-neutral-600 text-[3vw] lg:text-[1.8vh]' : 'text-neutral-500 text-sm sm:text-lg'}`}>
            {time.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </div>
    </div>
  );
};