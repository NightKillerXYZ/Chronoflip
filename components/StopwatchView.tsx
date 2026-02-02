import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FlipDigit } from './FlipDigit';
import { Maximize2, Minimize2 } from 'lucide-react';
import { AppearanceSettings } from '../types';

interface StopwatchViewProps {
  isZenMode: boolean;
  toggleZenMode: () => void;
  appearance?: AppearanceSettings;
}

interface Lap {
  id: number;
  time: number; // Duration of this specific lap
  total: number; // Total duration from start
}

export const StopwatchView: React.FC<StopwatchViewProps> = ({ isZenMode, toggleZenMode, appearance }) => {
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [laps, setLaps] = useState<Lap[]>([]);
  
  // High precision timing refs
  const requestRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const previousTimeRef = useRef<number>(0);
  const lastLapTimeRef = useRef<number>(0);

  const animate = useCallback((timestamp: number) => {
    if (!startTimeRef.current) startTimeRef.current = timestamp;
    
    // Calculate elapsed time
    const currentTime = timestamp - startTimeRef.current + previousTimeRef.current;
    setTime(currentTime);
    
    requestRef.current = requestAnimationFrame(animate);
  }, []);

  const toggleStart = () => {
    if (isRunning) {
      // STOP
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      previousTimeRef.current = time;
      startTimeRef.current = 0; // Reset for next start
      setIsRunning(false);
    } else {
      // START
      startTimeRef.current = 0; // Will be set in animate
      requestRef.current = requestAnimationFrame(animate);
      setIsRunning(true);
    }
  };

  const handleLapOrReset = () => {
    if (isRunning) {
      // LAP
      const currentTotal = time;
      const currentLapDuration = currentTotal - lastLapTimeRef.current;
      
      const newLap: Lap = {
        id: laps.length + 1,
        time: currentLapDuration,
        total: currentTotal
      };

      setLaps([newLap, ...laps]);
      lastLapTimeRef.current = currentTotal;
    } else {
      // RESET
      setTime(0);
      setLaps([]);
      previousTimeRef.current = 0;
      lastLapTimeRef.current = 0;
      startTimeRef.current = 0;
    }
  };

  useEffect(() => {
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  // Format Helper: HH:MM:SS.ms
  const format = (ms: number) => {
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    const cs = Math.floor((ms % 1000) / 10); // Centiseconds (0-99)
    return { h, m, s, cs };
  };

  const currentFormatted = format(time);
  const showHours = currentFormatted.h > 0;

  // Analysis for Lap highlighting (Best/Worst)
  const getLapStyle = (lapTime: number) => {
    if (laps.length < 2) return "text-neutral-700 dark:text-neutral-300";
    const times = laps.map(l => l.time);
    const min = Math.min(...times);
    const max = Math.max(...times);
    
    if (lapTime === min) return "text-green-600 dark:text-green-500 font-bold bg-green-50 dark:bg-green-900/20";
    if (lapTime === max) return "text-red-600 dark:text-red-500 font-bold bg-red-50 dark:bg-red-900/20";
    return "text-neutral-700 dark:text-neutral-300";
  };

  // Helper to format Lap strings
  const formatLapString = (ms: number) => {
    const { h, m, s, cs } = format(ms);
    const mStr = m.toString().padStart(2, '0');
    const sStr = s.toString().padStart(2, '0');
    const csStr = cs.toString().padStart(2, '0');
    
    if (h > 0) {
        return `${h}:${mStr}:${sStr}.${csStr}`;
    }
    return `${mStr}:${sStr}.${csStr}`;
  };

  const handleZenToggle = () => {
    toggleZenMode();
    if (!isZenMode) {
       if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
    } else {
       if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    }
  };

  // Dynamic sizing to fit Hours if present (reduced for smaller screens)
  // We use standard sizes unless we need to squeeze 4 groups of digits
  const cardSizeClass = showHours && !isZenMode
    ? "w-14 h-20 sm:w-20 sm:h-32 md:w-28 md:h-44 lg:w-32 lg:h-52 xl:w-44 xl:h-64" 
    : undefined;
    
  const textSizeClass = showHours && !isZenMode
    ? "text-3xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl"
    : undefined;

  const colonClass = `font-mono font-bold flex items-center justify-center pb-[2vh] sm:pb-8 text-neutral-300 dark:text-neutral-700 ${isZenMode ? 'text-[6vw]' : (showHours ? 'text-2xl sm:text-4xl lg:text-5xl mx-0.5 sm:mx-1' : 'text-4xl sm:text-6xl lg:text-7xl mx-1 sm:mx-2')}`;

  return (
    <div className="h-full w-full flex flex-col bg-neutral-100 dark:bg-neutral-950 transition-colors relative">
      
      {/* Zen Toggle */}
      <button 
        onClick={handleZenToggle}
        className="absolute top-6 right-6 z-50 p-3 rounded-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-400 hover:text-amber-500 transition-all shadow-sm focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none"
      >
        {isZenMode ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
      </button>

      {/* --- Display Area --- */}
      <div className={`flex flex-col items-center justify-center transition-all duration-500 ${isZenMode ? 'h-full scale-110' : 'h-[55%] min-h-[300px]'}`}>
        
        {/* Main Clock */}
        <div className="flex items-end justify-center mb-8 sm:mb-12">
           
           {/* Hours (Conditional) */}
           {showHours && (
             <>
                <FlipDigit 
                    key="stopwatch-hours"
                    value={currentFormatted.h} 
                    label={isZenMode ? undefined : "Hours"} 
                    isZenMode={isZenMode} 
                    cardClassName={cardSizeClass}
                    textClassName={textSizeClass}
                    appearance={appearance}
                />
                <div className={colonClass}>:</div>
             </>
           )}

           <FlipDigit 
                key="stopwatch-minutes"
                value={currentFormatted.m} 
                label={isZenMode ? undefined : "Minutes"} 
                isZenMode={isZenMode}
                cardClassName={cardSizeClass}
                textClassName={textSizeClass}
                appearance={appearance} 
            />
           
           <div className={colonClass}>:</div>
           
           <FlipDigit 
                key="stopwatch-seconds"
                value={currentFormatted.s} 
                label={isZenMode ? undefined : "Seconds"} 
                isZenMode={isZenMode}
                cardClassName={cardSizeClass}
                textClassName={textSizeClass}
                appearance={appearance} 
           />
           
           {/* Milliseconds (Centiseconds) - Plain Text */}
           <div className={`flex flex-col justify-end ml-2 sm:ml-4 pb-4 sm:pb-8`}>
               <div className={`font-mono font-bold tabular-nums leading-none text-neutral-400 dark:text-neutral-500 flex items-baseline
                 ${isZenMode ? 'text-[8vw] pb-[2vh]' : 'text-4xl sm:text-5xl lg:text-6xl mb-6 sm:mb-10'}`}>
                 <span className="opacity-50">.</span>
                 <span>{currentFormatted.cs.toString().padStart(2, '0')}</span>
               </div>
           </div>

        </div>

        {/* Controls */}
        <div className="flex items-center gap-16 sm:gap-24 relative z-10">
            {/* Left Button: Lap / Reset */}
            <button
                onClick={handleLapOrReset}
                disabled={!isRunning && time === 0}
                className={`w-20 h-20 sm:w-24 sm:h-24 lg:w-28 lg:h-28 rounded-full flex items-center justify-center border-2 transition-all active:scale-95 focus-visible:ring-4 focus-visible:ring-offset-4 focus-visible:ring-neutral-500 focus-visible:outline-none disabled:opacity-30 disabled:cursor-not-allowed
                  ${isRunning 
                    ? 'bg-neutral-200 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-300 dark:hover:bg-neutral-700'
                    : 'bg-neutral-200 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-300 dark:hover:bg-neutral-700'
                  }`}
            >
                {isRunning ? (
                    <span className="text-sm sm:text-base font-bold tracking-widest uppercase">Lap</span>
                ) : (
                    <span className="text-sm sm:text-base font-bold tracking-widest uppercase">Reset</span>
                )}
            </button>

            {/* Right Button: Start / Stop */}
            <button
                onClick={toggleStart}
                className={`w-20 h-20 sm:w-24 sm:h-24 lg:w-28 lg:h-28 rounded-full flex items-center justify-center border-2 transition-all active:scale-95 shadow-lg focus-visible:ring-4 focus-visible:ring-offset-4 focus-visible:outline-none
                  ${isRunning
                    ? 'bg-red-500/10 border-red-500 text-red-600 dark:text-red-500 hover:bg-red-500/20 focus-visible:ring-red-500' 
                    : 'bg-green-500/10 border-green-500 text-green-600 dark:text-green-500 hover:bg-green-500/20 focus-visible:ring-green-500'
                  }`}
            >
                {isRunning ? (
                    <span className="text-sm sm:text-base font-bold tracking-widest uppercase">Stop</span>
                ) : (
                    <span className="text-sm sm:text-base font-bold tracking-widest uppercase">Start</span>
                )}
            </button>
        </div>
      </div>

      {/* --- Lap List Area --- */}
      {!isZenMode && (
        <div className="flex-1 overflow-hidden border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/50 backdrop-blur-sm animate-slide-up">
            <div className="h-full overflow-y-auto custom-scrollbar p-0">
                <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-neutral-100/90 dark:bg-neutral-900/90 backdrop-blur-md z-10 border-b border-neutral-200 dark:border-neutral-800 text-xs font-bold uppercase tracking-wider text-neutral-500">
                        <tr>
                            <th className="py-3 px-6 sm:px-10">Lap No</th>
                            <th className="py-3 px-6 text-center">Split</th>
                            <th className="py-3 px-6 sm:px-10 text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                        {/* Current "Live" Lap (Ghost row) */}
                        {isRunning && (
                            <tr className="bg-neutral-50/50 dark:bg-neutral-800/30 animate-pulse">
                                <td className="py-4 px-6 sm:px-10 font-mono text-neutral-400">#{laps.length + 1}</td>
                                <td className="py-4 px-6 font-mono text-neutral-500 text-center">
                                    {formatLapString(time - lastLapTimeRef.current)}
                                </td>
                                <td className="py-4 px-6 sm:px-10 font-mono text-neutral-500 text-right">
                                    {formatLapString(time)}
                                </td>
                            </tr>
                        )}
                        
                        {laps.map((lap) => (
                            <tr key={lap.id} className={`transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50 ${getLapStyle(lap.time)}`}>
                                <td className="py-4 px-6 sm:px-10 font-mono">Lap {lap.id}</td>
                                <td className="py-4 px-6 font-mono text-center">{formatLapString(lap.time)}</td>
                                <td className="py-4 px-6 sm:px-10 font-mono text-right text-neutral-500 dark:text-neutral-400">{formatLapString(lap.total)}</td>
                            </tr>
                        ))}
                        
                        {laps.length === 0 && !isRunning && (
                            <tr>
                                <td colSpan={3} className="py-12 text-center text-neutral-400 dark:text-neutral-600 italic">
                                    Start the stopwatch to record laps
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
      )}
    </div>
  );
};