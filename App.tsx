
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Clock, AlarmClock, Timer as TimerIcon, Calendar, Menu, X, Sun, Moon, ChevronLeft, ChevronRight, Zap, Bell, MonitorX, Lock, AlertCircle, Watch, Settings, Palette, Type, Layout, RefreshCw, Globe, Search, Volume2, Sliders } from 'lucide-react';
import { ViewState, Timer, Alarm, AppearanceSettings, DEFAULT_APPEARANCE, CustomSound } from './types';
import { ClockView } from './components/ClockView';
import { AlarmView } from './components/AlarmView';
import { TimerView } from './components/TimerView';
import { StopwatchView } from './components/StopwatchView';
import { TimetableView } from './components/TimetableView';
import { audioService } from './services/audioService';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useWakeLock } from './hooks/useWakeLock';
import { SoundPicker } from './components/SoundPicker';

// --- TIMEZONE DATA ---
const MAJOR_CITIES = [
    { label: 'Local Time', zone: 'local' },
    { label: 'London', zone: 'Europe/London' },
    { label: 'New York', zone: 'America/New_York' },
    { label: 'Los Angeles', zone: 'America/Los_Angeles' },
    { label: 'Tokyo', zone: 'Asia/Tokyo' },
    { label: 'Paris', zone: 'Europe/Paris' },
    { label: 'Sydney', zone: 'Australia/Sydney' },
    { label: 'Dubai', zone: 'Asia/Dubai' },
    { label: 'Singapore', zone: 'Asia/Singapore' },
    { label: 'Hong Kong', zone: 'Asia/Hong_Kong' },
    { label: 'Mumbai', zone: 'Asia/Kolkata' },
    { label: 'Shanghai', zone: 'Asia/Shanghai' },
    { label: 'Moscow', zone: 'Europe/Moscow' },
    { label: 'Berlin', zone: 'Europe/Berlin' },
    { label: 'Toronto', zone: 'America/Toronto' },
    { label: 'Chicago', zone: 'America/Chicago' },
    { label: 'Sao Paulo', zone: 'America/Sao_Paulo' },
    { label: 'Cairo', zone: 'Africa/Cairo' },
    { label: 'Johannesburg', zone: 'Africa/Johannesburg' },
    { label: 'Seoul', zone: 'Asia/Seoul' },
];

interface ColorSwatchProps {
  color: string;
  selected: boolean;
  onClick: () => void;
  label?: string;
}

