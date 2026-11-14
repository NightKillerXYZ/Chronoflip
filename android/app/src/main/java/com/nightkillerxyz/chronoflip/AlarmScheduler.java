package com.nightkillerxyz.chronoflip;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.Calendar;

final class AlarmScheduler {
    private static final String PREFS = "chronoflip_native_alarms";
    private static final String ALARMS = "alarms";

    private AlarmScheduler() {}

    static void sync(Context context, JSONArray alarms) {
        JSONArray previous = read(context);
        for (int i = 0; i < previous.length(); i++) {
            cancel(context, previous.optJSONObject(i));
        }
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit()
            .putString(ALARMS, alarms.toString())
            .apply();
        for (int i = 0; i < alarms.length(); i++) {
            JSONObject alarm = alarms.optJSONObject(i);
            if (alarm != null && alarm.optBoolean("active", false)) schedule(context, alarm);
        }
    }

    static JSONArray read(Context context) {
        String value = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getString(ALARMS, "[]");
        try {
            return new JSONArray(value);
        } catch (Exception ignored) {
            return new JSONArray();
        }
    }

    static JSONObject find(Context context, String alarmId) {
        JSONArray alarms = read(context);
        for (int i = 0; i < alarms.length(); i++) {
            JSONObject alarm = alarms.optJSONObject(i);
            if (alarm != null && alarmId.equals(alarm.optString("id"))) return alarm;
        }
        return null;
    }

    static void schedule(Context context, JSONObject alarm) {
        long triggerAt = nextTrigger(alarm, System.currentTimeMillis());
        if (triggerAt <= 0) return;
        AlarmManager manager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        PendingIntent pending = pendingIntent(context, alarm);
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                manager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pending);
            } else {
                manager.setExact(AlarmManager.RTC_WAKEUP, triggerAt, pending);
            }
        } catch (SecurityException ignored) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                manager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pending);
            } else {
                manager.set(AlarmManager.RTC_WAKEUP, triggerAt, pending);
            }
        }
    }

    static void cancel(Context context, JSONObject alarm) {
        if (alarm == null) return;
        AlarmManager manager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        manager.cancel(pendingIntent(context, alarm));
    }

    static void snooze(Context context, String alarmId, int minutes) {
        JSONObject alarm = find(context, alarmId);
        if (alarm == null) return;
        try {
            JSONObject snooze = new JSONObject(alarm.toString());
            snooze.put("id", "native-snooze-" + System.currentTimeMillis());
            snooze.put("label", "Snooze: " + alarm.optString("label", "Alarm"));
            snooze.put("days", new JSONArray());
            snooze.put("active", true);
            JSONArray alarms = read(context);
            alarms.put(snooze);
            context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .edit().putString(ALARMS, alarms.toString()).apply();
            Calendar target = Calendar.getInstance();
            target.add(Calendar.MINUTE, minutes);
            AlarmManager manager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            PendingIntent pending = pendingIntent(context, snooze);
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    manager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, target.getTimeInMillis(), pending);
                } else {
                    manager.setExact(AlarmManager.RTC_WAKEUP, target.getTimeInMillis(), pending);
                }
            } catch (SecurityException ignored) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    manager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, target.getTimeInMillis(), pending);
                } else {
                    manager.set(AlarmManager.RTC_WAKEUP, target.getTimeInMillis(), pending);
                }
            }
        } catch (Exception ignored) {
        }
    }

    static void markOneTimeInactive(Context context, String alarmId) {
        JSONArray alarms = read(context);
        for (int i = 0; i < alarms.length(); i++) {
            JSONObject alarm = alarms.optJSONObject(i);
            if (alarm != null && alarmId.equals(alarm.optString("id"))) {
                try {
                    alarm.put("active", false);
                } catch (Exception ignored) {
                }
            }
        }
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit().putString(ALARMS, alarms.toString()).apply();
    }

    private static long nextTrigger(JSONObject alarm, long now) {
        try {
            String[] parts = alarm.optString("time").split(":");
            int hour = Integer.parseInt(parts[0]);
            int minute = Integer.parseInt(parts[1]);
            JSONArray days = alarm.optJSONArray("days");
            Calendar candidate = Calendar.getInstance();
            candidate.set(Calendar.SECOND, 0);
            candidate.set(Calendar.MILLISECOND, 0);
            candidate.set(Calendar.HOUR_OF_DAY, hour);
            candidate.set(Calendar.MINUTE, minute);

            if (days == null || days.length() == 0) {
                if (candidate.getTimeInMillis() <= now) candidate.add(Calendar.DAY_OF_YEAR, 1);
                return candidate.getTimeInMillis();
            }

            for (int offset = 0; offset <= 7; offset++) {
                Calendar attempt = (Calendar) candidate.clone();
                attempt.add(Calendar.DAY_OF_YEAR, offset);
                int sundayBasedDay = attempt.get(Calendar.DAY_OF_WEEK) - Calendar.SUNDAY;
                for (int i = 0; i < days.length(); i++) {
                    if (days.optInt(i, -1) == sundayBasedDay &&
                        attempt.getTimeInMillis() > now) {
                        return attempt.getTimeInMillis();
                    }
                }
            }
        } catch (Exception ignored) {
        }
        return -1;
    }

    private static PendingIntent pendingIntent(Context context, JSONObject alarm) {
        String id = alarm.optString("id", "alarm");
        Intent intent = new Intent(context, AlarmReceiver.class)
            .putExtra("alarmId", id)
            .putExtra("label", alarm.optString("label", "Alarm"))
            .putExtra("soundId", alarm.optString("soundId", "radar"));
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;
        return PendingIntent.getBroadcast(context, id.hashCode(), intent, flags);
    }
}
