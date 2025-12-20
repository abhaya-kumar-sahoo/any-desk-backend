const { app, BrowserWindow, ipcMain, desktopCapturer } = require('electron');
const path = require('path');
const { handleRemoteInput } = require('./input');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1000,
        height: 700,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
        titleBarStyle: 'hiddenInset',
        backgroundColor: '#1e1e2e',
    });

    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

ipcMain.on('start-hosting', async (event, code) => {
    console.log(`Starting host mode for session: ${code}`);
    try {
        const sources = await desktopCapturer.getSources({ types: ['screen', 'window'] });
        console.log(`Found ${sources.length} sources.`);
        if (sources.length === 0) {
            console.warn("No screen sources found. Check permissions.");
        }
        event.reply('host-started', { sources: sources.map(s => ({ id: s.id, name: s.name })) });
    } catch (err) {
        console.error('Failed to get sources:', err);
        event.reply('error', 'Failed to access screen. Please check system permissions.');
    }
});

ipcMain.on('simulate-input', (event, data) => {
    handleRemoteInput(data);
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

