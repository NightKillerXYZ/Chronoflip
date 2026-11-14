package com.nightkillerxyz.chronoflip;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

import androidx.core.content.ContextCompat;

public class AlarmReceiver extends BroadcastReceiver {
    static final String ACTION_ALARM_TRIGGERED = "com.nightkillerxyz.chronoflip.ALARM_TRIGGERED";

    @Override
    public void onReceive(Context context, Intent intent) {
        String alarmId = intent.getStringExtra("alarmId");
        String label = intent.getStringExtra("label");
        String soundId = intent.getStringExtra("soundId");
        if (alarmId == null) return;

        android.content.Intent event = new android.content.Intent(ACTION_ALARM_TRIGGERED)
            .setPackage(context.getPackageName())
            .putExtra("alarmId", alarmId)
            .putExtra("label", label)
            .putExtra("soundId", soundId);
        context.sendBroadcast(event);

        org.json.JSONObject alarm = AlarmScheduler.find(context, alarmId);
        if (alarm != null && alarm.optJSONArray("days") != null && alarm.optJSONArray("days").length() > 0) {
            AlarmScheduler.schedule(context, alarm);
        } else {
            AlarmScheduler.markOneTimeInactive(context, alarmId);
        }

        Intent service = new Intent(context, AlarmPlaybackService.class)
            .putExtra("alarmId", alarmId)
            .putExtra("label", label)
            .putExtra("soundId", soundId);
        ContextCompat.startForegroundService(context, service);
    }
}
