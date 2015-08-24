#!/usr/bin/env node

var path = require('path')
var spawn = require('child_process').spawn
var which = require('which')

which('electron', function (err, resolvedPath) {
  if (!resolvedPath && !process.env.ELECTRON_PATH) {
    console.error('')
    console.error('  Can not find `electron` in the $PATH and $ELECTRON_PATH is not set.')
    console.error('  Please either set $ELECTRON_PATH or run `npm i -g electron-prebuilt`.')
    console.error('')
    process.exit(1)
  }

  if (!resolvedPath) return runElectron(process.env.ELECTRON_PATH)
  if (resolvedPath) return runElectron(resolvedPath)
  if (err) console.error(err)
})

function runElectron (resolvedPath) {
  var args = process.argv.slice(2)
  args.unshift(path.resolve(path.join(__dirname, './index.js')))
  var electron = spawn(resolvedPath, args, {
    stdio: ['inherit', 'inherit', 'pipe', 'ipc'],
    cwd: path.resolve(__dirname)
  })
  electron.stderr.on('data', function (data) {
    var str = data.toString('utf8')
    // it's Chromium, STFU
    if (str.match(/^\[\d+\:\d+/)) return
    process.stderr.write(data)
  })
}
