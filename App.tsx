import React, { useState, useEffect } from 'react';
import { Clock, AlarmClock, Timer as TimerIcon, Calendar, Menu, X, Sun, Moon, ChevronLeft, ChevronRight } from 'lucide-react';
import { ViewState, Timer } from './types';
import { ClockView } from './components/ClockView';
import { AlarmView } from './components/AlarmView';
import { TimerView } from './components/TimerView';
import { TimetableView } from './components/TimetableView';
import { audioService } from './services/audioService';
import { useLocalStorage } from './hooks/useLocalStorage';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.CLOCK);
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isZenMode, setZenMode] = useState(false);
  
  // Theme Management
  const [isDarkMode, setIsDarkMode] = useLocalStorage('isDarkMode', true);

  // Audio Warmup
  useEffect(() => {
    const warmupAudio = () => {
        audioService.resumeContext();
        window.removeEventListener('click', warmupAudio);
        window.removeEventListener('keydown', warmupAudio);
    };
    window.addEventListener('click', warmupAudio);
    window.addEventListener('keydown', warmupAudio);
    return () => {
        window.removeEventListener('click', warmupAudio);
        window.removeEventListener('keydown', warmupAudio);
    };
  }, []);

  // Handle screen resize to auto-close sidebar on mobile
  useEffect(() => {
    const handleResize = () => {
        if (window.innerWidth < 768) {
            setSidebarOpen(false);
        } else {
            setSidebarOpen(true);
        }
    };
    // Initial check
    if (window.innerWidth < 768) setSidebarOpen(false);
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Body scroll lock when mobile sidebar is open
  useEffect(() => {
    if (window.innerWidth < 768 && isSidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isSidebarOpen]);

  useEffect(() => {
    const html = document.documentElement;
    if (isDarkMode) {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    if (navigator.vibrate) navigator.vibrate(50);
  };

  // --- TIMER STATE MANAGEMENT ---
  const [timers, setTimers] = useLocalStorage<Timer[]>('timers', []);

  // Sync logic for background throttling and cross-tab updates
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      
      setTimers((prevTimers: Timer[]) => {
        let hasChanges = false;
        
        const updatedTimers = prevTimers.map((timer): Timer => {
          if (timer.status === 'RUNNING') {
            // If we have an endTime, calculate remaining based on that for accuracy
            if (timer.endTime) {
              const secondsLeft = Math.max(0, Math.ceil((timer.endTime - now) / 1000));
              
              if (secondsLeft !== timer.remaining) {
                hasChanges = true;
                if (secondsLeft <= 0) {
                  audioService.playAlarm(timer.soundId);
                  if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
                  return { ...timer, remaining: 0, status: 'FINISHED', endTime: undefined };
                }
                return { ...timer, remaining: secondsLeft };
              }
            } else {
              // Fallback for legacy data or start: set the endTime
              hasChanges = true;
              return { ...timer, endTime: now + timer.remaining * 1000 };
            }
          }
          return timer;
        });

        // Only update state if values actually changed to prevent re-renders
        return hasChanges ? updatedTimers : prevTimers;
      });
    }, 200); // Check more frequently than 1s to catch 0 faster, but UI updates based on diff

    return () => clearInterval(interval);
  }, [setTimers]);

  const addTimer = (duration: number, label: string, soundId: string) => {
    const newTimer: Timer = {
      id: Date.now().toString(),
      originalDuration: duration,
      remaining: duration,
      status: 'IDLE',
      label,
      soundId
    };
    setTimers([...timers, newTimer]);
  };

  const removeTimer = (id: string) => {
    const t = timers.find(t => t.id === id);
    if (t?.status === 'FINISHED') audioService.stopAlarm();
    setTimers(timers.filter(t => t.id !== id));
  };
  
  const updateTimer = (updatedTimer: Timer) => {
      setTimers(timers.map(t => t.id === updatedTimer.id ? updatedTimer : t));
  };

  const toggleTimer = (id: string) => {
    if (navigator.vibrate) navigator.vibrate(20);
    const now = Date.now();
    
    setTimers(timers.map(t => {
      if (t.id !== id) return t;
      
      if (t.status === 'RUNNING') {
        // Pause: clear endTime, keep current remaining
        return { ...t, status: 'PAUSED', endTime: undefined };
      }
      
      if (t.status === 'IDLE' || t.status === 'PAUSED') {
        // Start/Resume: calculate new endTime
        return { ...t, status: 'RUNNING', endTime: now + t.remaining * 1000 };
      }
      
      return t;
    }));
  };

  const resetTimer = (id: string) => {
     audioService.stopAlarm();
     if (navigator.vibrate) navigator.vibrate(20);
     setTimers(timers.map(t => t.id === id ? { ...t, remaining: t.originalDuration, status: 'IDLE', endTime: undefined } : t));
  };

  const snoozeTimer = (id: string) => {
     audioService.stopAlarm();
     if (navigator.vibrate) navigator.vibrate(50);
     const snoozeDuration = 300; // 5 minutes
     const now = Date.now();
     
     setTimers(timers.map(t => {
         if (t.id !== id) return t;
         return { 
           ...t, 
           remaining: t.remaining + snoozeDuration, 
           status: 'RUNNING',
           endTime: now + (t.remaining + snoozeDuration) * 1000 
         };
     }));
  };

  // ---------------------------

  const renderView = () => {
    let content;
    switch (currentView) {
      case ViewState.CLOCK: 
        content = <ClockView isZenMode={isZenMode} toggleZenMode={() => setZenMode(!isZenMode)} />;
        break;
      case ViewState.ALARM: 
        content = <AlarmView />;
        break;
      case ViewState.TIMER: 
        content = <TimerView 
                  timers={timers}
                  addTimer={addTimer}
                  removeTimer={removeTimer}
                  toggleTimer={toggleTimer}
                  resetTimer={resetTimer}
                  snoozeTimer={snoozeTimer}
                  updateTimer={updateTimer}
                  isZenMode={isZenMode}
                  toggleZenMode={() => setZenMode(!isZenMode)}
               />;
        break;
      case ViewState.TIMETABLE: 
        content = <TimetableView />;
        break;
      default: 
        content = <ClockView isZenMode={isZenMode} toggleZenMode={() => setZenMode(!isZenMode)} />;
    }
    
    // Add animation wrapper
    return (
        <div key={currentView} className="h-full w-full animate-fade-in">
            {content}
        </div>
    );
  };

  const NavItem = ({ view, icon: Icon, label }: { view: ViewState, icon: any, label: string }) => {
    const isActive = currentView === view;
    return (
      <button
        onClick={() => {
          if (navigator.vibrate) navigator.vibrate(10);
          setCurrentView(view);
          setZenMode(false);
          // On mobile, close sidebar on selection
          if (window.innerWidth < 768) setSidebarOpen(false);
        }}
        aria-label={label}
        aria-current={isActive ? 'page' : undefined}
        className={`w-full flex items-center px-6 py-4 transition-all duration-300 group relative border-r-2 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-500
          ${isActive 
            ? 'bg-amber-500/5 border-amber-500 text-amber-500 dark:text-amber-400' 
            : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-900/50'
          } ${!isSidebarOpen ? 'justify-center md:px-2' : 'gap-4'}`}
      >
        <Icon 
          size={24} 
          className={`flex-shrink-0 transition-transform duration-300 ${isActive ? 'scale-110 drop-shadow-[0_0_8px_rgba(245,158,11,0.3)]' : 'group-hover:scale-105'}`} 
          strokeWidth={isActive ? 2.5 : 2}
          aria-hidden="true"
        />
        
        <span className={`font-medium tracking-wide whitespace-nowrap overflow-hidden transition-all duration-300 ${
          isSidebarOpen ? 'w-auto opacity-100 translate-x-0' : 'w-0 opacity-0 -translate-x-4 md:hidden'
        }`}>
          {label}
        </span>
        
        {/* Tooltip for collapsed mode (Desktop) */}
        {!isSidebarOpen && (
          <div role="tooltip" className="absolute left-full top-1/2 -translate-y-1/2 ml-4 px-3 py-1.5 bg-neutral-900 dark:bg-neutral-800 text-white text-xs font-semibold rounded-lg opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 pointer-events-none whitespace-nowrap z-50 hidden md:block shadow-[0_4px_12px_rgba(0,0,0,0.5)] border border-neutral-700/50">
             {label}
             {/* Arrow */}
             <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-neutral-900 dark:bg-neutral-800 border-l border-b border-neutral-700/50 transform rotate-45"></div>
          </div>
        )}
      </button>
    );
  };

  return (
    <div className="flex h-screen bg-neutral-50 dark:bg-black text-neutral-900 dark:text-white overflow-hidden transition-colors duration-500 font-sans">
      
      {/* Mobile Menu Toggle (Hide in Zen Mode) */}
      {!isZenMode && (
        <button 
          className="absolute top-4 left-4 z-50 md:hidden p-2.5 bg-white dark:bg-neutral-900 rounded-xl text-neutral-600 dark:text-neutral-400 shadow-lg border border-neutral-200 dark:border-neutral-800 active:scale-95 transition-transform focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none"
          onClick={() => setSidebarOpen(!isSidebarOpen)}
          aria-label={isSidebarOpen ? "Close Menu" : "Open Menu"}
          aria-expanded={isSidebarOpen}
        >
          {isSidebarOpen ? <X size={24} aria-hidden="true" /> : <Menu size={24} aria-hidden="true" />}
        </button>
      )}

      {/* Mobile Backdrop Overlay */}
      {isSidebarOpen && !isZenMode && (
        <div 
            className="fixed inset-0 bg-black/60 z-30 md:hidden backdrop-blur-sm animate-fade-in cursor-pointer"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
            aria-label="Close sidebar"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                setSidebarOpen(false);
              }
            }}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed md:relative z-40 h-full bg-white dark:bg-neutral-950/95 backdrop-blur-sm border-r border-neutral-200 dark:border-neutral-900 transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) flex flex-col shadow-2xl md:shadow-none
        ${isZenMode ? '-translate-x-full w-0 opacity-0 overflow-hidden' : (isSidebarOpen ? 'w-72 translate-x-0' : '-translate-x-full md:translate-x-0 md:w-20')}
      `}>
        {/* Desktop Collapse Toggle Button */}
        {!isZenMode && (
          <button 
            onClick={() => setSidebarOpen(!isSidebarOpen)}
            className="hidden md:flex absolute -right-3 top-10 z-50 bg-white dark:bg-neutral-800 text-neutral-500 hover:text-amber-500 border border-neutral-200 dark:border-neutral-700 rounded-full p-1.5 shadow-md transition-all items-center justify-center hover:scale-110 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none"
            aria-label={isSidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
            aria-expanded={isSidebarOpen}
          >
            {isSidebarOpen ? <ChevronLeft size={14} strokeWidth={3} aria-hidden="true" /> : <ChevronRight size={14} strokeWidth={3} aria-hidden="true" />}
          </button>
        )}

        <div className="h-28 flex items-center justify-center border-b border-neutral-200 dark:border-neutral-900 whitespace-nowrap overflow-hidden relative" role="banner">
           <div className={`transition-all duration-500 ${isSidebarOpen ? 'opacity-100 scale-100' : 'opacity-100 scale-100'}`}>
             {isSidebarOpen ? (
               <h1 className="text-xl font-bold tracking-[0.25em] text-neutral-800 dark:text-neutral-200">CHRONO<span className="text-amber-600">FLIP</span></h1>
             ) : (
               <span className="text-xl font-bold text-amber-600 tracking-tighter" aria-label="ChronoFlip">CF</span>
             )}
           </div>
        </div>

        <nav className="flex-1 py-8 space-y-1 overflow-y-auto overflow-x-hidden custom-scrollbar" aria-label="Main Navigation">
          <NavItem view={ViewState.CLOCK} icon={Clock} label="Clock" />
          <NavItem view={ViewState.ALARM} icon={AlarmClock} label="Alarm" />
          <NavItem view={ViewState.TIMER} icon={TimerIcon} label="Timer" />
          <NavItem view={ViewState.TIMETABLE} icon={Calendar} label="Timetable" />
        </nav>

        <div className="p-6 border-t border-neutral-200 dark:border-neutral-900 flex flex-col gap-4">
           {/* Theme Toggle */}
           <button 
             onClick={toggleTheme}
             aria-label={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
             className={`flex items-center justify-center w-full p-3 rounded-xl transition-all duration-300 group relative border shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-950 ${
               isDarkMode 
                ? 'bg-neutral-900 border-neutral-800 text-amber-400 hover:bg-neutral-800 hover:border-neutral-700' 
                : 'bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100 hover:border-amber-300'
             }`}
           >
             {isDarkMode ? <Sun size={20} className="fill-amber-400" aria-hidden="true" /> : <Moon size={20} className="fill-amber-600" aria-hidden="true" />}
             
             {isSidebarOpen && <span className="ml-3 font-semibold text-sm whitespace-nowrap">Switch Theme</span>}

             {!isSidebarOpen && (
                <div role="tooltip" className="absolute left-full top-1/2 -translate-y-1/2 ml-4 px-3 py-1.5 bg-neutral-900 dark:bg-neutral-800 text-white text-xs font-semibold rounded-lg opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 pointer-events-none whitespace-nowrap z-50 hidden md:block shadow-[0_4px_12px_rgba(0,0,0,0.5)] border border-neutral-700/50">
                    Switch Theme
                    <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-neutral-900 dark:bg-neutral-800 border-l border-b border-neutral-700/50 transform rotate-45"></div>
                </div>
            )}
           </button>

           <div className={`text-[10px] font-mono text-neutral-400 dark:text-neutral-600 text-center whitespace-nowrap overflow-hidden transition-all duration-300 ${!isSidebarOpen ? 'opacity-0 h-0' : 'opacity-100 h-auto'}`} aria-hidden="true">
             v1.2.0 • Pro
           </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className={`flex-1 relative h-full overflow-hidden bg-neutral-50 dark:bg-black transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) ${isZenMode ? 'w-screen' : ''}`} role="main">
        {renderView()}
      </main>

    </div>
  );
};

export default App;