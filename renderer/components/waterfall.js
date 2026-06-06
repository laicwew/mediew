const Waterfall = {
  grid: null,
  container: null,
  imageList: [],
  _generation: 0,
  zoomLevel: 1.0,
  ZOOM_MIN: 0.3,
  ZOOM_MAX: 3.0,
  ZOOM_STEP: 0.1,
  STORAGE_KEY: 'Mediew-zoom',
  _zoomIndicator: null,
  _zoomTimer: null,

  init(gridId, containerId) {
    this.grid = document.getElementById(gridId);
    this.container = document.getElementById(containerId);
    this._zoomIndicator = document.getElementById('zoom-indicator');
    this.loadZoom();
    this.setupZoom();
  },

  getBasename(filePath) {
    return filePath.replace(/^.*[\\/]/, '');
  },

  getFileURL(filePath) {
    return `file:///${filePath.split(/[\\/]/).map(encodeURIComponent).join('/')}`;
  },

  loadZoom() {
    try {
      const saved = parseFloat(localStorage.getItem(this.STORAGE_KEY));
      if (!isNaN(saved) && saved >= this.ZOOM_MIN && saved <= this.ZOOM_MAX) {
        this.zoomLevel = saved;
      }
    } catch (e) {}
  },

  saveZoom() {
    try {
      localStorage.setItem(this.STORAGE_KEY, String(this.zoomLevel));
    } catch (e) {}
  },

  setupZoom() {
    this.container.addEventListener('wheel', (e) => {
      if (!e.ctrlKey) return;
      e.preventDefault();

      const delta = e.deltaY > 0 ? -this.ZOOM_STEP : this.ZOOM_STEP;
      const newZoom = Math.round(Math.max(this.ZOOM_MIN, Math.min(this.ZOOM_MAX, this.zoomLevel + delta)) * 100) / 100;

      if (newZoom !== this.zoomLevel) {
        this.zoomLevel = newZoom;
        this.saveZoom();
        this.applyZoom();
        this.showZoomIndicator();
      }
    }, { passive: false });

    const ro = new ResizeObserver(() => {
      this.applyZoom();
    });
    ro.observe(this.container);
  },

  showZoomIndicator() {
    if (!this._zoomIndicator) return;
    this._zoomIndicator.textContent = Math.round(this.zoomLevel * 100) + '%';
    this._zoomIndicator.classList.add('visible');
    if (this._zoomTimer) clearTimeout(this._zoomTimer);
    this._zoomTimer = setTimeout(() => {
      this._zoomIndicator.classList.remove('visible');
    }, 800);
  },

  applyZoom() {
    if (!this.grid || !this.container) return;
    if (this.grid.classList.contains('hidden')) return;

    const mode = SettingsManager.getLayoutMode();
    const sortMode = SettingsManager.getSortMode();
    const containerWidth = this.container.clientWidth;

    if (sortMode === 'filename') {
      this.applyFilenameZoom();
    } else if (mode === 'grid') {
      this.applyGridZoom(containerWidth);
    } else {
      this.applyWaterfallZoom(containerWidth);
    }
  },

  applyWaterfallZoom(containerWidth) {
    const baseColumns = 3;
    const columns = Math.max(1, Math.round(baseColumns / this.zoomLevel));
    this.grid.style.columnCount = columns;
  },

  applyGridZoom(containerWidth) {
    const baseImageHeight = 200;
    const gap = 8;
    const imageHeight = Math.round(baseImageHeight * this.zoomLevel);
    const columns = Math.max(1, Math.floor((containerWidth + gap) / (imageHeight + gap)));

    this.grid.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
    this.grid.style.setProperty('--grid-image-height', imageHeight + 'px');
  },

  applyFilenameZoom() {
    const baseCardWidth = 180;
    const cardWidth = Math.round(baseCardWidth * this.zoomLevel);
    this.grid.style.setProperty('--filename-card-width', cardWidth + 'px');
  },

  async loadImages(dirPath) {
    const gen = ++this._generation;
    this.grid.innerHTML = '';
    this.imageList = [];
    this.grid.classList.remove('hidden');
    document.getElementById('welcome-screen').classList.add('hidden');

    const sortMode = SettingsManager.getSortMode();
    const sortDir = SettingsManager.getSortDir();
    const images = await window.api.readDirectory(dirPath, sortMode, sortDir);

    if (gen !== this._generation) return;

    if (images.length === 0) {
      this.grid.innerHTML = `
        <div class="empty-state" style="column-span: all;">
          <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
            <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
          </svg>
          <span>该目录下没有媒体文件</span>
        </div>
      `;
      return;
    }

    this.imageList = images;
    const isFilenameMode = sortMode === 'filename';

    if (isFilenameMode) {
      this.grid.classList.add('filename-mode');
      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        const card = this.createFilenameCard(img, i);
        this.grid.appendChild(card);
      }
    } else {
      this.grid.classList.remove('filename-mode');
      const groupLevel = SettingsManager.getGroupLevel();
      let currentGroup = '';
      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        const groupKey = img[groupLevel] || img.day || img.date;
        if (groupKey !== currentGroup) {
          currentGroup = groupKey;
          const header = document.createElement('div');
          header.className = 'date-header';
          header.textContent = groupKey;
          this.grid.appendChild(header);
        }
        const card = this.createImageCard(img, i);
        this.grid.appendChild(card);
      }
    }

    this.applyZoom();
  },

  setupDraggable(card, imageInfo) {
    card.draggable = true;
    card.dataset.path = imageInfo.path;

    card.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', imageInfo.path);
      e.dataTransfer.effectAllowed = 'move';
      card.classList.add('dragging');
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
    });
  },

  createFilenameCard(imageInfo, index) {
    const card = document.createElement('div');
    card.className = imageInfo.type === 'video' ? 'image-card filename-card video-card' : 'image-card filename-card';

    const name = document.createElement('div');
    name.className = 'image-filename';
    name.textContent = imageInfo.name;
    name.title = imageInfo.name;

    if (imageInfo.type === 'video') {
      const video = document.createElement('video');
      video.src = this.getFileURL(imageInfo.path);
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;

      const overlay = document.createElement('div');
      overlay.className = 'video-overlay';
      overlay.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';

      video.addEventListener('loadedmetadata', () => {
        const loading = card.querySelector('.image-loading');
        if (loading) loading.remove();
      });

      video.addEventListener('error', () => {
        const ext = imageInfo.name.split('.').pop().toLowerCase();
        const unsupported = ['avi', 'mkv', 'wmv', 'flv', 'm4v'];
        const errorMsg = unsupported.includes(ext) ? '格式不支持' : '加载失败';
        card.innerHTML = `
          <div class="image-filename">${imageInfo.name}</div>
          <div class="image-loading" style="min-height: 120px; color: var(--text-tertiary);">
            <span>${errorMsg}</span>
          </div>
        `;
      });

      const loading = document.createElement('div');
      loading.className = 'image-loading';
      loading.textContent = '加载中...';

      card.appendChild(name);
      card.appendChild(loading);
      card.appendChild(video);
      card.appendChild(overlay);
    } else {
      const img = document.createElement('img');
      img.src = this.getFileURL(imageInfo.path);
      img.alt = imageInfo.name;
      img.loading = 'lazy';
      img.title = imageInfo.name;

      img.addEventListener('load', () => {
        const loading = card.querySelector('.image-loading');
        if (loading) loading.remove();
      });

      img.addEventListener('error', () => {
        card.innerHTML = `
          <div class="image-filename">${imageInfo.name}</div>
          <div class="image-loading" style="min-height: 120px; color: var(--text-tertiary);">
            <span>加载失败</span>
          </div>
        `;
      });

      const loading = document.createElement('div');
      loading.className = 'image-loading';
      loading.textContent = '加载中...';

      card.appendChild(name);
      card.appendChild(loading);
      card.appendChild(img);
    }

    card.addEventListener('click', () => {
      Preview.open(this.imageList, index);
    });

    card.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      ContextMenu.show(e.clientX, e.clientY, imageInfo, true);
    });

    this.setupDraggable(card, imageInfo);
    return card;
  },

  createImageCard(imageInfo, index) {
    const card = document.createElement('div');
    card.className = imageInfo.type === 'video' ? 'image-card video-card' : 'image-card';

    if (imageInfo.type === 'video') {
      const video = document.createElement('video');
      video.src = this.getFileURL(imageInfo.path);
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;

      const overlay = document.createElement('div');
      overlay.className = 'video-overlay';
      overlay.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';

      video.addEventListener('loadedmetadata', () => {
        const loading = card.querySelector('.image-loading');
        if (loading) loading.remove();
      });

      video.addEventListener('error', () => {
        const ext = imageInfo.name.split('.').pop().toLowerCase();
        const unsupported = ['avi', 'mkv', 'wmv', 'flv', 'm4v'];
        const errorMsg = unsupported.includes(ext) ? '格式不支持' : '加载失败';
        card.innerHTML = `
          <div class="image-loading" style="min-height: 120px; color: var(--text-tertiary);">
            <span>${errorMsg}</span>
          </div>
        `;
      });

      const loading = document.createElement('div');
      loading.className = 'image-loading';
      loading.textContent = '加载中...';

      card.appendChild(loading);
      card.appendChild(video);
      card.appendChild(overlay);
    } else {
      const img = document.createElement('img');
      img.src = this.getFileURL(imageInfo.path);
      img.alt = imageInfo.name;
      img.loading = 'lazy';
      img.title = imageInfo.name;

      img.addEventListener('load', () => {
        const loading = card.querySelector('.image-loading');
        if (loading) loading.remove();
      });

      img.addEventListener('error', () => {
        card.innerHTML = `
          <div class="image-loading" style="min-height: 120px; color: var(--text-tertiary);">
            <span>加载失败</span>
          </div>
        `;
      });

      const loading = document.createElement('div');
      loading.className = 'image-loading';
      loading.textContent = '加载中...';

      card.appendChild(loading);
      card.appendChild(img);
    }

    card.addEventListener('click', () => {
      Preview.open(this.imageList, index);
    });

    const canRename = SettingsManager.getSortMode() === 'filename';
    card.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      ContextMenu.show(e.clientX, e.clientY, imageInfo, canRename);
    });

    this.setupDraggable(card, imageInfo);
    return card;
  },

  startRenameCard(imageInfo) {
    const card = document.querySelector(`.image-card[data-path="${CSS.escape(imageInfo.path)}"]`);
    if (!card) return;

    const filenameEl = card.querySelector('.image-filename');
    if (!filenameEl) return;

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'inline-rename-input';
    input.value = imageInfo.name.replace(/\.[^.]+$/, '');

    filenameEl.replaceWith(input);
    input.focus();
    input.select();

    const finishRename = async () => {
      const newName = input.value.trim();
      if (newName && newName !== imageInfo.name.replace(/\.[^.]+$/, '')) {
        App.fileOperationPending = true;
        const result = await window.api.renameFile(imageInfo.path, newName);
        if (result.success) {
          imageInfo.name = this.getBasename(result.newPath);
          imageInfo.path = result.newPath;
        } else {
          App.fileOperationPending = false;
        }
      }
      const restored = document.createElement('div');
      restored.className = 'image-filename';
      restored.textContent = imageInfo.name;
      restored.title = imageInfo.name;
      input.replaceWith(restored);
    };

    input.addEventListener('blur', finishRename);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
      if (e.key === 'Escape') { input.value = imageInfo.name.replace(/\.[^.]+$/, ''); input.blur(); }
    });
  }
};
