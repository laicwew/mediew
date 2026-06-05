const Preview = {
  modal: null,
  image: null,
  container: null,
  imageArea: null,
  prevBtn: null,
  nextBtn: null,
  counter: null,
  isOpen: false,
  imageList: [],
  currentIndex: 0,

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
    this.isOpen = false;
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
    this.panX = 0;
    this.panY = 0;
    this.scale = 1;
    this.image.style.transform = 'translate(0px, 0px) scale(1)';
    this.image.src = `file:///${img.path.replace(/\\/g, '/')}`;
    this.updateNav();
    this.updateInfo(img);

    if (this.image.complete && this.image.naturalWidth) {
      this.onImageReady();
    } else {
      this.image.onload = () => this.onImageReady();
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
    document.getElementById('info-filename').textContent = img.name;
    document.getElementById('info-dimensions').textContent = '加载中...';
    document.getElementById('info-filesize').textContent = this.formatSize(img.size);
    document.getElementById('info-date').textContent = img.date;
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
        this.close();
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
  }
};
