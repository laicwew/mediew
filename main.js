const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');

const stateFile = path.join(__dirname, 'window-state.json');
const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
const videoExts = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.wmv'];
const mediaExts = [...imageExts, ...videoExts];

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
    icon: path.join(__dirname, 'build', 'icon.ico'),
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
      return buildDateInfo(exif.DateTimeOriginal);
    }
    if (exif && exif.DateTimeDigitized) {
      return buildDateInfo(exif.DateTimeDigitized);
    }
  } catch (e) {
    // EXIF parsing failed, fall through to mtime
  }

  const stats = fs.statSync(filePath);
  return buildDateInfo(stats.mtime);
}

function buildDateInfo(date) {
  const d = new Date(date);
  if (isNaN(d.getTime())) {
    return { date: '未知日期', year: '', month: '', day: '', hour: '' };
  }
  const year = String(d.getFullYear());
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return {
    date: `${year}年${month}月${day}日 ${hours}:${minutes}`,
    year: `${year}年`,
    month: `${year}年${month}月`,
    day: `${year}年${month}月${day}日`,
    hour: `${year}年${month}月${day}日 ${hours}:00`
  };
}

// IPC Handlers
ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog(win, {
    properties: ['openDirectory'],
    title: '选择媒体目录'
  });
  return result.canceled ? null : { path: result.filePaths[0] };
});

ipcMain.handle('read-directory', async (event, dirPath, sortMode, sortDir) => {
  try {
    const files = fs.readdirSync(dirPath);
    const mediaFiles = files.filter(f => {
      const ext = path.extname(f).toLowerCase();
      return mediaExts.includes(ext);
    });

    const media = await Promise.all(
      mediaFiles.map(async (file) => {
        const filePath = path.join(dirPath, file);
        const stats = fs.statSync(filePath);
        const ext = path.extname(file).toLowerCase();
        const type = videoExts.includes(ext) ? 'video' : 'image';
        const dateInfo = await getImageDate(filePath);
        return { name: file, path: filePath, size: stats.size, mtime: stats.mtimeMs, type, ...dateInfo };
      })
    );

    if (sortMode === 'filename') {
      if (sortDir === 'asc') {
        media.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN', { numeric: true }));
      } else {
        media.sort((a, b) => b.name.localeCompare(a.name, 'zh-CN', { numeric: true }));
      }
    } else {
      if (sortDir === 'desc') {
        media.sort((a, b) => b.mtime - a.mtime);
      } else {
        media.sort((a, b) => a.mtime - b.mtime);
      }
    }

    return media;
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
        }, 1500);
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

// File operation handlers
ipcMain.handle('delete-file', async (event, filePath) => {
  const result = await dialog.showMessageBox(win, {
    type: 'warning',
    buttons: ['删除', '取消'],
    defaultId: 1,
    title: '确认删除',
    message: `确定要删除这个文件吗？`,
    detail: path.basename(filePath)
  });
  if (result.response !== 0) return { success: false };
  try {
    await shell.trashItem(filePath);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('delete-files', async (event, filePaths) => {
  const result = await dialog.showMessageBox(win, {
    type: 'warning',
    buttons: ['删除', '取消'],
    defaultId: 1,
    title: '确认删除',
    message: `确定要删除这 ${filePaths.length} 个文件吗？`,
    detail: filePaths.map(p => path.basename(p)).join('\n')
  });
  if (result.response !== 0) return { success: false };

  let successCount = 0;
  for (const filePath of filePaths) {
    try {
      await shell.trashItem(filePath);
      successCount++;
    } catch (e) {
      // skip failed files
    }
  }
  return { success: successCount > 0, successCount };
});

ipcMain.handle('rename-file', async (event, filePath, newName) => {
  try {
    const dir = path.dirname(filePath);
    const ext = path.extname(filePath);
    const nameWithoutExt = newName.includes('.') ? newName.replace(/\.[^.]+$/, '') : newName;
    const finalName = nameWithoutExt + ext;
    const newPath = path.join(dir, finalName);

    if (filePath === newPath) return { success: true, newPath: filePath };
    if (fs.existsSync(newPath)) return { success: false, error: '文件已存在' };

    fs.renameSync(filePath, newPath);
    return { success: true, newPath };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('move-file', async (event, filePath, destDir) => {
  try {
    const fileName = path.basename(filePath);
    const destPath = path.join(destDir, fileName);
    if (fs.existsSync(destPath)) return { success: false, error: '目标文件夹已存在同名文件' };
    fs.renameSync(filePath, destPath);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// Folder operation handlers
ipcMain.handle('create-folder', async (event, parentDir, folderName) => {
  try {
    const newPath = path.join(parentDir, folderName);
    if (fs.existsSync(newPath)) return { success: false, error: '文件夹已存在' };
    fs.mkdirSync(newPath);
    return { success: true, path: newPath };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('delete-folder', async (event, dirPath) => {
  const result = await dialog.showMessageBox(win, {
    type: 'warning',
    buttons: ['删除', '取消'],
    defaultId: 1,
    title: '确认删除文件夹',
    message: `确定要删除这个文件夹吗？`,
    detail: `${dirPath}\n\n文件夹内的所有内容都将被删除，此操作不可撤销。`
  });
  if (result.response !== 0) return { success: false };
  try {
    fs.rmSync(dirPath, { recursive: true, force: true });
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('rename-folder', async (event, dirPath, newName) => {
  try {
    const parentDir = path.dirname(dirPath);
    const newPath = path.join(parentDir, newName);
    if (dirPath === newPath) return { success: true, newPath: dirPath };
    if (fs.existsSync(newPath)) return { success: false, error: '文件夹已存在' };
    fs.renameSync(dirPath, newPath);
    return { success: true, newPath };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('move-folder', async (event, srcPath, destDir) => {
  try {
    const folderName = path.basename(srcPath);
    const destPath = path.join(destDir, folderName);
    if (srcPath === destPath) return { success: false, error: '不能移动到自身' };
    if (fs.existsSync(destPath)) return { success: false, error: '目标文件夹已存在同名文件夹' };
    fs.renameSync(srcPath, destPath);
    return { success: true, newPath: destPath };
  } catch (e) {
    return { success: false, error: e.message };
  }
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
