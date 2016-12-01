const { ipcRenderer } = require('electron')

document.addEventListener('DOMContentLoaded', function () {
  document.removeEventListener('DOMContentLoaded', this)
  ipcRenderer.send('dom-loaded', document.documentElement.outerHTML)
})
