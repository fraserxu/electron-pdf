// Get some logs when things go horribly wrong
require('./sentry')
const _ = require('lodash')
const { ipcRenderer } = require('electron')

const privateApi = {
  // Have to assign ipcRenderer here or it will not be available
  // after preload.js terminates
  renderer: ipcRenderer
}

function sendStats(options = {}) {
  const convertKtoMB = val => (val ? Math.round(val / 1024) : '0') + 'MB'
  process.getProcessMemoryInfo().then(processMemory => {
    const systemMemory = process.getSystemMemoryInfo()
    const stats = _.extend(options, {
      processId: process.pid,
      processType: process.type,
      // Percentage of CPU used since the last call to getCPUUsage
      cpuUsage: Math.round(100 * process.getCPUUsage().percentCPUUsage) + '%',
      processMemory: {
        // residentSet Integer Linux Windows - The amount of memory currently pinned to actual physical RAM in Kilobytes.
        residentSet: convertKtoMB(processMemory.residentSet),
        // private Integer - The amount of memory not shared by other processes, such as JS heap or HTML content in Kilobytes.
        'private': convertKtoMB(processMemory.private),
        // shared Integer - The amount of memory shared between processes, typically memory consumed by the Electron code itself in Kilobytes.
        shared: convertKtoMB(processMemory.shared)
      },
      systemMemory: {
        free: convertKtoMB(systemMemory.free),
        total: convertKtoMB(systemMemory.total)
      },
      heapStatistics: process.getHeapStatistics(),
      ioCounters: process.getIOCounters()
    })
    privateApi.renderer.sendSync('process-stats', stats)
  })
}

// eslint-disable-next-line no-undef
ipcApi = {
  // accessed from exportJob.js#_executeJSListener
  send (event, jobId, detail) {
    privateApi.renderer.send(event, jobId, detail)
  },

  eventStats (messageId, event) {
    sendStats({messageId, event})
  },

  /**
   * Runs in the renderer, gathering stats about the current state of the Renderer runtime and
   * sends them back to the main process so it can be logged in the export server log (and not the browser)
   */
  initialize() {
    process.getCPUUsage() // first call always returns zero
  }
}
