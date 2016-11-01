'use strict'

// Node Modules
const async = require('async')
const fs = require('fs')
const path = require('path')
const url = require('url')

// Third Party Modules
const EventEmitter = require('eventemitter2').EventEmitter2
const electron = require('electron')
const _ = require('lodash')

// Logging
const debug = require('debug')
const logger = debug('electronpdf:')

// CONSTANTS
const HTML_DPI = 96
const MICRONS_INCH_RATIO = 25400
const MAX_EVENT_WAIT = 10000

class ExportJob extends EventEmitter {

  /**
   *
   * @param {Array} input The path to the HTML or url, or a markdown file
   *   with 'md' or 'markdown' extension.
   * @param output The name of the file to export to.  If the extension is
   *   '.png' then a PNG image will be generated instead of a PDF.
   * @param args {Object} the minimist arg object
   *
   * @fires ExportJob#pdf-complete after each PDF is available on the
   *   filesystem
   * @fires ExportJob#job-complete after all PDFs are available on the
   *   filesystem
   */
  constructor (input, output, args) {
    super()
    this.input = input
    this.output = output
    this.args = args
  }

  // ***************************************************************************
  // ************************* Public Functions ********************************
  // ***************************************************************************

  /**
   * Render markdown or html to pdf
   */
  render () {
    const args = this.args

    const win = this._launchBrowserWindow(args)
    // TODO: Check for different domains, this is meant to support only a single origin
    const firstUrl = this.input[0]
    this._setSessionCookies(args.cookies, firstUrl, win.webContents.session.cookies)

    const windowEvents = []
    this.input.forEach((uriPath, i) => {
      windowEvents.push((pageDone) => {
        this._loadURL(win, uriPath, args)
        const generateFunction = this._generateOutput.bind(this, win, `${this.output}.${i + 1}`, args, pageDone)
        const waitFunction = this._waitForPage.bind(this, win, generateFunction, args.outputWait)
        win.webContents.removeAllListeners('did-finish-load')
        win.webContents.on('did-finish-load', waitFunction)
      })
    })

    async.series(windowEvents, (err, results) => {
      win.close()
      /**
       * PDF Generation Event - fires when all PDFs have been persisted to disk
       * @event PDFExporter#jobj-complete
       * @type {object}
       * @property {String} results - array of generated pdf file locations
       * @property {Object} error - If an error occurred, null otherwise
       */
      this.emit('job-complete', {results: results, error: err})
    })
  }

  // ***************************************************************************
  // ************************* Private Functions *******************************
  // ***************************************************************************

  // Browser Setup
  /**
   *
   * @param {String} cookies - ';' delimited cookies, '=' delimited name/value
   *   pairs
   * @param {URL} requestedURL - URL Object
   * @param windowSessionCookies - The cookies object from the Electron
   *   window.session
   *
   * @private
   */
  _setSessionCookies (cookies, requestedURL, windowSessionCookies) {
    if (cookies) {
      const urlObj = url.parse(requestedURL)
      cookies.split(';').forEach(function (c) {
        const nameValue = c.split('=')
        const cookie = {
          url: urlObj.protocol + '//' + urlObj.host,
          name: nameValue[0],
          value: nameValue[1]
        }
        windowSessionCookies.set(cookie, function (err) {
          if (err) {
            logger(err)
          }
        })
      })
    }
  }

  /**
   * Launch a browser window
   * @param args {Object} the minimist arg object
   * @returns {BrowserWindow}
   *
   * @private
   */
  _launchBrowserWindow (args) {
    const pageDim = this._getPageDimensions(args.pageSize, args.landscape)

    const defaultOpts = {
      width: pageDim.x,
      height: pageDim.y,
      enableLargerThanScreen: true,
      show: false
    }

    let cmdLineBrowserConfig = {}
    try {
      cmdLineBrowserConfig = JSON.parse(args.browserConfig || '{}')
    } catch (e) {
      logger('Invalid browserConfig provided, using defaults. Value:',
        args.browserConfig,
        '\nError:', e)
    }

    const browserConfig = _.extend(defaultOpts, cmdLineBrowserConfig)
    this.emit('window.open.start', {})
    let win = new electron.BrowserWindow(browserConfig)
    this.emit('window.open.end', {
      width: browserConfig.width,
      height: browserConfig.height
    })

    win.on('closed', function () {
      win = null
    })

    return win
  }

