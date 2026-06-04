const Preview = {
  modal: null,
  image: null,
  isOpen: false,

  init() {
    this.modal = document.getElementById('preview-modal');
    this.image = document.getElementById('preview-image');

    const closeBtn = this.modal.querySelector('.preview-close');
    const backdrop = this.modal.querySelector('.preview-backdrop');

    closeBtn.addEventListener('click', () => this.close());
    backdrop.addEventListener('click', () => this.close());

    document.addEventListener('keydown', (e) => {
      if (this.isOpen && e.key === 'Escape') {
        this.close();
      }
    });
  },

  open(imagePath) {
    this.image.src = `file:///${imagePath.replace(/\\/g, '/')}`;
    this.modal.classList.add('active');
    this.isOpen = true;
  },

  close() {
    this.modal.classList.remove('active');
    this.image.src = '';
    this.isOpen = false;
  }
};
