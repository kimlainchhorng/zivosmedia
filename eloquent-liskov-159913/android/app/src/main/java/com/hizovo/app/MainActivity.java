package com.hizovo.app;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(PlayIntegrityPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
