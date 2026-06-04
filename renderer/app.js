const App = {
  currentPath: null,

  async init() {
    FolderTree.init('folder-list', (path) => this.onFolderSelect(path));
    Waterfall.init('image-grid', 'image-grid-container');
    Preview.init();

    document.getElementById('directory-bar').addEventListener('click', () => {
      this.selectDirectory();
    });
  },

  async selectDirectory() {
    const result = await window.api.selectDirectory();
    if (result && result.path) {
      this.currentPath = result.path;
      document.getElementById('directory-path').textContent = result.path;
      await this.loadDirectory(result.path);
    }
  },

  async loadDirectory(dirPath) {
    await Promise.all([
      FolderTree.loadFolders(dirPath),
      Waterfall.loadImages(dirPath)
    ]);
  },

  async onFolderSelect(path) {
    this.currentPath = path;
    document.getElementById('directory-path').textContent = path;
    await this.loadDirectory(path);
  }
};

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
