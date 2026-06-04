const FolderTree = {
  container: null,
  currentPath: null,
  onFolderSelect: null,

  init(containerId, onFolderSelect) {
    this.container = document.getElementById(containerId);
    this.onFolderSelect = onFolderSelect;
  },

  async loadFolders(dirPath) {
    this.currentPath = dirPath;
    this.container.innerHTML = '';
    
    const folders = await window.api.getSubfolders(dirPath);
    
    if (folders.length === 0) {
      this.container.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
            <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
          </svg>
          <span>无子文件夹</span>
        </div>
      `;
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
      this.selectFolder(fullPath, item);
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

  selectFolder(path, element) {
    document.querySelectorAll('.folder-item.active').forEach(el => {
      el.classList.remove('active');
    });
    element.classList.add('active');
    
    if (this.onFolderSelect) {
      this.onFolderSelect(path);
    }
  }
};
