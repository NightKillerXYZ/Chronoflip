
import React, { useState } from 'react';
import { X, Play, Volume2, Upload, Music, Check, Pencil, Trash2 } from 'lucide-react';
import { SOUND_PRESETS, CustomSound } from '../types';
import { audioService } from '../services/audioService';

interface SoundPickerProps {
  selectedSoundId: string;
  onSelect: (id: string) => void;
  systemDefaultId?: string; // ID of the global default sound to show badge
  
  // Custom Sound Props
  customSounds: CustomSound[];
  onUpload: (file: File) => void;
  onRename: (id: string, newName: string) => void;
  onDelete: (id: string) => void;
}

export const SoundPicker: React.FC<SoundPickerProps> = ({ 
    selectedSoundId, 
    onSelect, 
    systemDefaultId,
    customSounds, 
    onUpload,
    onRename,
    onDelete
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'Presets' | 'Custom'>('Presets');
  const [previewId, setPreviewId] = useState<string | null>(null);
  
  // Renaming State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handlePreview = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setPreviewId(id);
    audioService.previewSound(id);
    // Auto reset icon after 5s (matching preview duration)
    setTimeout(() => {
        if (previewId === id) setPreviewId(null);
    }, 5000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        onUpload(file);
        setActiveTab('Custom');
    }
  };

  const startEditing = (e: React.MouseEvent, sound: CustomSound) => {
      e.stopPropagation();
      setEditingId(sound.id);
      setEditName(sound.name);
  };

  const saveName = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (editingId && editName.trim()) {
          onRename(editingId, editName.trim());
      }
      setEditingId(null);
  };

  const cancelEditing = (e: React.MouseEvent) => {
      e.stopPropagation();
      setEditingId(null);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if (confirm('Delete this sound?')) {
          onDelete(id);
      }
  };

  const getSoundName = (id: string) => {
      const preset = SOUND_PRESETS.find(s => s.id === id);
      if (preset) return preset.name;
      const custom = customSounds.find(s => s.id === id);
      return custom ? custom.name : 'Unknown Sound';
  };

  const renderBadge = (id: string) => {
      if (id === systemDefaultId) {
          return (
              <span className="ml-2 px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-500 text-[9px] font-bold uppercase tracking-wider border border-amber-200 dark:border-amber-700/50">
                  Default
              </span>
          );
      }
      return null;
  };

  const renderPresetList = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar" role="listbox">
      {SOUND_PRESETS.map(sound => (
        <button 
          key={sound.id}
          type="button"
          onClick={() => { onSelect(sound.id); setIsOpen(false); }}
          role="option"
          aria-selected={selectedSoundId === sound.id}
          className={`
            group flex items-center justify-between p-4 rounded-xl cursor-pointer border transition-all text-left w-full outline-none focus-visible:ring-2 focus-visible:ring-amber-500
            ${selectedSoundId === sound.id 
              ? 'bg-amber-500/10 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.1)]' 
              : 'bg-neutral-50 dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-700/50 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-600'}
          `}
        >
          <div className="flex items-center gap-3">
             <div className={`p-2 rounded-full ${selectedSoundId === sound.id ? 'bg-amber-500 text-black' : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400 group-hover:text-neutral-700 dark:group-hover:text-white'}`}>
                {selectedSoundId === sound.id ? <Check size={16} aria-hidden="true" /> : <Music size={16} aria-hidden="true" />}
             </div>
             <div className="flex flex-col items-start">
                <div className="flex items-center">
                    <span className={`font-medium ${selectedSoundId === sound.id ? 'text-amber-600 dark:text-amber-500' : 'text-neutral-700 dark:text-neutral-300'}`}>
                        {sound.name}
                    </span>
                    {renderBadge(sound.id)}
                </div>
                <span className="text-xs text-neutral-500">{sound.category}</span>
             </div>
          </div>

          <div 
             role="button"
             tabIndex={0}
             aria-label={`Preview ${sound.name}`}
             onClick={(e) => handlePreview(e, sound.id)}
             onKeyDown={(e) => {
                 if (e.key === 'Enter' || e.key === ' ') {
                     e.preventDefault();
                     handlePreview(e as any, sound.id);
                 }
             }}
             className={`p-2 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none ${previewId === sound.id ? 'text-amber-500 animate-pulse' : 'text-neutral-400 dark:text-neutral-500'}`}
          >
             {previewId === sound.id ? <Volume2 size={20} aria-hidden="true" /> : <Play size={20} aria-hidden="true" />}
          </div>
        </button>
      ))}
    </div>
  );

  const renderCustomList = () => (
      <div className="flex flex-col h-full">
        {customSounds.length > 0 ? (
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[320px] overflow-y-auto pr-2 custom-scrollbar mb-4">
               {customSounds.map(sound => (
                   <button 
                       key={sound.id}
                       type="button"
                       onClick={() => { 
                           if (editingId !== sound.id) {
                               onSelect(sound.id); 
                               setIsOpen(false);
                           }
                       }}
                       role="option"
                       aria-selected={selectedSoundId === sound.id}
                       className={`
                           group flex items-center justify-between p-3 rounded-xl cursor-pointer border transition-all text-left w-full outline-none focus-visible:ring-2 focus-visible:ring-amber-500
                           ${selectedSoundId === sound.id 
                           ? 'bg-amber-500/10 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.1)]' 
                           : 'bg-neutral-50 dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-700/50 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-600'}
                       `}
                   >
                       <div className="flex items-center gap-3 flex-1 min-w-0">
                           <div className={`p-2 rounded-full flex-shrink-0 ${selectedSoundId === sound.id ? 'bg-amber-500 text-black' : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400'}`}>
                               <Music size={16} />
                           </div>
                           
                           {editingId === sound.id ? (
                               <div className="flex items-center gap-1 flex-1" onClick={e => e.stopPropagation()}>
                                   <input 
                                       type="text" 
                                       value={editName}
                                       onChange={(e) => setEditName(e.target.value)}
                                       className="w-full bg-white dark:bg-neutral-900 border border-amber-500 rounded px-2 py-1 text-sm focus:outline-none"
                                       autoFocus
                                   />
                                   <button onClick={saveName} className="p-1 text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"><Check size={14}/></button>
                                   <button onClick={cancelEditing} className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"><X size={14}/></button>
                               </div>
                           ) : (
                               <div className="flex flex-col items-start min-w-0">
                                   <div className="flex items-center">
                                        <span className={`font-medium truncate ${selectedSoundId === sound.id ? 'text-amber-600 dark:text-amber-500' : 'text-neutral-700 dark:text-neutral-300'}`}>
                                            {sound.name}
                                        </span>
                                        {renderBadge(sound.id)}
                                   </div>
                                   <span className="text-[10px] text-neutral-500">Custom</span>
                               </div>
                           )}
                       </div>

                       <div className="flex items-center gap-1">
                           {editingId !== sound.id && (
                               <>
                                   <div onClick={(e) => handlePreview(e, sound.id)} className={`p-2 hover:text-amber-500 ${previewId === sound.id ? 'text-amber-500 animate-pulse' : 'text-neutral-400'}`}>
                                       {previewId === sound.id ? <Volume2 size={16} /> : <Play size={16} />}
                                   </div>
                                   <div onClick={(e) => startEditing(e, sound)} className="p-2 text-neutral-400 hover:text-blue-500">
                                       <Pencil size={16} />
                                   </div>
                                   <div onClick={(e) => handleDelete(e, sound.id)} className="p-2 text-neutral-400 hover:text-red-500">
                                       <Trash2 size={16} />
                                   </div>
                               </>
                           )}
                       </div>
                   </button>
               ))}
           </div>
        ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-neutral-500 dark:text-neutral-600 py-8 border-2 border-dashed border-neutral-300 dark:border-neutral-800 rounded-xl mb-4">
                <Music size={40} className="mb-2 opacity-20" aria-hidden="true" />
                <p className="text-sm">No custom sounds yet</p>
            </div>
        )}
        
        <label className="mt-auto flex items-center justify-center gap-2 w-full py-4 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white rounded-xl cursor-pointer transition-colors border border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-500 focus-within:ring-2 focus-within:ring-amber-500">
            <Upload size={20} aria-hidden="true" />
            <span className="font-bold text-sm">Upload Audio (.mp3, .wav)</span>
            <input type="file" accept="audio/*" onChange={handleFileUpload} className="hidden" />
        </label>
        <p className="text-center text-[10px] text-neutral-400 dark:text-neutral-500 mt-2">Max playback: 20 seconds. Stored locally in your browser.</p>
      </div>
  );

  return (
    <>
      {/* Trigger Button */}
      <button 
        onClick={() => setIsOpen(true)}
        aria-label="Select Ringtone"
        className="flex items-center justify-between w-full bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700 rounded-lg p-2.5 sm:p-3 text-neutral-900 dark:text-white hover:border-neutral-400 dark:hover:border-neutral-500 transition-colors group focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none"
      >
        <div className="flex items-center gap-2 overflow-hidden">
            <Volume2 size={20} className="text-neutral-500 group-hover:text-amber-500 transition-colors" aria-hidden="true" />
            <span className="truncate text-sm sm:text-base">
                {getSoundName(selectedSoundId)}
            </span>
            {renderBadge(selectedSoundId)}
        </div>
        <div className="text-xs text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-900 px-2 py-1 rounded ml-2">Change</div>
      </button>

      {/* Modal Overlay */}
      {isOpen && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 dark:bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
             
             {/* Header */}
             <div className="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-800">
                <h2 className="text-2xl font-bold text-neutral-900 dark:text-white flex items-center gap-3">
                    <Music className="text-amber-500" aria-hidden="true" /> Sound Selection
                </h2>
                <button 
                    onClick={() => setIsOpen(false)} 
                    aria-label="Close Sound Selector"
                    className="text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none rounded-lg p-1"
                >
                    <X size={24} aria-hidden="true" />
                </button>
             </div>

             {/* Tabs & Content */}
             <div className="p-6 flex-1 overflow-hidden flex flex-col">
                <div role="tablist" className="flex gap-4 mb-6 border-b border-neutral-200 dark:border-neutral-800 pb-1">
                    <button 
                        role="tab"
                        aria-selected={activeTab === 'Presets'}
                        onClick={() => setActiveTab('Presets')}
                        className={`pb-3 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:rounded-t ${activeTab === 'Presets' ? 'border-amber-500 text-neutral-900 dark:text-white' : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300'}`}
                    >
                        Presets
                    </button>
                    <button 
                        role="tab"
                        aria-selected={activeTab === 'Custom'}
                        onClick={() => setActiveTab('Custom')}
                        className={`pb-3 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:rounded-t ${activeTab === 'Custom' ? 'border-amber-500 text-neutral-900 dark:text-white' : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300'}`}
                    >
                        My Sounds
                    </button>
                </div>

                <div role="tabpanel" className="flex-1 overflow-hidden">
                    {activeTab === 'Presets' ? renderPresetList() : renderCustomList()}
                </div>
             </div>

           </div>
        </div>
      )}
    </>
  );
};
