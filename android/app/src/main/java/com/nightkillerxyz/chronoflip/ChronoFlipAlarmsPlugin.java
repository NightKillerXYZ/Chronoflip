package com.nightkillerxyz.chronoflip;

import android.Manifest;
import android.app.AlarmManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Build;
import android.provider.Settings;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;

@CapacitorPlugin(name = "ChronoFlipAlarms")
public class ChronoFlipAlarmsPlugin extends Plugin {
    private BroadcastReceiver alarmEvents;

    @Override
    public void load() {
        alarmEvents = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                JSObject event = new JSObject();
                event.put("alarmId", intent.getStringExtra("alarmId"));
                if (AlarmReceiver.ACTION_ALARM_TRIGGERED.equals(intent.getAction())) {
                    event.put("label", intent.getStringExtra("label"));
                    event.put("soundId", intent.getStringExtra("soundId"));
                    notifyListeners("alarmTriggered", event);
                } else {
                    event.put("action", intent.getStringExtra("action"));
                    notifyListeners("alarmAction", event);
                }
            }
        };
        IntentFilter filter = new IntentFilter(AlarmReceiver.ACTION_ALARM_TRIGGERED);
        filter.addAction(AlarmPlaybackService.ACTION_ALARM_ACTION);
        ContextCompat.registerReceiver(getContext(), alarmEvents, filter, ContextCompat.RECEIVER_NOT_EXPORTED);
    }

    @PluginMethod
    public void syncAlarms(PluginCall call) {
        JSONArray alarms = call.getArray("alarms");
        if (alarms == null) {
            call.reject("alarms is required");
            return;
        }
        AlarmScheduler.sync(getContext(), alarms);
        call.resolve();
    }

    @PluginMethod
    public void stopAlarm(PluginCall call) {
        String alarmId = call.getString("alarmId");
        if (alarmId == null) {
            call.reject("alarmId is required");
            return;
        }
        AlarmPlaybackService.stop(getContext(), alarmId);
        call.resolve();
    }

    @PluginMethod
    public void snoozeAlarm(PluginCall call) {
        String alarmId = call.getString("alarmId");
        int minutes = call.getInt("minutes", 5);
        if (alarmId == null) {
            call.reject("alarmId is required");
            return;
        }
        AlarmPlaybackService.snooze(getContext(), alarmId, minutes);
        call.resolve();
    }

    @PluginMethod
    public void requestPermissions(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            ActivityCompat.requestPermissions(
                getActivity(),
                new String[] { Manifest.permission.POST_NOTIFICATIONS },
                7101
            );
        }
        call.resolve();
    }

    @PluginMethod
    public void openExactAlarmSettings(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            AlarmManager alarmManager = (AlarmManager) getContext().getSystemService(Context.ALARM_SERVICE);
            if (!alarmManager.canScheduleExactAlarms()) {
                Intent intent = new Intent(
                    Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,
                    android.net.Uri.parse("package:" + getContext().getPackageName())
                );
                getActivity().startActivity(intent);
            }
        }
        call.resolve();
    }
}