  /**
   * Translates PDF output size into the browser pixels required to
   * match that size/aspect-ration.
   *
   * @param pageSize
   * @param landscape
   * @returns {{x: {number}, y: {number}}}
   * @private
   */
  _getPageDimensions (pageSize, landscape) {
    function pdfToPixels (inches) {
      return Math.floor(inches * HTML_DPI)
    }

    const pageDimensions = {
      'A3': {x: pdfToPixels(11.7), y: pdfToPixels(16.5)},
      'A4': {x: pdfToPixels(8.3), y: pdfToPixels(11.7)},
      'A5': {x: pdfToPixels(5.8), y: pdfToPixels(8.3)},
      'Letter': {x: pdfToPixels(8.5), y: pdfToPixels(11)},
      'Legal': {x: pdfToPixels(8.5), y: pdfToPixels(14)},
      'Tabloid': {x: pdfToPixels(11), y: pdfToPixels(17)}
    }

    let pageDim
    if (typeof pageSize === 'object') {
      const xInches = pageSize.width / MICRONS_INCH_RATIO
      const yInches = pageSize.height / MICRONS_INCH_RATIO

      pageDim = {
        x: pdfToPixels(xInches),
        y: pdfToPixels(yInches)
      }
    } else {
      pageDim = pageDimensions[pageSize]
    }
    // Flip if landscape
    pageDim = landscape ? {x: pageDim.y, y: pageDim.x} : pageDim
    return pageDim
  }

  /**
   * Define load options and load the URL in the window
   * @param window
   * @param url
   *
   * @private
   */
  _loadURL (window, url, args) {
    const loadOpts = {}
    if (args.disableCache) {
      loadOpts.extraHeaders += 'pragma: no-cache\n'
    }
    window.loadURL(url, loadOpts)
  }

  // Page Load & Rendering

  /**
   * Injects a wait if defined before calling the generateFunction
   *
   * @param window used for JavaScript injection to emit event back through IPC
   * @param generateFunction called when view is ready
   * @param waitTime wait time passed as an argument (if any), ignored when
   *   event is set
   *
   * @private
   */
  _waitForPage (window, generateFunction, waitTime) {
    const waitForJSEvent = this.args.waitForJSEvent
    if (waitForJSEvent) {
      this._waitForBrowserEvent(waitForJSEvent, window, generateFunction)
    } else {
      setTimeout(generateFunction, waitTime)
    }
  }

  _waitForBrowserEvent (waitForJSEvent, window, generateFunction) {
    const eventName = _.size(waitForJSEvent) > 0 ? waitForJSEvent : 'view-ready'
    this._attachIPCListener(eventName, generateFunction)
    this._executeJSListener(eventName, generateFunction, window)
  }

  _executeJSListener (eventName, generateFunction, window) {
    const cmd = `var ipc = require('electron').ipcRenderer
                   var body = document.body
                   body.addEventListener('${eventName}', () => ipc.send('READY_TO_RENDER'))`

    // Don't let things hang forever
    const timeout = setTimeout(() => {
      this.emit('window.event.wait.timeout', {eventName: eventName})
      electron.ipcMain.removeAllListeners('READY_TO_RENDER')
      generateFunction()
    }, this.args.outputWait > 0 ? this.args.outputWait : MAX_EVENT_WAIT)
    this.once('window.capture.start', () => clearTimeout(timeout))

    window.webContents.executeJavaScript(cmd)
  }

  _attachIPCListener (eventName, generateFunction) {
    this.emit('window.event.wait.start', {eventName: eventName})
    electron.ipcMain.once('READY_TO_RENDER', generateFunction)
  }

  // Output

  /**
   * Create the PDF or PNG file
   * @param window
   * @param outputFile
   *
   * @private
   */
  _generateOutput (window, outputFile, args, done) {
    this.emit('window.capture.start', {})

    const png = outputFile.toLowerCase().endsWith('.png')
    // Image (PNG)
    if (png) {
      window.capturePage(function (image) {
        const target = path.resolve(outputFile)
        fs.writeFile(target, image.toPNG(), function (err) {
          this.emit('window.capture.end', {file: target, error: err})
        })
      })
    } else { // PDF
      const pdfOptions = {
        marginsType: args.marginsType,
        printBackground: args.printBackground,
        printSelectionOnly: args.printSelectionOnly,
        pageSize: args.pageSize,
        landscape: args.landscape
      }

      window.webContents.printToPDF(pdfOptions, (err, data) => {
        if (err) {
          this.emit('window.capture.end', {error: err})
          done(err)
        } else {
          const target = path.resolve(outputFile)
          fs.writeFile(target, data, (err) => {
            if (!err) {
              /**
               * PDF Generation Event - fires when a PDF has be persisted to
               * disk
               * @event PDFExporter#pdf-complete
               * @type {object}
               * @property {String} file - Path to the PDF File
               */
              this.emit('pdf-complete', {file: target})
            }
            this.emit('window.capture.end', {file: target, error: err})
            done(err, target)
          })
        }
      })
    }
  }

}

module.exports = ExportJob
module.exports.HTML_DPI = HTML_DPI
module.exports.MICRONS_INCH_RATIO = MICRONS_INCH_RATIO
