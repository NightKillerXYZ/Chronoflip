package com.nightkillerxyz.chronoflip;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(ChronoFlipAlarmsPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
