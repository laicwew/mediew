# Mediew - Windows 11 Image Browser

## Overview

A modern, Twitter-inspired image browser for Windows 11 with:

- Frameless window with custom title bar
- Folder navigation tree
- Waterfall/masonry image grid
- EXIF拍摄日期 extraction
- Image preview modal

---

## Requirements

| Requirement       | Value                                             |
| ----------------- | ------------------------------------------------- |
| Technology        | Electron + HTML/CSS/JS                            |
| Window Size       | 1200x800 default, remembers last position/size    |
| Startup           | Empty welcome state (user selects folder)         |
| Image Sorting     | By date, newest first                             |
| Preview           | View only (no zoom/rotate)                        |
| Window Frame      | **Frameless** (custom title bar)                  |
| Supported Formats | jpg, jpeg, png, gif, webp, bmp                    |
| Animated GIFs     | Auto-play (native browser)                        |
| UI Theme          | Twitter dark mode                                 |
| Image Date        | EXIF拍摄日期 → fallback to file modification time |
| Date Format       | `xxxx年xx月xx日 xx:xx`                            |

---

## Project Structure

```
Mediew/
├── package.json                    # npm config + electron dependency
├── main.js                         # Electron main process
├── preload.js                      # Secure IPC bridge
├── window-state.json               # Auto-saved window position/size
├── PLAN.md                         # This file
├── renderer/
│   ├── index.html                  # Main layout structure
│   ├── styles.css                  # Twitter dark theme CSS
│   ├── app.js                      # App initialization + state management
│   ├── components/
│   │   ├── titlebar.js             # Custom frameless title bar
│   │   ├── folder-tree.js          # Left sidebar folder navigation
│   │   ├── waterfall.js            # Masonry image grid
│   │   └── preview.js              # Image preview modal
│   └── utils/
│       └── date-formatter.js       # Date formatting (EXIF + mtime)
└── assets/
    └── icon.png                    # App icon (optional)
```

---

## Dependencies

```json
{
  "dependencies": {
    "electron": "^28.0.0",
    "exifr": "^7.1.3"
  },
  "devDependencies": {
    "electron-builder": "^24.0.0"
  }
}
```

- **electron**: Desktop application framework
- **exifr**: Lightweight EXIF metadata parser
- **electron-builder**: Build/packaging tool (optional)

---

## UI Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ [─] [□] [✕]                    Mediew                           │ ← Custom title bar
├─────────────────────────────────────────────────────────────────┤
│ 📁 目录地址 (D:\__ARCHIEVE__\WebDev\Mediew)                     │ ← Clickable directory bar
├──────────┬──────────────────────────────────────────────┬───────┤
│          │  图片日期和时间 (2024年01月15日 14:30)        │       │
│ 文件夹1   │  ┌────────────┐ ┌────────────────┐          │       │
│ ├─ 子文件 │  │   image1.jpg│ │   image2.png   │          │   ●   │ ← Scrollbar
│ │  └─ 子  │  └────────────┘ │                │          │       │
│ ├─ 子文件 │  ┌────────────┐ └────────────────┘          │       │
│ │  └─ 子  │  │   image3.gif│ ┌────────────┐             │       │
│ └─ 子文件 │  │   (playing)│ │   image4.jpg│             │       │
│           │  └────────────┘ └────────────┘             │       │
│           │                                            │       │
├──────────┴────────────────────────────────────────────┴───────┤
```

---

## Implementation Phases

### Phase 1: Project Setup

1. Initialize npm project (`npm init -y`)
2. Install dependencies (`npm install electron exifr`)
3. Create basic `main.js` with BrowserWindow
4. Create `preload.js` with IPC bridges

### Phase 2: Frameless Window & Layout

1. Create `index.html` with layout structure
2. Create `styles.css` with Twitter dark theme
3. Implement custom title bar (minimize/maximize/close)
4. Save/restore window state from `window-state.json`

### Phase 3: Directory Navigation

1. Implement clickable directory bar
2. Implement folder tree sidebar
3. IPC handlers for reading directories
4. Click folder → update image grid

### Phase 4: Image Display

1. Implement waterfall/masonry grid
2. Extract EXIF拍摄日期 with fallback to mtime
3. Sort images by date (newest first)
4. Lazy loading with `loading="lazy"`

### Phase 5: Image Preview

1. Implement modal overlay
2. Click image → show preview
3. ESC / click backdrop → close preview

### Phase 6: Polish

1. Hover effects and animations
2. Custom scrollbar styling
3. Empty state welcome screen
4. Responsive column count

---

## IPC API Design

### `select-directory`

```javascript
// Renderer calls:
const result = await window.api.selectDirectory();
// Returns: { path: string } or null if cancelled

