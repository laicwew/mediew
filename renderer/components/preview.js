const Preview = {
  modal: null,
  image: null,
  video: null,
  container: null,
  imageArea: null,
  prevBtn: null,
  nextBtn: null,
  counter: null,
  isOpen: false,
  imageList: [],
  currentIndex: 0,
  isVideo: false,
  lastToggleTime: 0,

  scale: 1,
  fitScale: 1,
  maxScale: 2,
  panX: 0,
  panY: 0,
  isDragging: false,
  dragStartX: 0,
  dragStartY: 0,
  lastPanX: 0,
  lastPanY: 0,

  init() {
    this.modal = document.getElementById('preview-modal');
    this.image = document.getElementById('preview-image');
    this.video = document.getElementById('preview-video');
    this.imageArea = document.querySelector('.preview-image-area');
    this.container = document.querySelector('.preview-image-container');
    this.prevBtn = document.querySelector('.preview-prev');
    this.nextBtn = document.querySelector('.preview-next');
    this.counter = document.querySelector('.preview-counter');

    document.querySelector('.preview-close').addEventListener('click', () => this.close());

    this.imageArea.addEventListener('click', (e) => {
      if (e.target === this.imageArea || e.target === this.container) {
        this.close();
      }
    });

    this.prevBtn.addEventListener('click', (e) => { e.stopPropagation(); this.prev(); });
    this.nextBtn.addEventListener('click', (e) => { e.stopPropagation(); this.next(); });

    this.container.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
    this.container.addEventListener('mousedown', (e) => this.onMouseDown(e));
    document.addEventListener('mousemove', (e) => this.onMouseMove(e));
    document.addEventListener('mouseup', () => this.onMouseUp());
    this.container.addEventListener('dblclick', (e) => this.onDblClick(e));

    this.image.addEventListener('dragstart', (e) => e.preventDefault());
    document.addEventListener('keydown', (e) => this.onKeyDown(e));

    const filenameEl = document.getElementById('info-filename');
    filenameEl.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      this.startRename();
    });

    this.imageArea.addEventListener('contextmenu', (e) => {
      if (!this.isOpen) return;
      e.preventDefault();
      e.stopPropagation();
      const img = this.imageList[this.currentIndex];
      if (img) {
        const canRename = SettingsManager.getSortMode() === 'filename';
        ContextMenu.show(e.clientX, e.clientY, img, canRename);
      }
    });

    this.initVideoPlayer();
  },

  initVideoPlayer() {
    const playBtn = document.getElementById('video-play');
    const progressContainer = document.getElementById('video-progress-container');
    const progressBar = document.getElementById('video-progress');
    const timeDisplay = document.getElementById('video-time');
    const volumeBtn = document.getElementById('video-volume-btn');
    const volumeSlider = document.getElementById('video-volume-slider');

    playBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.togglePlay();
    });

    this.video.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.togglePlay();
    });

    this.video.addEventListener('mousedown', (e) => {
      e.stopPropagation();
    });

    this.video.addEventListener('timeupdate', () => {
      const progress = (this.video.currentTime / this.video.duration) * 100;
      progressBar.style.width = `${progress}%`;
      timeDisplay.textContent = `${this.formatTime(this.video.currentTime)} / ${this.formatTime(this.video.duration)}`;
    });

    this.video.addEventListener('ended', () => {
      playBtn.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
    });

    progressContainer.addEventListener('click', (e) => {
      e.stopPropagation();
      const rect = progressContainer.getBoundingClientRect();
      const pos = (e.clientX - rect.left) / rect.width;
      this.video.currentTime = pos * this.video.duration;
    });

    let isDraggingProgress = false;

    progressContainer.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      e.preventDefault();
      isDraggingProgress = true;
      this.seekToPosition(e, progressContainer);
    });

    document.addEventListener('mousemove', (e) => {
      if (isDraggingProgress) {
        e.preventDefault();
        this.seekToPosition(e, progressContainer);
      }
    });

    document.addEventListener('mouseup', () => {
      isDraggingProgress = false;
    });

    volumeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.video.muted = !this.video.muted;
      this.updateVolumeIcon();
    });

    volumeSlider.addEventListener('input', (e) => {
      e.stopPropagation();
      this.video.volume = e.target.value;
      this.video.muted = e.target.value === 0;
      this.updateVolumeIcon();
    });

    this.video.addEventListener('volumechange', () => {
      volumeSlider.value = this.video.muted ? 0 : this.video.volume;
      this.updateVolumeIcon();
    });
  },

  togglePlay() {
    const now = Date.now();
    if (now - this.lastToggleTime < 100) return;
    this.lastToggleTime = now;

    const playBtn = document.getElementById('video-play');
    if (this.video.paused) {
      this.video.play();
      playBtn.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';
    } else {
      this.video.pause();
      playBtn.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
    }
  },

  toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      this.video.requestFullscreen();
    }
  },

  updateVolumeIcon() {
    const volumeBtn = document.getElementById('video-volume-btn');
    if (this.video.muted || this.video.volume === 0) {
      volumeBtn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>';
    } else if (this.video.volume < 0.5) {
      volumeBtn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z"/></svg>';
    } else {
      volumeBtn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>';
    }
  },

  seekToPosition(e, progressContainer) {
    const rect = progressContainer.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    this.video.currentTime = pos * this.video.duration;
  },

  formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  },

  getViewSize() {
    const panel = document.querySelector('.preview-info-panel');
    const panelW = panel ? panel.offsetWidth : 0;
    return { w: window.innerWidth - panelW, h: window.innerHeight };
  },

  calcScales() {
    const nW = this.image.naturalWidth;
    const nH = this.image.naturalHeight;
    if (!nW || !nH) return;

    const { w: vW, h: vH } = this.getViewSize();

    if (nW >= nH) {
      this.fitScale = vW / nW;
      this.maxScale = vH / nH;
    } else {
      this.fitScale = vH / nH;
      this.maxScale = vW / nW;
    }

    if (this.fitScale > 1) this.fitScale = 1;
    if (this.maxScale < this.fitScale) this.maxScale = this.fitScale;
  },

  clampPan() {
    const nW = this.image.naturalWidth;
    const nH = this.image.naturalHeight;
    const displayW = nW * this.scale;
    const displayH = nH * this.scale;
    const { w: vW, h: vH } = this.getViewSize();

    const maxPanX = Math.max(0, (displayW - vW) / 2);
    const maxPanY = Math.max(0, (displayH - vH) / 2);

    this.panX = Math.max(-maxPanX, Math.min(maxPanX, this.panX));
    this.panY = Math.max(-maxPanY, Math.min(maxPanY, this.panY));
  },

  applyTransform(animate) {
    if (animate) {
      this.image.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)';
    } else {
      this.image.style.transition = 'none';
    }

    this.image.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.scale})`;

    this.container.classList.toggle('zoomed', this.scale > this.fitScale + 0.01);
  },

  zoomTo(target, animate) {
    const oldScale = this.scale;
    this.scale = Math.max(0.05, Math.min(this.maxScale * 2, target));

    const { w: vW, h: vH } = this.getViewSize();
    const cx = vW / 2;
    const cy = vH / 2;

    if (oldScale > 0) {
      this.panX = cx - (cx - this.panX) * this.scale / oldScale;
      this.panY = cy - (cy - this.panY) * this.scale / oldScale;
    }

    this.clampPan();
    this.applyTransform(animate);
  },

  open(imageList, index) {
    this.imageList = imageList;
    this.currentIndex = index;
    this.isOpen = true;
    this.panX = 0;
    this.panY = 0;
    this.scale = 1;
    this.showImage();
    this.modal.classList.add('active');
  },

  close() {
    this.modal.classList.remove('active');
    this.image.src = '';
    this.image.classList.remove('loaded');
    this.video.src = '';
    this.video.pause();
    this.container.classList.remove('video-mode');
    document.getElementById('video-controls').classList.remove('active');
    this.isOpen = false;
    this.isVideo = false;
    this.scale = 1;
    this.fitScale = 1;
    this.panX = 0;
    this.panY = 0;
  },

  showImage() {
    if (this.currentIndex < 0 || this.currentIndex >= this.imageList.length) return;
    const img = this.imageList[this.currentIndex];
    this.image.classList.remove('loaded');
    this.image.style.transition = 'none';
    this.video.style.display = 'none';
    document.getElementById('video-controls').classList.remove('active');
    this.panX = 0;
    this.panY = 0;
    this.scale = 1;
    this.image.style.transform = 'translate(0px, 0px) scale(1)';
    this.isVideo = img.type === 'video';

    if (this.isVideo) {
      this.image.style.display = 'none';
      this.video.style.display = 'block';
      this.container.classList.add('video-mode');
      document.getElementById('video-controls').classList.add('active');
      document.getElementById('video-play').innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
      document.getElementById('video-progress').style.width = '0%';
      document.getElementById('video-time').textContent = '0:00 / 0:00';
      this.video.src = `file:///${img.path.split(/[\\/]/).map(encodeURIComponent).join('/')}`;
      this.video.load();
      this.updateNav();
      this.updateInfo(img);

      this.video.onloadedmetadata = () => {
        document.getElementById('info-dimensions').textContent =
          `${this.video.videoWidth} × ${this.video.videoHeight} px`;
        this.video.currentTime = 0;
      };
    } else {
      this.image.style.display = 'block';
      this.container.classList.remove('video-mode');
      this.image.src = `file:///${img.path.split(/[\\/]/).map(encodeURIComponent).join('/')}`;
      this.updateNav();
      this.updateInfo(img);

      if (this.image.complete && this.image.naturalWidth) {
        this.onImageReady();
      } else {
        this.image.onload = () => this.onImageReady();
      }
    }
  },

  onImageReady() {
    this.calcScales();
    this.scale = this.fitScale;
    this.panX = 0;
    this.panY = 0;
    this.image.classList.add('loaded');
    this.applyTransform(false);

    const img = this.imageList[this.currentIndex];
    if (img) {
      document.getElementById('info-dimensions').textContent =
        `${this.image.naturalWidth} × ${this.image.naturalHeight} px`;
    }
  },

  updateInfo(img) {
    const filenameEl = document.getElementById('info-filename');
    filenameEl.textContent = img.name;
    filenameEl.title = img.name;
    document.getElementById('info-dimensions').textContent = '加载中...';
    document.getElementById('info-filesize').textContent = this.formatSize(img.size);
    document.getElementById('info-date').textContent = img.date;
    const infoTitle = document.querySelector('.info-title');
    if (infoTitle) {
      infoTitle.textContent = img.type === 'video' ? '视频信息' : '图片信息';
    }
  },

  formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  },

  updateNav() {
    this.prevBtn.disabled = this.currentIndex <= 0;
    this.nextBtn.disabled = this.currentIndex >= this.imageList.length - 1;
    this.counter.textContent = `${this.currentIndex + 1} / ${this.imageList.length}`;
  },

  prev() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.showImage();
    }
  },

  next() {
    if (this.currentIndex < this.imageList.length - 1) {
      this.currentIndex++;
      this.showImage();
    }
  },

  onDblClick(e) {
    if (!this.isOpen) return;
    e.preventDefault();
    e.stopPropagation();

    if (this.isVideo) {
      this.toggleFullscreen();
      return;
    }

    const rect = this.container.getBoundingClientRect();
    const cx = e.clientX - rect.left - rect.width / 2;
    const cy = e.clientY - rect.top - rect.height / 2;

    const midScale = (this.fitScale + this.maxScale) / 2;
    const target = this.scale > midScale ? this.fitScale : this.maxScale;

    const oldScale = this.scale;
    this.scale = Math.max(0.05, Math.min(this.maxScale * 2, target));

    this.panX = cx - (cx - this.panX) * this.scale / oldScale;
    this.panY = cy - (cy - this.panY) * this.scale / oldScale;

    this.clampPan();
    this.applyTransform(true);
  },

  onWheel(e) {
    if (!this.isOpen) return;
    e.preventDefault();

    const rect = this.container.getBoundingClientRect();
    const cx = e.clientX - rect.left - rect.width / 2;
    const cy = e.clientY - rect.top - rect.height / 2;

    const oldScale = this.scale;
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    this.scale = Math.max(0.05, Math.min(this.maxScale * 2, this.scale * factor));

    this.panX = cx - (cx - this.panX) * this.scale / oldScale;
    this.panY = cy - (cy - this.panY) * this.scale / oldScale;

    this.clampPan();
    this.applyTransform(false);
  },

  onMouseDown(e) {
    if (!this.isOpen || e.button !== 0) return;
    if (this.isVideo) return;

    this.isDragging = true;
    this.dragStartX = e.clientX;
    this.dragStartY = e.clientY;
    this.lastPanX = this.panX;
    this.lastPanY = this.panY;
    this.container.classList.add('dragging');
    this.image.style.transition = 'none';
  },

  onMouseMove(e) {
    if (!this.isDragging) return;

    this.panX = this.lastPanX + (e.clientX - this.dragStartX);
    this.panY = this.lastPanY + (e.clientY - this.dragStartY);
    this.clampPan();
    this.applyTransform(false);
  },

  onMouseUp() {
    if (!this.isDragging) return;
    this.isDragging = false;
    this.container.classList.remove('dragging');
  },

  onKeyDown(e) {
    if (!this.isOpen) return;

    if (this.isVideo && !document.fullscreenElement) {
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          this.video.currentTime = Math.max(0, this.video.currentTime - 5);
          break;
        case 'ArrowRight':
          e.preventDefault();
          this.video.currentTime = Math.min(this.video.duration, this.video.currentTime + 5);
          break;
        case 'Escape':
          this.close();
          break;
        case ' ':
          e.preventDefault();
          this.togglePlay();
          break;
      }
      return;
    }

    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        this.prev();
        break;
      case 'ArrowRight':
        e.preventDefault();
        this.next();
        break;
      case 'Escape':
        if (document.fullscreenElement) {
          document.exitFullscreen();
        } else {
          this.close();
        }
        break;
      case '+':
      case '=':
        e.preventDefault();
        this.zoomTo(this.scale * 1.2, false);
        break;
      case '-':
        e.preventDefault();
        this.zoomTo(this.scale / 1.2, false);
        break;
      case '0':
        e.preventDefault();
        this.zoomTo(this.fitScale, true);
        break;
    }
  },

  startRename() {
    if (!this.isOpen) return;
    const img = this.imageList[this.currentIndex];
    if (!img) return;

    const filenameEl = document.getElementById('info-filename');
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'inline-rename-input';
    input.value = img.name.replace(/\.[^.]+$/, '');

    filenameEl.replaceWith(input);
    input.focus();
    input.select();

    const finishRename = async () => {
      const newName = input.value.trim();
      if (newName && newName !== img.name.replace(/\.[^.]+$/, '')) {
        App.fileOperationPending = true;
        const result = await window.api.renameFile(img.path, newName);
        if (result.success) {
          img.name = result.newPath.replace(/^.*[\\/]/, '');
          img.path = result.newPath;
          Waterfall.imageList[this.currentIndex] = img;
        } else {
          App.fileOperationPending = false;
        }
      }
      const restored = document.createElement('span');
      restored.className = 'info-value';
      restored.id = 'info-filename';
      restored.textContent = img.name;
      restored.title = img.name;
      input.replaceWith(restored);
      restored.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        this.startRename();
      });
    };

    input.addEventListener('blur', finishRename);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
      if (e.key === 'Escape') { input.value = img.name.replace(/\.[^.]+$/, ''); input.blur(); }
    });
    input.addEventListener('click', (e) => e.stopPropagation());
  }
};
