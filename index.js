var app = require('app')
var meow = require('meow')
var fs = require('fs')
var path = require('path')
var url = require('url')
var BrowserWindow = require('browser-window')

app.on('ready', appReady)

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

var cli = meow({
  help: [
    'Usage',
    '  $ electron-pdf <input> <output>'
  ]
})

function appReady () {
  if (!cli.input[0] || !cli.input[1]) {
    cli.showHelp()
    app.quit()
  }

  var win = new BrowserWindow({ width: 0, height: 0, show: false })
  win.on('closed', function () { win = null })

  var indexUrl = url.format({
    protocol: 'file',
    pathname: cli.input[0],
    slashes: true
  })

  win.loadUrl(indexUrl)

  win.webContents.on('did-finish-load', function () {
    win.printToPDF({}, function (err, data) {
      if (err) {
        console.error(err)
      }

      fs.writeFile(cli.input[1], data, function (err) {
        if (err) {
          console.error(err)
        }
        app.quit()
      })
    })
  })
}
