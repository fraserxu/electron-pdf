#!/usr/bin/env node

var path = require('path')
var spawn = require('child_process').spawn
var electronPath = require('electron-prebuilt')


var args = process.argv.slice(2)

args.unshift(path.resolve(path.join(__dirname, './charge.js')))

var electron = spawn(electronPath, args, {
  //       stdin,     stdout,    stderr
  stdio: ['inherit', 'inherit', 'pipe', 'ipc']
})

electron.stderr.on('data', function (data) {
  var str = data.toString('utf8')
  // it's Chromium, STFU
  if (str.match(/^\[\d+\:\d+/)) return
  process.stderr.write(data)
})
