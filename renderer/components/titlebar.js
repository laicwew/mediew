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
