const ThemeManager = {
  STORAGE_KEY: 'tview-theme',

  init() {
    const saved = localStorage.getItem(this.STORAGE_KEY) || 'dark';
    this.apply(saved);

    document.getElementById('btn-theme').addEventListener('click', () => {
      this.toggle();
    });
  },

  apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(this.STORAGE_KEY, theme);
    this.updateIcon(theme);
  },

  toggle() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    this.apply(next);
  },

  updateIcon(theme) {
    const sun = document.querySelector('.icon-sun');
    const moon = document.querySelector('.icon-moon');
    if (theme === 'dark') {
      sun.style.display = '';
      moon.style.display = 'none';
    } else {
      sun.style.display = 'none';
      moon.style.display = '';
    }
  }
};

const SettingsManager = {
  STORAGE_KEY: 'tview-settings',
  LAST_DIR_KEY: 'tview-last-dir',
  modal: null,
  onLayoutChange: null,
  onSortChange: null,

  init(onLayoutChange, onSortChange) {
    this.modal = document.getElementById('settings-modal');
    this.onLayoutChange = onLayoutChange;
    this.onSortChange = onSortChange;

    document.getElementById('btn-settings').addEventListener('click', () => {
      this.open();
    });

    document.querySelector('.settings-close').addEventListener('click', () => {
      this.close();
    });

    document.querySelector('.settings-backdrop').addEventListener('click', () => {
      this.close();
    });

    document.querySelectorAll('.layout-option').forEach(btn => {
      btn.addEventListener('click', () => {
        this.setLayoutMode(btn.dataset.mode);
      });
    });

    document.querySelectorAll('.sort-option').forEach(btn => {
      btn.addEventListener('click', () => {
        this.setSortMode(btn.dataset.sort);
      });
    });

    document.querySelectorAll('.sort-dir-option').forEach(btn => {
      btn.addEventListener('click', () => {
        this.setSortDir(btn.dataset.dir);
      });
    });

    const rememberToggle = document.getElementById('setting-remember-dir');
    if (rememberToggle) {
      rememberToggle.addEventListener('change', () => {
        this.setRememberDir(rememberToggle.checked);
      });
    }

    document.addEventListener('keydown', (e) => {
      if (this.modal.classList.contains('active') && e.key === 'Escape') {
        this.close();
      }
    });

    this.load();
  },

  load() {
    try {
      const saved = JSON.parse(localStorage.getItem(this.STORAGE_KEY));
      if (saved && saved.layoutMode) {
        this.applyLayout(saved.layoutMode);
      }
      if (saved && saved.sortMode) {
        this.applySortMode(saved.sortMode);
      }
      if (saved && saved.sortDir) {
        this.applySortDir(saved.sortDir);
      }
      if (saved && saved.rememberDir !== undefined) {
        const toggle = document.getElementById('setting-remember-dir');
        if (toggle) toggle.checked = saved.rememberDir;
      }
    } catch (e) {}
  },

  open() {
    this.modal.classList.add('active');
  },

  close() {
    this.modal.classList.remove('active');
  },

  getSettings() {
    try {
      return JSON.parse(localStorage.getItem(this.STORAGE_KEY)) || { layoutMode: 'waterfall', sortMode: 'mtime', sortDir: 'desc', rememberDir: true };
    } catch (e) {
      return { layoutMode: 'waterfall', sortMode: 'mtime', sortDir: 'desc', rememberDir: true };
    }
  },

  setLayoutMode(mode) {
    const settings = this.getSettings();
    settings.layoutMode = mode;
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(settings));
    this.applyLayout(mode);
    if (this.onLayoutChange) this.onLayoutChange(mode);
  },

  setSortMode(mode) {
    const settings = this.getSettings();
    settings.sortMode = mode;
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(settings));
    this.applySortMode(mode);
    if (this.onSortChange) this.onSortChange();
  },

  setSortDir(dir) {
    const settings = this.getSettings();
    settings.sortDir = dir;
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(settings));
    this.applySortDir(dir);
    if (this.onSortChange) this.onSortChange();
  },

  setRememberDir(enabled) {
    const settings = this.getSettings();
    settings.rememberDir = enabled;
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(settings));
  },

  applyLayout(mode) {
    document.querySelectorAll('.layout-option').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });
    const grid = document.getElementById('image-grid');
    if (grid) grid.classList.toggle('grid-mode', mode === 'grid');
  },

  applySortMode(mode) {
    document.querySelectorAll('.sort-option').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.sort === mode);
    });
    const grid = document.getElementById('image-grid');
    if (grid) grid.classList.toggle('filename-mode', mode === 'filename');
  },

  applySortDir(dir) {
    document.querySelectorAll('.sort-dir-option').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.dir === dir);
    });
  },

  getLayoutMode() { return this.getSettings().layoutMode; },
  getSortMode() { return this.getSettings().sortMode; },
  getSortDir() { return this.getSettings().sortDir; },
  getRememberDir() { return this.getSettings().rememberDir; },

  saveLastDir(dirPath) { localStorage.setItem(this.LAST_DIR_KEY, dirPath); },
  getLastDir() { return localStorage.getItem(this.LAST_DIR_KEY); }
};

document.getElementById('btn-minimize').addEventListener('click', () => {
  window.api.minimizeWindow();
});

document.getElementById('btn-maximize').addEventListener('click', () => {
  window.api.maximizeWindow();
});

document.getElementById('btn-close').addEventListener('click', () => {
  window.api.closeWindow();
});

ThemeManager.init();
