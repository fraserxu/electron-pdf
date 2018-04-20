const {ipcRenderer} = require('electron')

const privateApi = {
  // Have to assign ipcRenderer here or it will not be available
  // after preload.js terminates
  renderer: ipcRenderer
}

// accessed from exportJob.js#_executeJSListener
ipcApi = {
  send (event, jobId, detail) {
    privateApi.renderer.send(event, jobId, detail)
  }
}
