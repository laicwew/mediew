const ContextMenu = {
  el: null,
  renameBtn: null,
  deleteBtn: null,
  currentImageInfo: null,

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

  show(x, y, imageInfo, canRename) {
    this.currentImageInfo = imageInfo;
    this.renameBtn.style.display = canRename ? '' : 'none';

    this.el.classList.remove('hidden');
    this.el.style.left = Math.min(x, window.innerWidth - 160) + 'px';
    this.el.style.top = Math.min(y, window.innerHeight - 80) + 'px';
  },

  hide() {
    this.el.classList.add('hidden');
    this.currentImageInfo = null;
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
    const info = this.currentImageInfo;
    this.hide();
    if (!info) return;

    const wasPreviewOpen = Preview.isOpen;
    const previewIndex = Preview.currentIndex;

    App.fileOperationPending = true;
    const result = await window.api.deleteFile(info.path);
    if (result.success) {
      const idx = Waterfall.imageList.findIndex(img => img.path === info.path);
      if (idx !== -1) {
        Waterfall.imageList.splice(idx, 1);
      }
      const card = document.querySelector(`.image-card[data-path="${CSS.escape(info.path)}"]`);
      if (card) {
        const prev = card.previousElementSibling;
        card.remove();
        if (prev && prev.classList.contains('date-header')) {
          const nextAfterPrev = prev.nextElementSibling;
          if (!nextAfterPrev || nextAfterPrev.classList.contains('date-header')) {
            prev.remove();
          }
        }
      }

      if (wasPreviewOpen) {
        if (Waterfall.imageList.length === 0) {
          Preview.close();
        } else {
          const newIndex = Math.min(previewIndex, Waterfall.imageList.length - 1);
          Preview.open(Waterfall.imageList, newIndex);
        }
      }
    } else {
      App.fileOperationPending = false;
    }
  }
};
