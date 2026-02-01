
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Clock, AlarmClock, Timer as TimerIcon, Calendar, Menu, X, Sun, Moon, ChevronLeft, ChevronRight, Zap, Bell, MonitorX, Lock, AlertCircle, Watch } from 'lucide-react';
import { ViewState, Timer, Alarm } from './types';
import { ClockView } from './components/ClockView';
import { AlarmView } from './components/AlarmView';
import { TimerView } from './components/TimerView';
import { StopwatchView } from './components/StopwatchView';
import { TimetableView } from './components/TimetableView';
import { audioService } from './services/audioService';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useWakeLock } from './hooks/useWakeLock';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.CLOCK);
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isZenMode, setZenMode] = useState(false);
  
  // Theme Management
  const [isDarkMode, setIsDarkMode] = useLocalStorage('isDarkMode', true);
  
  // Prevent Screen Sleep
  const { isLocked, status: wakeLockStatus, requestWakeLock } = useWakeLock();

  // --- GLOBAL STATE ---
  const [alarms, setAlarms] = useLocalStorage<Alarm[]>('alarms', []);
  const [timers, setTimers] = useLocalStorage<Timer[]>('timers', []);
  const [activeAlertId, setActiveAlertId] = useState<string | null>(null); 
  const [alertType, setAlertType] = useState<'ALARM' | 'TIMER' | null>(null);

  // --- SAFE UTILITIES ---
  const handleVibrate = useCallback((pattern: number | number[]) => {
      try {
          if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
              navigator.vibrate(pattern);
          }
      } catch (e) {}
  }, []);

  const sendNotification = useCallback((title: string, options?: any) => {
      try {
          if ('Notification' in window && Notification.permission === 'granted') {
              new Notification(title, options);
          }
      } catch (e) {
          console.warn("Notification error:", e);
      }
  }, []);

  // --- EFFECTS ---

  // Initialization & User Interaction Handlers
  useEffect(() => {
    const warmupApp = async () => {
        try { audioService.resumeContext(); } catch (e) {}
        
        if ('Notification' in window && Notification.permission === 'default') {
            try { await Notification.requestPermission(); } catch (e) {}
        }
    };
    
    // Explicitly separate the wake lock retry from the warmup to prevent loops
    const handleInteraction = () => {
        warmupApp();
        // Only try to request if we know it's inactive, but do NOT depend on status for the effect
        requestWakeLock(); 
    };
    
    window.addEventListener('click', handleInteraction);
    window.addEventListener('keydown', handleInteraction);
    // Use passive listener for touch to improve performance and prevent blocking
    window.addEventListener('touchstart', handleInteraction, { passive: true });
    
    return () => {
        window.removeEventListener('click', handleInteraction);
        window.removeEventListener('keydown', handleInteraction);
        window.removeEventListener('touchstart', handleInteraction);
    };
  }, [requestWakeLock]); 
  // Dependency is just the stable request function, NOT the status

  // --- LOGIC: ALARMS ---
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const currentHours = now.getHours();
      const currentMins = now.getMinutes();
      const currentTimestamp = Math.floor(now.getTime() / 60000); 
      
      let hasUpdates = false;

      const updatedAlarms = alarms.map(alarm => {
        const [h, m] = alarm.time.split(':').map(Number);
        
        if (alarm.active && h === currentHours && m === currentMins) {
           if (alarm.lastTriggered === currentTimestamp) return alarm;
           
           triggerAlert(alarm.id, 'ALARM', alarm.label, alarm.soundId);
           hasUpdates = true;
           return { ...alarm, lastTriggered: currentTimestamp };
        }
        return alarm;
      });

      if (hasUpdates) setAlarms(updatedAlarms);
    }, 1000);
    return () => clearInterval(interval);
  }, [alarms, setAlarms]);

  // --- LOGIC: TIMERS ---
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      
      setTimers((prevTimers: Timer[]) => {
        let hasChanges = false;
        
        const updatedTimers = prevTimers.map((timer): Timer => {
          if (timer.status === 'RUNNING') {
            if (timer.endTime) {
              const secondsLeft = Math.max(0, Math.ceil((timer.endTime - now) / 1000));
              
              if (secondsLeft !== timer.remaining) {
                hasChanges = true;
                if (secondsLeft <= 0) {
                  triggerAlert(timer.id, 'TIMER', timer.label, timer.soundId);
                  return { ...timer, remaining: 0, status: 'FINISHED', endTime: undefined };
                }
                return { ...timer, remaining: secondsLeft };
              }
            } else {
              hasChanges = true;
              return { ...timer, endTime: now + timer.remaining * 1000 };
            }
          }
          return timer;
        });
        return hasChanges ? updatedTimers : prevTimers;
      });
    }, 200); 

    return () => clearInterval(interval);
  }, [setTimers]);


  // --- SHARED ALERT ACTIONS ---
  const triggerAlert = (id: string, type: 'ALARM' | 'TIMER', label: string, soundId: string) => {
    if (activeAlertId === id) return;
    
    setActiveAlertId(id);
    setAlertType(type);
    
    audioService.playAlarm(soundId);
    handleVibrate([200, 100, 200, 100, 500, 100, 500]);
    
    sendNotification(`ChronoFlip ${type === 'ALARM' ? 'Alarm' : 'Timer'}`, { 
        body: `${label || 'Time is up!'}`,
        icon: '/icon.svg',
        requireInteraction: true,
        tag: id,
        renotify: true
    });
  };

  const stopAlert = () => {
    setActiveAlertId(null);
    setAlertType(null);
    audioService.stopAlarm();
  };

  const handleSnooze = () => {
      if (!activeAlertId) return;
      const snoozeMinutes = 5;

      if (alertType === 'ALARM') {
          const alarm = alarms.find(a => a.id === activeAlertId);
          if (alarm) {
              const now = new Date();
              now.setMinutes(now.getMinutes() + snoozeMinutes);
              const newTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
              
              setAlarms([...alarms, {
                  id: `snooze-${Date.now()}`,
                  time: newTime,
                  label: `Snooze: ${alarm.label}`,
                  active: true,
                  soundId: alarm.soundId
              }]);
          }
      } else if (alertType === 'TIMER') {
          setTimers(timers.map(t => {
            if (t.id !== activeAlertId) return t;
            const now = Date.now();
            return { 
                ...t, 
                remaining: snoozeMinutes * 60, 
                status: 'RUNNING',
                endTime: now + (snoozeMinutes * 60 * 1000) 
            };
          }));
      }

      stopAlert();
      handleVibrate(50);
  };

  // --- VIEW HELPERS ---
  useEffect(() => {
    const handleResize = () => {
        if (window.innerWidth < 768) setSidebarOpen(false);
        else setSidebarOpen(true);
    };
    if (window.innerWidth < 768) setSidebarOpen(false);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if ((window.innerWidth < 768 && isSidebarOpen) || activeAlertId) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }, [isSidebarOpen, activeAlertId]);

  useEffect(() => {
    const html = document.documentElement;
    if (isDarkMode) html.classList.add('dark');
    else html.classList.remove('dark');
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    handleVibrate(50);
  };

  // Timer Child Actions
  const addTimer = (duration: number, label: string, soundId: string) => {
    setTimers([...timers, {
      id: Date.now().toString(),
      originalDuration: duration,
      remaining: duration,
      status: 'IDLE',
      label,
      soundId
    }]);
  };
  const removeTimer = (id: string) => setTimers(timers.filter(t => t.id !== id));
  const updateTimer = (updated: Timer) => setTimers(timers.map(t => t.id === updated.id ? updated : t));
  const toggleTimer = (id: string) => {
    handleVibrate(20);
    const now = Date.now();
    setTimers(timers.map(t => {
      if (t.id !== id) return t;
      if (t.status === 'RUNNING') return { ...t, status: 'PAUSED', endTime: undefined };
      if (t.status === 'IDLE' || t.status === 'PAUSED') return { ...t, status: 'RUNNING', endTime: now + t.remaining * 1000 };
      return t;
    }));
  };
  const resetTimer = (id: string) => {
     audioService.stopAlarm();
     handleVibrate(20);
     setTimers(timers.map(t => t.id === id ? { ...t, remaining: t.originalDuration, status: 'IDLE', endTime: undefined } : t));
  };
  const snoozeTimer = (id: string) => {
     audioService.stopAlarm();
     handleVibrate(50);
     const snoozeDuration = 300;
     const now = Date.now();
     setTimers(timers.map(t => {
         if (t.id !== id) return t;
         return { ...t, remaining: t.remaining + snoozeDuration, status: 'RUNNING', endTime: now + (t.remaining + snoozeDuration) * 1000 };
     }));
  };

  const renderView = () => {
    let content;
    switch (currentView) {
      case ViewState.CLOCK: 
        content = <ClockView isZenMode={isZenMode} toggleZenMode={() => setZenMode(!isZenMode)} />;
        break;
      case ViewState.ALARM: 
        content = <AlarmView alarms={alarms} setAlarms={setAlarms} />;
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
      case ViewState.STOPWATCH:
        content = <StopwatchView isZenMode={isZenMode} toggleZenMode={() => setZenMode(!isZenMode)} />;
        break;
      case ViewState.TIMETABLE: 
        content = <TimetableView alarms={alarms} setAlarms={setAlarms} />;
        break;
      default: 
        content = <ClockView isZenMode={isZenMode} toggleZenMode={() => setZenMode(!isZenMode)} />;
    }
    
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
          handleVibrate(10);
          setCurrentView(view);
          setZenMode(false);
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
        <span className={`font-medium tracking-wide whitespace-nowrap overflow-hidden transition-all duration-300 ${isSidebarOpen ? 'w-auto opacity-100 translate-x-0' : 'w-0 opacity-0 -translate-x-4 md:hidden'}`}>{label}</span>
        
        {!isSidebarOpen && (
          <div role="tooltip" className="absolute left-full top-1/2 -translate-y-1/2 ml-4 px-3 py-1.5 bg-neutral-900 dark:bg-neutral-800 text-white text-xs font-semibold rounded-lg opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 pointer-events-none whitespace-nowrap z-50 hidden md:block shadow-[0_4px_12px_rgba(0,0,0,0.5)] border border-neutral-700/50">
             {label}
             <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-neutral-900 dark:bg-neutral-800 border-l border-b border-neutral-700/50 transform rotate-45"></div>
          </div>
        )}
      </button>
    );
  };

  const getAlertLabel = () => {
      if (alertType === 'ALARM') return alarms.find(a => a.id === activeAlertId)?.label || 'Alarm';
      if (alertType === 'TIMER') return timers.find(t => t.id === activeAlertId)?.label || 'Timer';
      return 'Alert';
  };

  const renderWakeLockStatus = () => {
      if (wakeLockStatus === 'active') {
          return (
             <div className="text-[10px] font-mono flex items-center justify-center gap-1 text-amber-500 animate-pulse" title="Screen will stay awake">
                 <Zap size={10} className="fill-current" />
                 {isSidebarOpen && <span>SCREEN AWAKE</span>}
             </div>
          );
      }
      
      if (wakeLockStatus === 'denied') {
          return (
             <div className="text-[10px] font-mono flex items-center justify-center gap-1 text-red-500" title="Browser blocked Wake Lock. Click anywhere to retry.">
                 <Lock size={10} />
                 {isSidebarOpen && <span>AUTO-SLEEP ON</span>}
             </div>
          );
      }
      
      if (wakeLockStatus === 'unavailable') {
          return (
             <div className="text-[10px] font-mono flex items-center justify-center gap-1 text-neutral-400" title="Wake Lock not supported in this environment">
                 <MonitorX size={10} />
                 {isSidebarOpen && <span>AUTO-SLEEP ON</span>}
             </div>
          );
      }

      return (
         <div className="text-[10px] font-mono flex items-center justify-center gap-1 text-neutral-500 dark:text-neutral-600" title="Click anywhere to wake screen">
             <MonitorX size={10} />
             {isSidebarOpen && <span>SLEEP ENABLED</span>}
         </div>
      );
  };

  return (
    <div className="flex h-screen bg-neutral-50 dark:bg-black text-neutral-900 dark:text-white overflow-hidden transition-colors duration-500 font-sans relative">
      {activeAlertId && (
        <div role="alertdialog" aria-modal="true" className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-xl p-6 animate-in fade-in zoom-in duration-300">
            <div className="bg-neutral-900/50 border border-red-500/50 p-10 rounded-3xl shadow-[0_0_100px_rgba(220,38,38,0.3)] flex flex-col items-center w-full max-w-md relative overflow-hidden">
                <div className="absolute inset-0 bg-red-500/10 animate-pulse" />
                <Bell className="w-24 h-24 text-red-500 mb-8 animate-bounce relative z-10 drop-shadow-[0_0_15px_rgba(220,38,38,0.5)]" aria-hidden="true" />
                <h1 className="text-5xl text-white font-black mb-4 text-center relative z-10 tracking-tight uppercase">{alertType}</h1>
                <p className="text-neutral-300 mb-12 text-2xl relative z-10 text-center font-medium">{getAlertLabel()}</p>
                
                <div className="flex flex-col gap-4 w-full relative z-10">
                    <button 
                    onClick={stopAlert}
                    className="bg-red-600 hover:bg-red-500 text-white w-full py-5 rounded-2xl text-xl font-bold transition-all shadow-lg shadow-red-900/50 hover:scale-[1.02] active:scale-95 focus-visible:ring-4 focus-visible:ring-white/50 focus-visible:outline-none"
                    >
                    STOP
                    </button>
                    <button 
                    onClick={handleSnooze}
                    className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 w-full py-5 rounded-2xl text-xl font-semibold transition-all border border-neutral-700 hover:border-neutral-600 hover:scale-[1.02] active:scale-95 focus-visible:ring-4 focus-visible:ring-white/20 focus-visible:outline-none"
                    >
                    Snooze 5m
                    </button>
                </div>
            </div>
        </div>
      )}

      {!isZenMode && (
        <button 
          className="absolute top-4 left-4 z-50 md:hidden p-2.5 bg-white dark:bg-neutral-900 rounded-xl text-neutral-600 dark:text-neutral-400 shadow-lg border border-neutral-200 dark:border-neutral-800 active:scale-95 transition-transform focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none"
          onClick={() => setSidebarOpen(!isSidebarOpen)}
          aria-label={isSidebarOpen ? "Close Menu" : "Open Menu"}
        >
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      )}

      {isSidebarOpen && !isZenMode && (
        <div 
            className="fixed inset-0 bg-black/60 z-30 md:hidden backdrop-blur-sm animate-fade-in"
            onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className={`
        fixed md:relative z-40 h-full bg-white dark:bg-neutral-950/95 backdrop-blur-sm border-r border-neutral-200 dark:border-neutral-900 transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) flex flex-col shadow-2xl md:shadow-none
        ${isZenMode ? '-translate-x-full w-0 opacity-0 overflow-hidden' : (isSidebarOpen ? 'w-72 translate-x-0' : '-translate-x-full md:translate-x-0 md:w-20')}
      `}>
        {!isZenMode && (
          <button 
            onClick={() => setSidebarOpen(!isSidebarOpen)}
            className="hidden md:flex absolute -right-3 top-10 z-50 bg-white dark:bg-neutral-800 text-neutral-500 hover:text-amber-500 border border-neutral-200 dark:border-neutral-700 rounded-full p-1.5 shadow-md transition-all items-center justify-center hover:scale-110 hover:shadow-lg"
          >
            {isSidebarOpen ? <ChevronLeft size={14} strokeWidth={3} /> : <ChevronRight size={14} strokeWidth={3} />}
          </button>
        )}

        <div className="h-28 flex items-center justify-center border-b border-neutral-200 dark:border-neutral-900 whitespace-nowrap overflow-hidden relative">
           <div className={`transition-all duration-500 ${isSidebarOpen ? 'opacity-100 scale-100' : 'opacity-100 scale-100'}`}>
             {isSidebarOpen ? <h1 className="text-xl font-bold tracking-[0.25em] text-neutral-800 dark:text-neutral-200">CHRONO<span className="text-amber-600">FLIP</span></h1> : <span className="text-xl font-bold text-amber-600 tracking-tighter">CF</span>}
           </div>
        </div>

        <nav className="flex-1 py-8 space-y-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
          <NavItem view={ViewState.CLOCK} icon={Clock} label="Clock" />
          <NavItem view={ViewState.ALARM} icon={AlarmClock} label="Alarm" />
          <NavItem view={ViewState.TIMER} icon={TimerIcon} label="Timer" />
          <NavItem view={ViewState.STOPWATCH} icon={Watch} label="Stopwatch" />
          <NavItem view={ViewState.TIMETABLE} icon={Calendar} label="Timetable" />
        </nav>

        <div className="p-6 border-t border-neutral-200 dark:border-neutral-900 flex flex-col gap-4">
           <button 
             onClick={toggleTheme}
             className={`flex items-center justify-center w-full p-3 rounded-xl transition-all duration-300 group relative border shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
               isDarkMode 
                ? 'bg-neutral-900 border-neutral-800 text-amber-400 hover:bg-neutral-800' 
                : 'bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100'
             }`}
           >
             {isDarkMode ? <Sun size={20} className="fill-amber-400" /> : <Moon size={20} className="fill-amber-600" />}
             {isSidebarOpen && <span className="ml-3 font-semibold text-sm whitespace-nowrap">Switch Theme</span>}
           </button>
           
           {renderWakeLockStatus()}
           
           {/* Version Indicator */}
           {isSidebarOpen && (
               <div className="text-center">
                   <span className="text-[10px] text-neutral-400 dark:text-neutral-600 font-mono tracking-widest uppercase">v1.2.1</span>
               </div>
           )}
        </div>
      </div>

      <main className={`flex-1 relative h-full overflow-hidden bg-neutral-50 dark:bg-black transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) ${isZenMode ? 'w-screen' : ''}`}>
        {renderView()}
      </main>
    </div>
  );
};

export default App;
