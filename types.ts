export interface Alarm {
  id: string;
  time: string; // HH:mm format
  label: string;
  active: boolean;
  soundId: string;
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

export enum ViewState {
  CLOCK = 'CLOCK',
  ALARM = 'ALARM',
  TIMER = 'TIMER',
  TIMETABLE = 'TIMETABLE',
}

export type TimerStatus = 'IDLE' | 'RUNNING' | 'PAUSED' | 'FINISHED';

export interface SoundPreset {
  id: string;
  name: string;
  category: 'Synth' | 'Melodic' | 'Retro' | 'Custom';
}

export const SOUND_PRESETS: SoundPreset[] = [
  { id: 'radar', name: 'Radar (Default)', category: 'Synth' },
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