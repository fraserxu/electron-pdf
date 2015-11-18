var app = require('app')
var meow = require('meow')
var fs = require('fs')
var path = require('path')
var BrowserWindow = require('browser-window')

var wargs = require('./lib/args')
var markdownToHTMLPath = require('./lib/markdown')

app.on('ready', appReady)

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

var cli = meow({
  pkg: './package.json',
  help: [
    'Options',
    '  --help                     Show this help',
    '  --version                  Current version of package',
    '  -i | --input               String - The path to the HTML file or url',
    '  -o | --output              String - The path of the output PDF',
    '  -c | --css                 String - The path to custom CSS',
    '  -b | --printBackground     Boolean - Whether to print CSS backgrounds.',
    '                               false - default',
    '  -s | --printSelectionOnly  Boolean - Whether to print selection only',
    '                               false - default',
    '  -l | --landscape           Boolean - true for landscape, false for portrait.',
    '                               false - default',
    '  -m | --marginType          Integer - Specify the type of margins to use',
    '                               0 - default',
    '                               1 - none',
    '                               2 - minimum',
    '',
    'Usage',
    '  $ electron-pdf <input> <output>',
    '  $ electron-pdf <input> <output> -l',
    '',
    'Examples',
    '  $ electron-pdf http://fraserxu.me ~/Desktop/fraserxu.pdf',
    '  $ electron-pdf ./index.html ~/Desktop/index.pdf',
    '  $ electron-pdf ./README.md ~/Desktop/README.pdf -l',
    '  $ electron-pdf ./README.md ~/Desktop/README.pdf -l -c my-awesome-css.css',

    ''
  ].join('\n')
})

function appReady () {
  var input = cli.input[0] || cli.flags.i || cli.flags.input
  var output = cli.input[1] || cli.flags.o || cli.flags.output
  var customCss = cli.flags.c || cli.flags.css
  if (!input || !output) {
    cli.showHelp()
    app.quit()
  }

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
  var win = new BrowserWindow({ width: 0, height: 0, show: false })
  win.on('closed', function () { win = null })
  win.loadURL(indexUrl)

  // print to pdf args
  var opts = {
    marginType: cli.flags.m || cli.flags.marginType || 0,
    printBackground: cli.flags.p || cli.flags.printBackground || true,
    printSelectionOnly: cli.flags.s || cli.flags.printSelectionOnly || false,
    landscape: cli.flags.l || cli.flags.landscape || false
  }

  win.webContents.on('did-finish-load', function () {
    win.printToPDF(opts, function (err, data) {
      if (err) {
        console.error(err)
      }

      fs.writeFile(path.join(process.cwd(), output), data, function (err) {
        if (err) {
          console.error(err)
        }
        app.quit()
      })
    })
  })
}
