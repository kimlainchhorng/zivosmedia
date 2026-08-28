package com.hizovo.app;

import android.app.Activity;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.os.Build;

import androidx.core.content.ContextCompat;
import androidx.core.content.pm.PackageInfoCompat;
import androidx.credentials.ClearCredentialStateRequest;
import androidx.credentials.CreateCredentialResponse;
import androidx.credentials.CreateRestoreCredentialRequest;
import androidx.credentials.CreateRestoreCredentialResponse;
import androidx.credentials.CredentialManager;
import androidx.credentials.CredentialManagerCallback;
import androidx.credentials.GetCredentialRequest;
import androidx.credentials.GetCredentialResponse;
import androidx.credentials.GetRestoreCredentialOption;
import androidx.credentials.RestoreCredential;
import androidx.credentials.exceptions.ClearCredentialException;
import androidx.credentials.exceptions.CreateCredentialException;
import androidx.credentials.exceptions.GetCredentialException;
import androidx.credentials.exceptions.NoCredentialException;
import androidx.credentials.exceptions.restorecredential.E2eeUnavailableException;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "RestoreCredentials")
public class RestoreCredentialsPlugin extends Plugin {
    private static final String GMS_PACKAGE_NAME = "com.google.android.gms";
    private static final long MINIMUM_GMS_VERSION = 24_220_000L;
    private static final int MAX_REQUEST_JSON_LENGTH = 262_144;

    @PluginMethod
    public void getAvailability(PluginCall call) {
        long gmsVersion = getGmsVersion();
        JSObject result = new JSObject();
        result.put("supported", Build.VERSION.SDK_INT >= Build.VERSION_CODES.P && gmsVersion >= MINIMUM_GMS_VERSION);
        result.put("androidApi", Build.VERSION.SDK_INT);
        result.put("gmsVersion", gmsVersion);
        call.resolve(result);
    }

    @PluginMethod
    public void create(PluginCall call) {
        String requestJson = getValidatedRequestJson(call);
        if (requestJson == null) return;
        if (!ensureSupported(call)) return;

        createRestoreCredential(call, requestJson, true);
    }

    @PluginMethod
    public void get(PluginCall call) {
        String requestJson = getValidatedRequestJson(call);
        if (requestJson == null) return;
        if (!ensureSupported(call)) return;

        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Restore credential activity is unavailable");
            return;
        }

        final GetCredentialRequest request;
        try {
            request = new GetCredentialRequest.Builder()
                    .addCredentialOption(new GetRestoreCredentialOption(requestJson))
                    .build();
        } catch (IllegalArgumentException error) {
            call.reject("Restore credential request is invalid");
            return;
        }

        CredentialManager.create(getContext()).getCredentialAsync(
                activity,
                request,
                null,
                ContextCompat.getMainExecutor(getContext()),
                new CredentialManagerCallback<GetCredentialResponse, GetCredentialException>() {
                    @Override
                    public void onResult(GetCredentialResponse response) {
                        if (!(response.getCredential() instanceof RestoreCredential)) {
                            call.reject("Restore credential response type is invalid");
                            return;
                        }

                        RestoreCredential credential = (RestoreCredential) response.getCredential();
                        JSObject result = new JSObject();
                        result.put("available", true);
                        result.put("responseJson", credential.getAuthenticationResponseJson());
                        call.resolve(result);
                    }

                    @Override
                    public void onError(GetCredentialException error) {
                        if (error instanceof NoCredentialException) {
                            JSObject result = new JSObject();
                            result.put("available", false);
                            call.resolve(result);
                            return;
                        }
                        call.reject("Restore credential retrieval failed");
                    }
                }
        );
    }

    @PluginMethod
    public void clear(PluginCall call) {
        if (!ensureSupported(call)) return;

        ClearCredentialStateRequest request = new ClearCredentialStateRequest(
                ClearCredentialStateRequest.TYPE_CLEAR_RESTORE_CREDENTIAL
        );
        CredentialManager.create(getContext()).clearCredentialStateAsync(
                request,
                null,
                ContextCompat.getMainExecutor(getContext()),
                new CredentialManagerCallback<Void, ClearCredentialException>() {
                    @Override
                    public void onResult(Void ignored) {
                        JSObject result = new JSObject();
                        result.put("cleared", true);
                        call.resolve(result);
                    }

                    @Override
                    public void onError(ClearCredentialException error) {
                        call.reject("Restore credential deletion failed");
                    }
                }
        );
    }

    private void createRestoreCredential(PluginCall call, String requestJson, boolean cloudBackupEnabled) {
        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Restore credential activity is unavailable");
            return;
        }

        final CreateRestoreCredentialRequest request;
        try {
            request = new CreateRestoreCredentialRequest(requestJson, cloudBackupEnabled);
        } catch (IllegalArgumentException error) {
            call.reject("Restore credential request is invalid");
            return;
        }

        CredentialManager.create(getContext()).createCredentialAsync(
                activity,
                request,
                null,
                ContextCompat.getMainExecutor(getContext()),
                new CredentialManagerCallback<CreateCredentialResponse, CreateCredentialException>() {
                    @Override
                    public void onResult(CreateCredentialResponse response) {
                        if (!(response instanceof CreateRestoreCredentialResponse)) {
                            call.reject("Restore credential response type is invalid");
                            return;
                        }

                        CreateRestoreCredentialResponse restoreResponse = (CreateRestoreCredentialResponse) response;
                        JSObject result = new JSObject();
                        result.put("responseJson", restoreResponse.getResponseJson());
                        result.put("cloudBackupEnabled", cloudBackupEnabled);
                        call.resolve(result);
                    }

                    @Override
                    public void onError(CreateCredentialException error) {
                        if (cloudBackupEnabled && error instanceof E2eeUnavailableException) {
                            createRestoreCredential(call, requestJson, false);
                            return;
                        }
                        call.reject("Restore credential creation failed");
                    }
                }
        );
    }

    private String getValidatedRequestJson(PluginCall call) {
        String requestJson = call.getString("requestJson");
        if (requestJson == null || requestJson.trim().isEmpty()) {
            call.reject("requestJson is required");
            return null;
        }
        if (requestJson.length() > MAX_REQUEST_JSON_LENGTH) {
            call.reject("requestJson is too large");
            return null;
        }
        return requestJson;
    }

    private boolean ensureSupported(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.P || getGmsVersion() < MINIMUM_GMS_VERSION) {
            call.reject("Restore Credentials is unavailable on this device");
            return false;
        }
        return true;
    }

    private long getGmsVersion() {
        try {
            PackageInfo packageInfo = getContext()
                    .getPackageManager()
                    .getPackageInfo(GMS_PACKAGE_NAME, 0);
            return PackageInfoCompat.getLongVersionCode(packageInfo);
        } catch (PackageManager.NameNotFoundException error) {
            return 0L;
        }
    }
}
