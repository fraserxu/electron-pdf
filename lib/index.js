'use strict'

const EventEmitter = require('eventemitter2').EventEmitter2
const os = require('os')

const electron = require('electron')
const minimist = require('minimist')

const argOptions = require('./options')
const setLogger = require('./logger').set

const ExportJob = require('./exportJob')
const Source = require('./source')
const source = new Source()

let electronApp

/**
 * Runs an Electron application used to export HTML to PDF Documents
 */
class PDFExporter extends EventEmitter {
  // ------------------------------------------------------------------
  // ------------------ Public API ------------------------------------
  // ------------------------------------------------------------------
  /**
   * @constructor
   * @param opts
   * @param {boolean} [opts.resilient=false] set to true to catch and
   * log all uncaught exception but leave things running
   * @param {object} [opts.loggers] Allows client to use its own logging implementation
   */
  constructor (opts) {
    super()
    this.options = opts || {}
    this.reslientMode = this.options.resilient || false
    setLogger(this.options.loggers, this)
  }

  /**
   * Starts the electron app
   *
   * @fires PDFExporter#charged
   */
  start (args = {}) {
    require('./sentry')

    electronApp = electron.app
    this.configureElectron()

    electronApp.once('ready', () => {
      this.isReady = true

      /**
       * emitted when the application is ready to process exports
       * @event PDFExporter#charged
       */
      this.emit('charged')
    })

    electronApp.on('window-all-closed', function () {
      if (process.platform !== 'darwin') {
        // electronApp.quit()
      }
    })

    // Stop Electron on SIG*
    process.on('exit', code => electronApp.exit(code))

    // https://stackoverflow.com/a/46789486/30665
    if (args.ignoreCertificateErrors) {
      // SSL/TSL: this is the self signed certificate support
      electronApp.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
        // On certificate error we disable default behaviour (stop loading the page)
        // and we then say "it is all fine - true" to the callback
        event.preventDefault()
        // eslint-disable-next-line
        callback(true)
      })
    }

    // Passthrough error handler to silence Electron GUI prompt
    process.on('uncaughtException', err => {
      if (this.reslientMode) {
        this.info('Something unexpectedly bad happened ' +
          '(but electron-pdf was initialized in resilient mode ' +
          'and will remain operational):', err)
      } else {
        throw err
      }
    })
  }

  /**
   * https://www.electronjs.org/docs/api/command-line-switches
   */
  configureElectron () {
    // Prevents Chromium from lowering the priority of invisible pages' renderer processes. This flag is global to all renderer processes
    electronApp.commandLine.appendSwitch('disable-renderer-backgrounding')

    const convertBytesToMB = bytes => bytes / 1024 / 1024
    const maxMem = process.env.ELECTRONPDF_RENDERER_MAX_MEMORY ||
        // 75% of the memory of the server, up to a ceiling of 8GB
        // The default is 512MB, this should be more than enough for a single export process
        Math.min(8192, Math.round(convertBytesToMB(os.totalmem() * 0.75)))

    // V8 (only) Flags are supported by Chromium; Node flags no worky; run `node --v8-options`
    // --prof ; creates a file like isolate-0x7fa6c0008000-v8.log in the local directory
    //     then run: node --prof-process isolate-0x7fe248008000-v8.log > isolate-0x7fe248008000-v8.txt
    const jsFlags = `--max-old-space-size=${maxMem}`

    electronApp.commandLine.appendSwitch('js-flags', jsFlags)
    this.info(`Assigned renderer process js-flags=${jsFlags}`)
  }

  stop () {
    this.info('Shutting down...')
    electronApp.quit()
  }

  /**
   * Load one or more HTML pages inside of a new window which is closed
   * as soon as the PDFs are rendered.
   *
   * @param input {String} URL for filepath
   * @param output {String} Filename
   * @param args {array|Object} command line args - Can be an array of any
   *   supported args, or an object that is the result of running minimist.
   * @param options {Object} export args - see ExportJob for list of options.
   * These are options only supported by the API and not by the CLI
   */
  createJob (input, output, args, options) {
    if (!this.isReady) {
      const msg = 'Electron is not ready, make sure to register an event listener for "charged" and invoke start()'
      throw msg
    }

    // charge.js interprets the args, but this method should also support raw args
    if (args instanceof Array) {
      args = minimist(args, argOptions)
    }

    return new Promise((resolve, reject) => {
      source.resolve(input, args).then(sources => {
        resolve(new ExportJob(sources, output, args, options))
      })
    })
  }
}

module.exports = PDFExporter
