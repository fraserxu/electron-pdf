'use strict'

const EventEmitter = require('eventemitter2').EventEmitter2

const electron = require('electron')
const minimist = require('minimist')

const argOptions = require('./options')
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
   */
  constructor(opts){
    super()
    this.options = opts || {}
    this.reslientMode = this.options.resilient || false
  }

  /**
   * Starts the electron app
   *
   * @fires PDFExporter#charged
   */
  start () {
    electronApp = electron.app

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

    // Passthrough error handler to silence Electron GUI prompt
    process.on('uncaughtException', err => {
      if( this.reslientMode ){
        console.log('Something unexpectedly bad happened ' +
          '(but electron-pdf was initialized in resilient mode ' +
          'and will remain operational):', err)
      }else{
        throw err
      }
    })
  }

  stop () {
    console.log('Shutting down...')
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
