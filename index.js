var app = require('app')
var meow = require('meow')
var fs = require('fs')
var BrowserWindow = require('browser-window')

var wargs = require('./lib/args')

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
    '  $ electron-pdf http://fraserxu.me ~/Desktop/fraserxu.pdf -l',
    ''
  ].join('\n')
})

function appReady () {
  var input = cli.input[0] || cli.flags.i || cli.flags.input
  var output = cli.input[1] || cli.flags.o || cli.flags.output
  if (!input || !output) {
    cli.showHelp()
    app.quit()
  }

  var win = new BrowserWindow({ width: 0, height: 0, show: false })
  win.on('closed', function () { win = null })

  var indexUrl = wargs.urlWithArgs(input, {})

  win.loadUrl(indexUrl)

  // print to pdf args
  var opts = {
    marginType: cli.flags.m || cli.flags.marginType || 0,
    printBackground: cli.flags.p || cli.flags.printBackground || false,
    printSelectionOnly: cli.flags.s || cli.flags.printSelectionOnly || false,
    landscape: cli.flags.l || cli.flags.landscape || false
  }

  win.webContents.on('did-finish-load', function () {
    win.printToPDF(opts, function (err, data) {
      if (err) {
        console.error(err)
      }

      fs.writeFile(output, data, function (err) {
        if (err) {
          console.error(err)
        }
        app.quit()
      })
    })
  })
}
