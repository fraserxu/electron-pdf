var fs = require('fs')
var path = require('path')
var url = require('url')

var electron = require('electron')

var wargs = require('./lib/args')
var markdownToHTMLPath = require('./lib/markdown')

var HTML_DPI = 96

var PDFExporter = function (input, output, argv) {
  var app = electron.app
  app.on('ready', appReady)
  app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })

  function appReady () {
    var customCss = argv.css

    function isMarkdown (input) {
      var ext = path.extname(input)
      return ext.indexOf('md') > 0 || ext.indexOf('markdown') > 0
    }

    if (isMarkdown(input)) {
      var opts = {}

      if (customCss) {
        opts.customCss = customCss
      }

      // if given a markdown, render it into HTML and return the path of the
      // HTML
      input = markdownToHTMLPath(input, opts, function (err, tmpHTMLPath) {
        if (err) {
          console.error('Parse markdown file error', err)
          app.quit()
        }

        var indexUrl = wargs.urlWithArgs(tmpHTMLPath, {})
        render(indexUrl, output)
      })
    } else {
      var indexUrl = wargs.urlWithArgs(input, {})
      render(indexUrl, output)
    }
  }

  /**
   * Render markdown or html to pdf
   * @param {String} indexUrl The path to the HTML or url, or a markdown file
   *   with 'md' or 'markdown' extension.
   * @param output The name of the file to export to.  If the extension is
   *   '.png' then a PNG image will be generated instead of a PDF.
   */
  function render (indexUrl, output) {
    var requestedURL = url.parse(indexUrl)
    var win = launchBrowserWindow()
    setSessionCookies(argv.cookies, requestedURL, win)
    loadURL(win, indexUrl)
    win.webContents.on('did-finish-load', function () {
      setTimeout(
        generateOutput.bind(this, win, output),
        argv.outputWait)
    })
  }

  /**
   *
   * @param {String} cookies - ';' delimited cookies, '=' delimited name/value
   *   pairs
   * @param {URL} requestedURL - URL Object
   * @param {BrowserWindow} win - The electron browser window
   */
  function setSessionCookies (cookies, requestedURL, win) {
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
   *
   * @returns {electron.BrowserWindow}
   */
  function launchBrowserWindow () {
    var pageDimensions = {
      'A4': {x: 595, y: 842},
      'Letter': {x: 8.5 * HTML_DPI, y: 11 * HTML_DPI},
      'Legal': {x: 8.5 * HTML_DPI, y: 14 * HTML_DPI}
    }

    var pageDim = pageDimensions[argv.pageSize]
    pageDim = argv.landscape ? {x: pageDim.y, y: pageDim.x} : pageDim
    var winX = argv.windowX || pageDim.x
    var winY = argv.windowY || pageDim.y

    console.info('Opening a browser window', winX, 'x', winY)

    var win = new electron.BrowserWindow({
      width: winX,
      height: winY,
      show: argv.showWindow,
      enableLargerThanScreen: true,
      // TODO: Allow Browser Window prefs to be passed in, use Lodash.extend to
      // overlay them
      webPreferences: {
        experimentalFeatures: false,
        experimentalCanvasFeatures: false
      }
    })
    win.on('closed', function () {
      win = null
    })
    return win
  }

  /**
   * Define load options and load the URL in the window
   * @param window
   * @param url
   */
  function loadURL (window, url) {
    var loadOpts = {}
    if (argv.disableCache) {
      loadOpts.extraHeaders += 'pragma: no-cache\n'
    }
    window.loadURL(url, loadOpts)
  }

  /**
   * Create the PDF or PNG file
   * @param window
   * @param outputFile
   */
  function generateOutput (window, outputFile) {
    var png = outputFile.toLowerCase().endsWith('.png')
    // Image (PNG)
    if (png) {
      window.capturePage(function (image) {
        var target = path.resolve(outputFile)
        fs.writeFile(target, image.toPNG(), function (err) {
          if (err) {
            console.error(err)
          }
          app.quit()
        })
      })
    } else { // PDF
      var pdfOptions = {
        marginsType: argv.marginsType,
        printBackground: argv.printBackground,
        printSelectionOnly: argv.printSelectionOnly,
        pageSize: argv.pageSize,
        landscape: argv.landscape
      }

      window.webContents.printToPDF(pdfOptions, function (err, data) {
        if (err) {
          console.error(err)
        }
        var target = path.resolve(outputFile)
        console.log('writing to:', target)
        fs.writeFile(target, data, function (err) {
          if (err) {
            console.error(err)
          }
          app.quit()
        })
      })
    }
  }
}

module.exports = PDFExporter

