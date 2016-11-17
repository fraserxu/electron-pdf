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

const wargs = require('./args')

// CONSTANTS
const HTML_DPI = 96
const MICRONS_INCH_RATIO = 25400
const MAX_EVENT_WAIT = 10000

const DEFAULT_OPTIONS = {
  closeWindow: true
}

class ExportJob extends EventEmitter {

  /**
   *
   * @param {Array} input The path to the HTML or url, or a markdown file
   *   with 'md' or 'markdown' extension.
   * @param output The name of the file to export to.  If the extension is
   *   '.png' then a PNG image will be generated instead of a PDF.
   * @param args {Object} the minimist arg object
   * @param options {Object} electron-pdf options
   * @param options.closeWindow default:true - If set to false, the window will
   *   not be closed when the job is complete.  This can be useful if you wish
   *   to reuse a window by passing it to the render function.
   *
   * @fires ExportJob#export-complete after each export is available on the
   *   filesystem
   * @fires ExportJob#job-complete after all export resources are available on
   *   the filesystem
   */
  constructor (input, output, args, options) {
    super()
    this.input = _.isArray(input) ? input : [input]
    this.output = output
    this.args = args
    this.options = _.extend({}, DEFAULT_OPTIONS, options)
    logger('job options:',this.options)

    if (_.startsWith(this.args.pageSize, '{')) {
      this.args.pageSize = JSON.parse(this.args.pageSize)
    }
  }

  // ***************************************************************************
  // ************************* Public Functions ********************************
  // ***************************************************************************

  /**
   * Render markdown or html to pdf
   */
  render (window) {
    logger('render starting...')
    const args = this.args

    const win = this._launchBrowserWindow(args)
    
    // TODO: Check for different domains, this is meant to support only a single origin
    const firstUrl = this.input[0]
    this._setSessionCookies(args.cookies, firstUrl, win.webContents.session.cookies)

    const windowEvents = []
    this.input.forEach((uriPath, i) => {
      windowEvents.push((pageDone) => {
        const targetFile = this._getTargetFile(i)
        const generateFunction = this._generateOutput.bind(this, win, targetFile, args, pageDone)
        const waitFunction = this._waitForPage.bind(this, win, generateFunction, args.outputWait)

        win.webContents.removeAllListeners('did-finish-load')
        win.webContents.on('did-finish-load', waitFunction)
        win.webContents.on('did-fail-load', (r) => {
          // http://electron.atom.io/docs/api/web-contents/#event-did-fail-load
          logger('load failure!')
        })
        win.webContents.on('did-start-loading', (r) => {
          //logger('loading!')
        })
        win.webContents.on('dom-ready', (r) => {
          logger('dom ready!')
        })
        win.webContents.on('did-get-response-details',
          function (event,
                    status,
                    newURL,
                    originalURL,
                    httpResponseCode,
                    requestMethod,
                    referrer,
                    headers,
                    resourceType) {
          // logger('resource complete:', httpResponseCode, newURL)
        })

        this._loadURL(win, uriPath, args)
      })
    })

    async.series(windowEvents, (err, results) => {
      if( this.options.closeWindow ){
        win.close()
      }
      /**
       * PDF Generation Event - fires when all PDFs have been persisted to disk
       * @event PDFExporter#jobj-complete
       * @type {object}
       * @property {String} results - array of generated pdf file locations
       * @property {Object} error - If an error occurred, null otherwise
       */
      this.emit('job-complete', {results: results, window: win, error: err})
    })
  }

  /**
   * If the html page requested emits a CustomEvent
   * (https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/CustomEvent)
   * you may want to act upon the information it contains.
   *
   * Use this method to register your own observer.
   *
   * @param handler {function} A callback that is passed a single argument,
   * the details object from CustomEvent
   */
  observeRenderEvent(handler){
    this.renderEventObserver = handler
  }

  /**
   * Change one of the arguments provided in the constructor.
   * Intended to be used with observeRenderEvent
   *
   * Note that electron-pdf uses the fully named arguments and none of the
   * aliases (i.e. 'landscape' and not 'l').  Even if you used an alias during
   * initialization make sure you pass the named argument here.
   *
   * @param arg The full name of the argument (i.e 'landscape')
   * @param value The new value
   */
  changeArgValue(arg, value){
    this.args[arg] = value
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
    window.loadURL(wargs.urlWithArgs(url, {}), loadOpts)
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

  /**
   * responsible for executing JS in the browser that will wait for the page
   * to emit an event before capturing the page.
   *
   * @param eventName
   * @param generateFunction
   * @param window
   * @private
   */
  _executeJSListener (eventName, generateFunction, window) {
    const cmd = `var ipc = require('electron').ipcRenderer
                 var body = document.body
                 body.addEventListener('${eventName}', 
                   event => {
                     //Detail will only exist if a CustomEvent was emitted
                     ipc.send('READY_TO_RENDER', event.detail)
                   }
                 )`

    // Don't let things hang forever
    const timeout = setTimeout(() => {
      this.emit('window.event.wait.timeout', {eventName: eventName})
      electron.ipcMain.removeAllListeners('READY_TO_RENDER')
      generateFunction()
    }, this.args.outputWait > 0 ? this.args.outputWait : MAX_EVENT_WAIT)

    this.once('window.event.wait.end', () => clearTimeout(timeout))

    window.webContents.executeJavaScript(cmd)
  }

  /**
   * Listen for the browser to emit the READY_TO_RENDER event and when it does
   * emit our own event so the max load timer is removed.
   *
   * @param eventName this is whatever the client provided
   * @param generateFunction _generateOutput with all of its arguments bound
   * @private
   */
  _attachIPCListener (eventName, generateFunction) {
    this.emit('window.event.wait.start', {eventName: eventName})

    electron.ipcMain.once('READY_TO_RENDER', (name, customEventDetail) => {
      this.emit('window.event.wait.end', {})

      if( this.renderEventObserver ){
        this.renderEventObserver(customEventDetail)
        //TODO: Set a timeout, maybe support promise return types?
      }
      generateFunction()
    })
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
        window.webContents.capturePage(image => {
          const target = path.resolve(outputFile)
          fs.writeFile(target, image.toPNG(), function (err) {
            this.emit('window.capture.end', {file: target, error: err})
            this.emit('export-complete', {file: target})
            // REMOVE pdf-complete in 2.0 - keeping for backwards compatibility
            this.emit('pdf-complete', {file: target})
            done(err, target)
          }.bind(this))
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
              // REMOVE in 2.0 - keeping for backwards compatibility
              this.emit('pdf-complete', {file: target})
              /**
               * Generation Event - fires when an export has be persisted to
               * disk
               * @event PDFExporter#export-complete
               * @type {object}
               * @property {String} file - Path to the File
               */
              this.emit('export-complete', {file: target})
            }
            this.emit('window.capture.end', {file: target, error: err})
            done(err, target)
          })
        }
      })
    }
  }

  /**
   * @param zeroBasedIndex Index of the input being processed
   * @returns {String} the pdf output file name that should be used.
   * @private
   */
  _getTargetFile (zeroBasedIndex) {
    if (_.size(this.input) > 1) {
      const ext = path.extname(this.output)
      return _.replace(this.output, ext, `_${zeroBasedIndex + 1}${ext}`)
    }
    return this.output
  }
}

module.exports = ExportJob
module.exports.HTML_DPI = HTML_DPI
module.exports.MICRONS_INCH_RATIO = MICRONS_INCH_RATIO
