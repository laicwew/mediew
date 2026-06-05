const FolderTree = {
  container: null,
  rootPath: null,
  onFolderPreview: null,
  onFolderEnter: null,
  _dragPath: null,

  init(containerId, onFolderPreview, onFolderEnter) {
    this.container = document.getElementById(containerId);
    this.onFolderPreview = onFolderPreview;
    this.onFolderEnter = onFolderEnter;
    this.setupContextMenu();
  },

  setupContextMenu() {
    const menu = document.getElementById('folder-context-menu');
    document.addEventListener('click', () => {
      menu.classList.add('hidden');
    });
    document.addEventListener('contextmenu', (e) => {
      if (!menu.contains(e.target)) {
        menu.classList.add('hidden');
      }
    });

    menu.querySelectorAll('.context-menu-item').forEach(item => {
      item.addEventListener('click', async () => {
        const action = item.dataset.action;
        const dirPath = menu.dataset.dirPath;
        const isRoot = menu.dataset.isRoot === 'true';
        menu.classList.add('hidden');
        if (!dirPath) return;

        if (action === 'new-folder') {
          await this.handleNewFolder(dirPath);
        } else if (action === 'rename' && !isRoot) {
          this.handleRenameFolder(dirPath);
        } else if (action === 'delete' && !isRoot) {
          await this.handleDeleteFolder(dirPath);
        }
      });
    });
  },

  showContextMenu(x, y, dirPath, isRoot) {
    const menu = document.getElementById('folder-context-menu');
    menu.dataset.dirPath = dirPath;
    menu.dataset.isRoot = isRoot;
    menu.classList.remove('hidden');

    const deleteItem = menu.querySelector('[data-action="delete"]');
    const renameItem = menu.querySelector('[data-action="rename"]');
    if (isRoot) {
      deleteItem.style.display = 'none';
      renameItem.style.display = 'none';
    } else {
      deleteItem.style.display = '';
      renameItem.style.display = '';
    }

    const menuRect = menu.getBoundingClientRect();
    const winW = window.innerWidth;
    const winH = window.innerHeight;
    let left = x;
    let top = y;
    if (x + menuRect.width > winW) left = x - menuRect.width;
    if (y + menuRect.height > winH) top = y - menuRect.height;
    menu.style.left = left + 'px';
    menu.style.top = top + 'px';
  },

  findWrapper(dirPath) {
    return this.container.querySelector(`.folder-wrapper > .folder-item[data-path="${CSS.escape(dirPath)}"]`);
  },

  async handleNewFolder(parentDir) {
    const name = '新建文件夹';
    const result = await window.api.createFolder(parentDir, name);
    if (!result.success) return;

    App.fileOperationPending = true;
    const parentItem = this.findWrapper(parentDir);

    if (!parentItem) {
      await this.reloadTree();
      return;
    }

    const parentWrapper = parentItem.parentElement;
    let subList = parentWrapper.querySelector(':scope > .subfolder-list');

    if (!subList) {
      let expandIconEl = parentItem.querySelector('.expand-icon');
      if (!expandIconEl) {
        expandIconEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        expandIconEl.classList.add('expand-icon');
        expandIconEl.setAttribute('viewBox', '0 0 24 24');
        expandIconEl.setAttribute('fill', 'currentColor');
        expandIconEl.innerHTML = '<path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>';
        parentItem.insertBefore(expandIconEl, parentItem.firstChild);
        expandIconEl.addEventListener('click', (e) => {
          e.stopPropagation();
          expandIconEl.classList.toggle('expanded');
          subList.classList.toggle('expanded');
        });
      }

      subList = document.createElement('div');
      subList.className = 'subfolder-list';
      parentWrapper.appendChild(subList);

      expandIconEl.classList.add('expanded');
      subList.classList.add('expanded');
    }

    const newItem = await this.createFolderItem(parentDir, name);
    subList.appendChild(newItem);
  },

  handleRenameFolder(dirPath) {
    const item = this.findWrapper(dirPath);
    if (!item) return;
    const nameEl = item.querySelector('.folder-name');
    if (!nameEl) return;

    const currentName = nameEl.textContent;
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'inline-rename-input';
    input.value = currentName;
    nameEl.replaceWith(input);
    input.focus();
    input.select();

    const finishRename = async () => {
      const newName = input.value.trim();
      const restored = document.createElement('span');
      restored.className = 'folder-name';
      restored.title = currentName;
      if (newName && newName !== currentName) {
        App.fileOperationPending = true;
        const result = await window.api.renameFolder(dirPath, newName);
        if (result.success) {
          restored.textContent = newName;
          restored.title = newName;
          input.replaceWith(restored);
          if (App.currentPath === dirPath) {
            App.currentPath = result.newPath;
            App.currentPreviewPath = result.newPath;
            document.getElementById('directory-path').textContent = result.newPath;
          }
          return;
        } else {
          App.fileOperationPending = false;
        }
      }
      restored.textContent = currentName;
      input.replaceWith(restored);
    };

    input.addEventListener('blur', finishRename);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
      if (e.key === 'Escape') { input.value = currentName; input.blur(); }
    });
  },

  async handleDeleteFolder(dirPath) {
    App.fileOperationPending = true;
    const result = await window.api.deleteFolder(dirPath);
    if (!result.success) {
      App.fileOperationPending = false;
      return;
    }

    if (this.rootPath === dirPath) {
      App.currentPath = null;
      App.currentPreviewPath = null;
      document.getElementById('directory-path').textContent = '选择目录...';
      document.getElementById('image-grid').innerHTML = '';
      document.getElementById('welcome-screen').classList.remove('hidden');
      await this.reloadTree();
      return;
    }

    if (App.currentPath === dirPath || App.currentPreviewPath === dirPath) {
      App.currentPath = this.rootPath;
      App.currentPreviewPath = this.rootPath;
      document.getElementById('directory-path').textContent = this.rootPath;
      const rootItem = this.container.querySelector('.root-folder');
      if (rootItem) this.previewFolder(this.rootPath, rootItem);
    }

    const item = this.findWrapper(dirPath);
    if (!item) return;
    const wrapper = item.parentElement;
    const parentWrapper = wrapper.parentElement;
    wrapper.remove();

    if (parentWrapper && parentWrapper.classList.contains('subfolder-list')) {
      if (parentWrapper.children.length === 0) {
        const parentItem = parentWrapper.previousElementSibling;
        if (parentItem && parentItem.classList.contains('folder-item')) {
          const expandIcon = parentItem.querySelector('.expand-icon');
          if (expandIcon) expandIcon.remove();
        }
        parentWrapper.remove();
      }
    } else if (parentWrapper && parentWrapper.classList.contains('folder-wrapper')) {
      const hasSubWrappers = parentWrapper.querySelector(':scope > .folder-wrapper');
      if (!hasSubWrappers) {
        const parentItem = parentWrapper.querySelector(':scope > .folder-item');
        if (parentItem) {
          const expandIcon = parentItem.querySelector('.expand-icon');
          if (expandIcon) expandIcon.remove();
        }
      }
    }
  },

  async reloadTree() {
    const root = this.rootPath;
    if (root) {
      await this.loadFolders(root);
    }
  },

  async loadFolders(dirPath) {
    this.rootPath = dirPath;
    this.container.innerHTML = '';

    const rootName = dirPath.split('\\').pop() || dirPath.split('/').pop() || dirPath;
    const rootWrapper = document.createElement('div');
    rootWrapper.className = 'folder-wrapper';

    const rootItem = document.createElement('div');
    rootItem.className = 'folder-item root-folder';
    rootItem.dataset.path = dirPath;
    rootItem.innerHTML = `
      <span class="folder-name" title="${rootName}">${rootName}</span>
      <span class="root-badge">根目录</span>
    `;
    rootItem.addEventListener('click', (e) => {
      e.stopPropagation();
      this.previewFolder(dirPath, rootItem);
    });
    rootItem.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.showContextMenu(e.clientX, e.clientY, dirPath, true);
    });

    this.setupDropZone(rootItem);
    rootWrapper.appendChild(rootItem);
    this.container.appendChild(rootWrapper);
    
    this.previewFolder(dirPath, rootItem);
    
    const folders = await window.api.getSubfolders(dirPath);
    
    if (folders.length === 0) {
      return;
    }

    for (const folder of folders) {
      const item = await this.createFolderItem(dirPath, folder);
      rootWrapper.appendChild(item);
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

    item.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.showContextMenu(e.clientX, e.clientY, fullPath, false);
    });

    this.setupFolderDrag(item, fullPath);
    this.setupDropZone(item);

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

  enterFolder(path) {
    if (this.onFolderEnter) {
      this.onFolderEnter(path);
    }
  },

  setupFolderDrag(element, dirPath) {
    element.draggable = true;
    element.addEventListener('dragstart', (e) => {
      this._dragPath = dirPath;
      e.dataTransfer.setData('text/plain', dirPath);
      e.dataTransfer.setData('application/x-folder-path', dirPath);
      e.dataTransfer.effectAllowed = 'move';
      element.classList.add('dragging');
    });
    element.addEventListener('dragend', () => {
      this._dragPath = null;
      element.classList.remove('dragging');
    });
  },

  setupDropZone(element) {
    element.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      element.classList.add('drag-over');
    });

    element.addEventListener('dragleave', (e) => {
      if (!element.contains(e.relatedTarget)) {
        element.classList.remove('drag-over');
      }
    });

    element.addEventListener('drop', async (e) => {
      e.preventDefault();
      element.classList.remove('drag-over');
      const destDir = element.dataset.path;
      if (!destDir) return;

      const folderPath = e.dataTransfer.getData('application/x-folder-path');
      if (folderPath) {
        if (folderPath === destDir) return;
        if (destDir.startsWith(folderPath + '\\') || destDir === folderPath) return;
        App.fileOperationPending = true;
        const result = await window.api.moveFolder(folderPath, destDir);
        if (result.success) {
          await this.reloadTree();
          if (App.currentPath === folderPath || App.currentPreviewPath === folderPath) {
            App.currentPath = result.newPath;
            App.currentPreviewPath = result.newPath;
            document.getElementById('directory-path').textContent = result.newPath;
          }
        } else {
          App.fileOperationPending = false;
        }
        return;
      }

      const filePath = e.dataTransfer.getData('text/plain');
      if (!filePath) return;
      if (filePath === destDir) return;

      App.fileOperationPending = true;
      const result = await window.api.moveFile(filePath, destDir);
      if (result.success) {
        const idx = Waterfall.imageList.findIndex(img => img.path === filePath);
        if (idx !== -1) {
          Waterfall.imageList.splice(idx, 1);
        }
        const card = document.querySelector(`.image-card[data-path="${CSS.escape(filePath)}"]`);
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
      } else {
        App.fileOperationPending = false;
      }
    });
  }
};
