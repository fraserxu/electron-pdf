// Get some logs when things go horribly wrong
require('./sentry')

const { ipcRenderer } = require('electron')

const privateApi = {
  // Have to assign ipcRenderer here or it will not be available
  // after preload.js terminates
  renderer: ipcRenderer
}

// accessed from exportJob.js#_executeJSListener
// eslint-disable-next-line no-undef
ipcApi = {
  send (event, jobId, detail) {
    privateApi.renderer.send(event, jobId, detail)
  }
}
