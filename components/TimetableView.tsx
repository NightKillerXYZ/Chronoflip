
import React, { useState } from 'react';
import { TimetableEntry, Alarm, SOUND_PRESETS, CustomSound, AppearanceSettings } from '../types';
import { Plus, Trash2, Upload, FileText, Clock, AlignLeft, StickyNote, Bell, X, Check, BellRing } from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { SoundPicker } from './SoundPicker';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';

const TIME_RANGE_PATTERN = /^\s*(\d{1,2}):(\d{2})\s*([-–—])\s*(\d{1,2}):(\d{2})\s*$/;
const TIME_PATTERN = /^\s*(\d{1,2}):(\d{2})\s*$/;

const toMinutes = (hours: number, minutes: number) => hours * 60 + minutes;

const getTimeRange = (value: string): { start: string; end?: string; duration?: string } | null => {
    const range = value.match(TIME_RANGE_PATTERN);
    const single = value.match(TIME_PATTERN);
    if (!range && !single) return null;

    const startHours = Number((range || single)?.[1]);
    const startMinutes = Number((range || single)?.[2]);
    if (startHours > 23 || startMinutes > 59) return null;

    const start = `${String(startHours).padStart(2, '0')}:${String(startMinutes).padStart(2, '0')}`;
    if (!range) return { start };

    const endHours = Number(range[3]);
    const endMinutes = Number(range[4]);
    if (endHours > 23 || endMinutes > 59) return null;

    const end = `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
    const startTotal = toMinutes(startHours, startMinutes);
    const endTotal = toMinutes(endHours, endMinutes);
    const totalMinutes = (endTotal - startTotal + 1440) % 1440;
    if (totalMinutes === 0) return { start, end };

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const duration = hours > 0
        ? `${hours}h${minutes > 0 ? ` ${minutes}m` : ''}`
        : `${minutes}m`;
    return { start, end, duration };
};

const parseImportedRow = (values: string[], id: string): TimetableEntry | null => {
    const time = values[0]?.trim() || '';
    const activity = values[1]?.trim() || '';
    if (!getTimeRange(time) || !activity) return null;
    return {
        id,
        time,
        activity,
        notes: values[2]?.trim() || ''
    };
};

interface TimetableViewProps {
    alarms: Alarm[];
    setAlarms: (alarms: Alarm[]) => void;
    defaultSoundId: string;
    appearance?: AppearanceSettings;
    // Custom Sound Props
    customSounds: CustomSound[];
    onUpload: (file: File) => void;
    onRename: (id: string, newName: string) => void;
    onDelete: (id: string) => void;
}

export const TimetableView: React.FC<TimetableViewProps> = ({ 
        alarms, setAlarms, defaultSoundId, customSounds, onUpload, onRename, onDelete, appearance
}) => {
    const isGlass = Boolean(appearance?.transparentMode);
  const [entries, setEntries] = useLocalStorage<TimetableEntry[]>('timetable', [
    { id: '1', time: '09:00', activity: 'Morning Standup', notes: 'Discuss Q3 Goals' },
    { id: '2', time: '11:30', activity: 'Deep Work Session', notes: 'Focus on API Integration' },
    { id: '3', time: '14:00', activity: 'Client Call', notes: 'Prepare slide deck' },
  ]);
  
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Alarm Modal State
  const [isAlarmModalOpen, setIsAlarmModalOpen] = useState(false);
  const [isBulkAlarmMode, setIsBulkAlarmMode] = useState(false);
  const [selectedEntryForAlarm, setSelectedEntryForAlarm] = useState<TimetableEntry | null>(null);
  const [selectedAlarmSound, setSelectedAlarmSound] = useState(defaultSoundId);

  // Sync with default sound change if modal is closed or sound hasn't been manually touched yet (simplified logic)
  // We initialize state with the prop, but users might want to change it per alarm.

  const updateEntry = (id: string, field: keyof TimetableEntry, value: string) => {
    setEntries(entries.map(e => e.id === id ? { ...e, [field]: value } : e));
  };

  const addEntry = () => {
    const id = Date.now().toString();
    setEntries([...entries, { id, time: '12:00', activity: '', notes: '' }]);
  };

  const removeEntry = (id: string) => {
    if (deleteConfirmId === id) {
        setEntries(entries.filter(e => e.id !== id));
        setDeleteConfirmId(null);
    } else {
        setDeleteConfirmId(id);
        setTimeout(() => setDeleteConfirmId(null), 3000);
    }
  };

  // --- Alarm Logic ---
  const openAlarmModal = (entry: TimetableEntry) => {
      setSelectedEntryForAlarm(entry);
      setIsBulkAlarmMode(false);
      // Reset sound selection to current default when opening fresh
      setSelectedAlarmSound(defaultSoundId);
      setIsAlarmModalOpen(true);
  };

  const openBulkAlarmModal = () => {
      if (entries.length === 0) return;
      setSelectedEntryForAlarm(null);
      setIsBulkAlarmMode(true);
      // Reset sound selection to current default
      setSelectedAlarmSound(defaultSoundId);
      setIsAlarmModalOpen(true);
  };

  const handleConfirmAlarm = () => {
      const invalidEntry = entries.find(entry => !getTimeRange(entry.time));
      if (isBulkAlarmMode && invalidEntry) {
          alert(`Enter a valid time or interval for "${invalidEntry.activity || 'an untitled task'}" before setting all alarms.`);
          return;
      }

      if (isBulkAlarmMode) {
          // Create alarms for ALL entries
          const newAlarms: Alarm[] = entries.map((entry, idx) => ({
              id: `tt-bulk-${Date.now()}-${idx}`,
              time: getTimeRange(entry.time)?.start || entry.time,
              label: entry.activity || 'Timetable Task',
              active: true,
              soundId: selectedAlarmSound,
              days: [] // Initialize as one-time alarm
          }));

          setAlarms([...alarms, ...newAlarms]);
          if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
      } else if (selectedEntryForAlarm) {
          const startTime = getTimeRange(selectedEntryForAlarm.time)?.start;
          if (!startTime) {
              alert('Enter a valid time or interval before setting an alarm.');
              return;
          }
          // Create single alarm
          const newAlarm: Alarm = {
              id: `tt-${Date.now()}`,
              time: startTime,
              label: selectedEntryForAlarm.activity || 'Timetable Reminder',
              active: true,
              soundId: selectedAlarmSound,
              days: [] // Initialize as one-time alarm
          };
          setAlarms([...alarms, newAlarm]);
          if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
      }

      setIsAlarmModalOpen(false);
      setSelectedEntryForAlarm(null);
      setIsBulkAlarmMode(false);
  };

  // --- File Import Logic ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Handle .docx files
    if (file.name.toLowerCase().endsWith('.docx')) {
        const reader = new FileReader();
        reader.onload = async (event) => {
            const arrayBuffer = event.target?.result as ArrayBuffer;
            if (!arrayBuffer) return;
            try {
                const result = await mammoth.convertToHtml({ arrayBuffer });
                const parser = new DOMParser();
                const doc = parser.parseFromString(result.value, 'text/html');
                const rows = Array.from(doc.querySelectorAll('tr'));
                
                // Assumption: Word Table -> Col 1: Time, Col 2: Activity
                const newEntries = rows.map((row, idx) => {
                    const cells = row.querySelectorAll('td');
                    if (cells.length >= 2) {
                        return {
                            id: `docx-${Date.now()}-${idx}`,
                            time: cells[0].textContent?.trim() || '',
                            activity: cells[1].textContent?.trim() || '',
                            notes: cells[2]?.textContent?.trim() || ''
                        };
                    }
                    return null;
                }).filter(e => e && e.time && e.activity) as TimetableEntry[];

                if (newEntries.length > 0) {
                     setEntries(prev => [...prev, ...newEntries]);
                }
            } catch (err) {
                console.error("Error parsing Word file:", err);
                alert("Could not parse the Word file. Ensure it contains a table.");
            }
        };
        reader.readAsArrayBuffer(file);
        return;
    }

    // Handle Excel workbooks with the same table shape: Time, Activity, Notes.
    if (/\.(xlsx|xls)$/i.test(file.name)) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const arrayBuffer = event.target?.result as ArrayBuffer;
            if (!arrayBuffer) return;
            try {
                const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
                    header: 1,
                    raw: false,
                    defval: ''
                });
                const newEntries = rows
                    .map((row, idx) => parseImportedRow(
                        row.map(value => String(value)),
                        `excel-${Date.now()}-${idx}`
                    ))
                    .filter((entry): entry is TimetableEntry => entry !== null);
                if (newEntries.length > 0) setEntries(prev => [...prev, ...newEntries]);
            } catch (err) {
                console.error("Error parsing Excel file:", err);
                alert("Could not parse the Excel file. Ensure it contains a table with time and activity columns.");
            }
        };
        reader.readAsArrayBuffer(file);
        return;
    }

    // Handle .json / .txt / .csv
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      try {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
            setEntries(parsed);
        }
      } catch (err) {
        // Fallback for text files line by line
        const lines = content.split('\n');
        const newEntries: TimetableEntry[] = lines.map((line, idx) => {
            const match = line.match(/^\s*((?:\d{1,2}:\d{2})(?:\s*[-–—]\s*\d{1,2}:\d{2})?)\s*[-–—]\s+(.+?)\s*$/);
            return match
                ? parseImportedRow([match[1], match[2]], `upload-${Date.now()}-${idx}`)
                : null;
        }).filter((entry): entry is TimetableEntry => entry !== null);
        
        if (newEntries.length > 0) {
            setEntries(prev => [...prev, ...newEntries]);
        }
      }
    };
    reader.readAsText(file);
  };

  const soundPickerProps = { 
      customSounds, 
      onUpload, 
      onRename, 
      onDelete,
      systemDefaultId: defaultSoundId
  };

    return (
        <div className="h-full p-6 md:p-10 max-w-5xl mx-auto w-full flex flex-col animate-fade-in overflow-y-auto custom-scrollbar relative">
       
       {/* Alarm Creation Modal */}
       {isAlarmModalOpen && (selectedEntryForAlarm || isBulkAlarmMode) && (
           <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
               <div className={`${isGlass ? 'bg-neutral-100/55 dark:bg-neutral-900/50 border-white/20 dark:border-white/10' : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800'} border w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 backdrop-blur-2xl`}>
                   <div className="p-6 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center">
                       <h3 className="text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                           <Bell className="text-amber-500" /> {isBulkAlarmMode ? 'Set All Reminders' : 'Set Reminder'}
                       </h3>
                       <button onClick={() => setIsAlarmModalOpen(false)} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-white">
                           <X size={24} />
                       </button>
                   </div>
                   <div className="p-6 space-y-6">
                       <div className={`${isGlass ? 'bg-neutral-100/50 dark:bg-neutral-900/45 border-white/20 dark:border-white/10' : 'bg-neutral-50 dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800'} p-4 rounded-xl border`}>
                           {isBulkAlarmMode ? (
                               <>
                                <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">Bulk Action</div>
                                <div className="text-lg font-bold text-neutral-900 dark:text-white">
                                    Create alarms for {entries.length} tasks?
                                </div>
                               </>
                           ) : (
                               <>
                                <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">Activity</div>
                                <div className="text-lg font-bold text-neutral-900 dark:text-white truncate">{selectedEntryForAlarm?.activity}</div>
                                <div className="text-amber-600 dark:text-amber-500 font-mono text-2xl font-bold mt-2">{selectedEntryForAlarm?.time}</div>
                               </>
                           )}
                       </div>
                       
                       <div className="space-y-2">
                           <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Select Alert Sound</label>
                           <SoundPicker selectedSoundId={selectedAlarmSound} onSelect={setSelectedAlarmSound} {...soundPickerProps} />
                       </div>
                       
                       <button 
                           onClick={handleConfirmAlarm}
                           className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-500/20 active:scale-[0.98]"
                       >
                           <Check size={20} strokeWidth={3} /> {isBulkAlarmMode ? 'CONFIRM ALL' : 'SET ALARM'}
                       </button>
                   </div>
               </div>
           </div>
       )}

       {/* Header Section */}
       <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 border-b border-neutral-200 dark:border-neutral-800 pb-6 gap-6">
        <div>
            <h2 className="text-4xl font-bold text-neutral-800 dark:text-white tracking-tight">Daily Schedule</h2>
            <p className="text-neutral-500 dark:text-neutral-400 mt-2">Manage your daily tasks and events.</p>
        </div>
        
        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
            <button 
                onClick={openBulkAlarmModal}
                disabled={entries.length === 0}
                className="group flex items-center gap-3 px-5 py-3 bg-neutral-900 dark:bg-neutral-800 hover:bg-amber-500 dark:hover:bg-amber-600 rounded-xl cursor-pointer transition-all border border-neutral-800 hover:border-amber-500 text-sm font-bold text-neutral-300 group-hover:text-white shadow-sm w-full md:w-auto justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <BellRing size={18} aria-hidden="true" />
                <span>NOTIFY ALL</span>
            </button>

            <label className="group flex items-center gap-3 px-5 py-3 bg-neutral-900 dark:bg-neutral-800 hover:bg-amber-500 dark:hover:bg-amber-600 rounded-xl cursor-pointer transition-all border border-neutral-800 hover:border-amber-500 text-sm font-bold text-neutral-300 group-hover:text-white shadow-sm w-full md:w-auto justify-center">
                <Upload size={18} aria-hidden="true" />
                <span>IMPORT FILE</span>
                <input type="file" accept=".txt,.json,.csv,.docx,.xlsx,.xls" onChange={handleFileUpload} className="hidden" />
            </label>
        </div>
      </div>

      {/* List Container */}
    <div className={`flex-1 rounded-3xl border shadow-xl overflow-hidden flex flex-col ${isGlass ? 'bg-neutral-100/55 dark:bg-neutral-900/50 border-white/20 dark:border-white/10 backdrop-blur-2xl' : 'bg-white dark:bg-neutral-900/40 border-neutral-200 dark:border-neutral-800'}`}>
        
        {/* Desktop Headers */}
        <div className={`hidden md:flex border-b text-neutral-400 text-xs font-bold uppercase tracking-wider p-4 ${isGlass ? 'bg-neutral-100/45 dark:bg-neutral-900/45 border-white/20 dark:border-white/10' : 'bg-neutral-100 dark:bg-neutral-950/50 border-neutral-200 dark:border-neutral-800'}`}>
            <div className="w-32 px-2 flex items-center gap-2"><Clock size={14}/> Time</div>
            <div className="flex-1 px-2 flex items-center gap-2"><FileText size={14}/> Activity</div>
            <div className="flex-1 px-2 flex items-center gap-2"><AlignLeft size={14}/> Notes</div>
            <div className="w-24 text-center">Actions</div>
        </div>

        {/* Entries List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
            {entries.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-neutral-400">
                    <FileText size={48} className="mb-4 opacity-20" aria-hidden="true" />
                    <p>Your schedule is empty.</p>
                </div>
            )}

            {entries.map((entry) => (
              <div 
                key={entry.id} 
                className="group flex flex-col md:flex-row items-stretch md:items-center bg-white dark:bg-neutral-900 border border-transparent hover:border-amber-500/30 rounded-xl p-3 gap-3 transition-all hover:shadow-md dark:hover:bg-neutral-800/30"
              >
                {/* Time Input */}
                <div className="flex items-center w-full md:w-32 shrink-0 bg-neutral-50 dark:bg-neutral-950 rounded-lg border border-neutral-200 dark:border-neutral-800 focus-within:border-amber-500 transition-colors">
                    <div className="pl-3 text-neutral-400 md:hidden"><Clock size={14}/></div>
                    <input
                        type="text"
                        aria-label="Time interval"
                        value={entry.time}
                        onChange={(e) => updateEntry(entry.id, 'time', e.target.value)}
                        placeholder="12:00 - 14:00"
                        title="Use HH:mm or HH:mm-HH:mm"
                        className="bg-transparent w-full p-2 text-neutral-900 dark:text-white font-mono font-medium text-lg outline-none text-center md:text-left"
                    />
                </div>

                {/* Activity Input */}
                <div className="flex-1 min-w-0">
                    <input 
                        type="text" 
                        aria-label="Activity"
                        value={entry.activity}
                        onChange={(e) => updateEntry(entry.id, 'activity', e.target.value)}
                        placeholder="Activity Name"
                        className="w-full bg-transparent p-2 text-neutral-800 dark:text-neutral-100 font-semibold text-lg placeholder-neutral-300 dark:placeholder-neutral-700 outline-none border-b border-transparent focus:border-amber-500 transition-colors"
                    />
                    {getTimeRange(entry.time)?.duration && (
                        <div className="px-2 text-xs text-neutral-400 dark:text-neutral-500">
                            {getTimeRange(entry.time)?.duration}
                        </div>
                    )}
                </div>

                {/* Notes Input */}
                <div className="flex-1 min-w-0 flex items-center gap-2">
                    <StickyNote size={14} className="text-neutral-400 md:hidden shrink-0" />
                    <input 
                        type="text" 
                        aria-label="Notes"
                        value={entry.notes}
                        onChange={(e) => updateEntry(entry.id, 'notes', e.target.value)}
                        placeholder="Add notes..."
                        className="w-full bg-transparent p-2 text-neutral-500 dark:text-neutral-400 text-sm outline-none border-b border-transparent focus:border-neutral-500 transition-colors"
                    />
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2 md:w-24 shrink-0">
                    <button 
                        onClick={() => openAlarmModal(entry)}
                        className="p-2 rounded-lg text-neutral-300 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all"
                        title="Set Alarm for this activity"
                    >
                        <Bell size={18} />
                    </button>

                    <button 
                        onClick={() => removeEntry(entry.id)}
                        className={`p-2 rounded-lg transition-all ${
                            deleteConfirmId === entry.id
                            ? 'bg-red-500 text-white w-full md:w-auto text-xs font-bold px-3'
                            : 'text-neutral-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                        }`}
                    >
                        {deleteConfirmId === entry.id ? 'DEL' : <Trash2 size={18} />}
                    </button>
                </div>
              </div>
            ))}
        </div>

        {/* Footer Action */}
        <div className="p-4 bg-neutral-50 dark:bg-neutral-950/50 border-t border-neutral-200 dark:border-neutral-800 sticky bottom-0 backdrop-blur-md">
            <button 
                onClick={addEntry}
                className="w-full py-4 border-2 border-dashed border-neutral-300 dark:border-neutral-700 text-neutral-500 rounded-xl hover:border-amber-500 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/5 transition-all flex items-center justify-center gap-2 font-bold uppercase tracking-wide text-sm focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none"
            >
                <Plus size={18} strokeWidth={3} /> Add Activity
            </button>
        </div>
      </div>
    </div>
  );
};
