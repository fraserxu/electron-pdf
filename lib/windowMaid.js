// Third Party Modules
const _ = require('lodash')

const errorLogger = require('./logger').error
const infoLogger = require('./logger')
const debugLogger = require('./logger').debug

/** How long a window can remain open before it is terminated, in milliseconds */
const HUNG_WINDOW_THRESHOLD = process.env.ELECTRONPDF_WINDOW_LIFE_THRESHOLD || 1000 * 60 * 5 /* minutes */

// Window Cache - Keep track of all windows created, and if any get stuck close
// them
const windowCache = {}

const windowMaid = {

  /**
   * When a job creates a window it invokes this method so any memory leaks
   * due to hung windows are prevented.  This can happen if an uncaught
   * exception occurs and job.destroy() is never invoked.
   * @param exportJob the ExportJob instance, it must have a window reference set
   */
  registerOpenWindow (exportJob) {
    const {windowLifespan = HUNG_WINDOW_THRESHOLD} = exportJob.options
    const w = exportJob.window
    windowCache[w.id] = {
      id: w.id,
      job: exportJob,
      window: w,
      lastUsed: Date.now(),
      lifespan: windowLifespan
    }
  },

  /**
   * Anytime a window is used this function should be invoked to update
   * the lastUsed property in the window cache
   * @param id
   */
  touchWindow (id) {
    windowCache[id].lastUsed = Date.now()
  },

  /**
   * Allows a job to gracefully remove a window
   * @param id the window id
   */
  removeWindow (id) {
    delete windowCache[id]
  },

  /**
   * Checks every window that was registered to make sure it has been used within
   * the allowed threshold, and if not it is destroyed and removed from memory.
   *
   * @param {number} [threshold=process.env.ELECTRONPDF_WINDOW_LIFE_THRESHOLD]
   * the number of millseconds that a window has to be open and untouched for it to be destroyed.
   */
  cleanupHungWindows (threshold) {
    const now = Date.now()
    const hungWindows = _.filter(windowCache, cacheEntry => {
      const {lastUsed, lifespan} = cacheEntry
      const elapsed = now - lastUsed;
      cacheEntry.elapsed = elapsed
      const destructionThreshold = threshold || lifespan
      return elapsed >= destructionThreshold
    })

    if (!_.isEmpty(hungWindows)) {
      debugLogger(`hung windows detected -> ` +
        `total windows: ${_.size(windowCache)}, ` +
        `hung windows: ${JSON.stringify(hungWindows)}`)
    }

    _.forEach(hungWindows, e => {
      infoLogger('destroying hung window: ', e.id)
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
        errorLogger('a window was left in the cache that was already destroyed, do proper cleanup')
        delete windowCache[e.id]
      }
    })
  },

  windowCount () {
    return _.size(windowCache)
  }

}

module.exports = windowMaid
