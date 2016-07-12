var electron = require('electron')
var argv = require('minimist')(process.argv.slice(2))
var fs = require('fs')
var path = require('path')
var pkg = require('./package.json')

var app = electron.app
var BrowserWindow = electron.BrowserWindow

var wargs = require('./lib/args')
var markdownToHTMLPath = require('./lib/markdown')

var input = argv._[0] || argv.i || argv.input
var output = argv._[1] || argv.o || argv.output

if (argv.v || argv.version) {
  console.log('v' + pkg.version)
  process.exit(0)
}

if (argv.h || argv.help) {
  usage(1)
} else if (!input || !output) {
  usage(1)
}

app.on('ready', appReady)

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

function appReady () {
  var customCss = argv.c || argv.css

  function isMarkdown (input) {
    var ext = path.extname(input)
    return ext.indexOf('md') > 0 || ext.indexOf('markdown') > 0
  }

  if (isMarkdown(input)) {
    var opts = {}

    if (customCss) {
      opts.customCss = customCss
    }

    // if given a markdown, render it into HTML and return the path of the HTML
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
  var wait = argv.w || argv.outputWait || 0
  var win = new BrowserWindow({ width: 0, height: 0, show: false })
  win.on('closed', function () { win = null })

  var loadOpts = {}
  if (argv.d || argv.disableCache) {
    loadOpts.extraHeaders = 'pragma: no-cache\n'
  }
  win.loadURL(indexUrl, loadOpts)

  // print to pdf args
  var opts = {
    marginsType: argv.m || argv.marginsType || argv.marginType || 0,
    printBackground: argv.b || argv.printBackground || true,
    printSelectionOnly: argv.s || argv.printSelectionOnly || false,
    pageSize: argv.p || argv.pageSize || 'A4',
    landscape: argv.l || argv.landscape || false
  }

  win.webContents.on('did-finish-load', function () {
    setTimeout(function () {
      win.webContents.printToPDF(opts, function (err, data) {
        if (err) {
          console.error(err)
        }

        fs.writeFile(path.resolve(output), data, function (err) {
          if (err) {
            console.error(err)
          }
          app.quit()
        })
      })
    })
  }, wait)
}

function usage (code) {
  var rs = fs.createReadStream(path.join(__dirname, '/usage.txt'))
  rs.pipe(process.stdout)
  rs.on('close', function () {
    if (code) process.exit(code)
  })
}
