
import React, { useState } from 'react';
import { FlipDigit } from './FlipDigit';
import { Play, Pause, RotateCcw, Plus, Trash2, Maximize2, Minimize2, Bell, Pencil, X, Check, Square, Clock } from 'lucide-react';
import { Timer, SOUND_PRESETS, AppearanceSettings, CustomSound } from '../types';
import { WheelPicker } from './WheelPicker';
import { SoundPicker } from './SoundPicker';

interface TimerViewProps {
  timers: Timer[];
  addTimer: (duration: number, label: string, soundId: string) => void;
  removeTimer: (id: string) => void;
  toggleTimer: (id: string) => void;
  resetTimer: (id: string) => void;
  snoozeTimer: (id: string) => void;
  isZenMode: boolean;
  toggleZenMode: () => void;
  // We need a way to pass edits back up since state is in App.tsx
  updateTimer: (timer: Timer) => void;
  appearance?: AppearanceSettings;
  defaultSoundId: string;

  // Custom Sound Props
  customSounds: CustomSound[];
  onUpload: (file: File) => void;
  onRename: (id: string, newName: string) => void;
  onDelete: (id: string) => void;
}

export const TimerView: React.FC<TimerViewProps> = ({ 
  timers, addTimer, removeTimer, toggleTimer, resetTimer, snoozeTimer, updateTimer, isZenMode, toggleZenMode, appearance, defaultSoundId,
  customSounds, onUpload, onRename, onDelete
}) => {
  // Add State
  const [inputHrs, setInputHrs] = useState(0);
  const [inputMins, setInputMins] = useState(5);
  const [inputSecs, setInputSecs] = useState(0);
  const [newLabel, setNewLabel] = useState('');
  const [selectedSound, setSelectedSound] = useState(defaultSoundId); // Use Default
  const [zenFocusId, setZenFocusId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Edit State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTimerId, setEditingTimerId] = useState<string | null>(null);
  const [editHrs, setEditHrs] = useState(0);
  const [editMins, setEditMins] = useState(0);
  const [editSecs, setEditSecs] = useState(0);
  const [editLabel, setEditLabel] = useState('');
  const [editSound, setEditSound] = useState('');

  const handleAdd = () => {
    const total = inputHrs * 3600 + inputMins * 60 + inputSecs;
    if (total === 0) return;
    addTimer(total, newLabel || `Timer ${timers.length + 1}`, selectedSound);
    setNewLabel('');
    if (navigator.vibrate) navigator.vibrate(50);
  };

  const handleDeleteClick = (id: string) => {
      if (deleteConfirmId === id) {
          removeTimer(id);
          setDeleteConfirmId(null);
          if (navigator.vibrate) navigator.vibrate(50);
      } else {
          setDeleteConfirmId(id);
          setTimeout(() => setDeleteConfirmId(null), 3000);
      }
  };

  // --- Edit Logic ---
  const openEditModal = (timer: Timer) => {
      const h = Math.floor(timer.originalDuration / 3600);
      const m = Math.floor((timer.originalDuration % 3600) / 60);
      const s = timer.originalDuration % 60;
      
      setEditingTimerId(timer.id);
      setEditHrs(h);
      setEditMins(m);
      setEditSecs(s);
      setEditLabel(timer.label);
      setEditSound(timer.soundId);
      setIsEditModalOpen(true);
  };

  const saveEdit = () => {
      if (!editingTimerId) return;
      const originalTimer = timers.find(t => t.id === editingTimerId);
      if (!originalTimer) return;

      const newTotal = editHrs * 3600 + editMins * 60 + editSecs;
      
      // If duration changed, we must reset the timer
      const durationChanged = newTotal !== originalTimer.originalDuration;
      
      const updatedTimer: Timer = {
          ...originalTimer,
          label: editLabel || `Timer`,
          soundId: editSound,
      };

      if (durationChanged) {
          updatedTimer.originalDuration = newTotal;
          updatedTimer.remaining = newTotal;
          updatedTimer.status = 'IDLE';
          updatedTimer.endTime = undefined;
      }

      updateTimer(updatedTimer);
      setIsEditModalOpen(false);
      setEditingTimerId(null);
      if (navigator.vibrate) navigator.vibrate(50);
  };

  const getZenTimer = () => {
    if (zenFocusId) return timers.find(t => t.id === zenFocusId) || timers[0];
    const ringing = timers.find(t => t.status === 'FINISHED');
    if (ringing) return ringing;
    const running = timers.filter(t => t.status === 'RUNNING').sort((a, b) => a.remaining - b.remaining)[0];
    if (running) return running;
    return timers[0];
  };

  const handleZenToggle = (id?: string) => {
    if (id) setZenFocusId(id);
    toggleZenMode();
    if (!isZenMode) {
         if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
        }
    } else {
        if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
        }
    }
  };

  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return { h, m, s };
  };

  const soundPickerProps = { 
      customSounds, 
      onUpload, 
      onRename, 
      onDelete,
      systemDefaultId: defaultSoundId 
    };

  // --- ZEN MODE VIEW ---
  if (isZenMode && timers.length > 0) {
    const activeTimer = getZenTimer();
    const { h, m, s } = formatTime(activeTimer.remaining);
    const separatorClass = "text-[15vh] pb-[5vh] mx-2 text-neutral-700/50";

    // Calculate finish time
    let finishTimeString = '';
    if (activeTimer.status !== 'FINISHED') {
        const endTime = activeTimer.status === 'RUNNING' && activeTimer.endTime 
            ? activeTimer.endTime 
            : Date.now() + (activeTimer.remaining * 1000);
            
        finishTimeString = new Date(endTime).toLocaleTimeString(undefined, {
            hour: 'numeric',
            minute: '2-digit'
        });
    }

    return (
        <div className="flex flex-col items-center justify-center h-full w-full bg-neutral-950 relative animate-fade-in">
             <button 
                onClick={() => handleZenToggle()}
                aria-label="Exit Focus Mode"
                className="absolute top-8 right-8 p-4 rounded-full transition-all duration-300 z-50 text-neutral-500 hover:text-white border border-transparent hover:border-neutral-700 hover:bg-neutral-800 focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none"
            >
                <Minimize2 size={24} aria-hidden="true" />
            </button>

            <div className="flex-1 flex flex-col items-center justify-center w-full" role="timer" aria-label={`Timer: ${activeTimer.label}`}>
                <div className="flex items-end justify-center scale-90 sm:scale-100" aria-hidden="true">
                    <FlipDigit value={h} isZenMode={true} appearance={appearance} />
                    <div className={`font-mono font-bold animate-pulse flex items-center ${separatorClass}`}>:</div>
                    <FlipDigit value={m} isZenMode={true} appearance={appearance} />
                    <div className={`font-mono font-bold animate-pulse flex items-center ${separatorClass}`}>:</div>
                    <FlipDigit value={s} isZenMode={true} appearance={appearance} />
                </div>
                <div className="sr-only">
                    {h} hours {m} minutes {s} seconds remaining
                </div>
                
                <h2 className="text-3xl text-neutral-600 font-mono tracking-[0.3em] uppercase mt-16 mb-4">{activeTimer.label}</h2>
                
                {finishTimeString && (
                     <div className="flex items-center gap-2 mb-10 px-5 py-2.5 bg-neutral-900 border border-neutral-800 rounded-full shadow-sm animate-fade-in group hover:border-amber-500/30 transition-colors">
                        <Clock size={14} className="text-amber-600" />
                        <span className="text-xs font-bold tracking-widest text-neutral-400 group-hover:text-neutral-200 transition-colors">
                            {activeTimer.status === 'RUNNING' ? 'ENDS AT' : 'EST. END'} <span className="text-neutral-200 group-hover:text-white ml-1">{finishTimeString}</span>
                        </span>
                     </div>
                )}
                
                {activeTimer.status === 'FINISHED' ? (
                     <div className="flex flex-col sm:flex-row gap-6 items-center animate-bounce">
                        <button onClick={() => resetTimer(activeTimer.id)} className="bg-red-500 text-white font-bold px-10 py-5 rounded-full text-xl hover:bg-red-400 transition-all hover:scale-105 shadow-[0_0_30px_rgba(220,38,38,0.4)] border-4 border-red-400 focus-visible:ring-4 focus-visible:ring-red-500/50 focus-visible:outline-none min-w-[160px] flex items-center justify-center gap-2">
                             <Square size={24} fill="currentColor" /> STOP
                        </button>
                         <button onClick={() => snoozeTimer(activeTimer.id)} className="bg-amber-500 text-black font-bold px-10 py-5 rounded-full text-xl hover:bg-amber-400 transition-all hover:scale-105 shadow-[0_0_30px_rgba(245,158,11,0.4)] border-4 border-amber-300 focus-visible:ring-4 focus-visible:ring-amber-500/50 focus-visible:outline-none min-w-[160px] flex items-center justify-center gap-2">
                             <Bell size={24} fill="currentColor" /> SNOOZE
                         </button>
                     </div>
                 ) : (
                     <div className="flex gap-10">
                         <button 
                            onClick={() => toggleTimer(activeTimer.id)} 
                            aria-label={activeTimer.status === 'RUNNING' ? "Pause Timer" : "Start Timer"}
                            className="p-8 rounded-full bg-neutral-900 text-white hover:bg-neutral-800 border border-neutral-800 hover:border-amber-500/50 transition-all hover:scale-110 shadow-2xl focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none"
                        >
                            {activeTimer.status === 'RUNNING' ? <Pause size={40} className="fill-current" aria-hidden="true" /> : <Play size={40} className="fill-current ml-2" aria-hidden="true" />}
                         </button>
                         <button 
                            onClick={() => resetTimer(activeTimer.id)} 
                            aria-label="Reset Timer"
                            className="p-8 rounded-full bg-neutral-900 text-neutral-500 hover:text-white border border-neutral-800 hover:border-neutral-600 transition-all hover:scale-110 shadow-2xl focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none"
                        >
                            <RotateCcw size={40} aria-hidden="true" />
                         </button>
                     </div>
                 )}
            </div>
            
            {timers.length > 1 && (
                <div className="absolute bottom-10 flex gap-4 bg-neutral-900/50 p-3 rounded-full backdrop-blur-sm border border-neutral-800/50">
                    {timers.map(t => (
                        <button 
                            key={t.id} 
                            onClick={() => setZenFocusId(t.id)}
                            aria-label={`Switch to timer: ${t.label}`}
                            aria-current={t.id === activeTimer.id}
                            className={`w-3 h-3 rounded-full transition-all duration-300 focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none ${t.id === activeTimer.id ? 'bg-amber-500 scale-125 shadow-[0_0_10px_rgba(245,158,11,0.5)]' : 'bg-neutral-700 hover:bg-neutral-500'}`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
  }

  // --- STANDARD VIEW ---
  return (
    <div className="h-full flex flex-col p-4 sm:p-6 md:p-8 w-full overflow-y-auto custom-scrollbar animate-fade-in relative">
      
      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
             <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-neutral-900 dark:text-white">Edit Timer</h3>
                    <button onClick={() => setIsEditModalOpen(false)} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-white">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                    <div className="flex gap-1 sm:gap-4 items-center justify-center bg-neutral-50 dark:bg-neutral-950/50 p-4 sm:p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800">
                        <WheelPicker label="HOURS" value={editHrs} onChange={setEditHrs} min={0} max={23} />
                        <div className="text-xl sm:text-3xl font-mono text-neutral-300 dark:text-neutral-700 pb-6 sm:pb-8 opacity-50" aria-hidden="true">:</div>
                        <WheelPicker label="MINUTES" value={editMins} onChange={setEditMins} min={0} max={59} />
                        <div className="text-xl sm:text-3xl font-mono text-neutral-300 dark:text-neutral-700 pb-6 sm:pb-8 opacity-50" aria-hidden="true">:</div>
                        <WheelPicker label="SECONDS" value={editSecs} onChange={setEditSecs} min={0} max={59} />
                    </div>
                    
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="block text-neutral-500 text-xs font-bold uppercase tracking-wider pl-1">Label</label>
                            <input 
                                type="text" 
                                value={editLabel}
                                onChange={(e) => setEditLabel(e.target.value)}
                                className="w-full bg-neutral-100 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl p-3 sm:p-3.5 text-neutral-900 dark:text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all font-medium"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="block text-neutral-500 text-xs font-bold uppercase tracking-wider pl-1">Ringtone</label>
                            <SoundPicker selectedSoundId={editSound} onSelect={setEditSound} {...soundPickerProps} />
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950/30">
                     <button 
                        onClick={saveEdit}
                        className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold py-3.5 sm:py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-500/20 active:scale-[0.98]"
                    >
                        <Check size={20} strokeWidth={3} /> SAVE CHANGES
                    </button>
                </div>
             </div>
        </div>
      )}

      <div className="w-full max-w-7xl mx-auto mb-8">
         <div className="flex items-center justify-between mb-6 border-b border-neutral-200 dark:border-neutral-800 pb-4">
            <h2 className="text-3xl font-bold text-neutral-800 dark:text-white tracking-tight">Timers</h2>
         </div>
         
         <div className="bg-white dark:bg-neutral-900 p-4 sm:p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col xl:flex-row items-center gap-6 sm:gap-8 justify-between">
            <div className="flex gap-1 sm:gap-4 items-center">
                <WheelPicker label="HOURS" value={inputHrs} onChange={setInputHrs} min={0} max={23} />
                <div className="text-xl sm:text-3xl font-mono text-neutral-300 dark:text-neutral-700 pb-5 sm:pb-6" aria-hidden="true">:</div>
                <WheelPicker label="MINUTES" value={inputMins} onChange={setInputMins} min={0} max={59} />
                <div className="text-xl sm:text-3xl font-mono text-neutral-300 dark:text-neutral-700 pb-5 sm:pb-6" aria-hidden="true">:</div>
                <WheelPicker label="SECONDS" value={inputSecs} onChange={setInputSecs} min={0} max={59} />
            </div>

            <div className="flex flex-col gap-3 sm:gap-4 w-full xl:w-96">
                <div className="space-y-1.5">
                    <label htmlFor="timer-label" className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider pl-1">Label</label>
                    <input 
                        id="timer-label"
                        type="text" 
                        placeholder="Cooking, Focus, etc." 
                        value={newLabel}
                        onChange={(e) => setNewLabel(e.target.value)}
                        className="bg-neutral-100 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 p-3 rounded-xl text-neutral-900 dark:text-white outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 w-full transition-all text-sm"
                    />
                </div>
                 
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider pl-1">Sound</label>
                    <SoundPicker 
                        selectedSoundId={selectedSound} 
                        onSelect={setSelectedSound} 
                        {...soundPickerProps}
                    />
                 </div>

                <button 
                    onClick={handleAdd}
                    className="bg-neutral-900 dark:bg-white text-white dark:text-black font-bold py-3 sm:py-3.5 rounded-xl hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg hover:-translate-y-0.5 mt-1 active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none"
                >
                    <Plus size={18} strokeWidth={3} aria-hidden="true" /> <span className="text-sm tracking-wide">START TIMER</span>
                </button>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 w-full max-w-7xl mx-auto pb-12">
        {timers.map(timer => {
            const { h, m, s } = formatTime(timer.remaining);
            const isFinished = timer.status === 'FINISHED';
            
            // Compact size for grid view
            const gridCardSize = "w-12 h-20";
            const gridTextSize = "text-4xl";
            
            return (
                <div key={timer.id} className={`relative bg-white dark:bg-neutral-900 rounded-2xl border ${isFinished ? 'border-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.2)]' : 'border-neutral-200 dark:border-neutral-700'} p-6 flex flex-col items-center shadow-sm hover:shadow-xl hover:border-neutral-300 dark:hover:border-neutral-600 transition-all group duration-300 hover:-translate-y-1`}>
                     <div className="absolute top-4 right-4 flex gap-2">
                        <button 
                            onClick={() => openEditModal(timer)}
                            className="text-neutral-400 hover:text-amber-500 transition-colors bg-neutral-100 dark:bg-neutral-800 p-2 rounded-lg focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none" 
                            title="Edit Timer"
                            aria-label="Edit Timer"
                        >
                            <Pencil size={16} aria-hidden="true" />
                        </button>
                        <button 
                            onClick={() => handleZenToggle(timer.id)} 
                            className="text-neutral-400 hover:text-amber-500 transition-colors bg-neutral-100 dark:bg-neutral-800 p-2 rounded-lg focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none" 
                            title="Focus Mode"
                            aria-label="Enter Focus Mode"
                        >
                            <Maximize2 size={16} aria-hidden="true" />
                        </button>
                     </div>

                     <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em] mb-4 truncate w-full text-center px-14">{timer.label}</div>
                     
                     <div className="flex items-end justify-center gap-2 mb-6" aria-label={`${h} hours ${m} minutes ${s} seconds remaining`} role="timer">
                        <FlipDigit value={h} cardClassName={gridCardSize} textClassName={gridTextSize} appearance={appearance} />
                        <div className="text-3xl font-mono text-neutral-300 dark:text-neutral-700 pb-6 flex items-center" aria-hidden="true">:</div>
                        <FlipDigit value={m} cardClassName={gridCardSize} textClassName={gridTextSize} appearance={appearance} />
                        <div className="text-3xl font-mono text-neutral-300 dark:text-neutral-700 pb-6 flex items-center" aria-hidden="true">:</div>
                        <FlipDigit value={s} cardClassName={gridCardSize} textClassName={gridTextSize} appearance={appearance} />
                     </div>

                     <div className="flex items-center gap-3 w-full justify-center">
                        {isFinished ? (
                             <div className="flex gap-2 w-full animate-pulse">
                                <button onClick={() => resetTimer(timer.id)} className="flex-1 bg-red-500 hover:bg-red-400 text-white font-bold py-3 px-2 rounded-xl flex items-center justify-center gap-1 transition-colors shadow-lg shadow-red-500/20 focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:outline-none text-xs sm:text-sm">
                                    <Square size={16} fill="currentColor" /> STOP
                                </button>
                                <button onClick={() => snoozeTimer(timer.id)} className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-bold py-3 px-2 rounded-xl flex items-center justify-center gap-1 transition-colors shadow-lg shadow-amber-500/20 focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:outline-none text-xs sm:text-sm">
                                     <Bell size={16} className="fill-black" /> SNOOZE
                                 </button>
                             </div>
                        ) : (
                            <>
                                <button 
                                    onClick={() => toggleTimer(timer.id)} 
                                    aria-label={timer.status === 'RUNNING' ? "Pause" : "Start"}
                                    className={`p-3.5 rounded-xl transition-all shadow-sm focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none ${timer.status === 'RUNNING' ? 'bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-500 hover:bg-amber-200 dark:hover:bg-amber-500/20 ring-1 ring-amber-500/30' : 'bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-500 hover:bg-green-100 dark:hover:bg-green-500/20 ring-1 ring-green-500/30'}`}
                                >
                                    {timer.status === 'RUNNING' ? <Pause size={24} className="fill-current" aria-hidden="true" /> : <Play size={24} className="fill-current ml-0.5" aria-hidden="true" />}
                                </button>
                                <button 
                                    onClick={() => resetTimer(timer.id)} 
                                    aria-label="Reset"
                                    className="p-3.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors shadow-sm focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none"
                                >
                                    <RotateCcw size={24} aria-hidden="true" />
                                </button>
                            </>
                        )}
                        <button 
                            onClick={() => handleDeleteClick(timer.id)} 
                            aria-label={deleteConfirmId === timer.id ? "Confirm Deletion" : "Delete Timer"}
                            className={`p-3.5 rounded-xl transition-all shadow-sm focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none ${
                                deleteConfirmId === timer.id 
                                ? 'bg-red-500 text-white hover:bg-red-600 px-4 font-bold text-xs' 
                                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 ml-auto'
                            }`}
                        >
                            {deleteConfirmId === timer.id ? 'DELETE' : <Trash2 size={20} aria-hidden="true" />}
                        </button>
                     </div>
                </div>
            );
        })}
      </div>
    </div>
  );
};
