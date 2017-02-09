// Third Party Modules
const _ = require('lodash')

// Logging
const debug = require('debug')
const logger = debug('electronpdf:')

/** How long a window can remain open before it is terminated, in milliseconds */
const HUNG_WINDOW_THRESHOLD = process.env.ELECTRONPDF_WINDOW_LIFE_THRESHOLD || 1000 * 60 * 5 /* minutes */

// Window Cache - Keep track of all windows created, and if any get stuck close
// them
const windowCache = {}

class WindowMaid {

  /**
   * When a job creates a window it invokes this method so any memory leaks
   * due to hung windows are prevented.  This can happen if an uncaught
   * exception occurs and job.destroy() is never invoked.
   * @param exportJob the ExportJob instance, it must have a window reference set
   */
  static registerOpenWindow (exportJob) {
    const w = exportJob.window
    windowCache[w.id] = {id: w.id, job: exportJob, window: w, lastUsed: Date.now()}
  }

  /**
   * Anytime a window is used this function should be invoked to update
   * the lastUsed property in the window cache
   * @param id
   */
  static touchWindow (id) {
    windowCache[id].lastUsed = Date.now()
  }

  /**
   * Allows a job to gracefully remove a window
   * @param id the window id
   */
  static removeWindow (id) {
    delete windowCache[id]
  }

  /**
   * Checks every window that was registered to make sure it has been used within
   * the allowed threshold, and if not it is destroyed and removed from memory.
   *
   * @param {number} [threshold=process.env.ELECTRONPDF_WINDOW_LIFE_THRESHOLD]
   * the number of millseconds that a window has to be open and untouched for it to be destroyed.
   */
  static cleanupHungWindows (threshold) {
    const now = Date.now()
    const th = threshold || HUNG_WINDOW_THRESHOLD
    const hungWindows = _.filter(windowCache, e => now - e.lastUsed >= th)

    logger(`checking hung windows-> ` +
      `total windows: ${_.size(windowCache)}, ` +
      `hung windows: ${_.size(hungWindows)}, ` +
      `threshold: ${th}`)

    _.forEach(hungWindows, e => {
      logger('destroying hung window: ', e.id)
      const destroyable = e.job && e.window && !e.window.isDestroyed()
      if (destroyable) {
        const windowContext = {
          id: e.window.id,
          lifespan: now - e.lastUsed
        }
        e.job.emit('window.termination', windowContext)
        delete windowCache[e.id]
        e.job.destroy()
      } else {
        logger('Warning: a window was left in the cache that was already destroyed, do proper cleanup')
        delete windowCache[e.id]
      }
    })
  }

  static windowCount () {
    return _.size(windowCache)
  }

}

module.exports = WindowMaid
