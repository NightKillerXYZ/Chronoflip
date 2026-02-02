
export interface Alarm {
  id: string;
  time: string; // HH:mm format
  label: string;
  active: boolean;
  soundId: string;
  days: number[]; // 0 = Sunday, 1 = Monday, etc. Empty = One time only.
  lastTriggered?: number; // Timestamp to prevent duplicate triggers
}

export interface Timer {
  id: string;
  originalDuration: number;
  remaining: number; // Used for display, calculated from endTime
  endTime?: number; // The absolute timestamp when the timer finishes
  status: 'IDLE' | 'RUNNING' | 'PAUSED' | 'FINISHED';
  label: string;
  soundId: string;
}

export interface TimetableEntry {
  id: string;
  time: string;
  activity: string;
  notes: string;
}

export interface CustomSound {
  id: string;
  name: string;
  data: string; // Base64 Data URI
}

export enum ViewState {
  CLOCK = 'CLOCK',
  ALARM = 'ALARM',
  TIMER = 'TIMER',
  STOPWATCH = 'STOPWATCH',
  TIMETABLE = 'TIMETABLE',
}

export type TimerStatus = 'IDLE' | 'RUNNING' | 'PAUSED' | 'FINISHED';

export interface SoundPreset {
  id: string;
  name: string;
  category: 'Synth' | 'Melodic' | 'Retro' | 'Custom';
}

export interface AppearanceSettings {
  timeFormat: '12h' | '24h';
  cardShape: 'square' | 'rounded' | 'extra-rounded'; // border-radius
  numberColor: string; // hex
  cardColor: string; // hex
  backgroundColor: string; // hex (overrides theme if set, 'auto' uses theme)
  isCustom: boolean; // if false, use standard Light/Dark themes
  timezone: string; // IANA timezone string (e.g. 'America/New_York')
  locationLabel: string; // Display name (e.g. 'New York')
  defaultSoundId: string; 
}

export const DEFAULT_APPEARANCE: AppearanceSettings = {
  timeFormat: '24h',
  cardShape: 'rounded',
  numberColor: 'auto',
  cardColor: 'auto',
  backgroundColor: 'auto',
  isCustom: false,
  timezone: 'local',
  locationLabel: 'Local Time',
  defaultSoundId: 'radar',
};

export const SOUND_PRESETS: SoundPreset[] = [
  { id: 'radar', name: 'Radar', category: 'Synth' },
  { id: 'ripple', name: 'Ripple', category: 'Melodic' },
  { id: 'cosmic', name: 'Cosmic', category: 'Synth' },
  { id: 'beacon', name: 'Beacon', category: 'Synth' },
  { id: 'orbit', name: 'Orbit', category: 'Melodic' },
  { id: 'crystal', name: 'Crystal', category: 'Melodic' },
  { id: 'retro', name: 'Retro 8-Bit', category: 'Retro' },
  { id: 'bounce', name: 'Bounce', category: 'Synth' },
  { id: 'echo', name: 'Dark Echo', category: 'Synth' },
  { id: 'shimmer', name: 'Shimmer', category: 'Melodic' },
  { id: 'mars', name: 'Mars', category: 'Retro' },
  { id: 'void', name: 'Void', category: 'Synth' },
];
