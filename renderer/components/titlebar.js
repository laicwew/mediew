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
  modal: null,
  onLayoutChange: null,

  init(onLayoutChange) {
    this.modal = document.getElementById('settings-modal');
    this.onLayoutChange = onLayoutChange;

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
      return JSON.parse(localStorage.getItem(this.STORAGE_KEY)) || { layoutMode: 'waterfall' };
    } catch (e) {
      return { layoutMode: 'waterfall' };
    }
  },

  setLayoutMode(mode) {
    const settings = this.getSettings();
    settings.layoutMode = mode;
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(settings));
    this.applyLayout(mode);

    if (this.onLayoutChange) {
      this.onLayoutChange(mode);
    }
  },

  applyLayout(mode) {
    document.querySelectorAll('.layout-option').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });

    const grid = document.getElementById('image-grid');
    if (grid) {
      grid.classList.toggle('grid-mode', mode === 'grid');
    }
  },

  getLayoutMode() {
    return this.getSettings().layoutMode;
  }
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
