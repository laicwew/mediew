const ContextMenu = {
  el: null,
  renameBtn: null,
  deleteBtn: null,
  currentImageInfo: null,
  _targetImages: [],

  init() {
    this.el = document.getElementById('context-menu');
    this.renameBtn = this.el.querySelector('[data-action="rename"]');
    this.deleteBtn = this.el.querySelector('[data-action="delete"]');

    this.renameBtn.addEventListener('click', () => this.onRename());
    this.deleteBtn.addEventListener('click', () => this.onDelete());

    document.addEventListener('click', () => this.hide());
    document.addEventListener('contextmenu', (e) => {
      if (!e.target.closest('.image-card') && !e.target.closest('.preview-image-area')) {
        this.hide();
      }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.hide();
    });
  },

  show(x, y, imageInfo, canRename, targetImages) {
    this.currentImageInfo = imageInfo;
    this._targetImages = targetImages || [imageInfo];

    const count = this._targetImages.length;
    this.renameBtn.style.display = (canRename && count === 1) ? '' : 'none';
    this.deleteBtn.textContent = count > 1 ? `删除选中 (${count})` : '删除';

    this.el.classList.remove('hidden');
    this.el.style.left = Math.min(x, window.innerWidth - 160) + 'px';
    this.el.style.top = Math.min(y, window.innerHeight - 80) + 'px';
  },

  hide() {
    this.el.classList.add('hidden');
    this.currentImageInfo = null;
    this._targetImages = [];
  },

  async onRename() {
    const info = this.currentImageInfo;
    this.hide();
    if (!info) return;

    if (Preview.isOpen) {
      Preview.startRename();
    } else {
      Waterfall.startRenameCard(info);
    }
  },

  async onDelete() {
    const images = this._targetImages;
    this.hide();
    if (!images || images.length === 0) return;

    const wasPreviewOpen = Preview.isOpen;
    const previewIndex = Preview.currentIndex;
    const paths = images.map(img => img.path);

    App.fileOperationPending = true;

    if (images.length === 1) {
      const result = await window.api.deleteFile(paths[0]);
      if (result.success) {
        Waterfall.removeCards(paths);
      } else {
        App.fileOperationPending = false;
      }
    } else {
      const result = await window.api.deleteFiles(paths);
      if (result.success) {
        Waterfall.removeCards(paths);
      } else {
        App.fileOperationPending = false;
      }
    }
    App._lastOpTime = Date.now();

    if (wasPreviewOpen) {
      if (Waterfall.imageList.length === 0) {
        Preview.close();
      } else {
        const newIndex = Math.min(previewIndex, Waterfall.imageList.length - 1);
        Preview.open(Waterfall.imageList, newIndex);
      }
    }
  }
};
