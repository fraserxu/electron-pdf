#!/usr/bin/env node

const path = require('path')
const spawn = require('child_process').spawn
const electronPath = require('electron-prebuilt')

const args = process.argv.slice(2)
args.unshift(path.resolve(path.join(__dirname, './index.js')))

const electron = spawn(electronPath, args)
electron.stdout.pipe(process.stdout)
process.stdin.pipe(electron.stdin)

electron.stderr.on('data', (data) => {
  const str = data.toString('utf8')
  // it's Chromium, STFU
  if (str.match(/^\[\d+:\d+/)) return
  process.stderr.write(data)
})
electron.on('exit', (code) => { process.exit(code) })
