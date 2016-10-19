'use strict'

// Node Modules
var EventEmitter = require('events').EventEmitter
var async = require('async')
var fs = require('fs')
var path = require('path')
var url = require('url')

// Third Party Modules
var electron = require('electron')
var _ = require('lodash')

// CONSTANTS
var HTML_DPI = 96
var MICRONS_INCH_RATIO = 25400 / 1

class ExportJob extends EventEmitter {

  /**
   *
   * @param input
   * @param output
   * @param args
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

    this._render(input, output, args)
  }

  /**
   * Render markdown or html to pdf
   * @param {Array} input The path to the HTML or url, or a markdown file
   *   with 'md' or 'markdown' extension.
   * @param output The name of the file to export to.  If the extension is
   *   '.png' then a PNG image will be generated instead of a PDF.
   * @param args {Object} the minimist arg object
   *
   * @private
   */
  _render (input, output, args) {
    var win = this._launchBrowserWindow(args)
    // TODO: Check for different domains, this is meant to support only a single origin
    var requestedURL = url.parse(input[0])
    this._setSessionCookies(args.cookies, requestedURL, win)

    var windowEvents = []
    input.forEach((uriPath, i) => {
      windowEvents.push((pageDone) => {
        this._loadURL(win, uriPath, args)
        // .${i+1}
        var generateFunction = this._generateOutput.bind(this, win, `${output}`, args, pageDone)
        var waitFunction = this._waitForPage.bind(this, win, generateFunction, args.outputWait)
        win.webContents.removeAllListeners('did-finish-load')
        win.webContents.on('did-finish-load', waitFunction)
      })
    })

    async.series(windowEvents, (err, results) => {
      if (err) {
        console.log('Error loading urls in window:', err)
      }
      win.close()
      /**
       * PDF Generation Event - fires when all PDFs have been persisted to disk
       * @event PDFExporter#jobj-complete
       * @type {object}
       * @property {String} results - array of generated pdf file locations
       */
      this.emit('job-complete', {results: results})
    })
  }

  /**
   *
   * @param {String} cookies - ';' delimited cookies, '=' delimited name/value
   *   pairs
   * @param {URL} requestedURL - URL Object
   * @param {BrowserWindow} win - The electron browser window
   *
   * @private
   */
  _setSessionCookies (cookies, requestedURL, win) {
    if (cookies) {
      cookies.split(';').forEach(function (c) {
        var nameValue = c.split('=')
        var cookie = {
          url: requestedURL.protocol + '//' + requestedURL.host,
          name: nameValue[0],
          value: nameValue[1]
        }
        win.webContents.session.cookies.set(cookie, function (err) {
          if (err) {
            console.log(err)
          }
        })
      })
    }
  }

  /**
   * Launch a browser window
   * @param args {Object} the minimist arg object
   * @returns {electronApp.BrowserWindow}
   *
   * @private
   */
  _launchBrowserWindow (args) {
    function pdfToPixels (inches) {
      return Math.floor(inches * HTML_DPI)
    }

    var pageDimensions = {
      'A3': {x: pdfToPixels(11.7), y: pdfToPixels(16.5)},
      'A4': {x: pdfToPixels(8.3), y: pdfToPixels(11.7)},
      'A5': {x: pdfToPixels(5.8), y: pdfToPixels(8.3)},
      'Letter': {x: pdfToPixels(8.5), y: pdfToPixels(11)},
      'Legal': {x: pdfToPixels(8.5), y: pdfToPixels(14)},
      'Tabloid': {x: pdfToPixels(11), y: pdfToPixels(17)}
    }

    var pageDim

    if (typeof args.pageSize === 'object') {
      var xInches = args.pageSize.width / MICRONS_INCH_RATIO
      var yInches = args.pageSize.height / MICRONS_INCH_RATIO

      pageDim = {
        x: pdfToPixels(xInches),
        y: pdfToPixels(yInches)
      }
    } else {
      pageDim = pageDimensions[args.pageSize]
    }

    pageDim = args.landscape ? {x: pageDim.y, y: pageDim.x} : pageDim

    var defaultOpts = {
      width: pageDim.x,
      height: pageDim.y,
      enableLargerThanScreen: true,
      show: false
    }

    var cmdLineBrowserConfig = {}
    try {
      cmdLineBrowserConfig = JSON.parse(args.browserConfig || '{}')
    } catch (e) {
      console.log('Invalid browserConfig provided, using defaults. ' +
                  'Value:', args.browserConfig, '\nError:', e)
    }

    var browserConfig = _.extend(defaultOpts, cmdLineBrowserConfig)
    console.info('Opening a browser window', browserConfig.width, 'x', browserConfig.height)
    var win = new electron.BrowserWindow(browserConfig)
    win.on('closed', function () {
      win = null
    })

    return win
  }

  /**
   * Define load options and load the URL in the window
   * @param window
   * @param url
   *
   * @private
   */
  _loadURL (window, url, args) {
    var loadOpts = {}
    if (args.disableCache) {
      loadOpts.extraHeaders += 'pragma: no-cache\n'
    }
    window.loadURL(url, loadOpts)
  }

  /**
   * Injects a wait if defined before calling the generateFunction
   *
   * @param window used for JavaScript injection to emit event back through IPC
   * @param generateFunction called when view is ready
   * @param waitTime wait time passed as an argument (if any), ignored when event is set
   *
   * @private
   */
  _waitForPage (window, generateFunction, waitTime) {
    const waitForJSEvent = this.args.waitForJSEvent
    if (waitForJSEvent) {
      const ipc = electron.ipcMain
      const eventName = _.size(waitForJSEvent) > 0 ? waitForJSEvent : 'view-ready'
      console.log(`Waiting for '${eventName}' event in the browser to continue rendering...`)
      const cmd = `var ipc = require('electron').ipcRenderer
                   var body = document.body
                   body.addEventListener('${eventName}', () => ipc.send('READY_TO_RENDER'))`
      ipc.once('READY_TO_RENDER', generateFunction)
      window.webContents.executeJavaScript(cmd)
    } else {
      setTimeout(generateFunction, waitTime)
    }
  }

  /**
   * Create the PDF or PNG file
   * @param window
   * @param outputFile
   *
   * @private
   */
  _generateOutput (window, outputFile, args, done) {
    var png = outputFile.toLowerCase().endsWith('.png')
    // Image (PNG)
    if (png) {
      window.capturePage(function (image) {
        var target = path.resolve(outputFile)
        fs.writeFile(target, image.toPNG(), function (err) {
          if (err) {
            console.error(err)
          }
        })
      })
    } else { // PDF
      var pdfOptions = {
        marginsType: args.marginsType,
        printBackground: args.printBackground,
        printSelectionOnly: args.printSelectionOnly,
        pageSize: args.pageSize,
        landscape: args.landscape
      }

      window.webContents.printToPDF(pdfOptions, (err, data) => {
        if (err) {
          console.error('printToPDF Failed', err)
          done()
        } else {
          var target = path.resolve(outputFile)
          console.log('writing to:', target)
          fs.writeFile(target, data, (err) => {
            if (err) {
              console.error(err)
            } else {
              /**
               * PDF Generation Event - fires when a PDF has be persisted to
               * disk
               * @event PDFExporter#pdf-complete
               * @type {object}
               * @property {String} file - Path to the PDF File
               */
              this.emit('pdf-complete', {file: target})
            }
            done(err, target)
          })
        }
      })
    }
  }

}
module.exports = ExportJob
