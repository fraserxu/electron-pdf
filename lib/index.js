'use strict'

var EventEmitter = require('events').EventEmitter
var async = require('async')
var fs = require('fs')
var path = require('path')
var url = require('url')

var electron = require('electron')
var _ = require('lodash')
var minimist = require('minimist')

// var pdf = require('pdfjs-dist')

var argOptions = require('./options')
var Source = require('./source')
var source = new Source()

var HTML_DPI = 96
var MICRONS_INCH_RATIO = 25400 / 1

var electronApp

/**
 * Runs an Electron application used to export HTML to PDF Documents
 */
class PDFExporter extends EventEmitter {

  // ------------------------------------------------------------------
  // ------------------ Public API ------------------------------------
  // ------------------------------------------------------------------
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
    process.on('uncaughtException', err => { throw err })
  }

  stop () {
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
   *
   * @fires PDFExporter#pdf-complete after each PDF is available on the filesystem
   */
  runExport (input, output, args, done) {
    if (!this.isReady) {
      const msg = 'Electron is not ready, make sure to register an event listener for "charged" and invoke start()'
      throw msg
    }

    // charge.js interprets the args, but this method should also support raw args
    if (args instanceof Array) {
      args = minimist(args, argOptions)
    }

    this._render(source.resolve(input, args), output, args, done)
  }

  // ------------------------------------------------------------------
  // ------------------ Private API -----------------------------------
  // ------------------------------------------------------------------
  /**
   * Render markdown or html to pdf
   * @param {Array} input The path to the HTML or url, or a markdown file
   *   with 'md' or 'markdown' extension.
   * @param output The name of the file to export to.  If the extension is
   *   '.png' then a PNG image will be generated instead of a PDF.
   * @param args {Object} the minimist arg object
   * @param done {function} callback function for completed file
   *
   * @private
   */
  _render (input, output, args, done) {
    var win = this._launchBrowserWindow(args)
    // TODO: Check for different domains, this is meant to support only a single origin
    var requestedURL = url.parse(input[0])
    this._setSessionCookies(args.cookies, requestedURL, win)

    var windowEvents = []
    input.forEach((uriPath, i) => {
      windowEvents.push((pageDone) => {
        this._loadURL(win, uriPath, args)
        // .${i+1}
        var generate = this._generateOutput.bind(this, win, `${output}`, args, pageDone)
        win.webContents.removeAllListeners('did-finish-load')
        win.webContents.on('did-finish-load', function () {
          setTimeout(generate, args.outputWait)
        })
      })
    })
    async.series(windowEvents, (err, results) => {
      if (err) {
        console.log('Error loading urls in window:', err)
      }
      win.close()
      done(results)
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
               * PDF Generation Event - fires when a PDF has be persisted to disk
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

module.exports = PDFExporter
