const App = {
  currentPath: null,

  async init() {
    FolderTree.init(
      'folder-list',
      (path) => this.onFolderPreview(path),
      (path) => this.onFolderEnter(path)
    );
    Waterfall.init('image-grid', 'image-grid-container');
    Preview.init();

    SettingsManager.init((mode) => this.onLayoutChange(mode));

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

  async onFolderPreview(path) {
    await Waterfall.loadImages(path);
  },

  async onFolderEnter(path) {
    this.currentPath = path;
    document.getElementById('directory-path').textContent = path;
    await this.loadDirectory(path);
  },

  onLayoutChange(mode) {
    SettingsManager.applyLayout(mode);
  }
};

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
