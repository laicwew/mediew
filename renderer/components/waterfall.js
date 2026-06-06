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

  selectedPaths: new Set(),
  lastClickedIndex: -1,
  _isSelecting: false,
  _selectBox: null,
  _selectStartX: 0,
  _selectStartY: 0,
  _rubberBandCtrl: false,

  init(gridId, containerId) {
    this.grid = document.getElementById(gridId);
    this.container = document.getElementById(containerId);
    this._zoomIndicator = document.getElementById('zoom-indicator');
    this.loadZoom();
    this.setupZoom();
    this.setupSelection();
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

  setupSelection() {
    this.container.addEventListener('mousedown', (e) => {
      if (e.target.closest('.image-card')) return;
      if (e.button !== 0) return;

      this._isSelecting = true;
      this._rubberBandCtrl = e.ctrlKey;

      const containerRect = this.container.getBoundingClientRect();
      this._selectStartX = e.clientX - containerRect.left + this.container.scrollLeft;
      this._selectStartY = e.clientY - containerRect.top + this.container.scrollTop;

      if (!e.ctrlKey) {
        this.clearSelection();
      }

      this._selectBox = document.createElement('div');
      this._selectBox.className = 'selection-box';
      this.container.appendChild(this._selectBox);

      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!this._isSelecting || !this._selectBox) return;

      const containerRect = this.container.getBoundingClientRect();
      const currentX = e.clientX - containerRect.left + this.container.scrollLeft;
      const currentY = e.clientY - containerRect.top + this.container.scrollTop;

      const left = Math.min(this._selectStartX, currentX);
      const top = Math.min(this._selectStartY, currentY);
      const width = Math.abs(currentX - this._selectStartX);
      const height = Math.abs(currentY - this._selectStartY);

      this._selectBox.style.left = left + 'px';
      this._selectBox.style.top = top + 'px';
      this._selectBox.style.width = width + 'px';
      this._selectBox.style.height = height + 'px';

      this._updateRubberBandSelection(left, top, width, height);
    });

    document.addEventListener('mouseup', () => {
      if (!this._isSelecting) return;
      this._isSelecting = false;
      if (this._selectBox) {
        this._selectBox.remove();
        this._selectBox = null;
      }
    });
  },

  _updateRubberBandSelection(selLeft, selTop, selWidth, selHeight) {
    const containerRect = this.container.getBoundingClientRect();
    const allCards = this.grid.querySelectorAll('.image-card');

    allCards.forEach(card => {
      const cardRect = card.getBoundingClientRect();
      const cardLeft = cardRect.left - containerRect.left + this.container.scrollLeft;
      const cardTop = cardRect.top - containerRect.top + this.container.scrollTop;
      const cardWidth = cardRect.width;
      const cardHeight = cardRect.height;

      const intersects = !(
        selLeft > cardLeft + cardWidth ||
        selLeft + selWidth < cardLeft ||
        selTop > cardTop + cardHeight ||
        selTop + selHeight < cardTop
      );

      const path = card.dataset.path;
      if (!path) return;

      if (intersects) {
        this.selectedPaths.add(path);
        card.classList.add('selected');
      } else if (!this._rubberBandCtrl) {
        this.selectedPaths.delete(path);
        card.classList.remove('selected');
      }
    });
  },

  clearSelection() {
    this.selectedPaths.clear();
    this.lastClickedIndex = -1;
    this.grid.querySelectorAll('.image-card.selected').forEach(c => {
      c.classList.remove('selected');
    });
  },

  getSelectedImages() {
    if (this.selectedPaths.size === 0) return [];
    return this.imageList.filter(img => this.selectedPaths.has(img.path));
  },

  handleCardClick(e, index, card) {
    const path = card.dataset.path;
    if (!path) return;

    const allCards = Array.from(this.grid.querySelectorAll('.image-card'));
    const domIndex = allCards.indexOf(card);

    if (e.ctrlKey) {
      if (this.selectedPaths.has(path)) {
        this.selectedPaths.delete(path);
        card.classList.remove('selected');
      } else {
        this.selectedPaths.add(path);
        card.classList.add('selected');
      }
      this.lastClickedIndex = domIndex;
    } else if (e.shiftKey) {
      if (this.lastClickedIndex === -1) {
        this.lastClickedIndex = domIndex;
      }
      const start = Math.min(this.lastClickedIndex, domIndex);
      const end = Math.max(this.lastClickedIndex, domIndex);
      for (let i = start; i <= end; i++) {
        if (i < allCards.length) {
          const p = allCards[i].dataset.path;
          if (p) {
            this.selectedPaths.add(p);
            allCards[i].classList.add('selected');
          }
        }
      }
    } else {
      this.clearSelection();
      this.selectedPaths.add(path);
      card.classList.add('selected');
      this.lastClickedIndex = domIndex;
    }
  },

  removeCards(paths) {
    const pathSet = new Set(paths);
    paths.forEach(p => {
      const idx = this.imageList.findIndex(img => img.path === p);
      if (idx !== -1) this.imageList.splice(idx, 1);
    });

    const cards = this.grid.querySelectorAll('.image-card');
    const emptyHeaders = [];
    cards.forEach(card => {
      if (pathSet.has(card.dataset.path)) {
        const prev = card.previousElementSibling;
        card.remove();
        if (prev && prev.classList.contains('date-header')) {
          emptyHeaders.push(prev);
        }
      }
    });

    emptyHeaders.forEach(header => {
      const next = header.nextElementSibling;
      if (!next || next.classList.contains('date-header')) {
        header.remove();
      }
    });

    this.clearSelection();
  },

  async loadImages(dirPath) {
    const gen = ++this._generation;
    this.grid.innerHTML = '';
    this.imageList = [];
    this.clearSelection();
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
      if (!this.selectedPaths.has(imageInfo.path)) {
        this.clearSelection();
        this.selectedPaths.add(imageInfo.path);
        card.classList.add('selected');
      }

      const selectedPaths = Array.from(this.selectedPaths);

      if (selectedPaths.length > 1) {
        e.dataTransfer.setData('application/x-file-paths', JSON.stringify(selectedPaths));
        e.dataTransfer.setData('text/plain', selectedPaths[0]);
        selectedPaths.forEach(p => {
          const c = this.grid.querySelector(`.image-card[data-path="${CSS.escape(p)}"]`);
          if (c) c.classList.add('dragging');
        });
      } else {
        e.dataTransfer.setData('text/plain', imageInfo.path);
        card.classList.add('dragging');
      }

      e.dataTransfer.effectAllowed = 'move';
    });

    card.addEventListener('dragend', () => {
      this.grid.querySelectorAll('.image-card.dragging').forEach(c => {
        c.classList.remove('dragging');
      });
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

    card.addEventListener('click', (e) => {
      this.handleCardClick(e, index, card);
    });

    card.addEventListener('dblclick', () => {
      Preview.open(this.imageList, index);
    });

    card.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (!this.selectedPaths.has(imageInfo.path)) {
        this.clearSelection();
        this.selectedPaths.add(imageInfo.path);
        card.classList.add('selected');
      }

      const selectedImages = this.getSelectedImages();
      const canRename = SettingsManager.getSortMode() === 'filename' && selectedImages.length === 1;
      ContextMenu.show(e.clientX, e.clientY, imageInfo, canRename, selectedImages);
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

    card.addEventListener('click', (e) => {
      this.handleCardClick(e, index, card);
    });

    card.addEventListener('dblclick', () => {
      Preview.open(this.imageList, index);
    });

    card.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (!this.selectedPaths.has(imageInfo.path)) {
        this.clearSelection();
        this.selectedPaths.add(imageInfo.path);
        card.classList.add('selected');
      }

      const selectedImages = this.getSelectedImages();
      const canRename = SettingsManager.getSortMode() === 'filename' && selectedImages.length === 1;
      ContextMenu.show(e.clientX, e.clientY, imageInfo, canRename, selectedImages);
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
