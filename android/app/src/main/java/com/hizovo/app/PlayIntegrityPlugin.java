package com.hizovo.app;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.play.core.integrity.IntegrityManagerFactory;
import com.google.android.play.core.integrity.IntegrityTokenRequest;

@CapacitorPlugin(name = "PlayIntegrity")
public class PlayIntegrityPlugin extends Plugin {

    @PluginMethod
    public void requestToken(PluginCall call) {
        String nonce = call.getString("nonce");
        if (nonce == null || nonce.isEmpty()) {
            call.reject("nonce is required");
            return;
        }

        var integrityManager = IntegrityManagerFactory.create(getContext());
        var request = IntegrityTokenRequest.builder()
                .setNonce(nonce)
                .build();

        integrityManager.requestIntegrityToken(request)
                .addOnSuccessListener(response -> {
                    JSObject result = new JSObject();
                    result.put("token", response.token());
                    call.resolve(result);
                })
                .addOnFailureListener(e -> call.reject("Integrity check failed: " + e.getMessage()));
    }
}
