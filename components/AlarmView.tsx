
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Bell, BellOff, Pencil, X, Check, CalendarDays } from 'lucide-react';
import { Alarm, CustomSound } from '../types';
import { WheelPicker } from './WheelPicker';
import { SoundPicker } from './SoundPicker';
import { SOUND_PRESETS } from '../types';

interface AlarmViewProps {
    alarms: Alarm[];
    setAlarms: (alarms: Alarm[]) => void;
    defaultSoundId: string;
    
    // Custom Sound Props
    customSounds: CustomSound[];
    onUpload: (file: File) => void;
    onRename: (id: string, newName: string) => void;
    onDelete: (id: string) => void;
}

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const FULL_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const AlarmView: React.FC<AlarmViewProps> = ({ 
    alarms, setAlarms, defaultSoundId, customSounds, onUpload, onRename, onDelete 
}) => {
  // "Add New" State
  const [inputHrs, setInputHrs] = useState(8);
  const [inputMins, setInputMins] = useState(0);
  const [newLabel, setNewLabel] = useState('');
  const [selectedSound, setSelectedSound] = useState(defaultSoundId); // Use default
  const [selectedDays, setSelectedDays] = useState<number[]>([]); // Empty = One time
  
  // "Edit" State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAlarmId, setEditingAlarmId] = useState<string | null>(null);
  const [editHrs, setEditHrs] = useState(0);
  const [editMins, setEditMins] = useState(0);
  const [editLabel, setEditLabel] = useState('');
  const [editSound, setEditSound] = useState('');
  const [editDays, setEditDays] = useState<number[]>([]);

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const toggleDay = (dayIndex: number, isEdit: boolean) => {
      const current = isEdit ? editDays : selectedDays;
      const setter = isEdit ? setEditDays : setSelectedDays;
      
      if (current.includes(dayIndex)) {
          setter(current.filter(d => d !== dayIndex));
      } else {
          setter([...current, dayIndex].sort());
      }
  };

  const addAlarm = () => {
    const id = Date.now().toString();
    const timeStr = `${inputHrs.toString().padStart(2, '0')}:${inputMins.toString().padStart(2, '0')}`;
    setAlarms([...alarms, { 
      id, 
      time: timeStr, 
      label: newLabel || 'Alarm', 
      active: true,
      soundId: selectedSound,
      days: selectedDays
    }]);
    setNewLabel('');
    setSelectedDays([]);
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
      setEditDays(alarm.days || []);
      setIsEditModalOpen(true);
  };

  const saveEdit = () => {
      if (!editingAlarmId) return;
      const timeStr = `${editHrs.toString().padStart(2, '0')}:${editMins.toString().padStart(2, '0')}`;
      
      setAlarms(alarms.map(a => a.id === editingAlarmId ? {
          ...a,
          time: timeStr,
          label: editLabel || 'Alarm',
          soundId: editSound,
          days: editDays
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

  // Helper to display selected days
  const formatDays = (days: number[]) => {
      if (!days || days.length === 0) return 'Once';
      if (days.length === 7) return 'Every day';
      if (days.length === 2 && days.includes(0) && days.includes(6)) return 'Weekends';
      if (days.length === 5 && !days.includes(0) && !days.includes(6)) return 'Weekdays';
      return days.map(d => FULL_DAYS[d].slice(0, 3)).join(', ');
  };

  useEffect(() => {
    if (Notification.permission === 'default') Notification.requestPermission();
  }, []);

  const soundPickerProps = { 
      customSounds, 
      onUpload, 
      onRename, 
      onDelete,
      systemDefaultId: defaultSoundId 
    };

  return (
    <div className="h-full w-full overflow-y-auto custom-scrollbar p-4 sm:p-6 md:p-10 animate-fade-in relative">
      
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
                     <div className="flex gap-2 sm:gap-4 items-center justify-center bg-neutral-50 dark:bg-neutral-950/50 p-4 sm:p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800">
                        <WheelPicker label="HOURS" value={editHrs} onChange={setEditHrs} min={0} max={23} />
                        <div className="text-xl sm:text-3xl font-mono text-neutral-300 dark:text-neutral-700 pb-6 sm:pb-8 opacity-50" aria-hidden="true">:</div>
                        <WheelPicker label="MINUTES" value={editMins} onChange={setEditMins} min={0} max={59} />
                    </div>

                    <div className="space-y-4">
                        {/* Day Selector */}
                        <div className="space-y-2">
                             <label className="block text-neutral-500 text-xs font-bold uppercase tracking-wider pl-1">Repeat</label>
                             <div className="flex justify-between bg-neutral-100 dark:bg-neutral-950 rounded-xl p-2">
                                 {DAYS.map((day, idx) => {
                                     const isSelected = editDays.includes(idx);
                                     return (
                                         <button
                                             key={idx}
                                             onClick={() => toggleDay(idx, true)}
                                             className={`w-10 h-10 rounded-lg text-sm font-bold transition-all ${isSelected ? 'bg-amber-500 text-black shadow-md' : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200'}`}
                                         >
                                             {day}
                                         </button>
                                     );
                                 })}
                             </div>
                        </div>

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

      <div className="max-w-5xl mx-auto flex flex-col">
        <h2 className="text-3xl sm:text-4xl font-bold text-neutral-800 dark:text-white mb-6 sm:mb-8 border-b border-neutral-200 dark:border-neutral-800 pb-4 sm:pb-6 tracking-tight">Alarms</h2>

        {/* Add Alarm Section */}
        <div className="bg-white dark:bg-neutral-900/40 p-4 sm:p-5 md:p-8 rounded-3xl border border-neutral-200 dark:border-neutral-800 mb-8 sm:mb-10 flex flex-col lg:flex-row gap-6 sm:gap-8 lg:gap-10 items-start lg:items-center justify-between shadow-sm">
            <div className="flex gap-2 sm:gap-6 items-center mx-auto lg:mx-0">
                <WheelPicker label="HOURS" value={inputHrs} onChange={setInputHrs} min={0} max={23} />
                <div className="text-xl sm:text-3xl font-mono text-neutral-300 dark:text-neutral-700 pb-6 sm:pb-8 opacity-50" aria-hidden="true">:</div>
                <WheelPicker label="MINUTES" value={inputMins} onChange={setInputMins} min={0} max={59} />
            </div>
            
            <div className="flex flex-col gap-3 sm:gap-5 w-full flex-1">
            
            {/* Day Selector (Add) */}
            <div className="space-y-1 sm:space-y-2">
                 <label className="block text-neutral-500 text-xs font-bold uppercase tracking-wider pl-1">Repeat</label>
                 <div className="flex justify-between bg-neutral-100 dark:bg-neutral-950 rounded-xl p-2 sm:p-3">
                     {DAYS.map((day, idx) => {
                         const isSelected = selectedDays.includes(idx);
                         return (
                             <button
                                 key={idx}
                                 onClick={() => toggleDay(idx, false)}
                                 className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg text-sm font-bold transition-all ${isSelected ? 'bg-amber-500 text-black shadow-md' : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200'}`}
                             >
                                 {day}
                             </button>
                         );
                     })}
                 </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-5">
                <div className="space-y-1 sm:space-y-2">
                    <label htmlFor="alarm-label" className="block text-neutral-500 text-xs font-bold uppercase tracking-wider pl-1">Label</label>
                    <input 
                        id="alarm-label"
                        type="text" 
                        value={newLabel}
                        onChange={(e) => setNewLabel(e.target.value)}
                        placeholder="Morning Wakeup"
                        className="w-full bg-neutral-100 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl p-3 sm:p-3.5 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-600 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all font-medium text-sm sm:text-base"
                    />
                </div>
                <div className="space-y-1 sm:space-y-2">
                    <label className="block text-neutral-500 text-xs font-bold uppercase tracking-wider pl-1">Ringtone</label>
                    <SoundPicker selectedSoundId={selectedSound} onSelect={setSelectedSound} {...soundPickerProps} />
                </div>
            </div>
            
            <button 
                onClick={addAlarm}
                className="w-full bg-neutral-900 dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-black font-bold py-3 sm:p-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg mt-1 sm:mt-2 active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none"
            >
                <Plus size={20} strokeWidth={3} aria-hidden="true" /> <span className="tracking-wide">ADD ALARM</span>
            </button>
            </div>
        </div>

        {/* List Section */}
        <div className="space-y-4 pb-20" role="list">
            {alarms.length === 0 && (
            <div className="flex flex-col items-center justify-center h-48 text-neutral-400 dark:text-neutral-600 italic border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl">
                <BellOff size={48} className="mb-4 opacity-20" aria-hidden="true" />
                <p>No active alarms</p>
            </div>
            )}
            {alarms.map(alarm => (
            <div key={alarm.id} role="listitem" className="bg-white dark:bg-neutral-900/60 p-4 sm:p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 flex items-center justify-between group hover:border-amber-500/30 dark:hover:border-neutral-700 transition-all shadow-sm hover:shadow-md hover:bg-neutral-50 dark:hover:bg-neutral-900">
                <div className="flex items-center gap-4 sm:gap-6">
                <button 
                    onClick={() => toggleAlarm(alarm.id)}
                    aria-label={alarm.active ? "Turn off alarm" : "Turn on alarm"}
                    className={`p-3 sm:p-3.5 rounded-full transition-all duration-300 shadow-sm focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none ${alarm.active ? 'bg-amber-500/10 text-amber-600 dark:text-amber-500' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-600'}`}
                >
                    {alarm.active ? <Bell size={20} className="fill-current sm:w-6 sm:h-6" aria-hidden="true" /> : <BellOff size={20} className="sm:w-6 sm:h-6" aria-hidden="true" />}
                </button>
                <div>
                    <div className={`text-3xl sm:text-4xl font-mono font-bold tracking-tight ${alarm.active ? 'text-neutral-900 dark:text-white' : 'text-neutral-400 dark:text-neutral-600'}`}>
                    {alarm.time}
                    </div>
                    <div className="flex flex-col sm:flex-row gap-1 sm:gap-3 items-start sm:items-center mt-1">
                        <span className="text-neutral-600 dark:text-neutral-400 font-medium text-sm">{alarm.label}</span>
                        <span className="hidden sm:inline h-1 w-1 rounded-full bg-neutral-300 dark:bg-neutral-700" aria-hidden="true"></span>
                        <div className="flex items-center gap-1.5">
                            <CalendarDays size={12} className="text-amber-500" />
                            <span className="text-neutral-500 dark:text-neutral-400 text-[10px] sm:text-xs font-bold uppercase tracking-wide">
                                {formatDays(alarm.days)}
                            </span>
                        </div>
                    </div>
                </div>
                </div>
                
                <div className="flex items-center gap-1 sm:gap-2">
                    <button
                        onClick={() => openEditModal(alarm)}
                        aria-label="Edit alarm"
                        className="p-2 sm:p-3 rounded-xl text-neutral-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none"
                    >
                        <Pencil size={18} className="sm:w-5 sm:h-5" aria-hidden="true" />
                    </button>
                    
                    <button 
                    onClick={() => handleDeleteClick(alarm.id)}
                    aria-label={deleteConfirmId === alarm.id ? "Confirm deletion" : "Delete alarm"}
                    className={`transition-all p-2 sm:p-3 rounded-xl flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none ${
                        deleteConfirmId === alarm.id 
                        ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 px-3 sm:px-4' 
                        : 'text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10'
                    }`}
                    >
                    {deleteConfirmId === alarm.id ? <span className="font-bold text-xs">CONFIRM</span> : <Trash2 size={18} className="sm:w-5 sm:h-5" aria-hidden="true" />}
                    </button>
                </div>
            </div>
            ))}
        </div>
      </div>
    </div>
  );
};
