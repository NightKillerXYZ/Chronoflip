import { Capacitor, registerPlugin } from '@capacitor/core';
import type { Alarm } from '../types';

interface NativeAlarmPlugin {
  syncAlarms(options: { alarms: Alarm[] }): Promise<void>;
  stopAlarm(options: { alarmId: string }): Promise<void>;
  snoozeAlarm(options: { alarmId: string; minutes: number }): Promise<void>;
  requestPermissions(): Promise<void>;
  openExactAlarmSettings(): Promise<void>;
  addListener(
    eventName: 'alarmTriggered',
    listenerFunc: (event: { alarmId: string; label: string; soundId: string }) => void
  ): Promise<{ remove: () => Promise<void> }>;
  addListener(
    eventName: 'alarmAction',
    listenerFunc: (event: { alarmId: string; action: 'stop' | 'snooze' }) => void
  ): Promise<{ remove: () => Promise<void> }>;
}

const NativeAlarm = registerPlugin<NativeAlarmPlugin>('ChronoFlipAlarms');

export const isNativeAndroid = () =>
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

export const syncNativeAlarms = async (alarms: Alarm[]) => {
  if (isNativeAndroid()) await NativeAlarm.syncAlarms({ alarms });
};

export const stopNativeAlarm = async (alarmId: string) => {
  if (isNativeAndroid()) await NativeAlarm.stopAlarm({ alarmId });
};

export const snoozeNativeAlarm = async (alarmId: string, minutes: number) => {
  if (isNativeAndroid()) await NativeAlarm.snoozeAlarm({ alarmId, minutes });
};

export const requestNativeAlarmPermissions = async () => {
  if (isNativeAndroid()) await NativeAlarm.requestPermissions();
};

export const openNativeExactAlarmSettings = async () => {
  if (isNativeAndroid()) await NativeAlarm.openExactAlarmSettings();
};

export const addNativeAlarmListener = async (
  listener: (event: { alarmId: string; label: string; soundId: string }) => void
) => {
  if (!isNativeAndroid()) return undefined;
  return NativeAlarm.addListener('alarmTriggered', listener);
};

export const addNativeAlarmActionListener = async (
  listener: (event: { alarmId: string; action: 'stop' | 'snooze' }) => void
) => {
  if (!isNativeAndroid()) return undefined;
  return NativeAlarm.addListener('alarmAction', listener);
};
