var fs = require('fs')
var path = require('path')

var electron = require('electron')
var app = electron.app
var BrowserWindow = electron.BrowserWindow

var wargs = require('./lib/args')
var markdownToHTMLPath = require('./lib/markdown')

var HTML_DPI = 96

var PDFExporter = function (input, output, argv) {
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
   * render file to pdf
   * @param  {String} indexUrl The path to the HTML or url
   */
  function render (indexUrl, output) {
    var png = output.toLowerCase().endsWith('.png')

    var pdfOptions = {
      marginsType: argv.marginsType,
      printBackground: argv.printBackground,
      printSelectionOnly: argv.printSelectionOnly,
      pageSize: argv.pageSize,
      landscape: argv.landscape
    }

    var pageDimensions = {
      'A4': {x: 595, y: 842},
      'Letter': {x: 8.5 * HTML_DPI, y: 11 * HTML_DPI},
      'Legal': {x: 8.5 * HTML_DPI, y: 14 * HTML_DPI}
    }

    var pageDim = pageDimensions[pdfOptions.pageSize]
    pageDim = pdfOptions.landscape ? {x: pageDim.y, y: pageDim.x} : pageDim
    var winX = argv.windowX || pageDim.x
    var winY = argv.windowY || pageDim.y

    console.info('Opening a browser window', winX, 'x', winY)
    var win = new BrowserWindow({
      width: winX,
      height: winY,
      x: 0, y: 0,
      show: true,
      enableLargerThanScreen: true,
      webPreferences: {
        experimentalFeatures: false,
        experimentalCanvasFeatures: false
      }
    })

    win.on('closed', function () {
      win = null
    })

    var loadOpts = {}
    if (argv.disableCache) {
      loadOpts.extraHeaders = 'pragma: no-cache\n'
    }
    win.loadURL(indexUrl, loadOpts)

    win.webContents.on('did-finish-load', function () {
      setTimeout(function () {
        console.log('finished loading')

        //  Image (PNG)
        if (png) {
          win.capturePage(function (image) {
            var target = path.resolve(output)
            fs.writeFile(target, image.toPNG(), function (err) {
              if (err) {
                console.error(err)
              }
              app.quit()
            })
          })
        } else { //  PDF
          win.webContents.printToPDF(pdfOptions, function (err, data) {
            if (err) {
              console.error(err)
            }
            var target = path.resolve(output)
            console.log('writing to:', target)
            fs.writeFile(target, data, function (err) {
              if (err) {
                console.error(err)
              }
              app.quit()
            })
          })
        }
      }, argv.outputWait)
    })
  }
}

module.exports = PDFExporter

