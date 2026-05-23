const { app, BrowserWindow, shell } = require("electron");

const STORE_ID = "a914b90d-c249-4794-ba5e-3fdac0deed44";
const DEFAULT_LOCAL_URL = `http://localhost:8081/desktop/auto-repair/${STORE_ID}`;
const DEFAULT_PRODUCTION_URL = `https://hizivo.com/desktop/auto-repair/${STORE_ID}`;

const getDashboardUrl = () => {
  const cliUrl = process.argv.find((arg) => arg.startsWith("--zivo-url="))?.slice("--zivo-url=".length);
  return process.env.ZIVO_AUTO_REPAIR_URL || cliUrl || DEFAULT_LOCAL_URL;
};

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 1024,
    minHeight: 700,
    title: "ZIVO Auto Repair Software",
    backgroundColor: "#ffffff",
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.removeMenu();
  win.setTitle("ZIVO Auto Repair Software");
  win.once("ready-to-show", () => win.show());

  win.webContents.on("page-title-updated", (event) => {
    event.preventDefault();
    win.setTitle("ZIVO Auto Repair Software");
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  win.loadURL(getDashboardUrl());

  win.webContents.on("did-fail-load", (_event, _errorCode, _errorDescription, validatedUrl) => {
    if (validatedUrl === DEFAULT_LOCAL_URL && DEFAULT_PRODUCTION_URL !== DEFAULT_LOCAL_URL) {
      win.loadURL(DEFAULT_PRODUCTION_URL);
    }
  });
}

app.setName("ZIVO Auto Repair Software");

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
