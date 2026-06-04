document.getElementById('btn-minimize').addEventListener('click', () => {
  window.api.minimizeWindow();
});

document.getElementById('btn-maximize').addEventListener('click', () => {
  window.api.maximizeWindow();
});

document.getElementById('btn-close').addEventListener('click', () => {
  window.api.closeWindow();
});
