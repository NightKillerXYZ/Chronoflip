package com.nightkillerxyz.chronoflip;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.media.MediaPlayer;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.IBinder;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

public class AlarmPlaybackService extends Service {
    private static final String CHANNEL_ID = "chronoflip-alarms";
    private static final int NOTIFICATION_ID = 7102;
    private static final String ACTION_STOP = "com.nightkillerxyz.chronoflip.STOP";
    private static final String ACTION_SNOOZE = "com.nightkillerxyz.chronoflip.SNOOZE";
    static final String ACTION_ALARM_ACTION = "com.nightkillerxyz.chronoflip.ALARM_ACTION";
    private MediaPlayer player;
    private String alarmId;

    static void stop(Context context, String alarmId) {
        Intent intent = new Intent(context, AlarmPlaybackService.class)
            .setAction(ACTION_STOP)
            .putExtra("alarmId", alarmId);
        context.startService(intent);
    }

    static void snooze(Context context, String alarmId, int minutes) {
        Intent intent = new Intent(context, AlarmPlaybackService.class)
            .setAction(ACTION_SNOOZE)
            .putExtra("alarmId", alarmId)
            .putExtra("minutes", minutes);
        context.startService(intent);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent == null ? null : intent.getAction();
        if (ACTION_STOP.equals(action)) {
            sendActionEvent("stop", intent.getStringExtra("alarmId"));
            stopPlayback();
            stopSelf();
            return START_NOT_STICKY;
        }
        if (ACTION_SNOOZE.equals(action)) {
            sendActionEvent("snooze", intent.getStringExtra("alarmId"));
            AlarmScheduler.snooze(this, intent.getStringExtra("alarmId"), intent.getIntExtra("minutes", 5));
            stopPlayback();
            stopSelf();
            return START_NOT_STICKY;
        }

        alarmId = intent == null ? null : intent.getStringExtra("alarmId");
        String label = intent == null ? "Alarm" : intent.getStringExtra("label");
        createChannel();
        startForeground(NOTIFICATION_ID, buildNotification(label));
        startPlayback(intent == null ? null : intent.getStringExtra("soundId"));
        return START_NOT_STICKY;
    }

    private Notification buildNotification(String label) {
        Intent openApp = getPackageManager().getLaunchIntentForPackage(getPackageName());
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;
        PendingIntent content = PendingIntent.getActivity(this, 7103, openApp, flags);

        PendingIntent stop = PendingIntent.getService(
            this, 7104, new Intent(this, AlarmPlaybackService.class)
                .setAction(ACTION_STOP).putExtra("alarmId", alarmId), flags);
        PendingIntent snooze = PendingIntent.getService(
            this, 7105, new Intent(this, AlarmPlaybackService.class)
                .setAction(ACTION_SNOOZE).putExtra("alarmId", alarmId).putExtra("minutes", 5), flags);

        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle("ChronoFlip Alarm")
            .setContentText(label == null ? "Time is up!" : label)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setOngoing(true)
            .setAutoCancel(false)
            .setContentIntent(content)
            .addAction(android.R.drawable.ic_media_pause, "Snooze 5m", snooze)
            .addAction(android.R.drawable.ic_menu_close_clear_cancel, "Stop", stop)
            .build();
    }

    private void createChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID, "ChronoFlip alarms", NotificationManager.IMPORTANCE_HIGH);
        channel.setDescription("Background ChronoFlip alarm alerts");
        channel.setSound(null, null);
        channel.enableVibration(true);
        getSystemService(NotificationManager.class).createNotificationChannel(channel);
    }

    private void sendActionEvent(String action, String alarmId) {
        Intent event = new Intent(ACTION_ALARM_ACTION)
            .setPackage(getPackageName())
            .putExtra("alarmId", alarmId)
            .putExtra("action", action);
        sendBroadcast(event);
    }

    private void startPlayback(String soundId) {
        stopPlayback();
        try {
            int type = RingtoneManager.TYPE_ALARM;
            if (soundId != null && (soundId.equals("ripple") || soundId.equals("orbit") || soundId.equals("crystal") || soundId.equals("shimmer"))) {
                type = RingtoneManager.TYPE_RINGTONE;
            } else if (soundId != null && (soundId.equals("retro") || soundId.equals("mars") || soundId.equals("bounce") || soundId.equals("echo"))) {
                type = RingtoneManager.TYPE_NOTIFICATION;
            }
            Uri sound = RingtoneManager.getDefaultUri(type);
            player = MediaPlayer.create(this, sound);
            if (player != null) {
                player.setLooping(true);
                player.start();
            }
        } catch (Exception ignored) {
        }
    }

    private void stopPlayback() {
        if (player != null) {
            try {
                if (player.isPlaying()) player.stop();
                player.release();
            } catch (Exception ignored) {
            }
            player = null;
        }
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager != null) manager.cancel(NOTIFICATION_ID);
    }

    @Override
    public void onDestroy() {
        stopPlayback();
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