// Main process:
ipcMain.handle("select-directory", async () => {
  const result = await dialog.showOpenDialog(win, {
    properties: ["openDirectory"],
  });
  return result.canceled ? null : { path: result.filePaths[0] };
});
```

### `read-directory`

```javascript
// Renderer calls:
const images = await window.api.readDirectory(dirPath);
// Returns: FileInfo[] sorted by date, newest first

// FileInfo structure:
{
  name: "photo.jpg",
  path: "D:\\photos\\photo.jpg",
  date: "2024年01月15日 14:30"
}
```

### `get-subfolders`

```javascript
// Renderer calls:
const folders = await window.api.getSubfolders(dirPath);
// Returns: string[] (folder names)
```

### Window Controls

```javascript
window.api.minimizeWindow();
window.api.maximizeWindow();
window.api.closeWindow();
```

---

## Image Date Extraction Logic

```javascript
async function getImageDate(filePath) {
  try {
    // 1. Try EXIF DateTimeOriginal (拍摄日期)
    const exif = await exifr.parse(filePath, true);

    if (exif?.DateTimeOriginal) {
      return formatDate(exif.DateTimeOriginal);
    }

    // 2. Try EXIF DateTimeDigitized (数字化日期)
    if (exif?.DateTimeDigitized) {
      return formatDate(exif.DateTimeDigitized);
    }
  } catch (e) {
    // EXIF parsing failed, fall through
  }

  // 3. Fallback: file modification time
  const stats = fs.statSync(filePath);
  return formatDate(stats.mtime);
}

function formatDate(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${year}年${month}月${day}日 ${hours}:${minutes}`;
}
```

---

## Twitter Dark Theme Colors

```css
:root {
  --bg-primary: #15202b;
  --bg-secondary: #192734;
  --bg-card: #1e2d3d;
  --text-primary: #ffffff;
  --text-secondary: #8b98a5;
  --accent-blue: #1d9bf0;
  --border-color: #38444d;
  --hover-bg: #1c2938;
  --scrollbar-thumb: #536471;
}
```

---

## Key CSS Patterns

### Frameless Window (draggable title bar)

```css
#titlebar {
  height: 32px;
  background: var(--bg-secondary);
  display: flex;
  align-items: center;
  justify-content: space-between;
  -webkit-app-region: drag;
  padding: 0 8px;
}

#titlebar button {
  -webkit-app-region: no-drag;
}
```

### Waterfall Layout

```css
#image-grid {
  column-count: 3;
  column-gap: 12px;
  padding: 16px;
  overflow-y: auto;
}

.image-card {
  break-inside: avoid;
  margin-bottom: 12px;
  background: var(--bg-card);
  border-radius: 12px;
  overflow: hidden;
}
```

### Custom Scrollbar

```css
::-webkit-scrollbar {
  width: 8px;
}
::-webkit-scrollbar-track {
  background: var(--bg-primary);
}
::-webkit-scrollbar-thumb {
  background: var(--scrollbar-thumb);
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
  background: #6e7b88;
}
```

### Preview Modal

```css
#preview-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: none;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

#preview-modal.active {
  display: flex;
}

.preview-content {
  position: relative;
  max-width: 90vw;
  max-height: 90vh;
}

.preview-content img {
  max-width: 90vw;
  max-height: 85vh;
  object-fit: contain;
  border-radius: 4px;
}
```

---

## Window State Persistence

```javascript
// main.js - Save/restore window state
const stateFile = path.join(__dirname, "window-state.json");

function loadWindowState() {
  try {
    return JSON.parse(fs.readFileSync(stateFile, "utf8"));
  } catch (e) {
    return { width: 1200, height: 800, x: undefined, y: undefined };
  }
}

function saveWindowState(win) {
  const bounds = win.getBounds();
  const isMaximized = win.isMaximized();
  fs.writeFileSync(stateFile, JSON.stringify({ ...bounds, isMaximized }));
}

// On app quit
win.on("close", () => saveWindowState(win));
```

---

## Notes

- GIF auto-play works natively in `<img>` tags - no extra code needed
- Use `loading="lazy"` for deferred image loading
- Frameless window requires `contextIsolation: true` for security
- EXIF parsing may fail for some image types - always fallback to mtime
