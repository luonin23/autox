package com.fold7.agent.shell;

import android.Manifest;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.os.StrictMode;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;

public class MainActivity extends Activity {
    private static final int REQ_STORAGE = 7001;
    private static final String TARGET_DIR = "/AutoX/fold7-agent/autojs-scripts";

    private TextView statusView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        StrictMode.setVmPolicy(new StrictMode.VmPolicy.Builder().build());
        buildUi();
        ensurePermissionThenInstall();
    }

    private void buildUi() {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(44, 56, 44, 44);
        root.setBackgroundColor(Color.rgb(244, 242, 236));

        TextView title = new TextView(this);
        title.setText("Fold7 Agent");
        title.setTextColor(Color.rgb(36, 35, 31));
        title.setTextSize(30);
        title.setGravity(Gravity.LEFT);
        title.setTypeface(null, 1);
        root.addView(title);

        TextView subtitle = new TextView(this);
        subtitle.setText("AutoX.js launcher shell");
        subtitle.setTextColor(Color.rgb(113, 111, 104));
        subtitle.setTextSize(15);
        subtitle.setPadding(0, 10, 0, 34);
        root.addView(subtitle);

        statusView = new TextView(this);
        statusView.setText("Preparing scripts...");
        statusView.setTextColor(Color.rgb(47, 125, 98));
        statusView.setTextSize(16);
        statusView.setPadding(0, 0, 0, 28);
        root.addView(statusView);

        Button launch = new Button(this);
        launch.setText("Launch in AutoX");
        launch.setTextColor(Color.WHITE);
        launch.setBackgroundColor(Color.rgb(47, 125, 98));
        launch.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                installAndLaunch();
            }
        });
        root.addView(launch);

        TextView note = new TextView(this);
        note.setText("This shell copies the Fold7 AutoX scripts to shared storage and opens main.js in AutoX. AutoX.js must be installed on the device.");
        note.setTextColor(Color.rgb(113, 111, 104));
        note.setTextSize(13);
        note.setPadding(0, 28, 0, 0);
        root.addView(note);

        setContentView(root);
    }

    private void ensurePermissionThenInstall() {
        if (android.os.Build.VERSION.SDK_INT >= 23 &&
                checkSelfPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[] {
                    Manifest.permission.WRITE_EXTERNAL_STORAGE,
                    Manifest.permission.READ_EXTERNAL_STORAGE
            }, REQ_STORAGE);
            return;
        }
        installAndLaunch();
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQ_STORAGE) {
            installAndLaunch();
        }
    }

    private void installAndLaunch() {
        try {
            File target = getTargetDir();
            copyAssetDir("autojs-scripts", target);
            statusView.setText("Scripts installed: " + target.getAbsolutePath());
            launchAutoX(new File(target, "main.js"));
        } catch (Exception e) {
            statusView.setText("Install failed: " + e.getMessage());
            statusView.setTextColor(Color.rgb(177, 74, 66));
        }
    }

    private File getTargetDir() {
        return new File(Environment.getExternalStorageDirectory(), TARGET_DIR);
    }

    private void launchAutoX(File mainFile) {
        Intent intent = new Intent(Intent.ACTION_VIEW);
        intent.setDataAndType(Uri.fromFile(mainFile), "application/x-javascript");
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            startActivity(intent);
        } catch (ActivityNotFoundException e) {
            statusView.setText("AutoX.js is not installed or cannot open JavaScript files.");
            statusView.setTextColor(Color.rgb(177, 74, 66));
        }
    }

    private void copyAssetDir(String assetPath, File destDir) throws IOException {
        String[] children = getAssets().list(assetPath);
        if (children == null || children.length == 0) {
            copyAssetFile(assetPath, destDir);
            return;
        }
        if (!destDir.exists() && !destDir.mkdirs()) {
            throw new IOException("Cannot create " + destDir.getAbsolutePath());
        }
        for (String child : children) {
            copyAssetDir(assetPath + "/" + child, new File(destDir, child));
        }
    }

    private void copyAssetFile(String assetPath, File destFile) throws IOException {
        File parent = destFile.getParentFile();
        if (parent != null && !parent.exists() && !parent.mkdirs()) {
            throw new IOException("Cannot create " + parent.getAbsolutePath());
        }
        InputStream in = getAssets().open(assetPath);
        OutputStream out = new FileOutputStream(destFile);
        byte[] buf = new byte[8192];
        int len;
        while ((len = in.read(buf)) > 0) {
            out.write(buf, 0, len);
        }
        out.close();
        in.close();
    }
}
