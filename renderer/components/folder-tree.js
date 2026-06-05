const FolderTree = {
  container: null,
  rootPath: null,
  onFolderPreview: null,
  onFolderEnter: null,

  init(containerId, onFolderPreview, onFolderEnter) {
    this.container = document.getElementById(containerId);
    this.onFolderPreview = onFolderPreview;
    this.onFolderEnter = onFolderEnter;
  },

  async loadFolders(dirPath) {
    this.rootPath = dirPath;
    this.container.innerHTML = '';

    const rootName = dirPath.split('\\').pop() || dirPath.split('/').pop() || dirPath;
    const rootItem = document.createElement('div');
    rootItem.className = 'folder-item root-folder';
    rootItem.dataset.path = dirPath;
    rootItem.innerHTML = `
      <svg class="folder-icon" viewBox="0 0 24 24" fill="currentColor">
        <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
      </svg>
      <span class="folder-name" title="${rootName}">${rootName}</span>
      <span class="root-badge">根目录</span>
    `;
    rootItem.addEventListener('click', (e) => {
      e.stopPropagation();
      this.previewFolder(dirPath, rootItem);
    });
    this.container.appendChild(rootItem);
    
    // 默认选中根目录
    this.previewFolder(dirPath, rootItem);
    
    const folders = await window.api.getSubfolders(dirPath);
    
    if (folders.length === 0) {
      return;
    }

    for (const folder of folders) {
      const item = await this.createFolderItem(dirPath, folder);
      this.container.appendChild(item);
    }
  },

  async createFolderItem(parentPath, folderName) {
    const fullPath = `${parentPath}\\${folderName}`;
    const subfolders = await window.api.getSubfolders(fullPath);
    const hasSubfolders = subfolders.length > 0;

    const wrapper = document.createElement('div');
    wrapper.className = 'folder-wrapper';

    const item = document.createElement('div');
    item.className = 'folder-item';
    item.dataset.path = fullPath;

    let expandIcon = '';
    if (hasSubfolders) {
      expandIcon = `
        <svg class="expand-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
        </svg>
      `;
    }

    item.innerHTML = `
      ${expandIcon}
      <svg class="folder-icon" viewBox="0 0 24 24" fill="currentColor">
        <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
      </svg>
      <span class="folder-name" title="${folderName}">${folderName}</span>
    `;

    item.addEventListener('click', (e) => {
      e.stopPropagation();
      this.previewFolder(fullPath, item);
    });

    item.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      e.preventDefault();
      this.enterFolder(fullPath);
    });

    if (hasSubfolders) {
      const expandIconEl = item.querySelector('.expand-icon');
      const subList = document.createElement('div');
      subList.className = 'subfolder-list';

      for (const sub of subfolders) {
        const subItem = await this.createFolderItem(fullPath, sub);
        subList.appendChild(subItem);
      }

      expandIconEl.addEventListener('click', (e) => {
        e.stopPropagation();
        expandIconEl.classList.toggle('expanded');
        subList.classList.toggle('expanded');
      });

      wrapper.appendChild(item);
      wrapper.appendChild(subList);
    } else {
      wrapper.appendChild(item);
    }

    return wrapper;
  },

  previewFolder(path, element) {
    document.querySelectorAll('.folder-item.active').forEach(el => {
      el.classList.remove('active');
    });
    element.classList.add('active');
    
    if (this.onFolderPreview) {
      this.onFolderPreview(path);
    }
  },

  checkAndRestoreRootSelection() {
    const rootItem = this.container.querySelector('.root-folder');
    if (!rootItem) return;
    
    // 检查是否有其他目录被选中
    const activeItems = this.container.querySelectorAll('.folder-item.active');
    const hasOtherActive = Array.from(activeItems).some(item => item !== rootItem);
    
    // 如果没有其他目录被选中，恢复根目录选中状态
    if (!hasOtherActive) {
      rootItem.classList.add('active');
      if (this.onFolderPreview) {
        this.onFolderPreview(this.rootPath);
      }
    }
  },

  enterFolder(path) {
    if (this.onFolderEnter) {
      this.onFolderEnter(path);
    }
  }
};
