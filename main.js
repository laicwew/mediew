const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

const stateFile = path.join(__dirname, 'window-state.json');
const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];

let win;
let currentWatcher = null;
let watchedPath = null;
let debounceTimer = null;

function loadWindowState() {
  try {
    return JSON.parse(fs.readFileSync(stateFile, 'utf8'));
  } catch (e) {
    return { width: 1200, height: 800, x: undefined, y: undefined };
  }
}

function saveWindowState() {
  if (!win) return;
  const bounds = win.getBounds();
  const isMaximized = win.isMaximized();
  fs.writeFileSync(stateFile, JSON.stringify({ ...bounds, isMaximized }));
}

function createWindow() {
  const state = loadWindowState();

  win = new BrowserWindow({
    width: state.width || 1200,
    height: state.height || 800,
    x: state.x,
    y: state.y,
    frame: false,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#15202b',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (state.isMaximized) {
    win.maximize();
  }

  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  win.on('close', () => {
    stopWatching();
    saveWindowState();
  });
}

async function getImageDate(filePath) {
  try {
    const exifr = require('exifr');
    const exif = await exifr.parse(filePath, true);

    if (exif && exif.DateTimeOriginal) {
      return formatDate(exif.DateTimeOriginal);
    }
    if (exif && exif.DateTimeDigitized) {
      return formatDate(exif.DateTimeDigitized);
    }
  } catch (e) {
    // EXIF parsing failed, fall through to mtime
  }

  const stats = fs.statSync(filePath);
  return formatDate(stats.mtime);
}

function formatDate(date) {
  const d = new Date(date);
  if (isNaN(d.getTime())) {
    return '未知日期';
  }
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}年${month}月${day}日 ${hours}:${minutes}`;
}

// IPC Handlers
ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog(win, {
    properties: ['openDirectory'],
    title: '选择图片目录'
  });
  return result.canceled ? null : { path: result.filePaths[0] };
});

ipcMain.handle('read-directory', async (event, dirPath) => {
  try {
    const files = fs.readdirSync(dirPath);
    const imageFiles = files.filter(f => {
      const ext = path.extname(f).toLowerCase();
      return imageExts.includes(ext);
    });

    const images = await Promise.all(
      imageFiles.map(async (file) => {
        const filePath = path.join(dirPath, file);
        const stats = fs.statSync(filePath);
        const date = await getImageDate(filePath);
        return { name: file, path: filePath, date, size: stats.size, mtime: stats.mtimeMs };
      })
    );

    images.sort((a, b) => b.mtime - a.mtime);

    return images;
  } catch (e) {
    return [];
  }
});

ipcMain.handle('get-subfolders', async (event, dirPath) => {
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    return entries
      .filter(e => e.isDirectory() && !e.name.startsWith('.'))
      .map(e => e.name)
      .sort();
  } catch (e) {
    return [];
  }
});

// Directory watcher
function startWatching(dirPath) {
  stopWatching();

  try {
    currentWatcher = fs.watch(dirPath, (eventType) => {
      if (eventType === 'rename' || eventType === 'change') {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          if (win && !win.isDestroyed()) {
            win.webContents.send('directory-changed', dirPath);
          }
        }, 500);
      }
    });
    watchedPath = dirPath;
  } catch (e) {
    // Watch failed silently
  }
}

function stopWatching() {
  if (currentWatcher) {
    currentWatcher.close();
    currentWatcher = null;
    watchedPath = null;
  }
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
}

ipcMain.on('watch-directory', (event, dirPath) => {
  startWatching(dirPath);
});

ipcMain.on('unwatch-directory', () => {
  stopWatching();
});

// Window control handlers
ipcMain.on('window-minimize', () => win && win.minimize());
ipcMain.on('window-maximize', () => {
  if (win) {
    win.isMaximized() ? win.unmaximize() : win.maximize();
  }
});
ipcMain.on('window-close', () => win && win.close());

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
