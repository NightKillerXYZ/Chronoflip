import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Bell, BellOff, Volume2, AlertCircle, Pencil, X, Check } from 'lucide-react';
import { Alarm, SOUND_PRESETS } from '../types';
import { audioService } from '../services/audioService';
import { WheelPicker } from './WheelPicker';
import { SoundPicker } from './SoundPicker';
import { useLocalStorage } from '../hooks/useLocalStorage';

export const AlarmView: React.FC = () => {
  const [alarms, setAlarms] = useLocalStorage<Alarm[]>('alarms', []);
  
  // "Add New" State
  const [inputHrs, setInputHrs] = useState(8);
  const [inputMins, setInputMins] = useState(0);
  const [newLabel, setNewLabel] = useState('');
  const [selectedSound, setSelectedSound] = useState(SOUND_PRESETS[0].id);
  
  // "Edit" State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAlarmId, setEditingAlarmId] = useState<string | null>(null);
  const [editHrs, setEditHrs] = useState(0);
  const [editMins, setEditMins] = useState(0);
  const [editLabel, setEditLabel] = useState('');
  const [editSound, setEditSound] = useState('');

  const [activeAlarmId, setActiveAlarmId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const currentHours = now.getHours();
      const currentMins = now.getMinutes();
      const currentTimestamp = Math.floor(now.getTime() / 60000); // Minutes since epoch
      
      let hasUpdates = false;

      const updatedAlarms = alarms.map(alarm => {
        const [h, m] = alarm.time.split(':').map(Number);
        
        // Check if triggers: Active AND matches time AND hasn't triggered this minute already
        if (alarm.active && h === currentHours && m === currentMins) {
           // If we already triggered this alarm within this minute, skip
           if (alarm.lastTriggered === currentTimestamp) {
               return alarm;
           }
           
           triggerAlarm(alarm);
           hasUpdates = true;
           return { ...alarm, lastTriggered: currentTimestamp };
        }
        return alarm;
      });

      if (hasUpdates) {
          setAlarms(updatedAlarms);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [alarms, setAlarms]);

  const triggerAlarm = (alarm: Alarm) => {
    if (activeAlarmId === alarm.id) return;
    setActiveAlarmId(alarm.id);
    audioService.playAlarm(alarm.soundId);
    if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 500]);
    if (Notification.permission === 'granted') {
      new Notification("ChronoFlip Alarm", { body: `Wake up! ${alarm.label}` });
    }
  };

  const stopAlarm = () => {
    setActiveAlarmId(null);
    audioService.stopAlarm();
  };

  const snoozeAlarm = (id: string) => {
    const alarm = alarms.find(a => a.id === id);
    if (!alarm) { stopAlarm(); return; }
    const now = new Date();
    now.setMinutes(now.getMinutes() + 5);
    const newH = now.getHours().toString().padStart(2, '0');
    const newM = now.getMinutes().toString().padStart(2, '0');
    const newTime = `${newH}:${newM}`;
    
    const snoozeId = `snooze-${Date.now()}`;
    setAlarms([...alarms, {
        id: snoozeId,
        time: newTime,
        label: `Snooze: ${alarm.label}`,
        active: true,
        soundId: alarm.soundId
    }]);
    stopAlarm();
    if (navigator.vibrate) navigator.vibrate(50);
  };

  const addAlarm = () => {
    const id = Date.now().toString();
    const timeStr = `${inputHrs.toString().padStart(2, '0')}:${inputMins.toString().padStart(2, '0')}`;
    setAlarms([...alarms, { 
      id, 
      time: timeStr, 
      label: newLabel || 'Alarm', 
      active: true,
      soundId: selectedSound 
    }]);
    setNewLabel('');
    if (navigator.vibrate) navigator.vibrate(50);
  };

  // --- Edit Logic ---
  const openEditModal = (alarm: Alarm) => {
      const [h, m] = alarm.time.split(':').map(Number);
      setEditingAlarmId(alarm.id);
      setEditHrs(h);
      setEditMins(m);
      setEditLabel(alarm.label);
      setEditSound(alarm.soundId);
      setIsEditModalOpen(true);
  };

  const saveEdit = () => {
      if (!editingAlarmId) return;
      const timeStr = `${editHrs.toString().padStart(2, '0')}:${editMins.toString().padStart(2, '0')}`;
      
      setAlarms(alarms.map(a => a.id === editingAlarmId ? {
          ...a,
          time: timeStr,
          label: editLabel || 'Alarm',
          soundId: editSound
      } : a));
      
      setIsEditModalOpen(false);
      setEditingAlarmId(null);
      if (navigator.vibrate) navigator.vibrate(50);
  };

  const handleDeleteClick = (id: string) => {
      if (deleteConfirmId === id) {
          setAlarms(alarms.filter(a => a.id !== id));
          setDeleteConfirmId(null);
          if (navigator.vibrate) navigator.vibrate(50);
      } else {
          setDeleteConfirmId(id);
          setTimeout(() => setDeleteConfirmId(null), 3000);
      }
  };

  const toggleAlarm = (id: string) => {
    if (navigator.vibrate) navigator.vibrate(20);
    setAlarms(alarms.map(a => a.id === id ? { ...a, active: !a.active } : a));
  };

  useEffect(() => {
    if (Notification.permission === 'default') Notification.requestPermission();
  }, []);

  return (
    // Changed main container to scrollable for better mobile handling
    <div className="h-full w-full overflow-y-auto custom-scrollbar p-6 md:p-10 animate-fade-in relative">
      
      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-neutral-900 dark:text-white">Edit Alarm</h3>
                    <button onClick={() => setIsEditModalOpen(false)} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-white">
                        <X size={24} />
                    </button>
                </div>
                
                <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                     <div className="flex gap-4 items-center justify-center bg-neutral-50 dark:bg-neutral-950/50 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800">
                        <WheelPicker label="HOURS" value={editHrs} onChange={setEditHrs} min={0} max={23} />
                        <div className="text-3xl font-mono text-neutral-300 dark:text-neutral-700 pb-8 opacity-50" aria-hidden="true">:</div>
                        <WheelPicker label="MINUTES" value={editMins} onChange={setEditMins} min={0} max={59} />
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="block text-neutral-500 text-xs font-bold uppercase tracking-wider pl-1">Label</label>
                            <input 
                                type="text" 
                                value={editLabel}
                                onChange={(e) => setEditLabel(e.target.value)}
                                className="w-full bg-neutral-100 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl p-3.5 text-neutral-900 dark:text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all font-medium"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="block text-neutral-500 text-xs font-bold uppercase tracking-wider pl-1">Ringtone</label>
                            <SoundPicker selectedSoundId={editSound} onSelect={setEditSound} />
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950/30">
                     <button 
                        onClick={saveEdit}
                        className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-500/20 active:scale-[0.98]"
                    >
                        <Check size={20} strokeWidth={3} /> SAVE CHANGES
                    </button>
                </div>
            </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto flex flex-col">
        <h2 className="text-4xl font-bold text-neutral-800 dark:text-white mb-8 border-b border-neutral-200 dark:border-neutral-800 pb-6 tracking-tight">Alarms</h2>

        {activeAlarmId && (
            <div role="alertdialog" aria-modal="true" aria-labelledby="alarm-title" className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-6 animate-in fade-in zoom-in duration-300">
            <div className="bg-neutral-900 border border-red-500/30 p-10 rounded-3xl shadow-[0_0_50px_rgba(220,38,38,0.2)] flex flex-col items-center w-full max-w-md relative overflow-hidden">
                {/* Glowing Background */}
                <div className="absolute inset-0 bg-red-500/5 animate-pulse" />
                
                <Bell className="w-20 h-20 text-red-500 mb-6 animate-bounce relative z-10" aria-hidden="true" />
                <h1 id="alarm-title" className="text-4xl text-white font-bold mb-2 text-center relative z-10 tracking-tight">ALARM RINGING</h1>
                <p className="text-neutral-400 mb-10 text-xl relative z-10">{alarms.find(a => a.id === activeAlarmId)?.label}</p>
                
                <div className="flex flex-col gap-4 w-full relative z-10">
                    <button 
                    onClick={stopAlarm}
                    className="bg-red-600 hover:bg-red-500 text-white w-full py-4 rounded-xl text-lg font-bold transition-all shadow-lg shadow-red-900/30 hover:scale-[1.02] active:scale-95 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
                    >
                    STOP ALARM
                    </button>
                    <button 
                    onClick={() => snoozeAlarm(activeAlarmId)}
                    className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 w-full py-4 rounded-xl text-lg font-semibold transition-all border border-neutral-700 hover:border-neutral-600 hover:scale-[1.02] active:scale-95 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
                    >
                    Snooze 5m
                    </button>
                </div>
            </div>
            </div>
        )}

        {/* Add Alarm Section */}
        <div className="bg-white dark:bg-neutral-900/40 p-5 md:p-8 rounded-3xl border border-neutral-200 dark:border-neutral-800 mb-10 flex flex-col lg:flex-row gap-8 lg:gap-10 items-start lg:items-center justify-between shadow-sm">
            <div className="flex gap-6 items-center mx-auto lg:mx-0">
                <WheelPicker label="HOURS" value={inputHrs} onChange={setInputHrs} min={0} max={23} />
                <div className="text-3xl font-mono text-neutral-300 dark:text-neutral-700 pb-8 opacity-50" aria-hidden="true">:</div>
                <WheelPicker label="MINUTES" value={inputMins} onChange={setInputMins} min={0} max={59} />
            </div>
            
            <div className="flex flex-col gap-5 w-full flex-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                    <label htmlFor="alarm-label" className="block text-neutral-500 text-xs font-bold uppercase tracking-wider pl-1">Label</label>
                    <input 
                        id="alarm-label"
                        type="text" 
                        value={newLabel}
                        onChange={(e) => setNewLabel(e.target.value)}
                        placeholder="Morning Wakeup"
                        className="w-full bg-neutral-100 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl p-3.5 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-600 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all font-medium"
                    />
                </div>
                <div className="space-y-2">
                    <label className="block text-neutral-500 text-xs font-bold uppercase tracking-wider pl-1">Ringtone</label>
                    <SoundPicker selectedSoundId={selectedSound} onSelect={setSelectedSound} />
                </div>
            </div>
            
            <button 
                onClick={addAlarm}
                className="w-full bg-neutral-900 dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-black font-bold p-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg mt-2 active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none"
            >
                <Plus size={20} strokeWidth={3} aria-hidden="true" /> <span className="tracking-wide">ADD ALARM</span>
            </button>
            </div>
        </div>

        {/* List Section - Now simply flows in the document to allow page scrolling */}
        <div className="space-y-4 pb-20" role="list">
            {alarms.length === 0 && (
            <div className="flex flex-col items-center justify-center h-48 text-neutral-400 dark:text-neutral-600 italic border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl">
                <BellOff size={48} className="mb-4 opacity-20" aria-hidden="true" />
                <p>No active alarms</p>
            </div>
            )}
            {alarms.map(alarm => (
            <div key={alarm.id} role="listitem" className="bg-white dark:bg-neutral-900/60 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 flex items-center justify-between group hover:border-amber-500/30 dark:hover:border-neutral-700 transition-all shadow-sm hover:shadow-md hover:bg-neutral-50 dark:hover:bg-neutral-900">
                <div className="flex items-center gap-6">
                <button 
                    onClick={() => toggleAlarm(alarm.id)}
                    aria-label={alarm.active ? "Turn off alarm" : "Turn on alarm"}
                    className={`p-3.5 rounded-full transition-all duration-300 shadow-sm focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none ${alarm.active ? 'bg-amber-500/10 text-amber-600 dark:text-amber-500' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-600'}`}
                >
                    {alarm.active ? <Bell size={24} className="fill-current" aria-hidden="true" /> : <BellOff size={24} aria-hidden="true" />}
                </button>
                <div>
                    <div className={`text-4xl font-mono font-bold tracking-tight ${alarm.active ? 'text-neutral-900 dark:text-white' : 'text-neutral-400 dark:text-neutral-600'}`}>
                    {alarm.time}
                    </div>
                    <div className="flex gap-3 items-center mt-1">
                        <span className="text-neutral-600 dark:text-neutral-400 font-medium text-sm">{alarm.label}</span>
                        <span className="h-1 w-1 rounded-full bg-neutral-300 dark:bg-neutral-700" aria-hidden="true"></span>
                        <span className="text-neutral-400 dark:text-neutral-500 text-xs font-mono uppercase tracking-wide">
                            {SOUND_PRESETS.find(s => s.id === alarm.soundId)?.name || 'Default'}
                        </span>
                    </div>
                </div>
                </div>
                
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => openEditModal(alarm)}
                        aria-label="Edit alarm"
                        className="p-3 rounded-xl text-neutral-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none"
                    >
                        <Pencil size={20} aria-hidden="true" />
                    </button>
                    
                    <button 
                    onClick={() => handleDeleteClick(alarm.id)}
                    aria-label={deleteConfirmId === alarm.id ? "Confirm deletion" : "Delete alarm"}
                    className={`transition-all p-3 rounded-xl flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none ${
                        deleteConfirmId === alarm.id 
                        ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 px-4' 
                        : 'text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10'
                    }`}
                    >
                    {deleteConfirmId === alarm.id ? <span className="font-bold text-xs">CONFIRM</span> : <Trash2 size={20} aria-hidden="true" />}
                    </button>
                </div>
            </div>
            ))}
        </div>
      </div>
    </div>
  );
};