const ColorSwatch: React.FC<ColorSwatchProps> = ({ color, selected, onClick, label }) => (
  <button 
    onClick={onClick} 
    title={label}
    className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none ${selected ? 'border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)] scale-110' : 'border-neutral-200 dark:border-neutral-700'}`}
    style={{ backgroundColor: color === 'auto' ? 'transparent' : color }}
  >
      {color === 'auto' && (
          <div className="w-full h-full flex items-center justify-center bg-neutral-100 dark:bg-neutral-800 rounded-full text-[8px] font-bold text-neutral-500">AUTO</div>
      )}
  </button>
);

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.CLOCK);
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isZenMode, setZenMode] = useState(false);
  
  // Theme & Appearance Management
  const [isDarkMode, setIsDarkMode] = useLocalStorage('isDarkMode', true);
  const [appearance, setAppearance] = useLocalStorage<AppearanceSettings>('appearance', DEFAULT_APPEARANCE);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'General' | 'Appearance' | 'Sound'>('Appearance');
  const [tzSearch, setTzSearch] = useState('');
  
  // Prevent Screen Sleep
  const { isLocked, status: wakeLockStatus, requestWakeLock } = useWakeLock();

  // --- GLOBAL STATE ---
  const [alarms, setAlarms] = useLocalStorage<Alarm[]>('alarms', []);
  const [timers, setTimers] = useLocalStorage<Timer[]>('timers', []);
  const [customSounds, setCustomSounds] = useLocalStorage<CustomSound[]>('customSounds', []);
  const [activeAlertId, setActiveAlertId] = useState<string | null>(null); 
  const [alertType, setAlertType] = useState<'ALARM' | 'TIMER' | null>(null);

  // --- AUDIO PERSISTENCE HYDRATION ---
  useEffect(() => {
    const hydrateAudio = async () => {
        // Resume context first
        audioService.resumeContext();
        
        for (const sound of customSounds) {
            if (!audioService.hasCustomSound(sound.id)) {
                try {
                    const res = await fetch(sound.data);
                    const blob = await res.blob();
                    const ab = await blob.arrayBuffer();
                    await audioService.decodeCustomSound(sound.id, ab);
                } catch (e) {
                    console.error("Failed to hydrate sound:", sound.name, e);
                }
            }
        }
    };
    hydrateAudio();
  }, [customSounds]);

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

  // --- Custom Sound Handlers ---
  const handleUploadSound = (file: File) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
          const base64 = e.target?.result as string;
          if (base64) {
              const id = `custom-${Date.now()}`;
              const name = file.name.replace(/\.[^/.]+$/, "");
              
              const newSound: CustomSound = { id, name, data: base64 };
              setCustomSounds([...customSounds, newSound]);
          }
      };
      reader.readAsDataURL(file);
  };

  const handleRenameSound = (id: string, newName: string) => {
      setCustomSounds(customSounds.map(s => s.id === id ? { ...s, name: newName } : s));
  };

  const handleDeleteSound = (id: string) => {
      setCustomSounds(customSounds.filter(s => s.id !== id));
      // Also reset default if it was the deleted sound
      if (appearance.defaultSoundId === id) {
          setAppearance({ ...appearance, defaultSoundId: DEFAULT_APPEARANCE.defaultSoundId });
      }
  };

  // --- EFFECTS ---

  useEffect(() => {
    const warmupApp = async () => {
        try { audioService.resumeContext(); } catch (e) {}
        if ('Notification' in window && Notification.permission === 'default') {
            try { await Notification.requestPermission(); } catch (e) {}
        }
    };
    
    const handleInteraction = () => {
        warmupApp();
        requestWakeLock(); 
    };
    
    window.addEventListener('click', handleInteraction);
    window.addEventListener('keydown', handleInteraction);
    window.addEventListener('touchstart', handleInteraction, { passive: true });
    
    return () => {
        window.removeEventListener('click', handleInteraction);
        window.removeEventListener('keydown', handleInteraction);
        window.removeEventListener('touchstart', handleInteraction);
    };
  }, [requestWakeLock]); 

  // --- LOGIC: ALARMS ---
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const currentHours = now.getHours();
      const currentMins = now.getMinutes();
      const currentDay = now.getDay(); // 0-6
      const currentTimestamp = Math.floor(now.getTime() / 60000); 
      
      let hasUpdates = false;

      const updatedAlarms = alarms.map(alarm => {
        const [h, m] = alarm.time.split(':').map(Number);
        
        if (alarm.active && h === currentHours && m === currentMins) {
           // Check if this alarm is set for today (if days array is not empty)
           const isToday = alarm.days && alarm.days.length > 0 ? alarm.days.includes(currentDay) : true;
           
           if (isToday) {
               if (alarm.lastTriggered === currentTimestamp) return alarm;
               
               triggerAlert(alarm.id, 'ALARM', alarm.label, alarm.soundId);
               hasUpdates = true;

               // If it's a one-time alarm (no days selected), deactivate it
               const shouldDeactivate = !alarm.days || alarm.days.length === 0;

               return { 
                   ...alarm, 
                   lastTriggered: currentTimestamp,
                   active: shouldDeactivate ? false : alarm.active 
                };
           }
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
                  soundId: alarm.soundId,
                  days: [] // Snooze is always one-time
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

  // Apply Theme & Background Customization
  useEffect(() => {
    const html = document.documentElement;
    if (isDarkMode) html.classList.add('dark');
    else html.classList.remove('dark');
    
    const body = document.body;
    if (appearance.isCustom && appearance.backgroundColor !== 'auto') {
        body.style.backgroundColor = appearance.backgroundColor;
        body.style.backgroundImage = 'none'; 
    } else {
        body.style.backgroundColor = ''; 
        body.style.backgroundImage = ''; 
    }

  }, [isDarkMode, appearance]);

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
    // Props for Views needing Sound Picker
    const soundProps = {
        customSounds,
        onUpload: handleUploadSound,
        onRename: handleRenameSound,
        onDelete: handleDeleteSound
    };

    let content;
    switch (currentView) {
      case ViewState.CLOCK: 
        content = <ClockView isZenMode={isZenMode} toggleZenMode={() => setZenMode(!isZenMode)} appearance={appearance} />;
        break;
      case ViewState.ALARM: 
        content = <AlarmView 
            alarms={alarms} 
            setAlarms={setAlarms} 
            defaultSoundId={appearance.defaultSoundId || DEFAULT_APPEARANCE.defaultSoundId}
            {...soundProps}
        />;
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
            appearance={appearance}
            defaultSoundId={appearance.defaultSoundId || DEFAULT_APPEARANCE.defaultSoundId}
            {...soundProps}
        />;
        break;
      case ViewState.STOPWATCH:
        content = <StopwatchView isZenMode={isZenMode} toggleZenMode={() => setZenMode(!isZenMode)} appearance={appearance} />;
        break;
      case ViewState.TIMETABLE: 
        content = <TimetableView 
            alarms={alarms} 
            setAlarms={setAlarms} 
            defaultSoundId={appearance.defaultSoundId || DEFAULT_APPEARANCE.defaultSoundId}
            {...soundProps}
        />;
        break;
      default: 
        content = <ClockView isZenMode={isZenMode} toggleZenMode={() => setZenMode(!isZenMode)} appearance={appearance} />;
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
        className={`w-full flex items-center px-6 py-4 transition-all duration-300 group relative
          ${isActive 
            ? 'text-amber-500 dark:text-amber-400' 
            : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
          } ${!isSidebarOpen ? 'justify-center md:px-2' : 'gap-4'}`}
      >
        {/* Active Indicator Glow */}
        {isActive && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-amber-500 rounded-r-full shadow-[0_0_10px_rgba(245,158,11,0.5)]"></div>
        )}
        
        <Icon 
          size={24} 
          className={`flex-shrink-0 transition-transform duration-300 ${isActive ? 'scale-110 drop-shadow-[0_0_8px_rgba(245,158,11,0.3)]' : 'group-hover:scale-105'}`} 
          strokeWidth={isActive ? 2.5 : 2}
          aria-hidden="true"
        />
        <span className={`font-medium tracking-wide whitespace-nowrap overflow-hidden transition-all duration-300 ${isSidebarOpen ? 'w-auto opacity-100 translate-x-0' : 'w-0 opacity-0 -translate-x-4 md:hidden'}`}>{label}</span>
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
      return (
         <div className="text-[10px] font-mono flex items-center justify-center gap-1 text-neutral-400 dark:text-neutral-600 opacity-50" title="Click anywhere to wake screen">
             <MonitorX size={10} />
             {isSidebarOpen && <span>SLEEP ENABLED</span>}
         </div>
      );
  };

  const filteredCities = MAJOR_CITIES.filter(c => c.label.toLowerCase().includes(tzSearch.toLowerCase()));

  // -- Settings Render Helpers --
  const renderSettingsContent = () => {
    switch(settingsTab) {
        case 'General':
            return (
                <div className="space-y-6 animate-fade-in">
                    {/* Time Format */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm font-bold uppercase text-neutral-500 tracking-wider">
                            <Clock size={16} /> Time Format
                        </div>
                        <div className="flex bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl">
                            {['12h', '24h'].map((fmt) => (
                                <button
                                    key={fmt}
                                    onClick={() => setAppearance({...appearance, timeFormat: fmt as any})}
                                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${appearance.timeFormat === fmt ? 'bg-white dark:bg-neutral-700 text-amber-600 dark:text-amber-500 shadow-sm' : 'text-neutral-500'}`}
                                >
                                    {fmt.toUpperCase()}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Location / Timezone */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm font-bold uppercase text-neutral-500 tracking-wider">
                            <Globe size={16} /> Location / Time Zone
                        </div>
                        <div className="bg-neutral-100 dark:bg-neutral-800 rounded-xl p-3">
                             <div className="relative mb-3">
                                 <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                                 <input 
                                    type="text" 
                                    placeholder="Search city..." 
                                    value={tzSearch}
                                    onChange={(e) => setTzSearch(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                                 />
                             </div>
                             <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-1">
                                 {filteredCities.map((city) => (
                                     <button
                                        key={city.label}
                                        onClick={() => {
                                            setAppearance({...appearance, timezone: city.zone, locationLabel: city.label});
                                            setTzSearch('');
                                        }}
                                        className={`w-full text-left px-3 py-2 rounded-lg text-sm flex justify-between items-center transition-colors ${appearance.timezone === city.zone ? 'bg-amber-500 text-white font-bold' : 'hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300'}`}
                                     >
                                        <span>{city.label}</span>
                                        {appearance.timezone === city.zone && <Settings size={12} className="opacity-50" />}
                                     </button>
                                 ))}
                             </div>
                        </div>
                    </div>
                </div>
            );
        case 'Appearance':
            return (
                <div className="space-y-8 animate-fade-in">
                    {/* Theme Toggle */}
                     <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm font-bold uppercase text-neutral-500 tracking-wider">
                            <Sun size={16} /> App Theme
                        </div>
                        <button 
                            onClick={toggleTheme}
                            className={`flex items-center justify-between w-full p-4 rounded-xl transition-all duration-300 border shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                            isDarkMode 
                                ? 'bg-neutral-900 border-neutral-800 text-white hover:bg-neutral-800' 
                                : 'bg-white border-neutral-200 text-neutral-900 hover:bg-neutral-50'
                            }`}
                        >
                            <span className="font-bold flex items-center gap-2">
                                {isDarkMode ? <Moon size={18} className="fill-amber-400 text-amber-400" /> : <Sun size={18} className="fill-amber-500 text-amber-500" />}
                                {isDarkMode ? 'Dark Mode' : 'Light Mode'}
                            </span>
                            <div className={`w-12 h-6 rounded-full relative transition-colors ${isDarkMode ? 'bg-amber-500' : 'bg-neutral-300'}`}>
                                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${isDarkMode ? 'left-7' : 'left-1'}`} />
                            </div>
                        </button>
                    </div>

                    {/* Card Shape */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm font-bold uppercase text-neutral-500 tracking-wider">
                            <Layout size={16} /> Card Shape
                        </div>
                        <div className="flex bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl">
                            {[
                                { id: 'square', label: 'Square' }, 
                                { id: 'rounded', label: 'Rounded' }, 
                                { id: 'extra-rounded', label: 'Soft' }
                            ].map((shape) => (
                                <button
                                    key={shape.id}
                                    onClick={() => setAppearance({...appearance, cardShape: shape.id as any, isCustom: true})}
                                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${appearance.cardShape === shape.id ? 'bg-white dark:bg-neutral-700 text-amber-600 dark:text-amber-500 shadow-sm' : 'text-neutral-500'}`}
                                >
                                    {shape.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Colors */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-sm font-bold uppercase text-neutral-500 tracking-wider">
                            <Type size={16} /> Numbers Color
                        </div>
                        <div className="flex gap-3 flex-wrap">
                            {['auto', '#ffffff', '#000000', '#f59e0b', '#ef4444', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#14b8a6'].map(c => (
                                <ColorSwatch 
                                    key={c} color={c} 
                                    selected={appearance.numberColor === c} 
                                    onClick={() => setAppearance({...appearance, numberColor: c, isCustom: true})} 
                                />
                            ))}
                        </div>

                        <div className="flex items-center gap-2 text-sm font-bold uppercase text-neutral-500 tracking-wider mt-6">
                            <Palette size={16} /> Card Color
                        </div>
                        <div className="flex gap-3 flex-wrap">
                            {['auto', '#171717', '#262626', '#404040', '#ffffff', '#1e3a8a', '#3f2c2c', '#064e3b', '#701a75', '#0f766e'].map(c => (
                                <ColorSwatch 
                                    key={c} color={c} 
                                    selected={appearance.cardColor === c} 
                                    onClick={() => setAppearance({...appearance, cardColor: c, isCustom: true})} 
                                />
                            ))}
                        </div>

                        <div className="flex items-center gap-2 text-sm font-bold uppercase text-neutral-500 tracking-wider mt-6">
                            <MonitorX size={16} /> Background
                        </div>
                        <div className="flex gap-3 flex-wrap">
                            {['auto', '#000000', '#0a0a0a', '#18181b', '#0f172a', '#1c1917', '#ffffff', '#f5f5f5', '#2e1065', '#134e4a'].map(c => (
                                <ColorSwatch 
                                    key={c} color={c} 
                                    selected={appearance.backgroundColor === c} 
                                    onClick={() => setAppearance({...appearance, backgroundColor: c, isCustom: true})} 
                                />
                            ))}
                        </div>
                    </div>
                </div>
            );
        case 'Sound':
            return (
                <div className="space-y-6 animate-fade-in">
                    {/* Default Sound */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm font-bold uppercase text-neutral-500 tracking-wider">
                            <Volume2 size={16} /> Default Alert Sound
                        </div>
                        <SoundPicker 
                            selectedSoundId={appearance.defaultSoundId || DEFAULT_APPEARANCE.defaultSoundId}
                            onSelect={(id) => setAppearance({ ...appearance, defaultSoundId: id })}
                            systemDefaultId={appearance.defaultSoundId || DEFAULT_APPEARANCE.defaultSoundId}
                            customSounds={customSounds}
                            onUpload={handleUploadSound}
                            onRename={handleRenameSound}
                            onDelete={handleDeleteSound}
                        />
                         <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2 leading-relaxed">
                            This sound will be used for all new Alarms and Timers. Changing it will not affect existing alerts.
                        </p>
                    </div>
                </div>
            );
    }
  };

  return (
    <div className={`flex h-screen overflow-hidden transition-colors duration-500 font-sans relative 
        ${appearance.isCustom && appearance.backgroundColor !== 'auto' ? '' : 'bg-neutral-100 dark:bg-black bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white via-neutral-100 to-neutral-200 dark:from-neutral-800 dark:via-neutral-950 dark:to-black'}`}>
      
      {activeAlertId && (
        <div role="alertdialog" aria-modal="true" className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-xl p-6 animate-in fade-in zoom-in duration-300">
            <div className="bg-neutral-900/50 border border-red-500/50 p-10 rounded-3xl shadow-[0_0_100px_rgba(220,38,38,0.3)] flex flex-col items-center w-full max-w-md relative overflow-hidden">
                <div className="absolute inset-0 bg-red-500/10 animate-pulse" />
                <Bell className="w-24 h-24 text-red-500 mb-8 animate-bounce relative z-10 drop-shadow-[0_0_15px_rgba(220,38,38,0.5)]" aria-hidden="true" />
                <h1 className="text-5xl text-white font-black mb-4 text-center relative z-10 tracking-tight uppercase">{alertType}</h1>
                <p className="text-neutral-300 mb-12 text-2xl relative z-10 text-center font-medium">{getAlertLabel()}</p>
                <button onClick={stopAlert} className="bg-red-600 hover:bg-red-500 text-white w-full py-5 rounded-2xl text-xl font-bold relative z-10 shadow-lg mb-4">STOP</button>
                <button onClick={handleSnooze} className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 w-full py-5 rounded-2xl text-xl font-semibold relative z-10 border border-neutral-700">Snooze 5m</button>
            </div>
        </div>
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in">
            <div className="bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xl border border-neutral-200 dark:border-neutral-800 w-full max-w-3xl rounded-3xl shadow-2xl flex flex-col md:flex-row max-h-[90vh] h-full overflow-hidden animate-in zoom-in-95">
                
                {/* Sidebar */}
                <div className="w-full md:w-64 bg-neutral-50/50 dark:bg-black/20 border-b md:border-b-0 md:border-r border-neutral-200 dark:border-neutral-800 p-4 flex flex-col">
                     <div className="flex items-center justify-between md:mb-6">
                        <h3 className="text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                             <Sliders size={20} className="text-amber-500" /> Settings
                        </h3>
                        <button onClick={() => setIsSettingsOpen(false)} className="md:hidden text-neutral-400 hover:text-neutral-900 dark:hover:text-white">
                            <X size={24} />
                        </button>
                     </div>

                     <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-visible">
                        {['General', 'Appearance', 'Sound'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setSettingsTab(tab as any)}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm whitespace-nowrap
                                    ${settingsTab === tab 
                                    ? 'bg-amber-500 text-white shadow-md' 
                                    : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}
                            >
                                {tab === 'General' && <Globe size={18} />}
                                {tab === 'Appearance' && <Palette size={18} />}
                                {tab === 'Sound' && <Volume2 size={18} />}
                                {tab}
                            </button>
                        ))}
                     </div>

                     <div className="mt-auto hidden md:block pt-4 border-t border-neutral-200 dark:border-neutral-800">
                         <button 
                            onClick={() => setAppearance(DEFAULT_APPEARANCE)}
                            className="w-full py-2 text-neutral-400 hover:text-red-500 text-xs font-bold flex items-center justify-center gap-2 transition-colors uppercase tracking-wider"
                         >
                            <RefreshCw size={12} /> Reset Defaults
                         </button>
                     </div>
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col min-h-0 bg-white/50 dark:bg-neutral-900/50 relative">
                     <button onClick={() => setIsSettingsOpen(false)} className="absolute top-4 right-4 hidden md:block text-neutral-400 hover:text-neutral-900 dark:hover:text-white z-10">
                        <X size={24} />
                    </button>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8">
                        <div className="max-w-xl">
                            <h2 className="text-2xl font-bold text-neutral-800 dark:text-white mb-6 hidden md:block">{settingsTab}</h2>
                            {renderSettingsContent()}
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Sidebar Trigger (Mobile) */}
      {!isZenMode && (
        <button 
          className="absolute top-4 left-4 z-50 md:hidden p-2.5 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md rounded-xl text-neutral-600 dark:text-neutral-400 shadow-lg border border-neutral-200 dark:border-neutral-800 active:scale-95 transition-transform focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none"
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

      {/* Sidebar - Glassmorphism Style */}
      <div className={`
        fixed md:relative z-40 h-full 
        bg-white/80 dark:bg-neutral-950/80 backdrop-blur-xl 
        border-r border-white/20 dark:border-white/5 
        transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) flex flex-col shadow-2xl md:shadow-none
        ${isZenMode ? '-translate-x-full w-0 opacity-0 overflow-hidden' : (isSidebarOpen ? 'w-72 translate-x-0' : '-translate-x-full md:translate-x-0 md:w-24')}
      `}>
        {!isZenMode && (
          <button 
            onClick={() => setSidebarOpen(!isSidebarOpen)}
            className="hidden md:flex absolute -right-3 top-10 z-50 bg-white dark:bg-neutral-800 text-neutral-500 hover:text-amber-500 border border-neutral-200 dark:border-neutral-700 rounded-full p-1.5 shadow-md transition-all items-center justify-center hover:scale-110 hover:shadow-lg"
          >
            {isSidebarOpen ? <ChevronLeft size={14} strokeWidth={3} /> : <ChevronRight size={14} strokeWidth={3} />}
          </button>
        )}

        <div className="h-32 flex items-center justify-center whitespace-nowrap overflow-hidden relative border-b border-neutral-200/50 dark:border-white/5">
           <div className={`transition-all duration-500 ${isSidebarOpen ? 'opacity-100 scale-100' : 'opacity-100 scale-100'}`}>
             {isSidebarOpen ? <h1 className="text-xl font-black tracking-[0.25em] text-neutral-900 dark:text-white drop-shadow-sm">CHRONO<span className="text-amber-500">FLIP</span></h1> : <span className="text-xl font-black text-amber-500 tracking-tighter drop-shadow-sm">CF</span>}
           </div>
        </div>

        <nav className="flex-1 py-8 space-y-2 overflow-y-auto overflow-x-hidden custom-scrollbar px-3">
          <NavItem view={ViewState.CLOCK} icon={Clock} label="Clock" />
          <NavItem view={ViewState.ALARM} icon={AlarmClock} label="Alarm" />
          <NavItem view={ViewState.TIMER} icon={TimerIcon} label="Timer" />
          <NavItem view={ViewState.STOPWATCH} icon={Watch} label="Stopwatch" />
          <NavItem view={ViewState.TIMETABLE} icon={Calendar} label="Timetable" />
        </nav>

        <div className="p-6 border-t border-neutral-200/50 dark:border-white/5 flex flex-col gap-4 bg-gradient-to-t from-white/50 to-transparent dark:from-black/50">
           
           {/* Customize Button */}
           <button 
             onClick={() => setIsSettingsOpen(true)}
             className="flex items-center justify-center w-full p-3 rounded-xl transition-all duration-300 group relative border shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-amber-500 bg-white dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:text-amber-500 dark:hover:text-amber-400 hover:border-amber-500/30"
           >
             <Settings size={20} />
             {isSidebarOpen && <span className="ml-3 font-semibold text-sm whitespace-nowrap">Settings</span>}
           </button>

           {renderWakeLockStatus()}
           
           {isSidebarOpen && (
               <div className="text-center">
                   <span className="text-[10px] text-neutral-400 dark:text-neutral-600 font-mono tracking-widest uppercase opacity-60">v1.3.1</span>
               </div>
           )}
        </div>
      </div>

      <main className={`flex-1 relative h-full overflow-hidden transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) ${isZenMode ? 'w-screen' : ''}`}>
        {renderView()}
      </main>
    </div>
  );
};

export default App;
