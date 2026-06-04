const Waterfall = {
  grid: null,
  container: null,
  imageList: [],

  init(gridId, containerId) {
    this.grid = document.getElementById(gridId);
    this.container = document.getElementById(containerId);
  },

  async loadImages(dirPath) {
    this.grid.innerHTML = '';
    this.imageList = [];
    this.grid.classList.remove('hidden');
    document.getElementById('welcome-screen').classList.add('hidden');

    const images = await window.api.readDirectory(dirPath);

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
  },

  createImageCard(imageInfo, index) {
    const card = document.createElement('div');
    card.className = 'image-card';

    const img = document.createElement('img');
    img.src = `file:///${imageInfo.path.replace(/\\/g, '/')}`;
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

    return card;
  }
};
