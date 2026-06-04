const Preview = {
  modal: null,
  image: null,
  container: null,
  prevBtn: null,
  nextBtn: null,
  counter: null,
  isOpen: false,
  imageList: [],
  currentIndex: 0,

  scale: 1,
  panX: 0,
  panY: 0,
  isDragging: false,
  dragStartX: 0,
  dragStartY: 0,
  lastPanX: 0,
  lastPanY: 0,

  minScale: 0.5,
  maxScale: 5,
  zoomStep: 0.15,

  init() {
    this.modal = document.getElementById('preview-modal');
    this.image = document.getElementById('preview-image');
    this.container = document.querySelector('.preview-image-container');
    this.prevBtn = document.querySelector('.preview-prev');
    this.nextBtn = document.querySelector('.preview-next');
    this.counter = document.querySelector('.preview-counter');

    document.querySelector('.preview-close').addEventListener('click', () => this.close());
    document.querySelector('.preview-backdrop').addEventListener('click', () => this.close());

    this.prevBtn.addEventListener('click', (e) => { e.stopPropagation(); this.prev(); });
    this.nextBtn.addEventListener('click', (e) => { e.stopPropagation(); this.next(); });

    this.image.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
    this.image.addEventListener('mousedown', (e) => this.onMouseDown(e));
    document.addEventListener('mousemove', (e) => this.onMouseMove(e));
    document.addEventListener('mouseup', (e) => this.onMouseUp(e));

    this.image.addEventListener('dragstart', (e) => e.preventDefault());

    document.addEventListener('keydown', (e) => this.onKeyDown(e));

    this.image.addEventListener('load', () => {
      this.resetTransform();
    });
  },

  open(imageList, index) {
    this.imageList = imageList;
    this.currentIndex = index;
    this.isOpen = true;
    this.resetTransform();
    this.showImage();
    this.modal.classList.add('active');
  },

  close() {
    this.modal.classList.remove('active');
    this.image.src = '';
    this.isOpen = false;
    this.resetTransform();
  },

  showImage() {
    if (this.currentIndex < 0 || this.currentIndex >= this.imageList.length) return;
    const img = this.imageList[this.currentIndex];
    this.image.src = `file:///${img.path.replace(/\\/g, '/')}`;
    this.resetTransform();
    this.updateNav();
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

  resetTransform() {
    this.scale = 1;
    this.panX = 0;
    this.panY = 0;
    this.applyTransform();
  },

  applyTransform() {
    this.image.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.scale})`;

    if (this.scale > 1) {
      this.container.classList.add('zoomed');
    } else {
      this.container.classList.remove('zoomed');
      this.panX = 0;
      this.panY = 0;
      this.image.style.transform = `translate(0px, 0px) scale(1)`;
    }
  },

  onWheel(e) {
    if (!this.isOpen) return;
    e.preventDefault();

    const rect = this.image.getBoundingClientRect();
    const mouseX = e.clientX - rect.left - rect.width / 2;
    const mouseY = e.clientY - rect.top - rect.height / 2;

    const prevScale = this.scale;

    if (e.deltaY < 0) {
      this.scale = Math.min(this.maxScale, this.scale + this.zoomStep);
    } else {
      this.scale = Math.max(this.minScale, this.scale - this.zoomStep);
    }

    const scaleChange = this.scale / prevScale;
    this.panX = mouseX - scaleChange * (mouseX - this.panX);
    this.panY = mouseY - scaleChange * (mouseY - this.panY);

    if (this.scale <= 1) {
      this.panX = 0;
      this.panY = 0;
    }

    this.applyTransform();
  },

  onMouseDown(e) {
    if (!this.isOpen || e.button !== 0) return;
    if (this.scale <= 1) return;

    this.isDragging = true;
    this.dragStartX = e.clientX;
    this.dragStartY = e.clientY;
    this.lastPanX = this.panX;
    this.lastPanY = this.panY;
    this.container.classList.add('dragging');
  },

  onMouseMove(e) {
    if (!this.isDragging) return;

    const dx = e.clientX - this.dragStartX;
    const dy = e.clientY - this.dragStartY;

    this.panX = this.lastPanX + dx;
    this.panY = this.lastPanY + dy;

    this.applyTransform();
  },

  onMouseUp(e) {
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
        this.scale = Math.min(this.maxScale, this.scale + this.zoomStep);
        this.applyTransform();
        break;
      case '-':
        e.preventDefault();
        this.scale = Math.max(this.minScale, this.scale - this.zoomStep);
        if (this.scale <= 1) {
          this.panX = 0;
          this.panY = 0;
        }
        this.applyTransform();
        break;
      case '0':
        e.preventDefault();
        this.resetTransform();
        break;
    }
  }
};
