// Get some logs when things go horribly wrong
require('./sentry')
const _ = require('lodash')
const { ipcRenderer } = require('electron')

const privateApi = {
  // Have to assign ipcRenderer here or it will not be available
  // after preload.js terminates
  renderer: ipcRenderer
}

function sendStats (options = {}) {
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
    privateApi.renderer.send('process-stats', stats)
  })
}

// eslint-disable-next-line no-undef
ipcApi = {

  /**
   * Initializes the renderer process so this API can be used.
   */
  initialize () {
    process.getCPUUsage() // first call always returns zero
  },

  // accessed from exportJob.js#_executeJSListener
  send (event, jobId, detail) {
    privateApi.renderer.send(event, jobId, detail)
  },

  /**
   * Gets process stats from the renderer process and emits them on the 'process-stats' channel.
   *
   * @param {String} messageId A unique id that can be used to correlate the stats request when the event is emitted.
   * Used to fulfil promises when the main process needs to wait for the stats before continuing to the next step.
   *
   * @param {Number} windowId The window this renderer is for
   *
   * @param {String} event A descriptive event identifier that ties the stats to an export's lifecycle stage.  This
   * should correlate to one of the messages that is emitted from exportJob.
   */
  eventStats (messageId, windowId, event) {
    sendStats({ messageId, windowId, event })
  }
}
