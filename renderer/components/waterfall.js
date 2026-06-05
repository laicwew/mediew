const Waterfall = {
  grid: null,
  container: null,
  imageList: [],

  init(gridId, containerId) {
    this.grid = document.getElementById(gridId);
    this.container = document.getElementById(containerId);
  },

  getBasename(filePath) {
    return filePath.replace(/^.*[\\/]/, '');
  },

  getFileURL(filePath) {
    return `file:///${filePath.split(/[\\/]/).map(encodeURIComponent).join('/')}`;
  },

  async loadImages(dirPath) {
    this.grid.innerHTML = '';
    this.imageList = [];
    this.grid.classList.remove('hidden');
    document.getElementById('welcome-screen').classList.add('hidden');

    const sortMode = SettingsManager.getSortMode();
    const sortDir = SettingsManager.getSortDir();
    const images = await window.api.readDirectory(dirPath, sortMode, sortDir);

    if (images.length === 0) {
      this.grid.innerHTML = `
        <div class="empty-state" style="column-span: all;">
          <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
            <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
          </svg>
          <span>该目录下没有图片</span>
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
      let currentDate = '';
      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        if (img.date !== currentDate) {
          currentDate = img.date;
          const header = document.createElement('div');
          header.className = 'date-header';
          header.textContent = `${img.date}`;
          this.grid.appendChild(header);
        }
        const card = this.createImageCard(img, i);
        this.grid.appendChild(card);
      }
    }
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
    card.className = 'image-card filename-card';

    const name = document.createElement('div');
    name.className = 'image-filename';
    name.textContent = imageInfo.name;
    name.title = imageInfo.name;

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
    card.className = 'image-card';

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
